import { io } from "socket.io-client";
import { BUILD_ID } from "../config/build";
import { toast } from "../lib/toast";

const apiUrl = import.meta.env.VITE_API_URL;

export function createSocket() {
  const s = io(apiUrl, {
    transports: ["websocket", "polling"],
    query: { v: BUILD_ID }, // ✅ stops stale handshake issues
    reconnection: true,
    reconnectionAttempts: 8,
    reconnectionDelayMax: 2000,
  });

  s.on("connect_error", () => {
    toast.error("Socket connection failed. Retrying…");
  });

  return s;
}