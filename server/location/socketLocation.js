// server/location/socketLocation.js

import {
  updateLocation,
  removeLocation,
  getNearbyLocations,
  getAllLocations,
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

    const nearby = getNearbyLocations(user.id);

    console.log("📍 Nearby:", nearby);

    socket.emit("location:nearby", nearby);
  });

  socket.on("disconnect", () => {
    const user = socket.data.user;

    if (user) {
      console.log("📍 Removing location for:", user.username);

      removeLocation(user.id);
    }
  });
}