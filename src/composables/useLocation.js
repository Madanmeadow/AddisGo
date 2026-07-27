// src/composables/useLocation.js
import { ref, computed } from "vue";

const coords = ref(null);
const status = ref("idle"); // idle | active | error | unsupported | denied
const hasLocation = computed(() => !!coords.value);

let currentSocket = null;
let watchId = null;

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

function emitLocation(socket, pos) {
  const { latitude, longitude, accuracy } = pos.coords;
  coords.value = { lat: latitude, lng: longitude, accuracy };
  status.value = "active";

  if (socket?.connected) {
    console.log("[location] emitting location:update", { latitude, longitude });
    socket.emit("location:update", { latitude, longitude, accuracy });
  }
}

function onErr(err) {
  console.error("[location] Geolocation error:", err.code, err.message);
  if (err.code === 1) status.value = "denied";
  else if (err.code === 2) status.value = "error";
  else status.value = "error";
}

export function startLocation({ socket, userId, autoWatch = true }) {
  if (!navigator.geolocation) {
    status.value = "unsupported";
    console.warn("[location] Geolocation not supported");
    return;
  }

  currentSocket = socket;

  const options = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 60000,
  };

  // Immediate attempt
  navigator.geolocation.getCurrentPosition(
    (pos) => emitLocation(socket, pos),
    onErr,
    options
  );

  if (autoWatch) {
    watchId = navigator.geolocation.watchPosition(
      (pos) => emitLocation(socket, pos),
      onErr,
      options
    );
  }
}

export function sendLocationNow(socket) {
  if (!navigator.geolocation) {
    status.value = "unsupported";
    return;
  }
  currentSocket = socket;
  navigator.geolocation.getCurrentPosition(
    (pos) => emitLocation(socket, pos),
    onErr,
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

export function stopLocation() {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
}