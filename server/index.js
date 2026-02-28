// server/index.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { Server } from "socket.io";
import twilio from "twilio";

import { pool } from "./db.js";

// Routes (keep your existing route files)
import reelsRoutes from "./routes/reels.routes.js";
import postsRoutes from "./routes/posts.routes.js";
import usersRoutes from "./routes/users.routes.js";
import conversationsRoutes from "./routes/conversations.routes.js";
import messagesRoutes from "./routes/messages.routes.js";

dotenv.config();

const app = express();
const server = http.createServer(app);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* =========================
   CONFIG
========================= */
const PORT = process.env.PORT || 5000;

const ALLOWED_ORIGINS = [
  process.env.CLIENT_URL,              // e.g. https://addis-go.vercel.app
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "http://localhost:3000",
].filter(Boolean);

// If you want "allow all", you can just do: app.use(cors())
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // mobile apps / curl
      if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      return cb(null, true); // ✅ keep permissive (avoid random CORS breaks)
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "30mb" }));
app.use(express.urlencoded({ extended: true }));

/* =========================
   STATIC FILES
   - public/sounds/ringtone.mp3
   - server/uploads for local uploads
========================= */
app.use("/public", express.static(path.join(__dirname, "../public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* =========================
   HEALTH
========================= */
app.get("/", (req, res) => res.json({ ok: true, service: "AddisGo API" }));
app.get("/health", (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

/* =========================
   TURN / ICE SERVERS
   Supports BOTH:
   - /turn
   - /api/turn
========================= */
async function handleTurn(req, res) {
  try {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;

    // If Twilio not configured -> STUN fallback
    if (!sid || !token) {
      return res.json({
        ok: false,
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        note: "TURN not configured (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN missing).",
      });
    }

    const client = twilio(sid, token);
    const t = await client.tokens.create({ ttl: 3600 });

    // Twilio returns `iceServers`
    return res.json({
      ok: true,
      iceServers: t.iceServers || [{ urls: "stun:stun.l.google.com:19302" }],
    });
  } catch (e) {
    console.error("TURN ERROR:", e?.message || e);
    return res.json({
      ok: false,
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      note: "TURN error. Using STUN fallback.",
    });
  }
}

app.get("/turn", handleTurn);
app.get("/api/turn", handleTurn);

/* =========================
   API ROUTES
   (no /api prefix to match your working setup)
========================= */
app.use("/reels", reelsRoutes);
app.use("/posts", postsRoutes);
app.use("/users", usersRoutes);
app.use("/conversations", conversationsRoutes);
app.use("/messages", messagesRoutes);

/* =========================
   SOCKET.IO
========================= */
const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGINS.length ? ALLOWED_ORIGINS : "*",
    credentials: true,
  },
});

function now() {
  return new Date().toISOString();
}
function log(...a) {
  console.log(`[${now()}]`, ...a);
}

/* =========================
   PRESENCE (online users)
========================= */
const onlineUsers = new Map(); // userId -> { socketId, username }
function emitOnlineList() {
  io.emit("online-users", Array.from(onlineUsers.entries()).map(([id, v]) => ({ id, ...v })));
}

/* =========================
   CALLS STATE
========================= */
const activeCalls = new Map(); // roomId -> { callerId, calleeId, kind, createdAt, callerSocketId, calleeSocketId, status }
const userSocketById = new Map(); // userId -> socketId

function makeCallRoomId() {
  return `call-${Math.random().toString(36).slice(2, 10)}-${Date.now()}`;
}

/* =========================
   LIVE STATE
========================= */
const liveStreams = new Set();           // set of liveId
const liveHosts = new Map();             // liveId -> hostSocketId
const liveSpeakerAllowed = new Map();    // liveId -> Set(userId) who are allowed to publish mic

function ensureLiveSpeakerSet(liveId) {
  const id = String(liveId);
  if (!liveSpeakerAllowed.has(id)) liveSpeakerAllowed.set(id, new Set());
  return liveSpeakerAllowed.get(id);
}

function emitLiveList() {
  io.emit("live-list", Array.from(liveStreams));
}
function emitLivePresence(liveId) {
  const room = io.sockets.adapter.rooms.get(`live:${liveId}`);
  const count = room ? room.size : 0;
  io.to(`live:${liveId}`).emit("live:presence", { liveId, viewerCount: count });
}

/* =========================
   MAIN SOCKET HANDLER
========================= */
io.on("connection", (socket) => {
  log("socket connected:", socket.id);

  // You can attach user into socket.data after register-user
  socket.on("register-user", ({ id, username } = {}) => {
    if (!id) return;
    const userId = String(id);
    socket.data.user = { id: userId, username: username || "user" };

    onlineUsers.set(userId, { socketId: socket.id, username: username || "user" });
    userSocketById.set(userId, socket.id);

    emitOnlineList();
    log("register-user:", userId, username, socket.id);
  });

  /* =========================
     INBOX / CHAT ROOM JOIN
  ========================= */
  socket.on("inbox:join", ({ conversationId } = {}) => {
    if (!conversationId) return;
    socket.join(`conv:${conversationId}`);
  });

  socket.on("inbox:leave", ({ conversationId } = {}) => {
    if (!conversationId) return;
    socket.leave(`conv:${conversationId}`);
  });

  // optional: realtime message push (if you want)
  socket.on("message:send", async ({ conversationId, text, toUserId } = {}) => {
    try {
      if (!conversationId || !text) return;

      const fromUserId = socket.data?.user?.id;
      const payload = {
        conversationId: String(conversationId),
        text: String(text),
        fromUserId: fromUserId ? String(fromUserId) : null,
        toUserId: toUserId ? String(toUserId) : null,
        at: new Date().toISOString(),
      };

      io.to(`conv:${conversationId}`).emit("message:new", payload);
    } catch (e) {
      console.error("message:send error", e);
    }
  });

  /* =========================
     ✅ CALLS: SIGNALING + RING + RELAY
  ========================= */

  // Caller asks to call someone by userId
  socket.on("call:request", ({ toUserId, kind } = {}) => {
    const callerUserId = socket.data?.user?.id;
    if (!callerUserId || !toUserId) return;

    const calleeUserId = String(toUserId);
    const calleeSocketId = userSocketById.get(calleeUserId);

    const roomId = makeCallRoomId();
    const payload = {
      roomId,
      kind: kind || "video",
      from: { id: String(callerUserId), username: socket.data?.user?.username || "user" },
      callerSocketId: socket.id,
      calleeSocketId: calleeSocketId || null,
      status: "ringing",
      createdAt: Date.now(),
      callerId: String(callerUserId),
      calleeId: calleeUserId,
    };

    activeCalls.set(roomId, payload);

    // caller gets ringing info + roomId
    socket.emit("call:ringing", { roomId, kind: payload.kind });

    // if callee online -> incoming popup + ringtone
    if (calleeSocketId) {
      io.to(calleeSocketId).emit("call:incoming", {
        roomId,
        kind: payload.kind,
        from: payload.from,
        callerSocketId: socket.id,
      });

      io.to(calleeSocketId).emit("call:ring", { roomId, kind: payload.kind, side: "callee" });
      io.to(socket.id).emit("call:ring", { roomId, kind: payload.kind, side: "caller" });
    } else {
      socket.emit("call:status", { calleeOnline: false });
    }
  });

  socket.on("call:cancel", ({ roomId } = {}) => {
    const id = String(roomId || "");
    const call = activeCalls.get(id);
    if (!call) return;

    // stop ringing on both sides if possible
    if (call.calleeSocketId) io.to(call.calleeSocketId).emit("call:stopRing", { roomId: id });
    io.to(call.callerSocketId).emit("call:stopRing", { roomId: id });

    if (call.calleeSocketId) io.to(call.calleeSocketId).emit("call:ended", { roomId: id });
    io.to(call.callerSocketId).emit("call:ended", { roomId: id });

    activeCalls.delete(id);
  });

  socket.on("call:accept", ({ roomId } = {}) => {
    const id = String(roomId || "");
    const call = activeCalls.get(id);
    if (!call) return;

    // who accepted (callee socket)
    call.calleeSocketId = socket.id;
    call.status = "accepted";
    activeCalls.set(id, call);

    // stop ring + notify
    io.to(call.callerSocketId).emit("call:stopRing", { roomId: id });
    io.to(call.calleeSocketId).emit("call:stopRing", { roomId: id });

    io.to(call.callerSocketId).emit("call:accepted", { roomId: id });
    io.to(call.calleeSocketId).emit("call:accepted", { roomId: id });
  });

  socket.on("call:reject", ({ roomId } = {}) => {
    const id = String(roomId || "");
    const call = activeCalls.get(id);
    if (!call) return;

    io.to(call.callerSocketId).emit("call:stopRing", { roomId: id });
    io.to(call.callerSocketId).emit("call:rejected", { roomId: id });

    io.to(socket.id).emit("call:stopRing", { roomId: id });

    activeCalls.delete(id);
  });

  socket.on("call:join", ({ roomId } = {}) => {
    if (!roomId) return;
    socket.join(`call:${roomId}`);
    socket.emit("call:ready", { roomId: String(roomId) });

    // announce peer joined for mesh negotiation
    socket.to(`call:${roomId}`).emit("call:peer-joined", { roomId: String(roomId), peerSocketId: socket.id });
  });

  socket.on("call:leave", ({ roomId } = {}) => {
    if (!roomId) return;
    socket.leave(`call:${roomId}`);
  });

  socket.on("call:end", ({ roomId } = {}) => {
    const id = String(roomId || "");
    io.to(`call:${id}`).emit("call:ended", { roomId: id });
    activeCalls.delete(id);
  });

  // ✅ WebRTC relay for CALLS (supports {to} + broadcast fallback)
  socket.on("call:webrtc:offer", ({ roomId, offer, to }) => {
    if (!roomId || !offer) return;

    if (to) {
      io.to(String(to)).emit("call:webrtc:offer", {
        roomId: String(roomId),
        offer,
        from: socket.id,
      });
      return;
    }

    socket.to(`call:${roomId}`).emit("call:webrtc:offer", { roomId: String(roomId), offer, from: socket.id });
  });

  socket.on("call:webrtc:answer", ({ roomId, answer, to }) => {
    if (!roomId || !answer) return;

    if (to) {
      io.to(String(to)).emit("call:webrtc:answer", {
        roomId: String(roomId),
        answer,
        from: socket.id,
      });
      return;
    }

    socket.to(`call:${roomId}`).emit("call:webrtc:answer", { roomId: String(roomId), answer, from: socket.id });
  });

  socket.on("call:webrtc:ice", ({ roomId, candidate, to }) => {
    if (!roomId || !candidate) return;

    if (to) {
      io.to(String(to)).emit("call:webrtc:ice", {
        roomId: String(roomId),
        candidate,
        from: socket.id,
      });
      return;
    }

    socket.to(`call:${roomId}`).emit("call:webrtc:ice", { roomId: String(roomId), candidate, from: socket.id });
  });

  // optional: server-driven ringtone controls
  socket.on("call:ring", ({ roomId, kind, side } = {}) => {
    // usually server emits this itself; keep for debugging
    io.to(socket.id).emit("call:ring", { roomId, kind, side });
  });

  socket.on("call:stopRing", () => {
    io.to(socket.id).emit("call:stopRing");
  });

  /* =========================
     ✅ LIVE STREAMING
     - host broadcasts to viewers (fan-out)
     - mic request / approve / deny
     - live chat
     - webrtc relays (offer/answer/ice)
  ========================= */

  socket.on("live:create", ({ liveId } = {}) => {
    if (!liveId) return;
    const id = String(liveId);

    liveHosts.set(id, socket.id);
    liveStreams.add(id);
    socket.join(`live:${id}`);

    // host always allowed to speak
    const hostUserId = socket.data?.user?.id ? String(socket.data.user.id) : null;
    if (hostUserId) ensureLiveSpeakerSet(id).add(hostUserId);

    emitLiveList();
    emitLivePresence(id);

    io.to(`live:${id}`).emit("live:host", { liveId: id, hostSocketId: socket.id });
    log("live:create", id, "host", socket.id);
  });

  socket.on("live:end", ({ liveId } = {}) => {
    if (!liveId) return;
    const id = String(liveId);

    liveStreams.delete(id);
    liveHosts.delete(id);
    liveSpeakerAllowed.delete(id);

    io.to(`live:${id}`).emit("live:ended", { liveId: id });
    emitLiveList();
    log("live:end", id);
  });

  socket.on("live:join", ({ liveId } = {}) => {
    if (!liveId) return;
    const id = String(liveId);

    socket.join(`live:${id}`);

    const hostSocketId = liveHosts.get(id) || null;
    socket.emit("live:host", { liveId: id, hostSocketId });

    // tell host a viewer joined (so host can create offer)
    if (hostSocketId) {
      io.to(hostSocketId).emit("live:viewer-joined", { liveId: id, viewerSocketId: socket.id });
    }

    emitLivePresence(id);
    log("live:join", id, "viewer", socket.id);
  });

  socket.on("live:leave", ({ liveId } = {}) => {
    if (!liveId) return;
    const id = String(liveId);

    socket.leave(`live:${id}`);

    const hostSocketId = liveHosts.get(id) || null;
    if (hostSocketId) {
      io.to(hostSocketId).emit("live:viewer-left", { liveId: id, viewerSocketId: socket.id });
    }

    emitLivePresence(id);
    log("live:leave", id, "viewer", socket.id);
  });

  socket.on("live:chat", ({ liveId, message } = {}) => {
    if (!liveId || !message) return;
    const id = String(liveId);

    io.to(`live:${id}`).emit("live:chat", {
      liveId: id,
      message: String(message),
      from: socket.data?.user || { username: "Anon" },
      at: new Date().toISOString(),
    });
  });

  // Mic flow (request -> approve/deny -> viewer start mic)
  socket.on("live:mic:request", ({ liveId } = {}) => {
    if (!liveId) return;
    const id = String(liveId);
    const hostSocketId = liveHosts.get(id);
    if (!hostSocketId) return;

    io.to(hostSocketId).emit("live:mic:request", {
      liveId: id,
      viewerSocketId: socket.id,
      from: socket.data?.user || { username: "Anon" },
    });
  });

  socket.on("live:mic:approve", ({ liveId, viewerSocketId, userId } = {}) => {
    if (!liveId || !viewerSocketId) return;
    const id = String(liveId);

    // allow by userId if provided
    if (userId) ensureLiveSpeakerSet(id).add(String(userId));

    io.to(String(viewerSocketId)).emit("live:mic:approved", { liveId: id });
  });

  socket.on("live:mic:deny", ({ liveId, viewerSocketId, userId } = {}) => {
    if (!liveId || !viewerSocketId) return;
    const id = String(liveId);

    if (userId) ensureLiveSpeakerSet(id).delete(String(userId));

    io.to(String(viewerSocketId)).emit("live:mic:denied", { liveId: id });
  });

  socket.on("live:mic:check", ({ liveId, userId } = {}) => {
    if (!liveId) return;
    const id = String(liveId);
    const uid = userId ? String(userId) : socket.data?.user?.id ? String(socket.data.user.id) : null;

    const allowed = uid ? ensureLiveSpeakerSet(id).has(uid) : false;
    socket.emit("live:mic:status", { liveId: id, allowed });
  });

  // ✅ WebRTC relay for LIVE
  socket.on("webrtc:offer", ({ liveId, to, offer } = {}) => {
    if (!liveId || !to || !offer) return;
    io.to(String(to)).emit("webrtc:offer", { liveId: String(liveId), from: socket.id, offer });
  });

  socket.on("webrtc:answer", ({ liveId, to, answer } = {}) => {
    if (!liveId || !to || !answer) return;
    io.to(String(to)).emit("webrtc:answer", { liveId: String(liveId), from: socket.id, answer });
  });

  socket.on("webrtc:ice", ({ liveId, to, candidate } = {}) => {
    if (!liveId || !to || !candidate) return;
    io.to(String(to)).emit("webrtc:ice", { liveId: String(liveId), from: socket.id, candidate });
  });

  /* =========================
     DISCONNECT
  ========================= */
  socket.on("disconnect", () => {
    // remove from online
    const userId = socket.data?.user?.id;
    if (userId) {
      onlineUsers.delete(String(userId));
      userSocketById.delete(String(userId));
      emitOnlineList();
    }
    log("socket disconnected:", socket.id);
  });
});

/* =========================
   START SERVER
========================= */
server.listen(PORT, () => {
  log(`AddisGo server running on port ${PORT}`);
});