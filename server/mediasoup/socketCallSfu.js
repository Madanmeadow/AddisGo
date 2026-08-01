// server/mediasoup/socketCallSfu.js

const callRooms = new Map(); // roomId -> room

// Helper to safely close mediasoup entities
function safeClose(entity) {
  try {
    if (entity && typeof entity.close === 'function') {
      entity.close();
    }
  } catch (err) {
    console.warn('safeClose error:', err.message);
  }
}

export function registerCallSfuHandlers(io, socket) {
  
  // Track this socket's resources for cleanup
  const socketResources = {
    rooms: new Set(),           // rooms this socket joined
    transports: new Map(),      // transportId -> { transport, roomId, direction }
    producers: new Map(),       // producerId -> { producer, roomId }
    consumers: new Map(),       // consumerId -> { consumer, roomId, producerId }
  };

  /* ================= JOIN ================= */
  socket.on("call:sfu:join", async ({ roomId }, cb) => {
    try {
      if (!roomId) {
        return cb?.({ error: "roomId required" });
      }

      let room = callRooms.get(roomId);

      if (!room) {
        room = await createRoom(roomId);
        callRooms.set(roomId, room);
      }

      socket.join(`call:${roomId}`);
      socketResources.rooms.add(roomId);
      
      room.peers.set(socket.id, {
        socketId: socket.id,
        joinedAt: Date.now(),
      });

      cb?.({ rtpCapabilities: room.router.rtpCapabilities });
    } catch (err) {
      console.error("call:sfu:join error:", err);
      cb?.({ error: err.message || "Join failed" });
    }
  });

  /* ================= CREATE TRANSPORT ================= */
  socket.on("call:sfu:createTransport", async ({ roomId, direction = "send" }, cb) => {
    try {
      const room = callRooms.get(roomId);
      if (!room) {
        return cb?.({ error: "Room not found" });
      }

      // Validate direction
      if (!["send", "recv"].includes(direction)) {
        return cb?.({ error: "Invalid direction. Use 'send' or 'recv'" });
      }

      const transport = await room.router.createWebRtcTransport({
        listenIps: [
          {
            ip: process.env.MEDIASOUP_LISTEN_IP || "0.0.0.0",
            announcedIp: process.env.MEDIASOUP_ANNOUNCED_IP || null,
          },
        ],
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
        initialAvailableOutgoingBitrate: direction === "send" ? 1000000 : undefined,
      });

      // Store with unique transportId
      const transportData = {
        transport,
        roomId,
        direction,
        socketId: socket.id,
        createdAt: Date.now(),
      };
      
      room.transports.set(transport.id, transportData);
      socketResources.transports.set(transport.id, transportData);

      // Handle transport close
      transport.on("routerclose", () => {
        console.log(`Transport ${transport.id} router closed`);
        cleanupTransport(transport.id);
      });

      transport.on("@close", () => {
        cleanupTransport(transport.id);
      });

      cb?.({
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters,
      });
    } catch (err) {
      console.error("call:sfu:createTransport error:", err);
      cb?.({ error: err.message || "Transport creation failed" });
    }
  });

  /* ================= CONNECT TRANSPORT ================= */
  socket.on("call:sfu:connectTransport", async ({ roomId, transportId, dtlsParameters }, cb) => {
    try {
      const room = callRooms.get(roomId);
      if (!room) {
        return cb?.({ error: "Room not found" });
      }

      const transportData = room.transports.get(transportId);
      if (!transportData) {
        return cb?.({ error: "Transport not found" });
      }

      // Security: verify transport belongs to this socket
      if (transportData.socketId !== socket.id) {
        return cb?.({ error: "Transport access denied" });
      }

      await transportData.transport.connect({ dtlsParameters });
      cb?.({ success: true });
    } catch (err) {
      console.error("call:sfu:connectTransport error:", err);
      cb?.({ error: err.message || "DTLS connection failed" });
    }
  });

  /* ================= PRODUCE ================= */
  socket.on("call:sfu:produce", async ({ roomId, transportId, kind, rtpParameters }, cb) => {
    try {
      const room = callRooms.get(roomId);
      if (!room) {
        return cb?.({ error: "Room not found" });
      }

      const transportData = room.transports.get(transportId);
      if (!transportData) {
        return cb?.({ error: "Transport not found" });
      }

      if (transportData.socketId !== socket.id) {
        return cb?.({ error: "Transport access denied" });
      }

      if (transportData.direction !== "send") {
        return cb?.({ error: "Cannot produce on recv transport" });
      }

      const producer = await transportData.transport.produce({ kind, rtpParameters });

      const producerData = {
        producer,
        roomId,
        transportId,
        socketId: socket.id,
        kind,
      };

      room.producers.set(producer.id, producerData);
      socketResources.producers.set(producer.id, producerData);

      // Notify other peers
      socket.to(`call:${roomId}`).emit("call:sfu:newProducer", {
        producerId: producer.id,
        peerId: socket.id,
        kind,
      });

      // Handle producer close
      producer.on("transportclose", () => {
        console.log(`Producer ${producer.id} transport closed`);
        cleanupProducer(producer.id);
      });

      producer.on("@close", () => {
        cleanupProducer(producer.id);
      });

      cb?.({ id: producer.id });
    } catch (err) {
      console.error("call:sfu:produce error:", err);
      cb?.({ error: err.message || "Produce failed" });
    }
  });

  /* ================= CONSUME ================= */
  socket.on("call:sfu:consume", async ({ roomId, transportId, producerId, rtpCapabilities }, cb) => {
    try {
      const room = callRooms.get(roomId);
      if (!room) {
        return cb?.({ error: "Room not found" });
      }

      const transportData = room.transports.get(transportId);
      if (!transportData) {
        return cb?.({ error: "Transport not found" });
      }

      if (transportData.socketId !== socket.id) {
        return cb?.({ error: "Transport access denied" });
      }

      if (transportData.direction !== "recv") {
        return cb?.({ error: "Cannot consume on send transport" });
      }

      const producerData = room.producers.get(producerId);
      if (!producerData) {
        return cb?.({ error: "Producer not found" });
      }

      if (!room.router.canConsume({ producerId, rtpCapabilities })) {
        return cb?.({ error: "Cannot consume this producer with given RTP capabilities" });
      }

      const consumer = await transportData.transport.consume({
        producerId,
        rtpCapabilities,
        paused: true, // Start paused, client must resume
      });

      const consumerData = {
        consumer,
        roomId,
        transportId,
        producerId,
        socketId: socket.id,
      };

      room.consumers.set(consumer.id, consumerData);
      socketResources.consumers.set(consumer.id, consumerData);

      // Handle consumer close
      consumer.on("producerclose", () => {
        console.log(`Consumer ${consumer.id} producer closed`);
        socket.emit("call:sfu:producerClosed", { producerId });
        cleanupConsumer(consumer.id);
      });

      consumer.on("producerpause", () => {
        socket.emit("call:sfu:producerPaused", { producerId });
      });

      consumer.on("producerresume", () => {
        socket.emit("call:sfu:producerResumed", { producerId });
      });

      consumer.on("transportclose", () => {
        cleanupConsumer(consumer.id);
      });

      cb?.({
        id: consumer.id,
        producerId,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
      });
    } catch (err) {
      console.error("call:sfu:consume error:", err);
      cb?.({ error: err.message || "Consume failed" });
    }
  });

  /* ================= RESUME CONSUMER ================= */
  socket.on("call:sfu:resumeConsumer", async ({ roomId, consumerId }, cb) => {
    try {
      const room = callRooms.get(roomId);
      if (!room) {
        return cb?.({ error: "Room not found" });
      }

      const consumerData = room.consumers.get(consumerId);
      if (!consumerData) {
        return cb?.({ error: "Consumer not found" });
      }

      if (consumerData.socketId !== socket.id) {
        return cb?.({ error: "Consumer access denied" });
      }

      await consumerData.consumer.resume();
      cb?.({ success: true, resumed: true });
    } catch (err) {
      console.error("call:sfu:resumeConsumer error:", err);
      cb?.({ error: err.message || "Resume failed" });
    }
  });

  /* ================= PAUSE/RESUME PRODUCER ================= */
  socket.on("call:sfu:pauseProducer", async ({ roomId, producerId }, cb) => {
    try {
      const room = callRooms.get(roomId);
      if (!room) return cb?.({ error: "Room not found" });

      const producerData = room.producers.get(producerId);
      if (!producerData || producerData.socketId !== socket.id) {
        return cb?.({ error: "Producer not found or access denied" });
      }

      await producerData.producer.pause();
      cb?.({ paused: true });
    } catch (err) {
      cb?.({ error: err.message });
    }
  });

  socket.on("call:sfu:resumeProducer", async ({ roomId, producerId }, cb) => {
    try {
      const room = callRooms.get(roomId);
      if (!room) return cb?.({ error: "Room not found" });

      const producerData = room.producers.get(producerId);
      if (!producerData || producerData.socketId !== socket.id) {
        return cb?.({ error: "Producer not found or access denied" });
      }

      await producerData.producer.resume();
      cb?.({ resumed: true });
    } catch (err) {
      cb?.({ error: err.message });
    }
  });

  /* ================= LEAVE ROOM ================= */
  socket.on("call:sfu:leave", ({ roomId }, cb) => {
    try {
      leaveRoom(roomId);
      cb?.({ success: true });
    } catch (err) {
      cb?.({ error: err.message });
    }
  });

  /* ================= DISCONNECT ================= */
  socket.on("disconnect", (reason) => {
    console.log(`Socket ${socket.id} disconnected: ${reason}`);
    cleanupSocket();
  });

  /* ================= CLEANUP FUNCTIONS ================= */
  function cleanupTransport(transportId) {
    const transportData = socketResources.transports.get(transportId);
    if (!transportData) return;

    // Close the transport
    safeClose(transportData.transport);

    // Remove from room
    const room = callRooms.get(transportData.roomId);
    if (room) {
      room.transports.delete(transportId);
    }

    // Remove from socket resources
    socketResources.transports.delete(transportId);
  }

  function cleanupProducer(producerId) {
    const producerData = socketResources.producers.get(producerId);
    if (!producerData) return;

    // Notify peers that producer is gone
    const room = callRooms.get(producerData.roomId);
    if (room) {
      socket.to(`call:${producerData.roomId}`).emit("call:sfu:producerClosed", {
        producerId,
        peerId: socket.id,
      });
      room.producers.delete(producerId);
    }

    safeClose(producerData.producer);
    socketResources.producers.delete(producerId);
  }

  function cleanupConsumer(consumerId) {
    const consumerData = socketResources.consumers.get(consumerId);
    if (!consumerData) return;

    const room = callRooms.get(consumerData.roomId);
    if (room) {
      room.consumers.delete(consumerId);
    }

    safeClose(consumerData.consumer);
    socketResources.consumers.delete(consumerId);
  }

  function leaveRoom(roomId) {
    const room = callRooms.get(roomId);
    if (!room) return;

    // Leave socket room
    socket.leave(`call:${roomId}`);
    socketResources.rooms.delete(roomId);

    // Remove peer from room
    room.peers.delete(socket.id);

    // Clean up this socket's producers in this room
    for (const [producerId, producerData] of socketResources.producers.entries()) {
      if (producerData.roomId === roomId) {
        cleanupProducer(producerId);
      }
    }

    // Clean up this socket's consumers in this room
    for (const [consumerId, consumerData] of socketResources.consumers.entries()) {
      if (consumerData.roomId === roomId) {
        cleanupConsumer(consumerId);
      }
    }

    // Clean up this socket's transports in this room
    for (const [transportId, transportData] of socketResources.transports.entries()) {
      if (transportData.roomId === roomId) {
        cleanupTransport(transportId);
      }
    }

    // Clean up empty room
    if (room.peers.size === 0) {
      console.log(`Cleaning up empty room: ${roomId}`);
      
      // Close all remaining room resources
      for (const [, transportData] of room.transports) {
        safeClose(transportData.transport);
      }
      for (const [, producerData] of room.producers) {
        safeClose(producerData.producer);
      }
      for (const [, consumerData] of room.consumers) {
        safeClose(consumerData.consumer);
      }
      
      safeClose(room.router);
      callRooms.delete(roomId);
    }
  }

  function cleanupSocket() {
    // Leave all rooms
    for (const roomId of socketResources.rooms) {
      leaveRoom(roomId);
    }

    // Clean up any remaining resources (should be empty after leaveRoom)
    for (const [transportId] of socketResources.transports) {
      cleanupTransport(transportId);
    }
    for (const [producerId] of socketResources.producers) {
      cleanupProducer(producerId);
    }
    for (const [consumerId] of socketResources.consumers) {
      cleanupConsumer(consumerId);
    }

    socketResources.rooms.clear();
    socketResources.transports.clear();
    socketResources.producers.clear();
    socketResources.consumers.clear();
  }
}

