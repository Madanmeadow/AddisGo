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
import postsRoutes from "./routes/posts.routes.js";
import usersRoutes from "./routes/users.routes.js";
import conversationsRoutes from "./routes/conversations.routes.js";
import messagesRoutes from "./routes/messages.routes.js";
import uploadRoutes from "./routes/upload.routes.js";
import likesRoutes from "./routes/likes.routes.js";

dotenv.config();

/* =========================
   APP + SERVER
========================= */
const app = express();
const server = http.createServer(app);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 5000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "*";
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

const ORIGINS =
  CLIENT_ORIGIN === "*"
    ? "*"
    : CLIENT_ORIGIN.split(",").map((s) => s.trim()).filter(Boolean);

/* =========================
   MIDDLEWARE
========================= */
app.use(
  cors({
    origin: ORIGINS,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  })
);

app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true }));

/* =========================
   STATIC UPLOADS + ROUTES
========================= */
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ✅ You said “no /api” — so mount clean paths:
app.use("/upload", uploadRoutes);          // POST /upload
app.use("/likes", likesRoutes);            // /likes/:postId etc
app.use("/posts", postsRoutes);
app.use("/users", usersRoutes);
app.use("/conversations", conversationsRoutes);
app.use("/messages", messagesRoutes);

// (Optional backwards compat if anything still uses /api/upload)
app.use("/api/upload", uploadRoutes);

/* =========================
   DB HEALTH
========================= */
pool.on("connect", () => console.log("✅ PostgreSQL Connected"));

/* =========================
   AUTH (register/login)
========================= */
function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username || user.name || user.email || `User${user.id}`,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

