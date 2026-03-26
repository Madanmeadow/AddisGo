// server/index.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { Server } from "socket.io";
import bcrypt from "bcrypt";
import { registerCallSfuHandlers } from "./mediasoup/socketCallSfu.js";
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
import { initMediasoupWorker } from "./mediasoup/workers.js";
import { registerLiveSfuHandlers } from "./mediasoup/socketLiveSfu.js";

await initMediasoupWorker();
dotenv.config();

/* =========================
   ✅ PRETTY LOGS (COLORFUL)
========================= */
const C = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};
function logOK(...a) { console.log(`${C.green}✅${C.reset}`, ...a); }
function logWARN(...a) { console.log(`${C.yellow}⚠️${C.reset}`, ...a); }
function logERR(...a) { console.log(`${C.red}❌${C.reset}`, ...a); }
function logSOCK(...a) { console.log(`${C.cyan}🔌${C.reset}`, ...a); }
function logLIVE(...a) { console.log(`${C.magenta}🔴${C.reset}`, ...a); }
function logCALL(...a) { console.log(`${C.blue}📞${C.reset}`, ...a); }
function logROOM(...a) { console.log(`${C.blue}🏠${C.reset}`, ...a); }

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

const canon = (v) => (v === null || v === undefined ? null : String(v));

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

app.use("/reels", reelsRoutes);
app.use("/upload", uploadRoutes);
app.use("/likes", likesRoutes);
app.use("/posts", postsRoutes);
app.use("/users", usersRoutes);
app.use("/conversations", conversationsRoutes);
app.use("/messages", messagesRoutes);

// Optional backwards compat
app.use("/api/upload", uploadRoutes);

/* =========================
   DB HEALTH
========================= */
pool.on("connect", () => logOK("PostgreSQL Connected"));

