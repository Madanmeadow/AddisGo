// server/location/socketLocation.js

import {
  updateLocation,
  removeLocation,
  getNearbyLocations,
} from "./locationManager.js";

export function registerLocationHandlers(io, socket) {
  socket.on("location:update", (data = {}) => {
    const user = socket.data.user;

    if (!user) return;

    updateLocation({
      userId: user.id,
      username: user.username,
      latitude: Number(data.latitude),
      longitude: Number(data.longitude),
      accuracy: Number(data.accuracy || 0),
    });

    const nearby = getNearbyLocations(user.id);

    socket.emit("location:nearby", nearby);
  });

  socket.on("disconnect", () => {
    const user = socket.data.user;

    if (!user) return;

    removeLocation(user.id);
  });
}