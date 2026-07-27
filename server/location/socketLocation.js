// server/location/socketLocation.js
import {
  updateLocation,
  removeLocation,
  getNearbyLocations,
  getAllLocations,
  getAllWithDistances,
} from "./locationManager.js";

export function registerLocationHandlers(io, socket) {
  socket.on("location:update", (data = {}) => {
    const user = socket.data.user;
    if (!user) {
      console.log("❌ No user on socket");
      return;
    }

    updateLocation({
      userId: user.id,
      username: user.username,
      latitude: Number(data.latitude),
      longitude: Number(data.longitude),
      accuracy: Number(data.accuracy || 0),
    });

    // Send distances back immediately so UI updates
    const withDistances = getAllWithDistances(user.id);
    socket.emit("location:nearby", withDistances);
  });

  // NEW: frontend asks for distances explicitly
  socket.on("presence:get", () => {
    const user = socket.data.user;
    if (!user) return;

    const withDistances = getAllWithDistances(user.id);
    socket.emit("location:nearby", withDistances);
  });

  socket.on("disconnect", () => {
    const user = socket.data.user;
    if (user) {
      console.log("📍 Removing location for:", user.username);
      removeLocation(user.id);
    }
  });
}