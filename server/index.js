import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";

// If you already have these, keep them. If not, remove.
// import authRoutes from "./routes/auth.routes.js";
// import postsRoutes from "./routes/posts.routes.js";
// import messagesRoutes from "./routes/messages.routes.js";

const app = express();
const server = http.createServer(app);

/* =========================
   CONFIG
========================= */
const PORT = process.env.PORT || 5000;

// IMPORTANT: set your frontend(s) allowed origins
const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL || "http://localhost:5173",
  "https://addis-go.vercel.app",
  "https://addisgo.vercel.app",
].filter(Boolean);

/* =========================
   MIDDLEWARE
========================= */
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: (origin, cb) => {
      // allow mobile apps / curl / same-origin (no origin header)
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

/* =========================
   ROUTES (optional)
========================= */
// app.use("/auth", authRoutes);
// app.use("/posts", postsRoutes);
// app.use("/messages", messagesRoutes);

/* =========================
   SOCKET.IO
========================= */
const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGINS,
    credentials: true,
  },
});

// Presence mapping
// userId -> Set(socketId)
const userSockets = new Map();

// socketId -> userId
const socketToUser = new Map();

// Call state
// roomId -> { fromUserId, toUserId, kind, createdAt, status }
const activeCalls = new Map();

/* ================
  Helpers
================ */
function addSocketForUser(userId, socketId) {
  const key = String(userId);
  if (!userSockets.has(key)) userSockets.set(key, new Set());
  userSockets.get(key).add(socketId);
  socketToUser.set(socketId, key);
}

function removeSocket(socketId) {
  const userId = socketToUser.get(socketId);
  if (!userId) return;

  const set = userSockets.get(userId);
  if (set) {
    set.delete(socketId);
    if (set.size === 0) userSockets.delete(userId);
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
  for (const sid of set) {
    io.to(sid).emit(event, payload);
  }
  return true;
}

function safeEndCall(roomId, reason = "ended") {
  const call = activeCalls.get(roomId);
  if (!call) return;

  const payload = { roomId, reason };

  // notify both sides
  emitToUser(call.fromUserId, "call:ended", payload);
  emitToUser(call.toUserId, "call:ended", payload);

  // also notify anyone in room (multi tabs)
  io.to(roomId).emit("call:ended", payload);

  activeCalls.delete(roomId);
}

/* =========================
   Connection
========================= */
io.on("connection", (socket) => {
  // You can inspect socket.handshake.auth if you want token-based auth later.
  // For now, we register online users explicitly via "user:online".

  socket.emit("server:ready", { ok: true });

  /* =========================
     USER ONLINE / PRESENCE
  ========================= */
  socket.on("user:online", ({ userId }) => {
    if (!userId) return;

    addSocketForUser(userId, socket.id);

    // Broadcast presence update (optional)
    io.emit("presence:update", {
      userId: String(userId),
      online: true,
    });

    // Send current online list (optional)
    socket.emit("presence:list", {
      onlineUserIds: Array.from(userSockets.keys()),
    });
  });

  socket.on("presence:get", () => {
    socket.emit("presence:list", {
      onlineUserIds: Array.from(userSockets.keys()),
    });
  });

  /* =========================
     CALL FLOW
     - request -> incoming
     - ringing -> caller UI
     - accept/reject/cancel/end
  ========================= */

  socket.on("call:request", ({ toUserId, kind }) => {
    const fromUserId = socketToUser.get(socket.id);

    if (!fromUserId) {
      socket.emit("call:error", { message: "You are not registered online yet." });
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

    // Caller joins room (useful for multi-tab + signaling)
    socket.join(roomId);

    // Notify callee(s)
    emitToUser(toUserId, "call:incoming", {
      roomId,
      fromUserId: String(fromUserId),
      kind: callKind,
    });

    // Tell caller we’re ringing
    socket.emit("call:ringing", { roomId, toUserId: String(toUserId), kind: callKind });
  });

  socket.on("call:cancel", ({ roomId }) => {
    const call = activeCalls.get(roomId);
    if (!call) return;

    // Only caller can cancel
    const me = socketToUser.get(socket.id);
    if (!me || String(me) !== String(call.fromUserId)) return;

    safeEndCall(roomId, "canceled");
  });

  socket.on("call:reject", ({ roomId }) => {
    const call = activeCalls.get(roomId);
    if (!call) return;

    const me = socketToUser.get(socket.id);
    if (!me || String(me) !== String(call.toUserId)) return;

    safeEndCall(roomId, "rejected");
  });

  socket.on("call:accept", ({ roomId }) => {
    const call = activeCalls.get(roomId);
    if (!call) {
      socket.emit("call:error", { message: "Call not found/expired." });
      return;
    }

    const me = socketToUser.get(socket.id);
    if (!me || String(me) !== String(call.toUserId)) return;

    // join room and mark accepted
    socket.join(roomId);
    call.status = "accepted";
    activeCalls.set(roomId, call);

    // notify both sides
    emitToUser(call.fromUserId, "call:accepted", { roomId });
    emitToUser(call.toUserId, "call:accepted", { roomId });

    // optionally notify room
    io.to(roomId).emit("call:accepted", { roomId });
  });

  socket.on("call:end", ({ roomId }) => {
    // either side can end
    if (!activeCalls.has(roomId)) return;
    safeEndCall(roomId, "ended");
  });

  /* =========================
     WEBRTC SIGNALING
     - offer / answer / ice
     These are forwarded through the call room.
  ========================= */
  socket.on("webrtc:offer", ({ roomId, offer }) => {
    if (!activeCalls.has(roomId)) return;
    // send to everyone else in room
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

  /* =========================
     CLEANUP
  ========================= */
  socket.on("disconnect", () => {
    // remove presence mapping
    const userId = socketToUser.get(socket.id);
    removeSocket(socket.id);

    // broadcast offline if user has no more sockets
    if (userId && !isUserOnline(userId)) {
      io.emit("presence:update", { userId: String(userId), online: false });
    }

    // if this socket was in any call rooms, end them safely if needed
    // (simple approach: end calls where user is caller/callee AND has no sockets left)
    if (userId && !isUserOnline(userId)) {
      for (const [roomId, call] of activeCalls.entries()) {
        if (String(call.fromUserId) === String(userId) || String(call.toUserId) === String(userId)) {
          safeEndCall(roomId, "disconnect");
        }
      }
    }
  });
});

/* =========================
   START SERVER
========================= */
server.listen(PORT, () => {
  console.log(`✅ AddisGo server running on port ${PORT}`);
  console.log("✅ Allowed origins:", ALLOWED_ORIGINS);
});