app.post("/auth/register", async (req, res) => {
  try {
    const { username, name, email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });

    const display = username || name || email.split("@")[0];
    const hashed = await bcrypt.hash(password, 10);

    let created;
    try {
      created = await pool.query(
        `INSERT INTO users (username, email, password) VALUES ($1,$2,$3)
         RETURNING id, username, email`,
        [display, email, hashed]
      );
    } catch {
      created = await pool.query(
        `INSERT INTO users (name, email, password) VALUES ($1,$2,$3)
         RETURNING id, name, email`,
        [display, email, hashed]
      );
    }

    const userRow = created.rows[0];
    const token = signToken(userRow);

    res.json({
      token,
      user: { id: userRow.id, username: userRow.username || userRow.name || userRow.email },
    });
  } catch (err) {
    console.error("REGISTER ERROR:", err);
    res.status(500).json({ error: "Register failed" });
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });

    const found = await pool.query(`SELECT * FROM users WHERE email=$1 LIMIT 1`, [email]);
    if (!found.rows.length) return res.status(400).json({ error: "User not found" });

    const user = found.rows[0];
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ error: "Wrong password" });

    const token = signToken(user);

    res.json({
      token,
      user: { id: user.id, username: user.username || user.name || user.email },
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

/* =========================
   HEALTH
========================= */
app.get("/", (req, res) => res.send("🚀 AddisGo backend running"));
app.get("/health", async (req, res) => {
  try {
    const r = await pool.query("SELECT NOW() as now");
    res.json({ ok: true, now: r.rows[0].now });
  } catch {
    res.status(500).json({ ok: false });
  }
});
// Backwards compat
app.get("/api/health", async (req, res) => {
  try {
    const r = await pool.query("SELECT NOW() as now");
    res.json({ ok: true, now: r.rows[0].now });
  } catch {
    res.status(500).json({ ok: false });
  }
});

/* =========================
   TURN (ICE servers)
   - You can call /turn (no /api)
========================= */
async function buildIceServers() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const auth = process.env.TWILIO_AUTH_TOKEN;
  const ttl = Number(process.env.TWILIO_TURN_TTL || 3600);

  if (!sid || !auth) {
    return {
      ok: true,
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      note: "TURN not configured; STUN only",
    };
  }

  const client = twilio(sid, auth);
  const token = await client.tokens.create({ ttl });
  return { ok: true, iceServers: token.iceServers };
}

app.get("/turn", async (req, res) => {
  try {
    res.json(await buildIceServers());
  } catch (e) {
    console.error("TURN ERROR:", e);
    res.status(500).json({ ok: false, message: "Failed to get TURN servers" });
  }
});
// Backwards compat
app.get("/api/turn", async (req, res) => {
  try {
    res.json(await buildIceServers());
  } catch (e) {
    console.error("TURN ERROR:", e);
    res.status(500).json({ ok: false, message: "Failed to get TURN servers" });
  }
});

/* =========================
   SOCKET.IO
========================= */
const io = new Server(server, {
  cors: { origin: ORIGINS, credentials: true, methods: ["GET", "POST"] },
});

// Presence (userId -> socketId)
const onlineUsers = new Map();

// Live
const liveStreams = new Set();
const liveHosts = new Map(); // liveId -> hostSocketId

// ✅ Calls (room-based: fixes “waiting for offer” forever)
const callSessions = new Map();
/*
callSessions.set(roomId, {
  roomId,
  kind,
  caller: { userId, socketId },
  callee: { userId, socketId },
  createdAt
})
*/

function emitOnlineUsers() {
  io.emit("online-users", Array.from(onlineUsers.entries()));
}
function emitLiveList() {
  io.emit("live-list", Array.from(liveStreams));
}
function emitLivePresence(liveId) {
  const room = io.sockets.adapter.rooms.get(`live:${liveId}`);
  const count = room ? room.size : 0;
  io.to(`live:${liveId}`).emit("live:presence", { liveId, viewerCount: count });
}

io.on("connection", (socket) => {
  console.log("🔌 Socket connected:", socket.id);

  socket.data.user = null;

  /* ===== USER PRESENCE ===== */
  socket.on("register-user", (user) => {
    const userId = typeof user === "object" ? user?.id : user;
    const username = typeof user === "object" ? user?.username : null;
    if (!userId) return;

    socket.data.user = { id: String(userId), username: username || `User${userId}` };

    onlineUsers.set(String(userId), socket.id);
    socket.join(`user:${userId}`); // personal room (crucial for calls)
    emitOnlineUsers();
  });

  socket.on("join-room", (room) => room && socket.join(String(room)));

  /* ===== ROOM CHAT (optional) ===== */
  socket.on("send-room-message", (data) => {
    const room = data?.room;
    const text = data?.text?.trim();
    if (!room || !text) return;

    io.to(String(room)).emit("receive-message", {
      room: String(room),
      from: data.from || socket.data.user?.username || "user",
      text: String(text),
      created_at: new Date().toISOString(),
    });
  });

  /* =========================
     ✅ CALLS (Invite / Accept / Room Join / Relay)
  ========================= */

  // Caller clicks 📞 or 🎥
  socket.on("call:invite", ({ toUserId, kind = "audio", roomId }) => {
    const from = socket.data.user;
    if (!from?.id) return;

    if (!toUserId || !roomId) return;

    const calleeSocketId = onlineUsers.get(String(toUserId)) || null;

    // Create session even if callee is online; we want a stable roomId
    callSessions.set(String(roomId), {
      roomId: String(roomId),
      kind,
      caller: { userId: String(from.id), socketId: socket.id },
      callee: { userId: String(toUserId), socketId: calleeSocketId },
      createdAt: Date.now(),
    });

    if (!calleeSocketId) {
      socket.emit("call:error", { roomId, message: "User is not online." });
      return;
    }

    // Send incoming call popup to callee (personal room)
    io.to(`user:${toUserId}`).emit("call:incoming", {
      roomId: String(roomId),
      kind,
      fromUser: { id: String(from.id), username: from.username || `User${from.id}` },
    });

    socket.emit("call:ringing", { roomId: String(roomId) });
  });

  socket.on("call:reject", ({ roomId }) => {
    const sess = callSessions.get(String(roomId));
    if (!sess) return;

    io.to(sess.caller.socketId).emit("call:rejected", { roomId: String(roomId) });
    io.to(sess.callee.socketId || "").emit("call:ended", { roomId: String(roomId) });

    callSessions.delete(String(roomId));
  });

  socket.on("call:accept", ({ roomId }) => {
    const sess = callSessions.get(String(roomId));
    if (!sess) return;

    // Update callee socketId (VERY IMPORTANT because accept can happen after navigation)
    sess.callee.socketId = socket.id;
    callSessions.set(String(roomId), sess);

    io.to(sess.caller.socketId).emit("call:accepted", {
      roomId: String(roomId),
      kind: sess.kind,
    });
  });

  // Call page joins the call room (both sides do this)
  socket.on("call:join", ({ roomId }) => {
    const sess = callSessions.get(String(roomId));
    if (!sess) {
      socket.emit("call:error", { roomId, message: "Call session not found." });
      return;
    }

    socket.join(`call:${roomId}`);

    // Keep sockets up to date
    const meId = socket.data.user?.id;
    if (meId && meId === sess.caller.userId) sess.caller.socketId = socket.id;
    if (meId && meId === sess.callee.userId) sess.callee.socketId = socket.id;

    callSessions.set(String(roomId), sess);

    // If both connected to the room → ready
    const room = io.sockets.adapter.rooms.get(`call:${roomId}`);
    const count = room ? room.size : 0;

    io.to(`call:${roomId}`).emit("call:presence", { roomId: String(roomId), count });

    if (count >= 2) {
      io.to(`call:${roomId}`).emit("call:ready", {
        roomId: String(roomId),
        kind: sess.kind,
        callerUserId: sess.caller.userId,
        calleeUserId: sess.callee.userId,
      });
    }
  });

  socket.on("call:end", ({ roomId }) => {
    const sess = callSessions.get(String(roomId));
    if (!sess) return;

    io.to(`call:${roomId}`).emit("call:ended", { roomId: String(roomId) });

    // clean room/session
    callSessions.delete(String(roomId));
  });

  // ✅ WebRTC relay for calls by roomId (no "to" needed)
  socket.on("call:webrtc:offer", ({ roomId, offer }) => {
    if (!roomId || !offer) return;
    socket.to(`call:${roomId}`).emit("call:webrtc:offer", { roomId: String(roomId), offer });
  });

  socket.on("call:webrtc:answer", ({ roomId, answer }) => {
    if (!roomId || !answer) return;
    socket.to(`call:${roomId}`).emit("call:webrtc:answer", { roomId: String(roomId), answer });
  });

  socket.on("call:webrtc:ice", ({ roomId, candidate }) => {
    if (!roomId || !candidate) return;
    socket.to(`call:${roomId}`).emit("call:webrtc:ice", { roomId: String(roomId), candidate });
  });

  /* =========================
     LIVE STREAMING (your existing)
  ========================= */
  socket.on("live:create", ({ liveId }) => {
    if (!liveId) return;

    liveHosts.set(String(liveId), socket.id);
    liveStreams.add(String(liveId));
    emitLiveList();

    socket.join(`live:${liveId}`);
    io.to(`live:${liveId}`).emit("live:host", { liveId: String(liveId), hostSocketId: socket.id });

    emitLivePresence(String(liveId));
  });

  socket.on("live:join", ({ liveId }) => {
    if (!liveId) return;

    socket.join(`live:${liveId}`);

    const hostSocketId = liveHosts.get(String(liveId)) || null;
    socket.emit("live:host", { liveId: String(liveId), hostSocketId });

    // ✅ Important: tell host to start signaling to THIS viewer socket
    if (hostSocketId) {
      io.to(hostSocketId).emit("live:viewer-joined", {
        liveId: String(liveId),
        viewerSocketId: socket.id,
      });
    }

    emitLivePresence(String(liveId));
  });

  socket.on("live:end", ({ liveId }) => {
    if (!liveId) return;
    const hostSocketId = liveHosts.get(String(liveId));
    if (hostSocketId === socket.id) {
      io.to(`live:${liveId}`).emit("live:ended", { liveId: String(liveId) });
      liveHosts.delete(String(liveId));
      liveStreams.delete(String(liveId));
      emitLiveList();
    }
  });

  socket.on("get-live-list", () => socket.emit("live-list", Array.from(liveStreams)));

  // your existing direct relay (kept for Live compatibility)
  socket.on("webrtc:offer", ({ liveId, to, offer }) => {
    if (!to || !offer) return;
    io.to(to).emit("webrtc:offer", { liveId, from: socket.id, offer });
  });
  socket.on("webrtc:answer", ({ liveId, to, answer }) => {
    if (!to || !answer) return;
    io.to(to).emit("webrtc:answer", { liveId, from: socket.id, answer });
  });
  socket.on("webrtc:ice", ({ liveId, to, candidate }) => {
    if (!to || !candidate) return;
    io.to(to).emit("webrtc:ice", { liveId, from: socket.id, candidate });
  });

  /* ===== DISCONNECT ===== */
  socket.on("disconnect", () => {
    // presence cleanup
    for (const [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        break;
      }
    }

    // clean live if host
    for (const [liveId, hostSocketId] of liveHosts.entries()) {
      if (hostSocketId === socket.id) {
        io.to(`live:${liveId}`).emit("live:ended", { liveId });
        liveHosts.delete(liveId);
        liveStreams.delete(liveId);
        emitLiveList();
      }
    }

    emitOnlineUsers();
    console.log("❌ Socket disconnected:", socket.id);
  });
});

/* =========================
   START
========================= */
server.listen(PORT, () => {
  console.log(`🔥 AddisGo Server running on port ${PORT}`);
});