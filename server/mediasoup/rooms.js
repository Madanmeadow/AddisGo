// server/mediasoup/rooms.js
import { getMediasoupWorker } from "./workers.js";
import { mediaCodecs, webRtcTransportOptions } from "./config.js";

const rooms = new Map();

function createPeerState({ socketId, userId, username, role }) {
  return {
    socketId: String(socketId),
    userId: String(userId || ""),
    username: username || "User",
    role: role || "audience",
    transports: new Map(), // transportId -> transport
    producers: new Map(),  // producerId -> producer
    consumers: new Map(),  // consumerId -> consumer
  };
}

export async function createOrGetRoom({ liveId, hostUserId, hostSocketId, hostUsername }) {
  const id = String(liveId);

  if (rooms.has(id)) return rooms.get(id);

  const worker = getMediasoupWorker();
  const router = await worker.createRouter({ mediaCodecs });

  const room = {
    liveId: id,
    hostUserId: String(hostUserId || ""),
    hostSocketId: String(hostSocketId),
    hostUsername: hostUsername || "Host",
    router,
    peers: new Map(),       // socketId -> peerState
    audience: new Set(),    // socketId
    guests: new Set(),      // socketId
    createdAt: Date.now(),
  };

  room.peers.set(
    String(hostSocketId),
    createPeerState({
      socketId: hostSocketId,
      userId: hostUserId,
      username: hostUsername,
      role: "host",
    })
  );

  rooms.set(id, room);
  return room;
}

export function getRoom(liveId) {
  return rooms.get(String(liveId)) || null;
}

export function hasRoom(liveId) {
  return rooms.has(String(liveId));
}

export function listRooms() {
  return Array.from(rooms.values()).map((room) => ({
    liveId: room.liveId,
    hostUserId: room.hostUserId,
    hostUsername: room.hostUsername,
    audienceCount: room.audience.size,
    guestCount: room.guests.size,
    createdAt: room.createdAt,
  }));
}

export function ensurePeer(room, { socketId, userId, username, role = "audience" }) {
  const sid = String(socketId);
  if (!room.peers.has(sid)) {
    room.peers.set(
      sid,
      createPeerState({
        socketId: sid,
        userId,
        username,
        role,
      })
    );
  }
  return room.peers.get(sid);
}

export function getPeer(room, socketId) {
  return room?.peers.get(String(socketId)) || null;
}

export async function createWebRtcTransport(room) {
  const transport = await room.router.createWebRtcTransport(webRtcTransportOptions);

  await transport.setMaxIncomingBitrate?.(1_500_000).catch(() => {});

  return transport;
}

export function closePeer(room, socketId) {
  const sid = String(socketId);
  const peer = room?.peers.get(sid);
  if (!peer) return;

  for (const transport of peer.transports.values()) {
    try { transport.close(); } catch {}
  }
  for (const producer of peer.producers.values()) {
    try { producer.close(); } catch {}
  }
  for (const consumer of peer.consumers.values()) {
    try { consumer.close(); } catch {}
  }

  room.peers.delete(sid);
  room.audience.delete(sid);
  room.guests.delete(sid);
}

export function deleteRoom(liveId) {
  const id = String(liveId);
  const room = rooms.get(id);
  if (!room) return;

  for (const socketId of Array.from(room.peers.keys())) {
    closePeer(room, socketId);
  }

  try {
    room.router.close();
  } catch {}

  rooms.delete(id);
}

export function getAllProducerSummaries(room, exceptSocketId = null) {
  const list = [];
  for (const [sid, peer] of room.peers.entries()) {
    if (exceptSocketId && String(sid) === String(exceptSocketId)) continue;

    for (const [producerId, producer] of peer.producers.entries()) {
      list.push({
        producerId,
        socketId: sid,
        userId: peer.userId,
        username: peer.username,
        role: peer.role,
        kind: producer.kind,
        appData: producer.appData || {},
      });
    }
  }
  return list;
}