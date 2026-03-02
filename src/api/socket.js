// src/api/socket.js
import { io } from "socket.io-client";
import { BUILD_ID } from "../config/build";
import { toast } from "../lib/toast";

// ✅ must be your Railway backend URL in Vercel env
const apiUrl = (import.meta.env.VITE_API_URL || "").trim();

// ✅ small helper to avoid silent "undefined -> connects to Vercel" bug
function getSocketUrl() {
  if (!apiUrl) {
    console.error(
      "[AddisGo] VITE_API_URL is missing. Socket would connect to Vercel by default. Fix Vercel env."
    );
    return null;
  }
  return apiUrl.replace(/\/$/, ""); // remove trailing slash
}

export function createSocket() {
  const url = getSocketUrl();

  // If missing, create a socket anyway (so app doesn't crash),
  // but it will fail loudly and show a toast.
  const s = io(url || "/", {
    transports: ["websocket", "polling"],
    withCredentials: true,

    // ✅ IMPORTANT: send token so server can auto-register presence/calls reliably
    auth: {
      token: localStorage.getItem("token") || "",
    },

    query: { v: BUILD_ID }, // ✅ stops stale handshake issues
    reconnection: true,
    reconnectionAttempts: 8,
    reconnectionDelayMax: 20000,
  });

  s.on("connect", () => {
    console.log("[socket] connected:", s.id, "->", url || window.location.origin);
  });

  s.on("connect_error", (err) => {
    console.error("[socket] connect_error:", err?.message || err);
    toast.error("Socket connection failed. Check VITE_API_URL on Vercel.");
  });

  return s;
}