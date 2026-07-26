// src/composables/useLocation.js

import { ref } from "vue";
import socket from "../socket";

export const latitude = ref(null);
export const longitude = ref(null);
export const accuracy = ref(null);
export const heading = ref(null);
export const speed = ref(null);
export const lastUpdated = ref(null);
export const locationEnabled = ref(false);

let watchId = null;

export function startLocation() {
  if (!("geolocation" in navigator)) {
    console.warn("Geolocation is not supported.");
    return;
  }

  if (watchId !== null) {
    console.log("📍 Location watcher already running");
    return;
  }

  console.log("📍 Starting location service...");

  watchId = navigator.geolocation.watchPosition(
    (position) => {
      latitude.value = position.coords.latitude;
      longitude.value = position.coords.longitude;
      accuracy.value = position.coords.accuracy;
      heading.value = position.coords.heading;
      speed.value = position.coords.speed;
      lastUpdated.value = new Date();
      locationEnabled.value = true;

      console.log("📍 GPS UPDATE");
      console.log("Latitude:", latitude.value);
      console.log("Longitude:", longitude.value);
      console.log("Accuracy:", accuracy.value);

      socket.emit("location:update", {
        latitude: latitude.value,
        longitude: longitude.value,
        accuracy: accuracy.value,
        heading: heading.value,
        speed: speed.value,
        timestamp: Date.now(),
      });
    },

    (error) => {
      locationEnabled.value = false;

      console.error("📍 Location Error:", error);

      switch (error.code) {
        case error.PERMISSION_DENIED:
          console.warn("User denied location permission.");
          break;

        case error.POSITION_UNAVAILABLE:
          console.warn("Location unavailable.");
          break;

        case error.TIMEOUT:
          console.warn("Location request timed out.");
          break;

        default:
          console.warn("Unknown location error.");
      }
    },

    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 10000,
    }
  );
}

export function stopLocation() {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;

    console.log("📍 Location watcher stopped");
  }
}

export function getCurrentLocation() {
  return {
    latitude: latitude.value,
    longitude: longitude.value,
    accuracy: accuracy.value,
    heading: heading.value,
    speed: speed.value,
    lastUpdated: lastUpdated.value,
    enabled: locationEnabled.value,
  };
}