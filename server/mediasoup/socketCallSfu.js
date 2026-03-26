// server/mediasoup/socketCallSfu.js

const callRooms = new Map(); // roomId -> room

export function registerCallSfuHandlers(io, socket) {

  socket.on("call:sfu:join", async ({ roomId }, cb) => {
    if (!roomId) return;

    let room = callRooms.get(roomId);

    if (!room) {
      room = await createRoom(roomId);
      callRooms.set(roomId, room);
    }

    socket.join(`call:${roomId}`);
    room.peers.set(socket.id, {});

    cb({ rtpCapabilities: room.router.rtpCapabilities });
  });

  /* CREATE TRANSPORT */
  socket.on("call:sfu:createTransport", async ({ roomId }, cb) => {
    const room = callRooms.get(roomId);
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

  socket.on("call:sfu:connectTransport", async ({ roomId, dtlsParameters }) => {
    const room = callRooms.get(roomId);
    if (!room) return;

    const transport = room.transports.get(socket.id);
    if (!transport) return;

    await transport.connect({ dtlsParameters });
  });

  socket.on("call:sfu:produce", async ({ roomId, kind, rtpParameters }, cb) => {
    const room = callRooms.get(roomId);
    if (!room) return;

    const transport = room.transports.get(socket.id);
    const producer = await transport.produce({ kind, rtpParameters });

    room.producers.set(producer.id, producer);

    cb({ id: producer.id });

    socket.to(`call:${roomId}`).emit("call:sfu:newProducer", {
      producerId: producer.id,
    });
  });

  socket.on(
    "call:sfu:consume",
    async ({ roomId, producerId, rtpCapabilities }, cb) => {
      const room = callRooms.get(roomId);
      if (!room) return;

      if (!room.router.canConsume({ producerId, rtpCapabilities })) {
        return cb({ error: "cannot consume" });
      }

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
    }
  );

  socket.on("disconnect", () => {
    for (const room of callRooms.values()) {
      room.peers.delete(socket.id);
      room.transports.delete(socket.id);
    }
  });
}

/* CREATE ROOM */
async function createRoom(roomId) {
  const router = await global.mediasoupWorker.createRouter({
    mediaCodecs: [
      { kind: "audio", mimeType: "audio/opus", clockRate: 48000, channels: 2 },
      { kind: "video", mimeType: "video/VP8", clockRate: 90000 },
    ],
  });

  return {
    roomId,
    router,
    peers: new Map(),
    transports: new Map(),
    producers: new Map(),
  };
}