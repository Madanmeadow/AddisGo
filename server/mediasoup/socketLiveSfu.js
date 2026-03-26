// server/mediasoup/socketLiveSfu.js
import {
  createOrGetRoom,
  getRoom,
  hasRoom,
  ensurePeer,
  getPeer,
  createWebRtcTransport,
  closePeer,
  deleteRoom,
  getAllProducerSummaries,
} from "./rooms.js";

function safeAck(ack, payload) {
  if (typeof ack === "function") ack(payload);
}

function getUserFromSocket(socket) {
  const u = socket.data?.user || {};
  return {
    userId: String(u.id || socket.userId || ""),
    username: u.username || socket.username || "User",
  };
}

function emitRoomPresence(io, room) {
  io.to(`sfu:${room.liveId}`).emit("sfu:live:presence", {
    liveId: room.liveId,
    audienceCount: room.audience.size,
    guestCount: room.guests.size,
    peerCount: room.peers.size,
    hostUserId: room.hostUserId,
    hostUsername: room.hostUsername,
  });
}

export function registerLiveSfuHandlers(io, socket) {
  socket.on("sfu:live:create", async ({ liveId, title } = {}, ack) => {
    try {
      const id = String(liveId || "").trim();
      if (!id) return safeAck(ack, { ok: false, error: "liveId required" });

      const { userId, username } = getUserFromSocket(socket);

      const room = await createOrGetRoom({
        liveId: id,
        hostUserId: userId,
        hostSocketId: socket.id,
        hostUsername: username,
      });

      socket.join(`sfu:${id}`);

      safeAck(ack, {
        ok: true,
        liveId: room.liveId,
        role: "host",
        title: title || "Pulse Live",
      });

      emitRoomPresence(io, room);
      console.log("[SFU CREATE]", room.liveId, "host:", socket.id);
    } catch (err) {
      console.error("[SFU CREATE ERROR]", err);
      safeAck(ack, { ok: false, error: err.message || "Failed to create SFU live" });
    }
  });

  socket.on("sfu:live:join", async ({ liveId } = {}, ack) => {
    try {
      const id = String(liveId || "").trim();
      if (!id) return safeAck(ack, { ok: false, error: "liveId required" });
      if (!hasRoom(id)) return safeAck(ack, { ok: false, error: "Live not found" });

      const room = getRoom(id);
      const { userId, username } = getUserFromSocket(socket);

      socket.join(`sfu:${id}`);

      const peer = ensurePeer(room, {
        socketId: socket.id,
        userId,
        username,
        role: "audience",
      });

      if (peer.role !== "host" && peer.role !== "guest") {
        room.audience.add(socket.id);
      }

      safeAck(ack, {
        ok: true,
        liveId: room.liveId,
        role: peer.role,
        hostUserId: room.hostUserId,
        hostUsername: room.hostUsername,
      });

      io.to(`sfu:${id}`).emit("sfu:producerAdded:sync", {
        liveId: room.liveId,
        producers: getAllProducerSummaries(room, socket.id),
      });

      emitRoomPresence(io, room);
      console.log("[SFU JOIN]", room.liveId, "socket:", socket.id);
    } catch (err) {
      console.error("[SFU JOIN ERROR]", err);
      safeAck(ack, { ok: false, error: err.message || "Failed to join SFU live" });
    }
  });

  socket.on("sfu:getRouterRtpCapabilities", ({ liveId } = {}, ack) => {
    try {
      const room = getRoom(liveId);
      if (!room) return safeAck(ack, { ok: false, error: "Live not found" });

      safeAck(ack, {
        ok: true,
        rtpCapabilities: room.router.rtpCapabilities,
      });
    } catch (err) {
      console.error("[SFU RTP CAP ERROR]", err);
      safeAck(ack, { ok: false, error: err.message || "Failed to get RTP capabilities" });
    }
  });

  socket.on("sfu:createWebRtcTransport", async ({ liveId, direction } = {}, ack) => {
    try {
      const room = getRoom(liveId);
      if (!room) return safeAck(ack, { ok: false, error: "Live not found" });

      const { userId, username } = getUserFromSocket(socket);
      const peer = ensurePeer(room, {
        socketId: socket.id,
        userId,
        username,
        role: socket.id === room.hostSocketId ? "host" : "audience",
      });

      const transport = await createWebRtcTransport(room);
      peer.transports.set(transport.id, transport);

      transport.on("dtlsstatechange", (state) => {
        if (state === "closed") {
          try { transport.close(); } catch {}
          peer.transports.delete(transport.id);
        }
      });

      transport.on("close", () => {
        peer.transports.delete(transport.id);
      });

      safeAck(ack, {
        ok: true,
        transportOptions: {
          id: transport.id,
          iceParameters: transport.iceParameters,
          iceCandidates: transport.iceCandidates,
          dtlsParameters: transport.dtlsParameters,
          direction: direction || "send",
        },
      });
    } catch (err) {
      console.error("[SFU TRANSPORT CREATE ERROR]", err);
      safeAck(ack, { ok: false, error: err.message || "Failed to create transport" });
    }
  });

  socket.on(
    "sfu:connectWebRtcTransport",
    async ({ liveId, transportId, dtlsParameters } = {}, ack) => {
      try {
        const room = getRoom(liveId);
        if (!room) return safeAck(ack, { ok: false, error: "Live not found" });

        const peer = getPeer(room, socket.id);
        if (!peer) return safeAck(ack, { ok: false, error: "Peer not found" });

        const transport = peer.transports.get(String(transportId));
        if (!transport) return safeAck(ack, { ok: false, error: "Transport not found" });

        await transport.connect({ dtlsParameters });

        safeAck(ack, { ok: true });
      } catch (err) {
        console.error("[SFU TRANSPORT CONNECT ERROR]", err);
        safeAck(ack, { ok: false, error: err.message || "Failed to connect transport" });
      }
    }
  );

  socket.on(
    "sfu:produce",
    async ({ liveId, transportId, kind, rtpParameters, appData } = {}, ack) => {
      try {
        const room = getRoom(liveId);
        if (!room) return safeAck(ack, { ok: false, error: "Live not found" });

        const peer = getPeer(room, socket.id);
        if (!peer) return safeAck(ack, { ok: false, error: "Peer not found" });

        const transport = peer.transports.get(String(transportId));
        if (!transport) return safeAck(ack, { ok: false, error: "Transport not found" });

        const producer = await transport.produce({
          kind,
          rtpParameters,
          appData: {
            ...appData,
            socketId: socket.id,
            userId: peer.userId,
            username: peer.username,
            role: peer.role,
          },
        });

        peer.producers.set(producer.id, producer);

        producer.on("transportclose", () => {
          peer.producers.delete(producer.id);
        });

        producer.on("close", () => {
          peer.producers.delete(producer.id);
          io.to(`sfu:${room.liveId}`).emit("sfu:producerClosed", {
            liveId: room.liveId,
            producerId: producer.id,
            socketId: socket.id,
          });
        });

        io.to(`sfu:${room.liveId}`).emit("sfu:producerAdded", {
          liveId: room.liveId,
          producerId: producer.id,
          socketId: socket.id,
          userId: peer.userId,
          username: peer.username,
          role: peer.role,
          kind: producer.kind,
          appData: producer.appData || {},
        });

        safeAck(ack, {
          ok: true,
          producerId: producer.id,
        });
      } catch (err) {
        console.error("[SFU PRODUCE ERROR]", err);
        safeAck(ack, { ok: false, error: err.message || "Failed to produce" });
      }
    }
  );

  socket.on(
    "sfu:consume",
    async ({ liveId, transportId, producerId, rtpCapabilities } = {}, ack) => {
      try {
        const room = getRoom(liveId);
        if (!room) return safeAck(ack, { ok: false, error: "Live not found" });

        if (!room.router.canConsume({ producerId, rtpCapabilities })) {
          return safeAck(ack, { ok: false, error: "Cannot consume producer" });
        }

        const peer = getPeer(room, socket.id);
        if (!peer) return safeAck(ack, { ok: false, error: "Peer not found" });

        const transport = peer.transports.get(String(transportId));
        if (!transport) return safeAck(ack, { ok: false, error: "Transport not found" });

        const consumer = await transport.consume({
          producerId,
          rtpCapabilities,
          paused: true,
        });

        peer.consumers.set(consumer.id, consumer);

        consumer.on("transportclose", () => {
          peer.consumers.delete(consumer.id);
        });

        consumer.on("producerclose", () => {
          peer.consumers.delete(consumer.id);
          io.to(socket.id).emit("sfu:consumerClosed", {
            liveId: room.liveId,
            consumerId: consumer.id,
            producerId,
          });
        });

        safeAck(ack, {
          ok: true,
          consumerOptions: {
            id: consumer.id,
            producerId,
            kind: consumer.kind,
            rtpParameters: consumer.rtpParameters,
          },
        });
      } catch (err) {
        console.error("[SFU CONSUME ERROR]", err);
        safeAck(ack, { ok: false, error: err.message || "Failed to consume" });
      }
    }
  );

  socket.on("sfu:resumeConsumer", async ({ liveId, consumerId } = {}, ack) => {
    try {
      const room = getRoom(liveId);
      if (!room) return safeAck(ack, { ok: false, error: "Live not found" });

      const peer = getPeer(room, socket.id);
      if (!peer) return safeAck(ack, { ok: false, error: "Peer not found" });

      const consumer = peer.consumers.get(String(consumerId));
      if (!consumer) return safeAck(ack, { ok: false, error: "Consumer not found" });

      await consumer.resume();
      safeAck(ack, { ok: true });
    } catch (err) {
      console.error("[SFU RESUME ERROR]", err);
      safeAck(ack, { ok: false, error: err.message || "Failed to resume consumer" });
    }
  });

  socket.on("sfu:live:chat", ({ liveId, text } = {}) => {
    const room = getRoom(liveId);
    if (!room) return;

    const msg = String(text || "").trim();
    if (!msg) return;

    const { userId, username } = getUserFromSocket(socket);

    io.to(`sfu:${room.liveId}`).emit("sfu:live:chat", {
      liveId: room.liveId,
      text: msg,
      from: {
        userId,
        username,
      },
      at: new Date().toISOString(),
    });
  });

  socket.on("sfu:live:leave", ({ liveId } = {}, ack) => {
    try {
      const room = getRoom(liveId);
      if (!room) return safeAck(ack, { ok: true });

      socket.leave(`sfu:${room.liveId}`);
      closePeer(room, socket.id);

      if (socket.id === room.hostSocketId) {
        io.to(`sfu:${room.liveId}`).emit("sfu:live:ended", {
          liveId: room.liveId,
        });
        deleteRoom(room.liveId);
      } else {
        emitRoomPresence(io, room);
      }

      safeAck(ack, { ok: true });
    } catch (err) {
      console.error("[SFU LEAVE ERROR]", err);
      safeAck(ack, { ok: false, error: err.message || "Failed to leave live" });
    }
  });

  socket.on("sfu:live:end", ({ liveId } = {}, ack) => {
    try {
      const room = getRoom(liveId);
      if (!room) return safeAck(ack, { ok: true });

      if (socket.id !== room.hostSocketId) {
        return safeAck(ack, { ok: false, error: "Only host can end live" });
      }

      io.to(`sfu:${room.liveId}`).emit("sfu:live:ended", {
        liveId: room.liveId,
      });

      deleteRoom(room.liveId);
      safeAck(ack, { ok: true });
    } catch (err) {
      console.error("[SFU END ERROR]", err);
      safeAck(ack, { ok: false, error: err.message || "Failed to end live" });
    }
  });

  socket.on("disconnect", () => {
    const affected = [];

    // Find rooms this socket belongs to.
    // Room count is low initially, so linear scan is fine.
    for (const roomId of []) {
      void roomId;
    }

    // Safer simple cleanup:
    // scan known live ids from active socket rooms
    for (const roomName of socket.rooms || []) {
      if (typeof roomName === "string" && roomName.startsWith("sfu:")) {
        const liveId = roomName.replace(/^sfu:/, "");
        const room = getRoom(liveId);
        if (!room) continue;

        if (room.peers.has(socket.id)) {
          affected.push(room.liveId);

          if (socket.id === room.hostSocketId) {
            io.to(`sfu:${room.liveId}`).emit("sfu:live:ended", {
              liveId: room.liveId,
            });
            deleteRoom(room.liveId);
          } else {
            closePeer(room, socket.id);
          }
        }
      }
    }

    for (const liveId of affected) {
      const room = getRoom(liveId);
      if (room) emitRoomPresence(io, room);
    }
  });
}