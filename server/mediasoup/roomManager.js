// server/mediasoup/roomManager.js

const rooms = new Map();

export function hasRoom(liveId) {
  return rooms.has(String(liveId));
}

export function getRoom(liveId) {
  return rooms.get(String(liveId));
}

export function addRoom(room) {
  rooms.set(String(room.liveId), room);
}

export function removeRoom(liveId) {
  rooms.delete(String(liveId));
}

export function getRooms() {
  return Array.from(rooms.values());
}

export function getRoomIds() {
  return Array.from(rooms.keys());
}