/* =========================
   AUTH (register/login)
========================= */
function signToken(user) {
  const userId = canon(user?.id);
  const username =
    user?.username ||
    user?.display_name ||
    user?.name ||
    user?.email ||
    (userId ? `User${userId}` : "User");

  return jwt.sign(
    { userId, id: userId, username },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

app.post("/auth/register", async (req, res) => {
  try {
    const { username, name, email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    const display = username || name || email.split("@")[0];
    const hashed = await bcrypt.hash(password, 10);

    let created;
    try {
      created = await pool.query(
        `INSERT INTO users (username, email, password)
         VALUES ($1,$2,$3)
         RETURNING id, username, email, display_name, name`,
        [display, email, hashed]
      );
    } catch {
      created = await pool.query(
        `INSERT INTO users (name, email, password)
         VALUES ($1,$2,$3)
         RETURNING id, name, email, display_name, username`,
        [display, email, hashed]
      );
    }

    const userRow = created.rows[0];
    const token = signToken(userRow);

    res.json({
      token,
      user: {
        id: userRow.id,
        username:
          userRow.username ||
          userRow.display_name ||
          userRow.name ||
          userRow.email,
      },
    });
  } catch (err) {
    logERR("REGISTER ERROR:", err);
    res.status(500).json({ error: "Register failed" });
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    const found = await pool.query(
      `SELECT * FROM users WHERE email=$1 LIMIT 1`,
      [email]
    );

    if (!found.rows.length) {
      return res.status(400).json({ error: "User not found" });
    }

    const user = found.rows[0];
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(400).json({ error: "Wrong password" });
    }

    const token = signToken(user);

    res.json({
      token,
      user: {
        id: user.id,
        username:
          user.username ||
          user.display_name ||
          user.name ||
          user.email,
      },
    });
  } catch (err) {
    logERR("LOGIN ERROR:", err);
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
========================= */
async function buildIceServers() {
  const sid = (process.env.TWILIO_ACCOUNT_SID || "").trim();
  const auth = (process.env.TWILIO_AUTH_TOKEN || "").trim();
  const ttl = Number(process.env.TWILIO_TURN_TTL || 3600);

  const fallback = {
    ok: true,
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    note: "STUN only (TURN not available)",
  };

  if (!sid || !auth) {
    return { ...fallback, note: "TURN not configured; STUN only" };
  }

  try {
    const client = twilio(sid, auth);
    const token = await client.tokens.create({ ttl });
    return { ok: true, iceServers: token.iceServers, note: "TURN via Twilio" };
  } catch (e) {
    console.error("TURN(Twilio) ERROR -> fallback to STUN:", e?.message || e);
    return { ...fallback, error: "Twilio TURN failed; using STUN fallback" };
  }
}

app.get("/api/turn", async (req, res) => {
  try {
    res.json(await buildIceServers());
  } catch (e) {
    logERR("TURN ERROR:", e);
    res.status(500).json({ ok: false, message: "Failed to get TURN servers" });
  }
});

/* =========================
   SOCKET.IO
========================= */
const io = new Server(server, {
  cors: {
    origin: ORIGINS,
    credentials: true,
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {

  registerLiveSfuHandlers(io, socket);
  registerCallSfuHandlers(io, socket); // ✅ ADD THIS

});
/* =========================
   SOCKET JWT AUTH
========================= */
io.use((socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace("Bearer ", "");

    if (!token) return next();

    const payload = jwt.verify(token, JWT_SECRET);
    const userId = canon(payload?.userId ?? payload?.id);
    if (!userId) return next(new Error("INVALID_TOKEN_PAYLOAD"));

    socket.userId = userId;
    socket.username = payload?.username || `User${userId}`;
    return next();
  } catch (e) {
    logWARN("Socket auth failed (continuing as guest):", e?.message || e);
    return next();
  }
});

/* ---------- PRESENCE ---------- */
const onlineUsers = new Map();    // userId -> socketId
const socketToUserId = new Map(); // socketId -> userId

function emitOnlineUsersLegacy() {
  io.emit("online-users", Array.from(onlineUsers.entries()));
}

function emitPresenceList(toSocket) {
  const onlineUserIds = Array.from(onlineUsers.keys());
  if (toSocket) toSocket.emit("presence:list", { onlineUserIds });
  else io.emit("presence:list", { onlineUserIds });
}

function broadcastPresenceUpdate(userId, online) {
  io.emit("presence:update", { userId: String(userId), online: !!online });
}

function setOnline(socket, userId, username) {
  const uid = canon(userId);
  if (!uid) return false;

  socket.data.user = {
    id: uid,
    username: username || socket.username || `User${uid}`,
  };

  onlineUsers.set(uid, socket.id);
  socketToUserId.set(socket.id, uid);

  socket.join(`user:${uid}`);
  return true;
}

/* ---------- LIVE ---------- */
const liveStreams = new Set();
const liveHosts = new Map(); // liveId -> hostSocketId
const liveViewers = new Map(); // liveId -> Set<socketId>

function ensureLiveViewerSet(liveId) {
  const id = String(liveId);
  if (!liveViewers.has(id)) liveViewers.set(id, new Set());
  return liveViewers.get(id);
}

function emitLiveList() {
  io.emit("live-list", Array.from(liveStreams));
}

function emitLivePresence(liveId) {
  const id = String(liveId);
  const viewers = ensureLiveViewerSet(id);
  const hostSocketId = liveHosts.get(id);

  io.to(`live:${id}`).emit("live:presence", {
    liveId: id,
    viewerCount: viewers.size,
    hostSocketId: hostSocketId || null,
  });
}

/* ---------- LIVE MIC CONTROL ---------- */
const liveSpeakers = new Map();     // liveId -> Set<userId>
const liveMicRequests = new Map();  // liveId -> Map<userId -> payload>

function ensureLiveSpeakerSet(liveId) {
  const id = String(liveId);
  if (!liveSpeakers.has(id)) liveSpeakers.set(id, new Set());
  return liveSpeakers.get(id);
}

function ensureLiveRequestMap(liveId) {
  const id = String(liveId);
  if (!liveMicRequests.has(id)) liveMicRequests.set(id, new Map());
  return liveMicRequests.get(id);
}
/* ---------- DIRECT CALLS: OFFLINE QUEUE + BUSY ---------- */
const pendingIncomingCalls = new Map(); // userId -> Map(roomId -> payload)
const userBusyRoom = new Map();         // userId -> roomId

function queueIncomingCall(userId, payload) {
  const uid = String(userId);
  const rid = String(payload.roomId);
  if (!pendingIncomingCalls.has(uid)) pendingIncomingCalls.set(uid, new Map());
  pendingIncomingCalls.get(uid).set(rid, payload);
}

function removeQueuedIncomingCall(userId, roomId) {
  const uid = String(userId);
  const rid = String(roomId);
  const m = pendingIncomingCalls.get(uid);
  if (!m) return;
  m.delete(rid);
  if (m.size === 0) pendingIncomingCalls.delete(uid);
}

function flushQueuedIncomingCallsToUser(userId) {
  const uid = String(userId);
  const m = pendingIncomingCalls.get(uid);
  if (!m || m.size === 0) return;

  for (const payload of m.values()) {
    io.to(`user:${uid}`).emit("call:incoming", { ...payload, queued: true });
    io.to(`user:${uid}`).emit("call:ring", {
      roomId: String(payload.roomId),
      kind: payload.kind,
      side: "callee",
    });
    io.to(`user:${uid}`).emit("call:ringing", {
      roomId: String(payload.roomId),
      kind: payload.kind,
      side: "callee",
      queued: true,
    });
  }
}

/* ---------- DIRECT CALLS ---------- */
const callSessions = new Map();
const RING_TIMEOUT_MS = 30_000;

function makeCallRoomId(socket) {
  return `call-${socket.id}-${Date.now()}`;
}

function emitCallParticipants(roomId) {
  const sess = callSessions.get(String(roomId));
  if (!sess) return;

  io.to(`call:${roomId}`).emit("call:participants", {
    roomId: String(roomId),
    hostUserId: sess.hostUserId,
    kind: sess.kind,
    invitedUserIds: Array.from(sess.invitedUserIds || []),
    joinedUserIds: Array.from(sess.joinedUserIds || []),
  });
}

function ringToUser(userId, roomId, kind, side) {
  io.to(`user:${String(userId)}`).emit("call:ring", {
    roomId: String(roomId),
    kind: String(kind),
    side: side || "unknown",
  });
  io.to(`user:${String(userId)}`).emit("call:ringing", {
    roomId: String(roomId),
    kind: String(kind),
    side: side || "unknown",
  });
}

function stopRingToUser(userId, roomId) {
  io.to(`user:${String(userId)}`).emit("call:stopRing", {
    roomId: String(roomId),
  });
}

function stopRingForSession(sess) {
  if (!sess) return;

  if (sess.ringTimer) {
    clearTimeout(sess.ringTimer);
    sess.ringTimer = null;
  }

  for (const uid of sess.invitedUserIds || []) {
    stopRingToUser(uid, sess.roomId);
  }
}

function isUserBusy(userId) {
  return userBusyRoom.has(String(userId));
}

function setUserBusy(userId, roomId) {
  userBusyRoom.set(String(userId), String(roomId));
}

function clearUserBusy(userId, roomId) {
  const uid = String(userId);
  const rid = String(roomId);
  const cur = userBusyRoom.get(uid);
  if (cur && cur === rid) userBusyRoom.delete(uid);
}

function clearBusyForSession(sess) {
  if (!sess) return;
  for (const uid of sess.invitedUserIds || []) {
    clearUserBusy(uid, sess.roomId);
  }
}

/* ======= OPTIONAL DB helpers ======= */
async function dbNotifyIncomingCall(userId, payload) {
  try {
    await pool.query(
      `INSERT INTO notifications (user_id, type, payload)
       VALUES ($1, 'incoming_call', $2::jsonb)`,
      [Number(userId), JSON.stringify(payload)]
    );
  } catch {}
}

async function dbEnsureCall(roomId, kind, hostUserId) {
  try {
    const r = await pool.query(
      `SELECT id FROM calls WHERE room_id=$1 LIMIT 1`,
      [String(roomId)]
    );
    if (r.rows?.[0]?.id) return r.rows[0].id;

    const created = await pool.query(
      `INSERT INTO calls (room_id, kind, created_by, status)
       VALUES ($1,$2,$3,'ringing')
       RETURNING id`,
      [String(roomId), String(kind), hostUserId ? Number(hostUserId) : null]
    );
    return created.rows[0].id;
  } catch (e) {
    logERR("DB ensure call error:", e);
    return null;
  }
}

async function dbUpsertParticipant(callId, userId, role = "member", status = "invited") {
  try {
    await pool.query(
      `INSERT INTO call_participants (call_id, user_id, role, status)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (call_id, user_id)
       DO UPDATE SET role=EXCLUDED.role, status=EXCLUDED.status`,
      [Number(callId), Number(userId), String(role), String(status)]
    );
  } catch (e) {
    logERR("DB upsert participant error:", e);
  }
}

async function dbMarkJoined(callId, userId) {
  try {
    await pool.query(
      `UPDATE call_participants
       SET status='joined', joined_at=COALESCE(joined_at, NOW())
       WHERE call_id=$1 AND user_id=$2`,
      [Number(callId), Number(userId)]
    );
  } catch (e) {
    logERR("DB mark joined error:", e);
  }
}

async function dbActivateIfTwoJoined(callId) {
  try {
    const j = await pool.query(
      `SELECT COUNT(*)::int AS n
       FROM call_participants
       WHERE call_id=$1 AND status='joined'`,
      [Number(callId)]
    );
    if ((j.rows?.[0]?.n || 0) >= 2) {
      await pool.query(
        `UPDATE calls
         SET status='active', started_at=COALESCE(started_at, NOW())
         WHERE id=$1`,
        [Number(callId)]
      );
    }
  } catch (e) {
    logERR("DB activate error:", e);
  }
}

async function dbEndCall(roomId) {
  try {
    await pool.query(
      `UPDATE calls
       SET status='ended', ended_at=NOW()
       WHERE room_id=$1 AND status <> 'ended'`,
      [String(roomId)]
    );
  } catch (e) {
    logERR("DB end call error:", e);
  }
}

function scheduleMissedTimer(roomId) {
  const sess = callSessions.get(String(roomId));
  if (!sess) return;

  if (sess.ringTimer) {
    clearTimeout(sess.ringTimer);
    sess.ringTimer = null;
  }

  sess.ringTimer = setTimeout(async () => {
    const s = callSessions.get(String(roomId));
    if (!s) return;

    const room = io.sockets.adapter.rooms.get(`call:${roomId}`);
    const count = room ? room.size : 0;
    const joinedCount = s.joinedUserIds ? s.joinedUserIds.size : 0;

    if (count >= 2 || joinedCount >= 2) {
      if (s.ringTimer) {
        clearTimeout(s.ringTimer);
        s.ringTimer = null;
      }
      callSessions.set(String(roomId), s);
      return;
    }

    stopRingForSession(s);
    clearBusyForSession(s);

    for (const uid of s.invitedUserIds || []) {
      removeQueuedIncomingCall(uid, s.roomId);
    }

    await dbEndCall(roomId);

    io.to(`call:${roomId}`).emit("call:ended", {
      roomId: String(roomId),
      reason: "timeout",
    });

    for (const uid of s.invitedUserIds || []) {
      io.to(`user:${uid}`).emit("call:ended", {
        roomId: String(roomId),
        reason: "timeout",
      });
      stopRingToUser(uid, roomId);
    }

    callSessions.delete(String(roomId));
  }, RING_TIMEOUT_MS);

  callSessions.set(String(roomId), sess);
}

/* ---------- CALL ROOMS ---------- */
const callRooms = new Map();
/*
room shape:
{
  roomId,
  name,
  kind, // audio | video
  hostUserId,
  hostSocketId,
  createdAt,
  participants: Map<userId, {
    userId,
    username,
    name,
    socketId,
    joinedAt,
    micOn,
    camOn
  }>
}
*/

function roomTarget(roomId) {
  return `callroom:${String(roomId)}`;
}

function getRoomParticipant(room, userId) {
  return room?.participants?.get(String(userId)) || null;
}

function normalizeCallRoomParticipant(room, p) {
  return {
    userId: String(p.userId),
    username: p.username || `User${p.userId}`,
    name: p.name || p.username || `User ${p.userId}`,
    socketId: p.socketId,
    joinedAt: p.joinedAt,
    micOn: !!p.micOn,
    camOn: !!p.camOn,
    isHost: String(p.userId) === String(room.hostUserId),
    connected: true,
  };
}

function emitCallRoomList(toSocket = null) {
  const rooms = Array.from(callRooms.values()).map((r) => ({
    roomId: String(r.roomId),
    name: r.name,
    kind: r.kind,
    hostUserId: String(r.hostUserId || ""),
    participantCount: r.participants?.size || 0,
    createdAt: r.createdAt,
  }));

  if (toSocket) toSocket.emit("callroom:list", rooms);
  else io.emit("callroom:list", rooms);
}

function emitCallRoomState(roomId) {
  const room = callRooms.get(String(roomId));
  if (!room) return;

  const participants = Array.from(room.participants.values()).map((p) =>
    normalizeCallRoomParticipant(room, p)
  );

  io.to(roomTarget(roomId)).emit("callroom:state", {
    roomId: String(room.roomId),
    name: room.name,
    kind: room.kind,
    hostUserId: String(room.hostUserId || ""),
    participants,
  });
}

function removeParticipantFromCallRooms(socket) {
  const meId = socket.data.user?.id ? String(socket.data.user.id) : null;
  if (!meId) return;

  for (const [roomId, room] of callRooms.entries()) {
    if (!room.participants.has(meId)) continue;

    room.participants.delete(meId);
    socket.leave(roomTarget(roomId));

    socket.to(roomTarget(roomId)).emit("callroom:user-left", {
      roomId: String(roomId),
      userId: String(meId),
      name: socket.data.user?.username || `User ${meId}`,
      username: socket.data.user?.username || `User${meId}`,
      socketId: socket.id,
    });

    socket.to(roomTarget(roomId)).emit("callroom:peer-left", {
      roomId: String(roomId),
      userId: String(meId),
      socketId: socket.id,
    });

    if (room.participants.size === 0) {
      callRooms.delete(roomId);
      emitCallRoomList();
      continue;
    }

    if (String(room.hostUserId) === meId) {
      const next = Array.from(room.participants.values())[0];
      if (next) {
        room.hostUserId = String(next.userId);
        room.hostSocketId = next.socketId;
      }
    }

    callRooms.set(roomId, room);
    emitCallRoomState(roomId);
    emitCallRoomList();
  }
}

/* =========================
   SOCKET CONNECTION
========================= */
io.on("connection", (socket) => {
  logSOCK("Socket connected:", socket.id);
  socket.data.user = socket.data.user || null;
  registerLiveSfuHandlers(io, socket);
  /* ✅ Auto-register if JWT auth succeeded */
  if (socket.userId) {
    setOnline(socket, socket.userId, socket.username);
    emitPresenceList(socket);
    broadcastPresenceUpdate(socket.userId, true);
    emitOnlineUsersLegacy();
    flushQueuedIncomingCallsToUser(socket.userId);
  }

  /* =========================
     PRESENCE
  ========================= */
  socket.on("user:online", ({ userId, username }) => {
    if (!userId) return;

    setOnline(socket, userId, username);
    emitPresenceList(socket);
    broadcastPresenceUpdate(userId, true);
    emitOnlineUsersLegacy();
    flushQueuedIncomingCallsToUser(userId);
  });

  socket.on("presence:get", () => emitPresenceList(socket));

  socket.on("register-user", (user) => {
    const userId = typeof user === "object" ? user?.id : user;
    const username = typeof user === "object" ? user?.username : null;
    if (!userId) return;

    setOnline(socket, userId, username);
    emitPresenceList(socket);
    broadcastPresenceUpdate(userId, true);
    emitOnlineUsersLegacy();
    flushQueuedIncomingCallsToUser(userId);
  });

  /* =========================
     CHAT (general rooms)
  ========================= */
  socket.on("join-room", (room) => {
    if (!room) return;
    socket.join(String(room));
  });

  socket.on("send-message", ({ room, from, text }) => {
    const r = String(room || "");
    const t = String(text || "").trim();
    if (!r || !t) return;

    io.to(r).emit("receive-message", {
      from: from || socket.data.user?.username || "user",
      text: t,
      createdAt: new Date().toISOString(),
    });
  });

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
     DIRECT CALLS
  ========================= */
  socket.on("call:request", async ({ toUserId, kind = "audio" }) => {
    const from = socket.data.user;
    if (!from?.id) {
      return socket.emit("call:error", { message: "Not online." });
    }

    if (!toUserId) {
      return socket.emit("call:error", { message: "Missing toUserId" });
    }

    const callerUserId = String(from.id);
    const calleeUserId = String(toUserId);
    const callKind = kind === "video" ? "video" : "audio";

    if (calleeUserId === callerUserId) {
      return socket.emit("call:error", { message: "You cannot call yourself." });
    }

    if (isUserBusy(callerUserId)) {
      return socket.emit("call:error", { message: "You are already in a call." });
    }

    if (isUserBusy(calleeUserId)) {
      return socket.emit("call:busy", { message: "User is busy." });
    }

    const roomId = String(makeCallRoomId(socket));
    const invitedUserIds = new Set([callerUserId, calleeUserId]);
    const joinedUserIds = new Set();

    const dbCallId = await dbEnsureCall(roomId, callKind, from.id);
    if (dbCallId) {
      await dbUpsertParticipant(dbCallId, from.id, "host", "invited");
      await dbUpsertParticipant(dbCallId, calleeUserId, "member", "invited");
    }

    const incomingPayload = {
      roomId,
      kind: callKind,
      fromUserId: callerUserId,
      fromName: from.username || `User${from.id}`,
      isGroup: false,
      from: callerUserId,
      callerSocketId: socket.id,
      hostUserId: callerUserId,
    };

    callSessions.set(roomId, {
      roomId,
      kind: callKind,
      hostUserId: callerUserId,
      invitedUserIds,
      joinedUserIds,
      createdAt: Date.now(),
      dbCallId: dbCallId || null,
      ringTimer: null,
    });

    setUserBusy(callerUserId, roomId);
    setUserBusy(calleeUserId, roomId);

    scheduleMissedTimer(roomId);

    socket.emit("call:ringing", {
      roomId,
      kind: callKind,
      isCaller: true,
    });

    ringToUser(callerUserId, roomId, callKind, "caller");

    const calleeSocketId = onlineUsers.get(calleeUserId);

    if (!calleeSocketId) {
      queueIncomingCall(calleeUserId, incomingPayload);
      await dbNotifyIncomingCall(calleeUserId, incomingPayload);

      socket.emit("call:status", {
        roomId,
        calleeOnline: false,
      });
      return;
    }

    io.to(`user:${calleeUserId}`).emit("call:incoming", incomingPayload);
    ringToUser(calleeUserId, roomId, callKind, "callee");

    socket.emit("call:status", {
      roomId,
      calleeOnline: true,
    });
  });

  socket.on("call:accept", async ({ roomId }) => {
    const sess = callSessions.get(String(roomId));
    if (!sess) return;

    stopRingForSession(sess);

    for (const uid of sess.invitedUserIds || []) {
      io.to(`user:${uid}`).emit("call:accepted", {
        roomId: String(roomId),
        kind: sess.kind,
        hostUserId: sess.hostUserId,
      });
      stopRingToUser(uid, roomId);
    }

    io.to(`call:${roomId}`).emit("call:accepted", {
      roomId: String(roomId),
      kind: sess.kind,
      hostUserId: sess.hostUserId,
    });
  });

  socket.on("call:reject", async ({ roomId }) => {
    const sess = callSessions.get(String(roomId));
    if (!sess) return;

    stopRingForSession(sess);
    clearBusyForSession(sess);

    for (const uid of sess.invitedUserIds || []) {
      removeQueuedIncomingCall(uid, sess.roomId);
    }

    io.to(`call:${roomId}`).emit("call:ended", {
      roomId: String(roomId),
      reason: "rejected",
    });

    for (const uid of sess.invitedUserIds || []) {
      io.to(`user:${uid}`).emit("call:ended", {
        roomId: String(roomId),
        reason: "rejected",
      });
      stopRingToUser(uid, roomId);
    }

    if (sess.ringTimer) {
      clearTimeout(sess.ringTimer);
      sess.ringTimer = null;
    }

    callSessions.delete(String(roomId));
  });

  socket.on("call:join", async ({ roomId }) => {
    const sess = callSessions.get(String(roomId));
    if (!sess) {
      return socket.emit("call:error", { message: "Call session not found." });
    }

    const meId = socket.data.user?.id ? String(socket.data.user.id) : null;
    socket.join(`call:${roomId}`);

    if (meId) {
      sess.joinedUserIds.add(meId);
      callSessions.set(String(roomId), sess);

      removeQueuedIncomingCall(meId, roomId);
      setUserBusy(meId, roomId);

      if (sess.ringTimer) {
        clearTimeout(sess.ringTimer);
        sess.ringTimer = null;
      }

      if (sess.dbCallId) {
        await dbMarkJoined(sess.dbCallId, meId);
        await dbActivateIfTwoJoined(sess.dbCallId);
      }
    }

    const room = io.sockets.adapter.rooms.get(`call:${roomId}`);
    const count = room ? room.size : 0;

    io.to(`call:${roomId}`).emit("call:presence", {
      roomId: String(roomId),
      count,
      joinedUserIds: Array.from(sess.joinedUserIds || []),
      hostUserId: sess.hostUserId,
    });

    socket.to(`call:${roomId}`).emit("call:peer-joined", {
      roomId: String(roomId),
      peerSocketId: socket.id,
      peerUserId: meId,
      hostUserId: sess.hostUserId,
    });

    emitCallParticipants(roomId);

    if (count >= 2) {
      stopRingForSession(sess);

      io.to(`call:${roomId}`).emit("call:ready", {
        roomId: String(roomId),
        kind: sess.kind,
        hostUserId: sess.hostUserId,
        joinedUserIds: Array.from(sess.joinedUserIds || []),
      });
    }
  });

  socket.on("call:end", async ({ roomId }) => {
    const sess = callSessions.get(String(roomId));
    logCALL("call:end", { roomId: String(roomId) });

    await dbEndCall(roomId);

    if (sess) {
      stopRingForSession(sess);
      clearBusyForSession(sess);

      for (const uid of sess.invitedUserIds || []) {
        removeQueuedIncomingCall(uid, sess.roomId);
      }

      if (sess.ringTimer) {
        clearTimeout(sess.ringTimer);
        sess.ringTimer = null;
      }

      for (const uid of sess.invitedUserIds || []) {
        io.to(`user:${uid}`).emit("call:ended", {
          roomId: String(roomId),
          reason: "ended",
        });
        stopRingToUser(uid, roomId);
      }
    }

    io.to(`call:${roomId}`).emit("call:ended", {
      roomId: String(roomId),
      reason: "ended",
    });

    callSessions.delete(String(roomId));
  });

  socket.on("call:cancel", async ({ roomId }) => {
    const sess = callSessions.get(String(roomId));
    if (!sess) return;

    logCALL("call:cancel", { roomId: String(roomId) });
    await dbEndCall(roomId);

    stopRingForSession(sess);
    clearBusyForSession(sess);

    for (const uid of sess.invitedUserIds || []) {
      removeQueuedIncomingCall(uid, sess.roomId);
    }

    io.to(`call:${roomId}`).emit("call:ended", {
      roomId: String(roomId),
      reason: "canceled",
    });

    for (const uid of sess.invitedUserIds || []) {
      io.to(`user:${uid}`).emit("call:ended", {
        roomId: String(roomId),
        reason: "canceled",
      });
      stopRingToUser(uid, roomId);
    }

    if (sess.ringTimer) {
      clearTimeout(sess.ringTimer);
      sess.ringTimer = null;
    }

    callSessions.delete(String(roomId));
  });

  socket.on("call:invite", async ({ roomId, toUserId }) => {
    const sess = callSessions.get(String(roomId));
    const from = socket.data.user;

    if (!sess || !from?.id || !toUserId) return;

    const inviteeUserId = String(toUserId);
    if (sess.invitedUserIds.has(inviteeUserId)) return;

    sess.invitedUserIds.add(inviteeUserId);
    callSessions.set(String(roomId), sess);

    setUserBusy(inviteeUserId, roomId);

    if (sess.dbCallId) {
      await dbUpsertParticipant(sess.dbCallId, inviteeUserId, "member", "invited");
    }

    const incomingPayload = {
      roomId: String(roomId),
      kind: sess.kind,
      fromUserId: String(from.id),
      fromName: from.username || `User${from.id}`,
      isGroup: true,
      from: String(from.id),
      callerSocketId: socket.id,
      hostUserId: sess.hostUserId,
    };

    const inviteeSocketId = onlineUsers.get(inviteeUserId);
    if (!inviteeSocketId) {
      queueIncomingCall(inviteeUserId, incomingPayload);
      return;
    }

    io.to(`user:${inviteeUserId}`).emit("call:incoming", incomingPayload);
    ringToUser(inviteeUserId, roomId, sess.kind, "callee");
  });

  /* =========================
     DIRECT CALLS: WebRTC RELAY
  ========================= */
  socket.on("call:webrtc:offer", ({ roomId, offer, to }) => {
    if (!roomId || !offer) return;

    const payload = {
      roomId: String(roomId),
      offer,
      from: socket.id,
    };

    if (to) return io.to(String(to)).emit("call:webrtc:offer", payload);
    socket.to(`call:${roomId}`).emit("call:webrtc:offer", payload);
  });

  socket.on("call:webrtc:answer", ({ roomId, answer, to }) => {
    if (!roomId || !answer) return;

    const payload = {
      roomId: String(roomId),
      answer,
      from: socket.id,
    };

    if (to) return io.to(String(to)).emit("call:webrtc:answer", payload);
    socket.to(`call:${roomId}`).emit("call:webrtc:answer", payload);
  });

  socket.on("call:webrtc:ice", ({ roomId, candidate, to }) => {
    if (!roomId || !candidate) return;

    const payload = {
      roomId: String(roomId),
      candidate,
      from: socket.id,
    };

    if (to) return io.to(String(to)).emit("call:webrtc:ice", payload);
    socket.to(`call:${roomId}`).emit("call:webrtc:ice", payload);
  });

  /* =========================
     CALL ROOMS
  ========================= */
  socket.on("callroom:list:get", () => {
    emitCallRoomList(socket);
  });

  socket.on("callroom:get", ({ roomId } = {}) => {
    const room = callRooms.get(String(roomId));
    if (!room) {
      return socket.emit("callroom:error", { message: "Room not found." });
    }

    const participants = Array.from(room.participants.values()).map((p) =>
      normalizeCallRoomParticipant(room, p)
    );

    socket.emit("callroom:state", {
      roomId: String(room.roomId),
      name: room.name,
      kind: room.kind,
      hostUserId: String(room.hostUserId || ""),
      participants,
    });
  });

  socket.on("callroom:create", ({ name, kind = "audio" } = {}) => {
    const me = socket.data.user;
    if (!me?.id) {
      return socket.emit("callroom:error", { message: "Login required." });
    }

    const roomKind = kind === "video" ? "video" : "audio";
    const roomName =
      String(name || "").trim() ||
      `${me.username || "User"}'s ${roomKind === "video" ? "Video" : "Audio"} Room`;

    const roomId = `cr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const userId = String(me.id);

    const room = {
      roomId,
      name: roomName,
      kind: roomKind,
      hostUserId: userId,
      hostSocketId: socket.id,
      createdAt: new Date().toISOString(),
      participants: new Map(),
    };

    room.participants.set(userId, {
      userId,
      username: me.username || `User${userId}`,
      name: me.username || `User ${userId}`,
      socketId: socket.id,
      joinedAt: new Date().toISOString(),
      micOn: true,
      camOn: roomKind === "video",
    });

    callRooms.set(roomId, room);
    socket.join(roomTarget(roomId));

    socket.emit("callroom:created", {
      roomId,
      name: roomName,
      kind: roomKind,
    });

    emitCallRoomState(roomId);
    emitCallRoomList();
    logROOM("callroom:create", { roomId, roomName, roomKind, host: userId });
  });

  socket.on("callroom:join", ({ roomId } = {}) => {
    const me = socket.data.user;
    if (!me?.id) {
      return socket.emit("callroom:error", { message: "Login required." });
    }

    const room = callRooms.get(String(roomId));
    if (!room) {
      return socket.emit("callroom:error", { message: "Room not found." });
    }

    const userId = String(me.id);

    room.participants.set(userId, {
      userId,
      username: me.username || `User${userId}`,
      name: me.username || `User ${userId}`,
      socketId: socket.id,
      joinedAt: new Date().toISOString(),
      micOn: true,
      camOn: room.kind === "video",
    });

    callRooms.set(String(roomId), room);
    socket.join(roomTarget(roomId));

    const joinedPayload = {
      roomId: String(roomId),
      userId,
      name: me.username || `User ${userId}`,
      username: me.username || `User${userId}`,
      socketId: socket.id,
      isHost: String(room.hostUserId) === userId,
    };

    socket.to(roomTarget(roomId)).emit("callroom:user-joined", joinedPayload);
    socket.to(roomTarget(roomId)).emit("callroom:peer-joined", joinedPayload);

    emitCallRoomState(roomId);
    emitCallRoomList();
    logROOM("callroom:join", { roomId: String(roomId), userId });
  });

  socket.on("callroom:leave", ({ roomId } = {}) => {
    const me = socket.data.user;
    if (!me?.id) return;

    const room = callRooms.get(String(roomId));
    if (!room) return;

    const userId = String(me.id);
    room.participants.delete(userId);
    socket.leave(roomTarget(roomId));

    const leftPayload = {
      roomId: String(roomId),
      userId,
      name: me.username || `User ${userId}`,
      username: me.username || `User${userId}`,
      socketId: socket.id,
    };

    socket.to(roomTarget(roomId)).emit("callroom:user-left", leftPayload);
    socket.to(roomTarget(roomId)).emit("callroom:peer-left", leftPayload);

    if (room.participants.size === 0) {
      callRooms.delete(String(roomId));
      emitCallRoomList();
      logROOM("callroom:deleted-empty", { roomId: String(roomId) });
      return;
    }

    if (String(room.hostUserId) === userId) {
      const next = Array.from(room.participants.values())[0];
      if (next) {
        room.hostUserId = String(next.userId);
        room.hostSocketId = next.socketId;
      }
    }

    callRooms.set(String(roomId), room);
    emitCallRoomState(roomId);
    emitCallRoomList();
    logROOM("callroom:leave", { roomId: String(roomId), userId });
  });

  socket.on("callroom:media-state", ({ roomId, micOn, camOn } = {}) => {
    const me = socket.data.user;
    if (!me?.id) return;

    const room = callRooms.get(String(roomId));
    if (!room) return;

    const userId = String(me.id);
    const p = room.participants.get(userId);
    if (!p) return;

    if (typeof micOn === "boolean") p.micOn = micOn;
    if (typeof camOn === "boolean") p.camOn = camOn;

    room.participants.set(userId, p);
    callRooms.set(String(roomId), room);
    emitCallRoomState(roomId);
  });

  socket.on("callroom:webrtc:offer", ({ roomId, toUserId, offer, meta } = {}) => {
    if (!roomId || !toUserId || !offer) return;

    const fromUserId = socket.data.user?.id ? String(socket.data.user.id) : null;
    const fromName =
      meta?.name ||
      socket.data.user?.username ||
      (fromUserId ? `User ${fromUserId}` : "User");

    io.to(`user:${String(toUserId)}`).emit("callroom:webrtc:offer", {
      roomId: String(roomId),
      fromUserId,
      fromName,
      offer,
      meta: {
        userId: fromUserId,
        name: fromName,
        username: socket.data.user?.username || fromName,
      },
    });
  });

  socket.on("callroom:webrtc:answer", ({ roomId, toUserId, answer } = {}) => {
    if (!roomId || !toUserId || !answer) return;

    const fromUserId = socket.data.user?.id ? String(socket.data.user.id) : null;

    io.to(`user:${String(toUserId)}`).emit("callroom:webrtc:answer", {
      roomId: String(roomId),
      fromUserId,
      answer,
    });
  });

  socket.on("callroom:webrtc:ice", ({ roomId, toUserId, candidate } = {}) => {
    if (!roomId || !toUserId || !candidate) return;

    const fromUserId = socket.data.user?.id ? String(socket.data.user.id) : null;

    io.to(`user:${String(toUserId)}`).emit("callroom:webrtc:ice", {
      roomId: String(roomId),
      fromUserId,
      candidate,
    });
  });

  /* =========================
     LIVE: WebRTC RELAY (host <-> viewer)
  ========================= */
  socket.on("webrtc:offer", ({ liveId, to, offer }) => {
    if (!liveId || !to || !offer) return;
    io.to(String(to)).emit("webrtc:offer", {
      liveId: String(liveId),
      from: socket.id,
      offer,
    });
  });

  socket.on("webrtc:answer", ({ liveId, to, answer }) => {
    if (!liveId || !to || !answer) return;
    io.to(String(to)).emit("webrtc:answer", {
      liveId: String(liveId),
      from: socket.id,
      answer,
    });
  });

  socket.on("webrtc:ice", ({ liveId, to, candidate }) => {
    if (!liveId || !to || !candidate) return;
    io.to(String(to)).emit("webrtc:ice", {
      liveId: String(liveId),
      from: socket.id,
      candidate,
    });
  });

  /* =========================
     LIVE
  ========================= */
  socket.on("live:create", ({ liveId }) => {
    if (!liveId) return;

    liveHosts.set(String(liveId), socket.id);
    liveStreams.add(String(liveId));
    emitLiveList();

    socket.join(`live:${liveId}`);
    io.to(`live:${liveId}`).emit("live:host", {
      liveId: String(liveId),
      hostSocketId: socket.id,
    });

    const hostUserId = socket.data.user?.id ? String(socket.data.user.id) : null;
    if (hostUserId) ensureLiveSpeakerSet(liveId).add(hostUserId);

    emitLivePresence(liveId);
    logLIVE("live:create", { liveId: String(liveId), hostSocketId: socket.id });
  });

  socket.on("live:join", ({ liveId }) => {
    if (!liveId) return;

    socket.join(`live:${liveId}`);

    const hostSocketId = liveHosts.get(String(liveId)) || null;
    socket.emit("live:host", {
      liveId: String(liveId),
      hostSocketId,
    });

    if (hostSocketId) {
      io.to(hostSocketId).emit("live:viewer-joined", {
        liveId: String(liveId),
        viewerSocketId: socket.id,
      });
    }

    const meId = socket.data.user?.id ? String(socket.data.user.id) : null;
    const speakers = ensureLiveSpeakerSet(liveId);
    socket.emit("live:mic:status", {
      liveId: String(liveId),
      canSpeak: meId ? speakers.has(meId) : false,
    });

    emitLivePresence(liveId);
  });

  socket.on("live:leave", ({ liveId }) => {
    if (!liveId) return;

    socket.leave(`live:${liveId}`);

    const hostSocketId = liveHosts.get(String(liveId)) || null;
    if (hostSocketId) {
      io.to(hostSocketId).emit("live:viewer-left", {
        liveId: String(liveId),
        viewerSocketId: socket.id,
      });
    }

    emitLivePresence(liveId);
  });

  socket.on("live:end", ({ liveId }) => {
    if (!liveId) return;
    const hostSocketId = liveHosts.get(String(liveId));
    if (hostSocketId === socket.id) {
      io.to(`live:${liveId}`).emit("live:ended", { liveId: String(liveId) });
      liveHosts.delete(String(liveId));
      liveStreams.delete(String(liveId));
      emitLiveList();

      liveSpeakers.delete(String(liveId));
      liveMicRequests.delete(String(liveId));

      logLIVE("live:end", { liveId: String(liveId) });
    }
  });

  socket.on("get-live-list", () => {
    socket.emit("live-list", Array.from(liveStreams));
  });

  socket.on("live:chat", ({ liveId, message }) => {
    const msg = String(message || "").trim();
    if (!liveId || !msg) return;

    const from = socket.data.user || { id: null, username: "Anon" };

    io.to(`live:${liveId}`).emit("live:chat", {
      liveId: String(liveId),
      message: msg,
      from: {
        id: from.id ? String(from.id) : null,
        username: from.username || "Anon",
      },
      at: new Date().toISOString(),
    });
  });

  socket.on("live:mic:request", ({ liveId }) => {
    if (!liveId) return;
    const me = socket.data.user;
    const meId = me?.id ? String(me.id) : null;
    if (!meId) return;

    const hostSocketId = liveHosts.get(String(liveId));
    if (!hostSocketId) return;

    const reqMap = ensureLiveRequestMap(liveId);
    const payload = {
      liveId: String(liveId),
      fromUserId: meId,
      fromName: me?.username || `User${meId}`,
      fromSocketId: socket.id,
      requestedAt: Date.now(),
    };
    reqMap.set(meId, payload);

    io.to(hostSocketId).emit("live:mic:requested", payload);
    socket.emit("live:mic:requested:ack", {
      liveId: String(liveId),
      ok: true,
    });

    logLIVE("live:mic:request", { liveId: String(liveId), userId: meId });
  });

  socket.on("live:mic:approve", ({ liveId, userId }) => {
    if (!liveId || !userId) return;

    const hostSocketId = liveHosts.get(String(liveId));
    if (hostSocketId !== socket.id) return;

    const uid = String(userId);
    ensureLiveSpeakerSet(liveId).add(uid);

    const reqMap = ensureLiveRequestMap(liveId);
    reqMap.delete(uid);

    io.to(`user:${uid}`).emit("live:mic:approved", {
      liveId: String(liveId),
      ok: true,
    });
    io.to(`user:${uid}`).emit("live:mic:status", {
      liveId: String(liveId),
      canSpeak: true,
    });

    io.to(`live:${liveId}`).emit("live:mic:speakers", {
      liveId: String(liveId),
      speakerUserIds: Array.from(ensureLiveSpeakerSet(liveId)),
    });

    logLIVE("live:mic:approve", { liveId: String(liveId), userId: uid });
  });

  socket.on("live:mic:deny", ({ liveId, userId, reason }) => {
    if (!liveId || !userId) return;

    const hostSocketId = liveHosts.get(String(liveId));
    if (hostSocketId !== socket.id) return;

    const uid = String(userId);
    const reqMap = ensureLiveRequestMap(liveId);
    reqMap.delete(uid);

    io.to(`user:${uid}`).emit("live:mic:denied", {
      liveId: String(liveId),
      ok: false,
      reason: reason || "denied",
    });

    logLIVE("live:mic:deny", { liveId: String(liveId), userId: uid });
  });

  /* =========================
     DISCONNECT CLEANUP
  ========================= */
  socket.on("disconnect", () => {
    const offlineUserId = socketToUserId.get(socket.id) || null;

    removeParticipantFromCallRooms(socket);

    if (offlineUserId) {
      onlineUsers.delete(offlineUserId);
      socketToUserId.delete(socket.id);
      broadcastPresenceUpdate(offlineUserId, false);

      const busyRoomId = userBusyRoom.get(String(offlineUserId));
      if (busyRoomId) {
        userBusyRoom.delete(String(offlineUserId));
        io.to(`call:${busyRoomId}`).emit("call:peer-left", {
          roomId: String(busyRoomId),
          userId: String(offlineUserId),
          socketId: socket.id,
        });
      }
    }

    for (const [liveId, hostSocketId] of liveHosts.entries()) {
      if (hostSocketId === socket.id) {
        io.to(`live:${liveId}`).emit("live:ended", { liveId });
        liveHosts.delete(liveId);
        liveStreams.delete(liveId);
        emitLiveList();

        liveSpeakers.delete(String(liveId));
        liveMicRequests.delete(String(liveId));
      }
    }

    emitPresenceList();
    emitOnlineUsersLegacy();
    logSOCK("Socket disconnected:", socket.id);
  });
});

/* =========================
   START
========================= */
server.listen(PORT, () => {
  logOK(`🔥 Pulse Server running on port ${PORT}`);
});