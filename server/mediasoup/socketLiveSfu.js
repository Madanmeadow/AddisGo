// server/mediasoup/socketLiveSfu.js

const rooms = new Map(); // liveId -> room

export function registerLiveSfuHandlers(io, socket) {

  /* ================= JOIN ================= */
  socket.on("sfu:join", async ({ liveId, role }, cb) => {
    if (!liveId) return cb({ error: "liveId required" });

    let room = rooms.get(liveId);
    if (!room) {
      room = await createRoom(liveId);
      rooms.set(liveId, room);
      io.emit("live-list", Array.from(rooms.keys()));
    }

    socket.join(`live:${liveId}`);

    room.peers.set(socket.id, { role });

    cb({ rtpCapabilities: room.router.rtpCapabilities });

    // send existing producers
    socket.emit("sfu:getProducers", Array.from(room.producers.keys()));
  });

  /* ================= CREATE TRANSPORT ================= */
  socket.on("sfu:createTransport", async ({ liveId }, cb) => {
    const room = rooms.get(liveId);
    if (!room) return;

    const transport = await room.router.createWebRtcTransport({
      listenIps: [
        {
          ip: "0.0.0.0",
          announcedIp: process.env.MEDIASOUP_ANNOUNCED_IP || null,
        },
      ],
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
    });

    room.transports.set(socket.id, transport);

    cb({
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
    });
  });

  /* ================= CONNECT TRANSPORT ================= */
  socket.on("sfu:connectTransport", async ({ liveId, dtlsParameters }) => {
    const room = rooms.get(liveId);
    if (!room) return;

    const transport = room.transports.get(socket.id);
    if (!transport) return;

    await transport.connect({ dtlsParameters });
  });

  /* ================= PRODUCE ================= */
  socket.on("sfu:produce", async ({ liveId, kind, rtpParameters }, cb) => {
    const room = rooms.get(liveId);
    if (!room) return;

    const transport = room.transports.get(socket.id);
    if (!transport) return;

    const producer = await transport.produce({ kind, rtpParameters });

    room.producers.set(producer.id, producer);

    cb({ id: producer.id });

    socket.to(`live:${liveId}`).emit("sfu:newProducer", {
      producerId: producer.id,
    });
  });

  /* ================= CONSUME ================= */
  socket.on(
    "sfu:consume",
    async ({ liveId, producerId, rtpCapabilities }, cb) => {
      const room = rooms.get(liveId);
      if (!room) return;

      const router = room.router;

      if (!router.canConsume({ producerId, rtpCapabilities })) {
        return cb({ error: "Cannot consume" });
      }

      const transport = room.transports.get(socket.id);
      if (!transport) return;

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
    }
  );

  /* ================= REQUEST SPEAK ================= */
  socket.on("sfu:requestSpeak", ({ liveId }) => {
    const room = rooms.get(liveId);
    if (!room) return;

    io.to(`live:${liveId}`).emit("sfu:speakerRequested", {
      socketId: socket.id,
    });
  });

  /* ================= DISCONNECT ================= */
  socket.on("disconnect", () => {
    for (const room of rooms.values()) {
      room.transports.delete(socket.id);
      room.peers.delete(socket.id);
    }
  });
}

/* ================= CREATE ROOM ================= */
async function createRoom(liveId) {
  const router = await global.mediasoupWorker.createRouter({
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
    liveId,
    router,
    peers: new Map(),
    transports: new Map(),
    producers: new Map(),
  };
}