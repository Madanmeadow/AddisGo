// server/location/locationManager.js

const locations = new Map();

/*
Map structure

userId =>
{
    userId,
    username,
    latitude,
    longitude,
    accuracy,
    updatedAt
}
*/

export function updateLocation(user) {
    if (!user?.userId) return;

    locations.set(user.userId, {
        ...user,
        updatedAt: Date.now(),
    });
}

export function getLocation(userId) {
    return locations.get(userId) || null;
}

export function removeLocation(userId) {
    locations.delete(userId);
}

export function getAllLocations() {
    return [...locations.values()];
}

export function getNearbyLocations(latitude, longitude, radiusMiles = 25) {
    return [...locations.values()].filter((u) => {
        if (u.latitude == null || u.longitude == null) return false;

        const dx = latitude - u.latitude;
        const dy = longitude - u.longitude;

        // quick filter before exact calculation
        return Math.sqrt(dx * dx + dy * dy) < 1;
    });
}