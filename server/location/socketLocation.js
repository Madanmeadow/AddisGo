// server/location/socketLocation.js
import {
  updateLocation,
  removeLocation,
  getAllWithDistances,
} from "./locationManager.js";

export function registerLocationHandlers(io, socket) {
  socket.on("location:update", (data = {}) => {
    const user = socket.data.user;
    if (!user) {
      console.log("❌ location:update — no user on socket");
      return socket.emit("location:error", "Not authenticated");
    }

    const lat = Number(data.latitude);
    const lng = Number(data.longitude);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return socket.emit("location:error", "Invalid coordinates");
    }

    updateLocation({
      userId: user.id,
      username: user.username,
      latitude: lat,
      longitude: lng,
      accuracy: Number(data.accuracy || 0),
    });

    console.log("📍 Stored location for", user.username, { lat, lng });

    // Send back to THIS user
    const distances = getAllWithDistances(user.id);
    console.log("📍 Emitting location:nearby to", user.username, "with", distances.length, "users");
    socket.emit("location:nearby", distances);

    // NEW: broadcast to ALL online users so their distances refresh too
    for (const [uid, sockId] of io.sockets.adapter.rooms.get(`user:${user.id}`)?.entries() || []) {
      // Actually, we need to emit to every socket that has a stored location
    }
  });

  socket.on("presence:get", () => {
    const user = socket.data.user;
    if (!user) return;

    const distances = getAllWithDistances(user.id);
    socket.emit("location:nearby", distances);
  });

  socket.on("disconnect", () => {
    const user = socket.data.user;
    if (user) {
      console.log("📍 Removing location for:", user.username);
      removeLocation(user.id);
    }
  });
}