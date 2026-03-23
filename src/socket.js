// src/socket.js
import { io } from "socket.io-client";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://addisgo-production-63ae.up.railway.app";

const socket = io(API_URL, {
  transports: ["websocket", "polling"],
  withCredentials: true,
  autoConnect: true,
  auth: {
    token: localStorage.getItem("token") || "",
  },
});

export function refreshSocketAuth() {
  socket.auth = {
    token: localStorage.getItem("token") || "",
  };

  if (!socket.connected) {
    socket.connect();
  }
}

export default socket;