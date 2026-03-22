// src/socket.js
import { io } from "socket.io-client";

const apiBase = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");
const token = localStorage.getItem("token") || "";

const socket = io(apiBase, {
  transports: ["websocket"],
  autoConnect: true,
  auth: { token },
});

export default socket;