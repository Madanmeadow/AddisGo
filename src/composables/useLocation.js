// src/composables/useLocation.js
import { ref, computed } from "vue";

const coords = ref(null);
const status = ref("idle");
const hasLocation = computed(() => !!coords.value);

export function useLocation() {
  return {
    coords,
    status,
    hasLocation,
    isApproximate: ref(false),
    locationLabel: ref(""),
    computeDistances: (users) => users,
    sortByDistance: (users) => users,
  };
}

export function startLocation({ socket, userId, autoWatch = true }) {
  if (!navigator.geolocation) {
    status.value = "unsupported";
    console.warn("[location] Geolocation not supported");
    return;
  }

  const options = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 60000,
  };

  function send(pos) {
    const { latitude, longitude, accuracy } = pos.coords;
    coords.value = { lat: latitude, lng: longitude, accuracy };
    status.value = "active";

    if (socket?.connected) {
      console.log("[location] emitting location:update", { latitude, longitude });
      socket.emit("location:update", { latitude, longitude, accuracy });
    }
  }

  function onErr(err) {
    console.error("[location] Geolocation error:", err.message, err.code);
    status.value = "error";
  }

  navigator.geolocation.getCurrentPosition(send, onErr, options);

  if (autoWatch) {
    const watchId = navigator.geolocation.watchPosition(send, onErr, options);
    const cleanup = () => {
      navigator.geolocation.clearWatch(watchId);
      socket?.off("disconnect", cleanup);
    };
    socket?.on("disconnect", cleanup);
  }
}