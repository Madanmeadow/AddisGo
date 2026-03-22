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

// Routes
import reelsRoutes from "./routes/reels.routes.js";
import postsRoutes from "./routes/posts.routes.js";
import usersRoutes from "./routes/users.routes.js";
import conversationsRoutes from "./routes/conversations.routes.js";
import messagesRoutes from "./routes/messages.routes.js";
import uploadRoutes from "./routes/upload.routes.js";
import likesRoutes from "./routes/likes.routes.js";

dotenv.config();

const app = express();
const server = http.createServer(app);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "change-me";
const ORIGINS = (process.env.CORS_ORIGIN || process.env.CLIENT_URL || "*")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const io = new Server(server, {
  cors: {
    origin: ORIGINS.includes("*") ? true : ORIGINS,
    credentials: true,
    methods: ["GET", "POST"],
  },
});

/* =========================
   MIDDLEWARE
========================= */
app.use(cors({
  origin: ORIGINS.includes("*") ? true : ORIGINS,
  credentials: true,
}));
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* =========================
   HELPERS
========================= */
function authRequired(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: "Missing token" });

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

function getSocketUserLabel(socket) {
  return socket.username || "User";
}

/* =========================
   SOCKET STATE
========================= */
const onlineUsers = new Map(); // userId -> socketId
const socketToUser = new Map(); // socketId -> userId
const callRooms = new Map(); // roomId -> Set(socketIds)
const liveHosts = new Map(); // liveId -> hostSocketId
const liveViewers = new Map(); // liveId -> Set(socketIds)

/* =========================
   PRESENCE HELPERS
========================= */
function emitPresenceList(targetSocket = null) {
  const onlineUserIds = Array.from(onlineUsers.keys()).map(String);
  if (targetSocket) targetSocket.emit("presence:list", { onlineUserIds });
  else io.emit("presence:list", { onlineUserIds });
}

function broadcastPresenceUpdate(userId, online) {
  io.emit("presence:update", {
    userId: String(userId),
    online: !!online,
  });
}

/* =========================
   CALL HELPERS
========================= */
function joinCallRoom(roomId, socketId) {
  if (!callRooms.has(roomId)) callRooms.set(roomId, new Set());
  callRooms.get(roomId).add(socketId);
}

function leaveCallRoom(roomId, socketId) {
  if (!callRooms.has(roomId)) return;
  const set = callRooms.get(roomId);
  set.delete(socketId);
  if (set.size === 0) callRooms.delete(roomId);
}

function getPeers(roomId, selfSocketId) {
  if (!callRooms.has(roomId)) return [];
  return Array.from(callRooms.get(roomId)).filter((id) => id !== selfSocketId);
}

/* =========================
   LIVE HELPERS
========================= */
function getLiveViewerCount(liveId) {
  return liveViewers.has(liveId) ? liveViewers.get(liveId).size : 0;
}

function emitServerStats() {
  io.emit("server:stats", {
    onlineUsers: onlineUsers.size,
    liveStreams: liveHosts.size,
    directCalls: callRooms.size,
    callRooms: callRooms.size,
    onlineUserIds: Array.from(onlineUsers.keys()).map(String),
  });
}

/* =========================
   BASIC HEALTH / AUTH
========================= */
app.get("/", (_req, res) => {
  res.json({ ok: true, app: "Pulse API" });
});

app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true, db: true });
  } catch (err) {
    res.status(500).json({ ok: false, db: false, error: err.message });
  }
});

app.post("/auth/register", async (req, res) => {
  try {
    const { username, email, password, name } = req.body || {};
    if (!username || !email || !password) {
      return res.status(400).json({ error: "username, email, password required" });
    }

    const exists = await pool.query(
      `SELECT id FROM users WHERE email = $1 OR username = $2 LIMIT 1`,
      [email, username]
    );
    if (exists.rows.length) {
      return res.status(409).json({ error: "User already exists" });
    }

    const hash = await bcrypt.hash(password, 10);

    const created = await pool.query(
      `
      INSERT INTO users (username, email, password, name)
      VALUES ($1, $2, $3, $4)
      RETURNING id, username, email, name, avatar_url, bio, created_at
      `,
      [username, email, hash, name || username]
    );

    const user = created.rows[0];
    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({ token, user });
  } catch (err) {
    console.error("POST /auth/register error:", err);
    res.status(500).json({ error: "Failed to register" });
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    const { email, username, password } = req.body || {};
    const identifier = email || username;
    if (!identifier || !password) {
      return res.status(400).json({ error: "email/username and password required" });
    }

    const found = await pool.query(
      `
      SELECT id, username, email, password, name, avatar_url, bio, created_at
      FROM users
      WHERE email = $1 OR username = $1
      LIMIT 1
      `,
      [identifier]
    );

    const user = found.rows[0];
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.password || "");
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    delete user.password;
    res.json({ token, user });
  } catch (err) {
    console.error("POST /auth/login error:", err);
    res.status(500).json({ error: "Failed to login" });
  }
});

