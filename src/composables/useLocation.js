import { ref } from "vue";
import socket from "../socket";

export const latitude = ref(null);
export const longitude = ref(null);
export const accuracy = ref(null);

let watchId = null;

export function startLocation() {
  if (!navigator.geolocation) return;

  if (watchId !== null) return;

  watchId = navigator.geolocation.watchPosition(
    (pos) => {
      latitude.value = pos.coords.latitude;
      longitude.value = pos.coords.longitude;
      accuracy.value = pos.coords.accuracy;

      socket.emit("location:update", {
        latitude: latitude.value,
        longitude: longitude.value,
        accuracy: accuracy.value,
      });
    },
    (err) => {
      console.log("Location error", err);
    },
    {
      enableHighAccuracy: true,
      maximumAge: 10000,
      timeout: 15000,
    }
  );
}

export function stopLocation() {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
}