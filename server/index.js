// server/index.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { Server } from "socket.io";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import twilio from "twilio";

import { pool } from "./db.js";

// Routes (ESM default exports)
import postsRoutes from "./routes/posts.routes.js";
import usersRoutes from "./routes/users.routes.js";
import conversationsRoutes from "./routes/conversations.routes.js";
import messagesRoutes from "./routes/messages.routes.js";
import uploadRoutes from "./routes/upload.routes.js";

dotenv.config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;

// ✅ Put your Vercel frontends here
const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "http://localhost:3000",
  "https://addis-go.vercel.app",
  "https://addisgo.vercel.app",
].filter(Boolean);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      return cb(new Error("CORS blocked: " + origin));
    },
    credentials: true,
  })
);

app.get("/", (req, res) => {
  res.json({ ok: true, service: "AddisGo API + Socket" });
});

// Optional routes
// app.use("/auth", authRoutes);
// app.use("/users", usersRoutes);
// app.use("/posts", postsRoutes);
// app.use("/likes", likesRoutes);

const io = new Server(server, {
  cors: { origin: ALLOWED_ORIGINS, credentials: true },
});

/* =========================================================
   PRESENCE (Online Users)
   - userSockets: userId -> Set(socketId)
   - socketToUser: socketId -> userId
========================================================= */
const userSockets = new Map();
const socketToUser = new Map();

function addSocketForUser(userId, socketId) {
  const uid = String(userId);
  if (!userSockets.has(uid)) userSockets.set(uid, new Set());
  userSockets.get(uid).add(socketId);
  socketToUser.set(socketId, uid);
}

function removeSocket(socketId) {
  const uid = socketToUser.get(socketId);
  if (!uid) return;

  const set = userSockets.get(uid);
  if (set) {
    set.delete(socketId);
    if (set.size === 0) userSockets.delete(uid);
  }
  socketToUser.delete(socketId);
}

function isUserOnline(userId) {
  const set = userSockets.get(String(userId));
  return !!set && set.size > 0;
}

function emitToUser(userId, event, payload) {
  const set = userSockets.get(String(userId));
  if (!set) return false;
  for (const sid of set) io.to(sid).emit(event, payload);
  return true;
}

/* =========================================================
   LIVE STREAM LIST
========================================================= */
const liveStreams = new Set();

/* =========================================================
   CALL STATE
========================================================= */
// roomId -> { roomId, fromUserId, toUserId, kind, createdAt, status }
const activeCalls = new Map();

function endCall(roomId, reason = "ended") {
  const call = activeCalls.get(roomId);
  if (!call) return;

  const payload = { roomId, reason };

  emitToUser(call.fromUserId, "call:ended", payload);
  emitToUser(call.toUserId, "call:ended", payload);

  io.to(roomId).emit("call:ended", payload);
  activeCalls.delete(roomId);
}

