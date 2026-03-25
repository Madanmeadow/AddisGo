// src/socket.js
import { io } from "socket.io-client";

const API_URL =
  (import.meta.env.VITE_API_URL ||
    "https://addisgo-production-63ae.up.railway.app").replace(/\/$/, "");

const socket = io(API_URL, {
  transports: ["websocket", "polling"],
  withCredentials: true,
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 800,
  reconnectionDelayMax: 4000,
  timeout: 15000,
  auth: {
    token: localStorage.getItem("token") || "",
  },
});

let pulseSocketBound = false;

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
}

export function refreshSocketAuth(forceReconnect = false) {
  socket.auth = {
    token: localStorage.getItem("token") || "",
  };

  if (forceReconnect && socket.connected) {
    socket.disconnect();
  }

  if (!socket.connected) {
    socket.connect();
  }
}

export function ensurePulseSocket() {
  if (pulseSocketBound) return socket;
  pulseSocketBound = true;

  socket.on("connect", () => {
    const me = getStoredUser();
    const userId = String(me?.id || "").trim();
    const username = me?.username || me?.name || `User${userId || ""}`;

    if (userId) {
      socket.emit("user:online", { userId, username });
    }
  });

  socket.on("disconnect", () => {
    // no-op, reconnection handles recovery
  });

  socket.io.on("reconnect", () => {
    const me = getStoredUser();
    const userId = String(me?.id || "").trim();
    const username = me?.username || me?.name || `User${userId || ""}`;

    if (userId) {
      socket.emit("user:online", { userId, username });
    }
  });

  return socket;
}

export function cleanupPulseSocket() {
  pulseSocketBound = false;
  try {
    socket.removeAllListeners("connect");
    socket.removeAllListeners("disconnect");
  } catch {}
}

export default socket;