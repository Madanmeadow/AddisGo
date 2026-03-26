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