app.get("/users/me", authRequired, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `
      SELECT id, username, email, name, avatar_url, bio, created_at
      FROM users
      WHERE id = $1
      LIMIT 1
      `,
      [req.user.id]
    );

    if (!rows.length) return res.status(404).json({ error: "User not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error("GET /users/me error:", err);
    res.status(500).json({ error: "Failed to fetch current user" });
  }
});

/* =========================
   TURN / SERVER STATS
========================= */
app.get("/api/server-stats", (_req, res) => {
  res.json({
    onlineUsers: onlineUsers.size,
    liveStreams: liveHosts.size,
    directCalls: callRooms.size,
    callRooms: callRooms.size,
    onlineUserIds: Array.from(onlineUsers.keys()).map(String),
  });
});

app.get("/api/turn", async (_req, res) => {
  try {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const secret = process.env.TWILIO_API_SECRET;
    const key = process.env.TWILIO_API_KEY;

    if (!sid || !secret || !key) {
      return res.json({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });
    }

    const client = twilio(key, secret, { accountSid: sid });
    const token = await client.tokens.create();

    res.json({
      iceServers: token.iceServers || [{ urls: "stun:stun.l.google.com:19302" }],
    });
  } catch (err) {
    console.error("GET /api/turn error:", err);
    res.json({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
  }
});

/* =========================
   APP ROUTES
========================= */
app.use("/reels", reelsRoutes);
app.use("/posts", postsRoutes);
app.use("/users", usersRoutes);
app.use("/", conversationsRoutes);
app.use("/", messagesRoutes);
app.use("/upload", uploadRoutes);
app.use("/likes", likesRoutes);

/* =========================
   SOCKET.IO
========================= */
io.on("connection", (socket) => {
  console.log("🔌 connected:", socket.id);

  /* ---------- REGISTER USER ---------- */
  socket.on("register-user", ({ id, username }) => {
    if (!id) return;

    const userId = String(id);
    onlineUsers.set(userId, socket.id);
    socketToUser.set(socket.id, userId);

    socket.userId = userId;
    socket.username = username || "User";

    emitPresenceList(socket);
    broadcastPresenceUpdate(userId, true);
    emitServerStats();

    console.log("👤 online:", userId, socket.username);
  });

  socket.on("presence:get", () => {
    emitPresenceList(socket);
  });

  /* =========================
     MESSAGES
  ========================= */
  socket.on("messages:join", ({ conversationId }) => {
    if (!conversationId) return;
    socket.join(`conversation:${conversationId}`);
  });

  socket.on("messages:leave", ({ conversationId }) => {
    if (!conversationId) return;
    socket.leave(`conversation:${conversationId}`);
  });

  socket.on("message:send", ({ conversationId, message }) => {
    if (!conversationId || !message) return;

    io.to(`conversation:${conversationId}`).emit("message:new", {
      conversationId: String(conversationId),
      message,
    });
  });

  /* =========================
     DIRECT CALL
  ========================= */
  socket.on("call:request", ({ toUserId, kind }) => {
    const targetSocketId = onlineUsers.get(String(toUserId));

    if (!socket.userId) {
      socket.emit("call:error", { message: "You are not registered." });
      return;
    }

    if (!targetSocketId) {
      socket.emit("call:offline", { message: "User offline" });
      return;
    }

    const roomId = `call_${Date.now()}_${socket.userId}_${String(toUserId)}`;
    callRooms.set(roomId, new Set());

    socket.emit("call:ringing", { roomId });

    io.to(targetSocketId).emit("call:incoming", {
      roomId,
      fromUserId: socket.userId,
      fromName: getSocketUserLabel(socket),
      kind: kind || "video",
    });

    emitServerStats();
  });

  socket.on("call:accept", ({ roomId }) => {
    if (!roomId) return;
    io.to(roomId).emit("call:accepted", { roomId });
    socket.emit("call:accepted", { roomId });
  });

  socket.on("call:reject", ({ roomId }) => {
    if (!roomId) return;
    io.to(roomId).emit("call:ended", { roomId, reason: "rejected" });
    callRooms.delete(roomId);
    emitServerStats();
  });

  socket.on("call:join", ({ roomId }) => {
    if (!roomId) return;

    socket.join(roomId);
    joinCallRoom(roomId, socket.id);

    const peerSocketIds = getPeers(roomId, socket.id);

    socket.emit("call:joined", {
      peerSocketIds,
      shouldCreateOffer: peerSocketIds.length === 1,
    });

    peerSocketIds.forEach((peerSocketId) => {
      io.to(peerSocketId).emit("call:peer-joined", {
        peerSocketId: socket.id,
      });
    });

    emitServerStats();
  });

  socket.on("call:webrtc:offer", ({ roomId, offer, to }) => {
    if (!offer || !to) return;
    io.to(String(to)).emit("call:webrtc:offer", {
      roomId,
      offer,
      fromSocketId: socket.id,
    });
  });

  socket.on("call:webrtc:answer", ({ roomId, answer, to }) => {
    if (!answer || !to) return;
    io.to(String(to)).emit("call:webrtc:answer", {
      roomId,
      answer,
      fromSocketId: socket.id,
    });
  });

  socket.on("call:webrtc:ice", ({ roomId, candidate, to }) => {
    if (!candidate || !to) return;
    io.to(String(to)).emit("call:webrtc:ice", {
      roomId,
      candidate,
      fromSocketId: socket.id,
    });
  });

  socket.on("call:end", ({ roomId }) => {
    if (!roomId) return;
    io.to(roomId).emit("call:ended", { roomId });
    callRooms.delete(roomId);
    emitServerStats();
  });

  /* =========================
     LIVE
  ========================= */
  socket.on("live:create", ({ liveId }) => {
    if (!liveId) return;
    liveHosts.set(String(liveId), socket.id);
    if (!liveViewers.has(String(liveId))) liveViewers.set(String(liveId), new Set());

    socket.join(`live:${liveId}`);
    io.emit("live:created", {
      liveId: String(liveId),
      hostSocketId: socket.id,
    });
    emitServerStats();
  });

  socket.on("live:join", ({ liveId }) => {
    if (!liveId) return;
    const key = String(liveId);

    socket.join(`live:${key}`);
    if (!liveViewers.has(key)) liveViewers.set(key, new Set());
    liveViewers.get(key).add(socket.id);

    io.to(`live:${key}`).emit("live:viewers", {
      liveId: key,
      viewerCount: getLiveViewerCount(key),
    });

    const hostSocketId = liveHosts.get(key);
    if (hostSocketId && hostSocketId !== socket.id) {
      io.to(hostSocketId).emit("live:viewer-joined", {
        liveId: key,
        viewerSocketId: socket.id,
      });
    }

    emitServerStats();
  });

  socket.on("live:leave", ({ liveId }) => {
    if (!liveId) return;
    const key = String(liveId);

    socket.leave(`live:${key}`);
    if (liveViewers.has(key)) {
      liveViewers.get(key).delete(socket.id);
      if (liveViewers.get(key).size === 0 && !liveHosts.has(key)) {
        liveViewers.delete(key);
      }
    }

    io.to(`live:${key}`).emit("live:viewers", {
      liveId: key,
      viewerCount: getLiveViewerCount(key),
    });

    emitServerStats();
  });

  socket.on("live:chat", ({ liveId, message }) => {
    if (!liveId || !message) return;
    io.to(`live:${liveId}`).emit("live:chat", message);
  });

  socket.on("live:webrtc:offer", ({ liveId, to, offer }) => {
    if (!liveId || !to || !offer) return;
    io.to(String(to)).emit("live:webrtc:offer", {
      liveId: String(liveId),
      fromSocketId: socket.id,
      offer,
    });
  });

  socket.on("live:webrtc:answer", ({ liveId, to, answer }) => {
    if (!liveId || !to || !answer) return;
    io.to(String(to)).emit("live:webrtc:answer", {
      liveId: String(liveId),
      fromSocketId: socket.id,
      answer,
    });
  });

  socket.on("live:webrtc:ice", ({ liveId, to, candidate }) => {
    if (!liveId || !to || !candidate) return;
    io.to(String(to)).emit("live:webrtc:ice", {
      liveId: String(liveId),
      fromSocketId: socket.id,
      candidate,
    });
  });

  socket.on("live:end", ({ liveId }) => {
    if (!liveId) return;
    const key = String(liveId);

    io.to(`live:${key}`).emit("live:ended", { liveId: key });
    liveHosts.delete(key);
    liveViewers.delete(key);
    emitServerStats();
  });

  /* =========================
     DISCONNECT
  ========================= */
  socket.on("disconnect", () => {
    const userId = socketToUser.get(socket.id);

    if (userId) {
      onlineUsers.delete(String(userId));
      socketToUser.delete(socket.id);
      broadcastPresenceUpdate(userId, false);
    }

    for (const [roomId, members] of callRooms.entries()) {
      if (members.has(socket.id)) {
        members.delete(socket.id);
        io.to(roomId).emit("call:ended", { roomId, reason: "peer-left" });
        if (members.size === 0) callRooms.delete(roomId);
      }
    }

    for (const [liveId, hostSocketId] of liveHosts.entries()) {
      if (hostSocketId === socket.id) {
        io.to(`live:${liveId}`).emit("live:ended", { liveId });
        liveHosts.delete(liveId);
        liveViewers.delete(liveId);
      }
    }

    for (const [liveId, viewers] of liveViewers.entries()) {
      if (viewers.has(socket.id)) {
        viewers.delete(socket.id);
        io.to(`live:${liveId}`).emit("live:viewers", {
          liveId,
          viewerCount: getLiveViewerCount(liveId),
        });
        if (viewers.size === 0 && !liveHosts.has(liveId)) {
          liveViewers.delete(liveId);
        }
      }
    }

    emitServerStats();
    console.log("❌ disconnected:", socket.id);
  });
});

/* =========================
   START
========================= */
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});