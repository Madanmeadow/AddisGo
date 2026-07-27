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
    console.log("📍 location:update received");
    console.log("📍 socket.data.user =", socket.data.user);

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

    console.log("📍 All locations:", getAllLocations());

    // Send back ALL users with distances so the UI can show "mi away" for everyone
    const withDistances = getAllWithDistances(user.id);
    socket.emit("location:nearby", withDistances);
  });

  // NEW: let the frontend explicitly ask for distances
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