/* ================= CREATE ROOM ================= */
async function createRoom(roomId) {
  const router = await global.mediasoupWorker.createRouter({
    mediaCodecs: [
      { 
        kind: "audio", 
        mimeType: "audio/opus", 
        clockRate: 48000, 
        channels: 2,
        parameters: {
          minptime: 10,
          useinbandfec: 1,
        }
      },
      { 
        kind: "video", 
        mimeType: "video/VP8", 
        clockRate: 90000,
        parameters: {
          "x-google-start-bitrate": 1000,
        }
      },
    ],
  });

  return {
    roomId,
    router,
    peers: new Map(),
    transports: new Map(),   // transportId -> transportData
    producers: new Map(),    // producerId -> producerData
    consumers: new Map(),    // consumerId -> consumerData
    createdAt: Date.now(),
  };
}

/* ================= HEALTH CHECK (optional) ================= */
export function startRoomCleanup(intervalMs = 60000) {
  setInterval(() => {
    const now = Date.now();
    for (const [roomId, room] of callRooms.entries()) {
      // Clean up rooms with no peers for > 5 minutes
      if (room.peers.size === 0 && (now - room.createdAt) > 300000) {
        console.log(`Cleaning up stale room: ${roomId}`);
        
        for (const [, transportData] of room.transports) {
          safeClose(transportData.transport);
        }
        for (const [, producerData] of room.producers) {
          safeClose(producerData.producer);
        }
        for (const [, consumerData] of room.consumers) {
          safeClose(consumerData.consumer);
        }
        
        safeClose(room.router);
        callRooms.delete(roomId);
      }
    }
  }, intervalMs);
}