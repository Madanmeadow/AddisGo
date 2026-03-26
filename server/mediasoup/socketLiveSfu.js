// server/mediasoup/socketLiveSfu.js

import * as mediasoup from "mediasoup";

const rooms = new Map(); // liveId -> room

export function registerLiveSfuHandlers(io, socket) {
  socket.on("sfu:join", async ({ liveId, role }, cb) => {
    try {
      if (!liveId) return cb({ error: "liveId required" });

      let room = rooms.get(liveId);

      if (!room) {
        room = await createRoom();
        rooms.set(liveId, room);

        // 🔥 IMPORTANT: make it visible globally
        io.emit("live-list", Array.from(rooms.keys()));
      }

      const peer = await createPeer(room, socket, role);

      socket.join(`live:${liveId}`);

      cb({
        rtpCapabilities: room.router.rtpCapabilities,
        peerId: peer.id,
      });
    } catch (err) {
      console.error("SFU JOIN ERROR:", err);
      cb({ error: err.message });
    }
  });

  socket.on("sfu:createTransport", async ({ liveId }, cb) => {
    const room = rooms.get(liveId);
    if (!room) return cb({ error: "room not found" });

    const transport = await room.router.createWebRtcTransport({
      listenIps: [{ ip: "0.0.0.0", announcedIp: process.env.PUBLIC_IP }],
      enableUdp: true,
      enableTcp: true,
    });

    room.transports.set(socket.id, transport);

    cb({
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
    });
  });

  socket.on("sfu:connectTransport", async ({ transportId, dtlsParameters }) => {
    const room = findRoomByTransport(transportId);
    if (!room) return;

    const transport = room.transports.get(socket.id);
    await transport.connect({ dtlsParameters });
  });

  socket.on("sfu:produce", async ({ kind, rtpParameters }, cb) => {
    const room = findRoomBySocket(socket.id);
    if (!room) return;

    const transport = room.transports.get(socket.id);
    const producer = await transport.produce({ kind, rtpParameters });

    room.producers.set(socket.id, producer);

    // 🔥 notify others
    socket.to(room.id).emit("sfu:newProducer", {
      producerId: producer.id,
      socketId: socket.id,
    });

    cb({ id: producer.id });
  });

  socket.on("sfu:consume", async ({ producerId, rtpCapabilities }, cb) => {
    const room = findRoomByProducer(producerId);
    if (!room) return cb({ error: "room not found" });

    const transport = room.transports.get(socket.id);

    const consumer = await transport.consume({
      producerId,
      rtpCapabilities,
      paused: false,
    });

    cb({
      id: consumer.id,
      producerId,
      kind: consumer.kind,
      rtpParameters: consumer.rtpParameters,
    });
  });

  socket.on("disconnect", () => {
    for (const room of rooms.values()) {
      room.transports.delete(socket.id);
      room.producers.delete(socket.id);
    }
  });
}

/* ================= helpers ================= */

async function createRoom() {
  const worker = global.mediasoupWorker;

  const router = await worker.createRouter({
    mediaCodecs: [
      {
        kind: "audio",
        mimeType: "audio/opus",
        clockRate: 48000,
        channels: 2,
      },
      {
        kind: "video",
        mimeType: "video/VP8",
        clockRate: 90000,
      },
    ],
  });

  return {
    id: `room-${Date.now()}`,
    router,
    transports: new Map(),
    producers: new Map(),
  };
}

async function createPeer(room, socket, role) {
  return {
    id: socket.id,
    role,
  };
}

function findRoomBySocket(socketId) {
  for (const room of rooms.values()) {
    if (room.transports.has(socketId)) return room;
  }
}

function findRoomByTransport(transportId) {
  for (const room of rooms.values()) {
    for (const t of room.transports.values()) {
      if (t.id === transportId) return room;
    }
  }
}

function findRoomByProducer(producerId) {
  for (const room of rooms.values()) {
    for (const p of room.producers.values()) {
      if (p.id === producerId) return room;
    }
  }
}