io.on("connection", (socket) => {
  socket.emit("server:ready", { ok: true });

  /* =============================
     PRESENCE
  ============================== */
  socket.on("user:online", ({ userId }) => {
    if (!userId) return;

    addSocketForUser(userId, socket.id);

    // Send presence list to this socket
    socket.emit("presence:list", { onlineUserIds: Array.from(userSockets.keys()) });

    // Notify everyone a user is online
    io.emit("presence:update", { userId: String(userId), online: true });
  });

  socket.on("presence:get", () => {
    socket.emit("presence:list", { onlineUserIds: Array.from(userSockets.keys()) });
  });

  /* =============================
     CHAT (your existing)
  ============================== */
  socket.on("join-room", (room) => {
    if (!room) return;
    socket.join(room);
  });

  socket.on("send-message", ({ room, from, text }) => {
    if (!room || !text) return;
    io.to(room).emit("receive-message", {
      from: from || "user",
      text,
      createdAt: new Date().toISOString(),
    });
  });

  /* =============================
     LIVE (your existing)
  ============================== */
  socket.on("live:create", ({ liveId }) => {
    if (!liveId) return;
    liveStreams.add(liveId);
    io.emit("live-list", Array.from(liveStreams));
  });

  socket.on("get-live-list", () => {
    socket.emit("live-list", Array.from(liveStreams));
  });

  // Optional: remove live id when host leaves (you can improve later)
  socket.on("live:remove", ({ liveId }) => {
    if (!liveId) return;
    liveStreams.delete(liveId);
    io.emit("live-list", Array.from(liveStreams));
  });

  /* =============================
     CALLS
     Events expected by your UPDATED Dashboard:
     - call:request -> (caller gets call:ringing)
     - callee gets call:incoming
     - call:accept -> both get call:accepted
     - call:reject/cancel/end -> call:ended
  ============================== */
  socket.on("call:request", ({ toUserId, kind }) => {
    const fromUserId = socketToUser.get(socket.id);

    if (!fromUserId) {
      socket.emit("call:error", { message: "Not registered online. (user:online missing)" });
      return;
    }

    if (!toUserId) {
      socket.emit("call:error", { message: "Missing toUserId." });
      return;
    }

    if (!isUserOnline(toUserId)) {
      socket.emit("call:error", { message: "User is offline." });
      return;
    }

    const callKind = kind === "video" ? "video" : "audio";
    const roomId = `call-${fromUserId}-${toUserId}-${Date.now()}`;

    activeCalls.set(roomId, {
      roomId,
      fromUserId: String(fromUserId),
      toUserId: String(toUserId),
      kind: callKind,
      createdAt: Date.now(),
      status: "ringing",
    });

    // caller joins signaling room
    socket.join(roomId);

    // tell caller: ringing + roomId
    socket.emit("call:ringing", { roomId, kind: callKind });

    // tell callee: incoming popup
    emitToUser(toUserId, "call:incoming", {
      roomId,
      kind: callKind,
      fromUserId: String(fromUserId),
      fromName: null, // optional if you want to include display name
    });
  });

  socket.on("call:cancel", ({ roomId }) => {
    const call = activeCalls.get(roomId);
    if (!call) return;

    const me = socketToUser.get(socket.id);
    if (!me || String(me) !== String(call.fromUserId)) return;

    endCall(roomId, "canceled");
  });

  socket.on("call:reject", ({ roomId }) => {
    const call = activeCalls.get(roomId);
    if (!call) return;

    const me = socketToUser.get(socket.id);
    if (!me || String(me) !== String(call.toUserId)) return;

    endCall(roomId, "rejected");
  });

  socket.on("call:accept", ({ roomId }) => {
    const call = activeCalls.get(roomId);
    if (!call) {
      socket.emit("call:error", { message: "Call not found/expired." });
      return;
    }

    const me = socketToUser.get(socket.id);
    if (!me || String(me) !== String(call.toUserId)) return;

    socket.join(roomId);
    call.status = "accepted";
    activeCalls.set(roomId, call);

    emitToUser(call.fromUserId, "call:accepted", { roomId });
    emitToUser(call.toUserId, "call:accepted", { roomId });
    io.to(roomId).emit("call:accepted", { roomId });
  });

  socket.on("call:end", ({ roomId }) => {
    if (!activeCalls.has(roomId)) return;
    endCall(roomId, "ended");
  });

  /* =============================
     WEBRTC SIGNALING (relay)
     (Call.vue uses these)
  ============================== */
  socket.on("webrtc:offer", ({ roomId, offer }) => {
    if (!activeCalls.has(roomId)) return;
    socket.to(roomId).emit("webrtc:offer", { roomId, offer });
  });

  socket.on("webrtc:answer", ({ roomId, answer }) => {
    if (!activeCalls.has(roomId)) return;
    socket.to(roomId).emit("webrtc:answer", { roomId, answer });
  });

  socket.on("webrtc:ice", ({ roomId, candidate }) => {
    if (!activeCalls.has(roomId)) return;
    socket.to(roomId).emit("webrtc:ice", { roomId, candidate });
  });

  /* =============================
     DISCONNECT CLEANUP
  ============================== */
  socket.on("disconnect", () => {
    const userId = socketToUser.get(socket.id);
    removeSocket(socket.id);

    // Broadcast offline only if user has no more sockets
    if (userId && !isUserOnline(userId)) {
      io.emit("presence:update", { userId: String(userId), online: false });

      // End any calls for that user (simple safe behavior)
      for (const [roomId, call] of activeCalls.entries()) {
        if (String(call.fromUserId) === String(userId) || String(call.toUserId) === String(userId)) {
          endCall(roomId, "disconnect");
        }
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`✅ AddisGo server running on port ${PORT}`);
  console.log("✅ Allowed origins:", ALLOWED_ORIGINS);
});