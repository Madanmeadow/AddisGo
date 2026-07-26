// server/location/socketLocation.js

import {
  updateLocation,
  removeLocation,
  getNearbyLocations,
  getAllLocations,
} from "./locationManager.js";

export function registerLocationHandlers(io, socket) {
  socket.on("location:update", (data = {}) => {
    const user = socket.data.user;

    if (!user) {
      console.log("❌ Location update ignored - socket has no authenticated user.");
      return;
    }

    updateLocation({
      userId: user.id,
      username: user.username,
      latitude: Number(data.latitude),
      longitude: Number(data.longitude),
      accuracy: Number(data.accuracy || 0),
    });

    // Debug
    console.log("📍 User updated location:", user.username);
    console.log("📍 All locations:", getAllLocations());

    // Send nearby users to every connected user
    for (const client of io.sockets.sockets.values()) {
      const otherUser = client.data.user;

      if (!otherUser) continue;

      const nearby = getNearbyLocations(otherUser.id);

      client.emit("location:nearby", nearby);
    }
  });

  socket.on("disconnect", () => {
    const user = socket.data.user;

    if (!user) return;

    removeLocation(user.id);

    console.log(`📍 ${user.username} disconnected`);

    // Refresh nearby users for everyone else
    for (const client of io.sockets.sockets.values()) {
      const otherUser = client.data.user;

      if (!otherUser) continue;

      client.emit(
        "location:nearby",
        getNearbyLocations(otherUser.id)
      );
    }
  });
}