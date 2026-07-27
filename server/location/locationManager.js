// server/location/locationManager.js
import { distanceMiles } from "./distance.js";

const locations = new Map();

export function updateLocation(user) {
  if (!user?.userId) return;
  locations.set(user.userId, { ...user, updatedAt: Date.now() });
}

export function removeLocation(userId) {
  locations.delete(userId);
}

export function getLocation(userId) {
  return locations.get(userId) || null;
}

export function getAllLocations() {
  return [...locations.values()];
}

export function getNearbyLocations(userId, maxMiles = 50) {
  const me = locations.get(userId);
  if (!me) return [];

  return [...locations.values()]
    .filter(
      (u) =>
        u.userId !== userId &&
        Number.isFinite(u.latitude) &&
        Number.isFinite(u.longitude)
    )
    .map((u) => ({
      ...u,
      distance: Number(
        distanceMiles(me.latitude, me.longitude, u.latitude, u.longitude).toFixed(
          1
        )
      ),
    }))
    .filter((u) => u.distance <= maxMiles)
    .sort((a, b) => a.distance - b.distance);
}

// NEW: return every user with a distance from me
export function getAllWithDistances(userId) {
  const me = locations.get(userId);
  if (!me) return [];

  return [...locations.values()]
    .filter(
      (u) =>
        u.userId !== userId &&
        Number.isFinite(u.latitude) &&
        Number.isFinite(u.longitude)
    )
    .map((u) => ({
      ...u,
      distance: Number(
        distanceMiles(me.latitude, me.longitude, u.latitude, u.longitude).toFixed(
          1
        )
      ),
    }))
    .sort((a, b) => a.distance - b.distance);
}