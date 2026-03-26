// server/mediasoup/socketLiveSfu.js (enhanced)
export function registerLiveSfuHandlers(io, socket) {
  const rooms = new Map(); // liveId -> room

  /* ====================== JOIN ====================== */
  socket.on("sfu:join", async ({ liveId, role }, cb) => {
    if (!liveId) return cb({ error: "liveId required" });

    let room = rooms.get(liveId);
    if (!room) {
      room = await createRoom(liveId);
      rooms.set(liveId, room);
      io.emit("live-list", Array.from(rooms.keys()));
    }

    socket.join(`live:${liveId}`);
    room.peers.set(socket.id, { role, micOn: role === "speaker" });

    cb({ rtpCapabilities: room.router.rtpCapabilities });

    // send existing producers for grid
    const producers = Array.from(room.producers.keys());
    socket.emit("sfu:getProducers", producers);
  });

  /* ====================== SPEAKER REQUEST ====================== */
  socket.on("sfu:requestSpeak", ({ liveId }) => {
    const room = rooms.get(liveId);
    if (!room) return;

    const hostSocketId = room.hostSocketId;
    if (!hostSocketId) return;

    const req = { socketId: socket.id, userId: socket.data.user?.id };
    if (!room.speakerRequests) room.speakerRequests = new Map();
    room.speakerRequests.set(socket.id, req);

    // notify host
    io.to(hostSocketId).emit("sfu:speakerRequested", req);
  });

  socket.on("sfu:approveSpeaker", ({ liveId, socketId }) => {
    const room = rooms.get(liveId);
    if (!room) return;
    if (!room.peers.has(socketId)) return;

    const peer = room.peers.get(socketId);
    peer.role = "speaker";
    peer.micOn = true;

    room.peers.set(socketId, peer);
    io.to(socketId).emit("sfu:approvedSpeaker", { liveId });

    // broadcast new grid update
    io.to(`live:${liveId}`).emit("sfu:gridUpdate", Array.from(room.peers.values()));
  });

  /* ====================== PRODUCE ====================== */
  socket.on("sfu:produce", async ({ liveId, kind, rtpParameters }, cb) => {
    const room = rooms.get(liveId);
    if (!room) return;

    const transport = room.transports.get(socket.id);
    const producer = await transport.produce({ kind, rtpParameters });

    room.producers.set(producer.id, producer);
    cb({ id: producer.id });

    // notify all for new grid
    socket.to(`live:${liveId}`).emit("sfu:newProducer", { producerId: producer.id });
  });

  /* ====================== RECORDING ====================== */
  socket.on("sfu:startRecording", ({ liveId }) => {
    const room = rooms.get(liveId);
    if (!room) return;

    // setup recording logic (external FFmpeg or mediasoup recording)
    // just flag for now
    room.recording = true;
    io.to(`live:${liveId}`).emit("sfu:recordingStarted", { liveId });
  });

  socket.on("sfu:stopRecording", ({ liveId }) => {
    const room = rooms.get(liveId);
    if (!room) return;

    room.recording = false;
    io.to(`live:${liveId}`).emit("sfu:recordingStopped", { liveId });
  });

  /* ====================== DISCONNECT ====================== */
  socket.on("disconnect", () => {
    for (const room of rooms.values()) {
      room.transports.delete(socket.id);
      room.peers.delete(socket.id);
      if (room.speakerRequests) room.speakerRequests.delete(socket.id);
    }
  });
}

/* ====================== CREATE ROOM ====================== */
async function createRoom(liveId) {
  const router = await global.mediasoupWorker.createRouter({
    mediaCodecs: [
      { kind: "audio", mimeType: "audio/opus", clockRate: 48000, channels: 2 },
      { kind: "video", mimeType: "video/VP8", clockRate: 90000 },
    ],
  });

  return {
    liveId,
    router,
    peers: new Map(),
    transports: new Map(),
    producers: new Map(),
    hostSocketId: null,
    speakerRequests: new Map(),
    recording: false,
  };
}