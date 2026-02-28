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

// ✅ no /api
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
    if (!email || !password)
      return res.status(400).json({ error: "Email and password required" });

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
    logERR("REGISTER ERROR:", err);
    res.status(500).json({ error: "Register failed" });
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "Email and password required" });

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
========================= */
async function buildIceServers() {
  const sid = (process.env.TWILIO_ACCOUNT_SID || "").trim();
  const auth = (process.env.TWILIO_AUTH_TOKEN || "").trim();
  const ttl = Number(process.env.TWILIO_TURN_TTL || 3600);

  // Always have a working fallback
  const fallback = {
    ok: true,
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    note: "STUN only (TURN not available)",
  };

  // If TURN not configured -> STUN only (ok:true)
  if (!sid || !auth) return { ...fallback, note: "TURN not configured; STUN only" };

  try {
    const client = twilio(sid, auth);
    const token = await client.tokens.create({ ttl });

    return {
      ok: true,
      iceServers: token.iceServers,
      note: "TURN via Twilio",
    };
  } catch (e) {
    console.error("TURN(Twilio) ERROR -> fallback to STUN:", e?.message || e);
    return { ...fallback, error: "Twilio TURN failed; using STUN fallback" };
  }
}
// Backwards compat
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
  cors: { origin: ORIGINS, credentials: true, methods: ["GET", "POST"] },
});

/* ---------- PRESENCE ---------- */
const onlineUsers = new Map(); // userId -> socketId

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

/* ---------- LIVE ---------- */
const liveStreams = new Set();
const liveHosts = new Map(); // liveId -> hostSocketId

function emitLiveList() {
  io.emit("live-list", Array.from(liveStreams));
}
function emitLivePresence(liveId) {
  const room = io.sockets.adapter.rooms.get(`live:${liveId}`);
  const count = room ? room.size : 0;
  io.to(`live:${liveId}`).emit("live:presence", { liveId, viewerCount: count });
}

/* ✅ LIVE MIC CONTROL (NEW, NON-BREAKING)
   - viewer asks mic -> host approves -> viewer becomes "speaker" (frontend uses this to enable publishing audio track)
*/
const liveSpeakers = new Map(); // liveId -> Set<userId>
const liveMicRequests = new Map(); // liveId -> Map<userId -> requestPayload>

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

/* ---------- CALLS: OFFLINE QUEUE + BUSY ---------- */
const pendingIncomingCalls = new Map(); // userId -> Map(roomId -> payload)
const userBusyRoom = new Map(); // userId -> roomId

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
    // ✅ keep your existing incoming event
    io.to(`user:${uid}`).emit("call:incoming", { ...payload, queued: true });

    // ✅ ring event (you already use this)
    io.to(`user:${uid}`).emit("call:ring", {
      roomId: String(payload.roomId),
      kind: payload.kind,
      side: "callee",
    });

    // ✅ ALSO compatibility alias (some UIs listen to this)
    io.to(`user:${uid}`).emit("call:ringing", {
      roomId: String(payload.roomId),
      kind: payload.kind,
      side: "callee",
      queued: true,
    });
  }
}

/* ---------- CALLS ---------- */
/**
 * callSessions (memory)
 * roomId -> {
 *   roomId, kind,
 *   hostUserId,
 *   invitedUserIds: Set<string>,
 *   joinedUserIds: Set<string>,
 *   createdAt,
 *   dbCallId: number|null,
 *   ringTimer: Timeout|null
 * }
 */
const callSessions = new Map();
const RING_TIMEOUT_MS = 30_000;

function makeCallRoomId(socket) {
  return `call-${socket.id}-${Date.now()}`;
}

function emitCallParticipants(roomId) {
  const sess = callSessions.get(String(roomId));
  if (!sess) return;

  const invited = Array.from(sess.invitedUserIds || []);
  const joined = Array.from(sess.joinedUserIds || []);

  io.to(`call:${roomId}`).emit("call:participants", {
    roomId: String(roomId),
    hostUserId: sess.hostUserId,
    kind: sess.kind,
    invitedUserIds: invited,
    joinedUserIds: joined,
  });
}

/* ======= RING HELPERS (server signals; client plays audio) ======= */
function ringToUser(userId, roomId, kind, side) {
  io.to(`user:${String(userId)}`).emit("call:ring", {
    roomId: String(roomId),
    kind: String(kind),
    side: side || "unknown", // "caller" | "callee"
  });

  // ✅ compatibility alias
  io.to(`user:${String(userId)}`).emit("call:ringing", {
    roomId: String(roomId),
    kind: String(kind),
    side: side || "unknown",
  });
}
function stopRingToUser(userId, roomId) {
  io.to(`user:${String(userId)}`).emit("call:stopRing", { roomId: String(roomId) });
}
function stopRingForSession(sess) {
  if (!sess) return;
  for (const uid of sess.invitedUserIds || []) stopRingToUser(uid, sess.roomId);
}

/* ======= BUSY HELPERS ======= */
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
  for (const uid of sess.invitedUserIds || []) clearUserBusy(uid, sess.roomId);
}

/* ======= OPTIONAL: DB "incoming call" notify (offline-friendly) ======= */
async function dbNotifyIncomingCall(userId, payload) {
  try {
    await pool.query(
      `INSERT INTO notifications (user_id, type, payload)
       VALUES ($1, 'incoming_call', $2::jsonb)`,
      [Number(userId), JSON.stringify(payload)]
    );
  } catch {
    // ignore if table doesn't exist / schema differs
  }
}

async function dbEnsureCall(roomId, kind, hostUserId) {
  // returns dbCallId or null
  try {
    const r = await pool.query(`SELECT id FROM calls WHERE room_id=$1 LIMIT 1`, [String(roomId)]);
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

async function dbMarkMissedAndNotify(callId, roomId, hostUserId, kind, userId) {
  try {
    await pool.query(
      `UPDATE call_participants
       SET status='missed'
       WHERE call_id=$1 AND user_id=$2 AND status IN ('invited')`,
      [Number(callId), Number(userId)]
    );

    await pool.query(
      `INSERT INTO notifications (user_id, type, payload)
       VALUES ($1, 'missed_call', $2::jsonb)`,
      [
        Number(userId),
        JSON.stringify({
          roomId: String(roomId),
          fromUserId: String(hostUserId),
          kind: String(kind),
        }),
      ]
    );

    // realtime push if online
    io.to(`user:${userId}`).emit("notification:new", {
      type: "missed_call",
      payload: { roomId: String(roomId), fromUserId: String(hostUserId), kind: String(kind) },
    });
  } catch (e) {
    logERR("DB missed notify error:", e);
  }
}

async function dbActivateIfTwoJoined(callId) {
  try {
    const j = await pool.query(
      `SELECT COUNT(*)::int AS n FROM call_participants WHERE call_id=$1 AND status='joined'`,
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

  if (sess.ringTimer) clearTimeout(sess.ringTimer);

  sess.ringTimer = setTimeout(async () => {
    const s = callSessions.get(String(roomId));
    if (!s) return;

    const callId = s.dbCallId;

    if (callId) {
      for (const uid of s.invitedUserIds) {
        if (uid === s.hostUserId) continue;
        if (s.joinedUserIds.has(uid)) continue;
        await dbMarkMissedAndNotify(callId, roomId, s.hostUserId, s.kind, uid);
      }

      try {
        await pool.query(
          `UPDATE calls
           SET status=CASE WHEN status='ringing' THEN 'missed' ELSE status END,
               ended_at=CASE WHEN ended_at IS NULL AND status='ringing' THEN NOW() ELSE ended_at END
           WHERE id=$1`,
          [Number(callId)]
        );
      } catch {}
    }

    // stop ringing for everyone + unlock busy
    stopRingForSession(s);
    clearBusyForSession(s);

    // cleanup queued incoming
    for (const uid of s.invitedUserIds || []) removeQueuedIncomingCall(uid, s.roomId);

    // delete session if never became active
    const room = io.sockets.adapter.rooms.get(`call:${roomId}`);
    const count = room ? room.size : 0;
    if (count < 2) callSessions.delete(String(roomId));

    // ✅ tell UIs call ended (nice UX)
    io.to(`call:${roomId}`).emit("call:ended", { roomId: String(roomId), reason: "timeout" });
  }, RING_TIMEOUT_MS);

  callSessions.set(String(roomId), sess);
}

io.on("connection", (socket) => {
  logSOCK("Socket connected:", socket.id);
  socket.data.user = null;

  /* =========================
     ✅ PRESENCE (NEW)
  ========================= */
  socket.on("user:online", ({ userId }) => {
    if (!userId) return;

    socket.data.user = socket.data.user || { id: String(userId), username: `User${userId}` };
    onlineUsers.set(String(userId), socket.id);
    socket.join(`user:${userId}`);

    emitPresenceList(socket);
    broadcastPresenceUpdate(userId, true);
    emitOnlineUsersLegacy();

    // ✅ deliver queued offline calls when user comes online
    flushQueuedIncomingCallsToUser(userId);
  });

  socket.on("presence:get", () => {
    emitPresenceList(socket);
  });

  /* =========================
     ✅ PRESENCE (OLD COMPAT)
  ========================= */
  socket.on("register-user", (user) => {
    const userId = typeof user === "object" ? user?.id : user;
    const username = typeof user === "object" ? user?.username : null;
    if (!userId) return;

    socket.data.user = { id: String(userId), username: username || `User${userId}` };

    onlineUsers.set(String(userId), socket.id);
    socket.join(`user:${userId}`);

    emitPresenceList(socket);
    broadcastPresenceUpdate(userId, true);
    emitOnlineUsersLegacy();

    // ✅ deliver queued offline calls when user comes online
    flushQueuedIncomingCallsToUser(userId);
  });

  /* =========================
     CHAT
  ========================= */
  socket.on("join-room", (room) => room && socket.join(String(room)));

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

  // older chat event support
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
     ✅ CALLS: 1:1 (UPGRADED)
     - ringtone events (caller + callee)
     - offline queue
     - busy protection
     - compatibility fields
  ========================= */

  // 1:1 dashboard caller
  socket.on("call:request", async ({ toUserId, kind = "audio" }) => {
    const from = socket.data.user;
    if (!from?.id)
      return socket.emit("call:error", { message: "Not online. Emit user:online first." });

    const calleeUserId = String(toUserId);
    const callKind = kind === "video" ? "video" : "audio";

    logCALL("call:request", { from: from.id, to: calleeUserId, kind: callKind });

    // busy checks
    if (isUserBusy(from.id)) return socket.emit("call:error", { message: "You are already in a call." });
    if (isUserBusy(calleeUserId)) return socket.emit("call:busy", { message: "User is busy." });

    const roomId = makeCallRoomId(socket);

    const invitedUserIds = new Set([String(from.id), calleeUserId]);
    const joinedUserIds = new Set([String(from.id)]);

    const dbCallId = await dbEnsureCall(roomId, callKind, from.id);

    // host joins as joined
    if (dbCallId) {
      await dbUpsertParticipant(dbCallId, from.id, "host", "joined");
      await dbUpsertParticipant(dbCallId, calleeUserId, "member", "invited");
    }

    // ✅ incoming payload (kept) + added compatibility fields
    const incomingPayload = {
      roomId: String(roomId),
      kind: callKind,
      fromUserId: String(from.id),
      fromName: from.username || `User${from.id}`,
      isGroup: false,

      // ✅ compatibility fields many clients expect
      from: String(from.id),
      callerSocketId: socket.id,
    };

    callSessions.set(String(roomId), {
      roomId: String(roomId),
      kind: callKind,
      hostUserId: String(from.id),
      invitedUserIds,
      joinedUserIds,
      createdAt: Date.now(),
      dbCallId: dbCallId || null,
      ringTimer: null,
    });

    // lock busy for both users (even if callee offline: prevents spam)
    setUserBusy(from.id, roomId);
    setUserBusy(calleeUserId, roomId);

    scheduleMissedTimer(roomId);

    // caller UI: start ringing tone
    socket.emit("call:ringing", { roomId: String(roomId), kind: callKind });
    ringToUser(from.id, roomId, callKind, "caller");

    const calleeSocketId = onlineUsers.get(calleeUserId);

    if (!calleeSocketId) {
      // ✅ OFFLINE: queue it + optional DB notification
      queueIncomingCall(calleeUserId, incomingPayload);
      await dbNotifyIncomingCall(calleeUserId, incomingPayload);

      socket.emit("call:status", { roomId: String(roomId), calleeOnline: false });
      return;
    }

    // ✅ ONLINE: deliver popup + ring callee (to user room to cover multi-tabs)
    io.to(`user:${calleeUserId}`).emit("call:incoming", incomingPayload);
    ringToUser(calleeUserId, roomId, callKind, "callee");

    socket.emit("call:status", { roomId: String(roomId), calleeOnline: true });
  });

  /* =========================
     ✅ CALLS: GROUP (UPGRADED)
  ========================= */

  socket.on("call:group:create", async ({ toUserIds = [], kind = "video" }) => {
    const from = socket.data.user;
    if (!from?.id) return socket.emit("call:error", { message: "Not online." });

    if (isUserBusy(from.id)) return socket.emit("call:error", { message: "You are already in a call." });

    const roomId = makeCallRoomId(socket);
    const callKind = kind === "audio" ? "audio" : "video";

    const all = Array.from(new Set([String(from.id), ...toUserIds.map((x) => String(x))]));
    const invitedUserIds = new Set(all);
    const joinedUserIds = new Set([String(from.id)]);

    const dbCallId = await dbEnsureCall(roomId, callKind, from.id);

    if (dbCallId) {
      // host is joined
      await dbUpsertParticipant(dbCallId, from.id, "host", "joined");
      // invite others
      for (const uid of all) {
        if (uid === String(from.id)) continue;
        await dbUpsertParticipant(dbCallId, uid, "member", "invited");
      }
    }

    callSessions.set(String(roomId), {
      roomId: String(roomId),
      kind: callKind,
      hostUserId: String(from.id),
      invitedUserIds,
      joinedUserIds,
      createdAt: Date.now(),
      dbCallId: dbCallId || null,
      ringTimer: null,
    });

    // busy lock everyone invited (prevents double calls)
    for (const uid of invitedUserIds) setUserBusy(uid, roomId);

    scheduleMissedTimer(roomId);

    // host navigates immediately
    socket.emit("call:ringing", { roomId: String(roomId), kind: callKind, isGroup: true });
    ringToUser(from.id, roomId, callKind, "caller");

    // invite each callee (online -> realtime, offline -> queue)
    for (const uid of all) {
      if (uid === String(from.id)) continue;

      const payload = {
        roomId: String(roomId),
        kind: callKind,
        fromUserId: String(from.id),
        fromName: from.username || `User${from.id}`,
        isGroup: true,

        // compat
        from: String(from.id),
        callerSocketId: socket.id,
      };

      const targetSocketId = onlineUsers.get(uid);
      if (!targetSocketId) {
        queueIncomingCall(uid, payload);
        await dbNotifyIncomingCall(uid, payload);
        continue;
      }

      io.to(`user:${uid}`).emit("call:incoming", payload);
      ringToUser(uid, roomId, callKind, "callee");
    }
  });

  // invite more people mid-call
  socket.on("call:group:invite", async ({ roomId, toUserIds = [] }) => {
    const from = socket.data.user;
    if (!from?.id) return;

    const sess = callSessions.get(String(roomId));
    if (!sess) return socket.emit("call:error", { message: "Call session not found." });

    // only host can invite
    if (String(from.id) !== String(sess.hostUserId)) {
      socket.emit("call:error", { message: "Only host can invite." });
      return;
    }

    const add = toUserIds.map((x) => String(x));
    const newIds = [];

    for (const uid of add) {
      if (!uid) continue;
      if (sess.invitedUserIds.has(uid)) continue;
      sess.invitedUserIds.add(uid);
      newIds.push(uid);
    }

    callSessions.set(String(roomId), sess);
    scheduleMissedTimer(roomId);

    // busy lock new invitees
    for (const uid of newIds) setUserBusy(uid, roomId);

    // DB add invited
    if (sess.dbCallId) {
      for (const uid of newIds) {
        await dbUpsertParticipant(sess.dbCallId, uid, "member", "invited");
      }
    }

    // push incoming call popup (online) or queue (offline)
    for (const uid of newIds) {
      const payload = {
        roomId: String(roomId),
        kind: sess.kind,
        fromUserId: String(sess.hostUserId),
        fromName: `User${sess.hostUserId}`,
        isGroup: true,

        // compat
        from: String(sess.hostUserId),
        callerSocketId: null,
      };

      const targetSocketId = onlineUsers.get(uid);
      if (!targetSocketId) {
        queueIncomingCall(uid, payload);
        await dbNotifyIncomingCall(uid, payload);
        continue;
      }

      io.to(`user:${uid}`).emit("call:incoming", payload);
      ringToUser(uid, roomId, sess.kind, "callee");
    }

    // update participants list to the call room
    emitCallParticipants(roomId);
  });

  /* =========================
     ✅ CALLS: ACCEPT / JOIN / END (UPGRADED)
     - now notifies BOTH sides via user rooms too
  ========================= */

  socket.on("call:accept", async ({ roomId }) => {
    const sess = callSessions.get(String(roomId));
    if (!sess) return;

    const meId = socket.data.user?.id ? String(socket.data.user.id) : null;

    logCALL("call:accept", { roomId: String(roomId), by: meId });

    // stop ringing for everyone on accept
    stopRingForSession(sess);

    // ✅ notify call room (kept)
    io.to(`call:${roomId}`).emit("call:accepted", { roomId: String(roomId), kind: sess.kind });

    // ✅ notify user rooms (helps Dashboard ringtone/UI)
    for (const uid of sess.invitedUserIds || []) {
      io.to(`user:${uid}`).emit("call:accepted", { roomId: String(roomId), kind: sess.kind });
      stopRingToUser(uid, roomId);
    }
  });

  socket.on("call:reject", async ({ roomId }) => {
    const sess = callSessions.get(String(roomId));
    if (!sess) return;

    const myId = socket.data.user?.id ? String(socket.data.user.id) : null;
    logCALL("call:reject", { roomId: String(roomId), by: myId });

    // mark rejected in DB (optional)
    if (sess.dbCallId && myId) {
      try {
        await pool.query(
          `UPDATE call_participants
           SET status='rejected'
           WHERE call_id=$1 AND user_id=$2 AND status IN ('invited')`,
          [Number(sess.dbCallId), Number(myId)]
        );
      } catch {}
    }

    stopRingForSession(sess);
    clearBusyForSession(sess);

    for (const uid of sess.invitedUserIds || []) removeQueuedIncomingCall(uid, sess.roomId);

    // ✅ notify everyone
    io.to(`call:${roomId}`).emit("call:ended", { roomId: String(roomId), reason: "rejected" });
    for (const uid of sess.invitedUserIds || []) {
      io.to(`user:${uid}`).emit("call:rejected", { roomId: String(roomId) });
      io.to(`user:${uid}`).emit("call:ended", { roomId: String(roomId), reason: "rejected" });
      stopRingToUser(uid, roomId);
    }

    if (sess?.ringTimer) clearTimeout(sess.ringTimer);
    callSessions.delete(String(roomId));
  });

  // call page joins the call room (both sides + group members)
  socket.on("call:join", async ({ roomId }) => {
    const sess = callSessions.get(String(roomId));
    if (!sess) {
      socket.emit("call:error", { message: "Call session not found." });
      return;
    }

    const meId = socket.data.user?.id ? String(socket.data.user.id) : null;
    socket.join(`call:${roomId}`);

    if (meId) {
      sess.joinedUserIds.add(meId);
      callSessions.set(String(roomId), sess);

      // once user joined, remove their queued version
      removeQueuedIncomingCall(meId, roomId);

      // DB joined
      if (sess.dbCallId) {
        await dbMarkJoined(sess.dbCallId, meId);
        await dbActivateIfTwoJoined(sess.dbCallId);
      }
    }

    // presence
    const room = io.sockets.adapter.rooms.get(`call:${roomId}`);
    const count = room ? room.size : 0;

    io.to(`call:${roomId}`).emit("call:presence", { roomId: String(roomId), count });

    // ✅ Mesh handshake trigger: tell existing peers someone joined
    socket.to(`call:${roomId}`).emit("call:peer-joined", {
      roomId: String(roomId),
      peerSocketId: socket.id,
      peerUserId: meId,
    });

    // broadcast participants
    emitCallParticipants(roomId);

    // if 2+ joined, ready
    if (count >= 2) {
      stopRingForSession(sess);

      io.to(`call:${roomId}`).emit("call:ready", {
        roomId: String(roomId),
        kind: sess.kind,
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
      for (const uid of sess.invitedUserIds || []) removeQueuedIncomingCall(uid, sess.roomId);
      if (sess.ringTimer) clearTimeout(sess.ringTimer);

      // notify user rooms too
      for (const uid of sess.invitedUserIds || []) {
        io.to(`user:${uid}`).emit("call:ended", { roomId: String(roomId), reason: "ended" });
        stopRingToUser(uid, roomId);
      }
    }

    io.to(`call:${roomId}`).emit("call:ended", { roomId: String(roomId), reason: "ended" });
    callSessions.delete(String(roomId));
  });

  socket.on("call:cancel", async ({ roomId }) => {
    const sess = callSessions.get(String(roomId));
    if (!sess) return;

    logCALL("call:cancel", { roomId: String(roomId) });

    await dbEndCall(roomId);

    stopRingForSession(sess);
    clearBusyForSession(sess);

    for (const uid of sess.invitedUserIds || []) removeQueuedIncomingCall(uid, sess.roomId);

    io.to(`call:${roomId}`).emit("call:ended", { roomId: String(roomId), reason: "canceled" });

    // ✅ notify user rooms
    for (const uid of sess.invitedUserIds || []) {
      io.to(`user:${uid}`).emit("call:cancelled", { roomId: String(roomId) });
      io.to(`user:${uid}`).emit("call:ended", { roomId: String(roomId), reason: "canceled" });
      stopRingToUser(uid, roomId);
    }

    if (sess.ringTimer) clearTimeout(sess.ringTimer);
    callSessions.delete(String(roomId));
  });

  /* =========================
     ✅ CALLS: WebRTC RELAY
     - supports {to} for group mesh
     - still supports old broadcast (no to)
  ========================= */

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

    socket.to(`call:${roomId}`).emit("call:webrtc:offer", { roomId: String(roomId), offer });
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

    socket.to(`call:${roomId}`).emit("call:webrtc:answer", { roomId: String(roomId), answer });
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

    socket.to(`call:${roomId}`).emit("call:webrtc:ice", { roomId: String(roomId), candidate });
  });
   /* =========================
   ✅ LIVE: WebRTC RELAY (host<->viewer)
   - required because Live.vue uses "webrtc:*"
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
     LIVE STREAMING (kept)
     + ✅ MIC REQUEST/APPROVE added (new)
  ========================= */
  socket.on("live:create", ({ liveId }) => {
    if (!liveId) return;

    liveHosts.set(String(liveId), socket.id);
    liveStreams.add(String(liveId));
    emitLiveList();

    socket.join(`live:${liveId}`);
    io.to(`live:${liveId}`).emit("live:host", { liveId: String(liveId), hostSocketId: socket.id });

    // ✅ host is always a speaker
    const hostUserId = socket.data.user?.id ? String(socket.data.user.id) : null;
    if (hostUserId) ensureLiveSpeakerSet(liveId).add(hostUserId);

    emitLivePresence(String(liveId));
    logLIVE("live:create", { liveId: String(liveId), hostSocketId: socket.id });
  });

  socket.on("live:join", ({ liveId }) => {
    if (!liveId) return;

    socket.join(`live:${liveId}`);

    const hostSocketId = liveHosts.get(String(liveId)) || null;
    socket.emit("live:host", { liveId: String(liveId), hostSocketId });

    if (hostSocketId) {
      io.to(hostSocketId).emit("live:viewer-joined", {
        liveId: String(liveId),
        viewerSocketId: socket.id,
      });
    }

    // ✅ tell viewer whether they are allowed to speak
    const meId = socket.data.user?.id ? String(socket.data.user.id) : null;
    const speakers = ensureLiveSpeakerSet(liveId);
    socket.emit("live:mic:status", { liveId: String(liveId), canSpeak: meId ? speakers.has(meId) : false });

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

      // cleanup mic state
      liveSpeakers.delete(String(liveId));
      liveMicRequests.delete(String(liveId));

      logLIVE("live:end", { liveId: String(liveId) });
    }
  });

  socket.on("get-live-list", () => socket.emit("live-list", Array.from(liveStreams)));

  // ✅ NEW: viewer requests mic
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

    // host gets request popup/list
    io.to(hostSocketId).emit("live:mic:requested", payload);

    // viewer gets ack
    socket.emit("live:mic:requested:ack", { liveId: String(liveId), ok: true });

    logLIVE("live:mic:request", { liveId: String(liveId), userId: meId });
  });

  // ✅ NEW: host approves mic
  socket.on("live:mic:approve", ({ liveId, userId }) => {
    if (!liveId || !userId) return;

    const hostSocketId = liveHosts.get(String(liveId));
    if (hostSocketId !== socket.id) return; // only host

    const uid = String(userId);
    ensureLiveSpeakerSet(liveId).add(uid);

    const reqMap = ensureLiveRequestMap(liveId);
    reqMap.delete(uid);

    // notify user (all tabs)
    io.to(`user:${uid}`).emit("live:mic:approved", { liveId: String(liveId), ok: true });
    io.to(`user:${uid}`).emit("live:mic:status", { liveId: String(liveId), canSpeak: true });

    // notify room (optional; helpful for UI)
    io.to(`live:${liveId}`).emit("live:mic:speakers", {
      liveId: String(liveId),
      speakerUserIds: Array.from(ensureLiveSpeakerSet(liveId)),
    });

    logLIVE("live:mic:approve", { liveId: String(liveId), userId: uid });
  });

  // ✅ NEW: host denies mic
  socket.on("live:mic:deny", ({ liveId, userId, reason }) => {
    if (!liveId || !userId) return;

    const hostSocketId = liveHosts.get(String(liveId));
    if (hostSocketId !== socket.id) return; // only host

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

  // existing live relay (kept)
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

  /* =========================
     DISCONNECT CLEANUP
  ========================= */
  socket.on("disconnect", () => {
    // presence cleanup
    let offlineUserId = null;
    for (const [uid, sid] of onlineUsers.entries()) {
      if (sid === socket.id) {
        offlineUserId = uid;
        onlineUsers.delete(uid);
        break;
      }
    }

    // live cleanup if host
    for (const [liveId, hostSocketId] of liveHosts.entries()) {
      if (hostSocketId === socket.id) {
        io.to(`live:${liveId}`).emit("live:ended", { liveId });
        liveHosts.delete(liveId);
        liveStreams.delete(liveId);
        emitLiveList();

        // cleanup mic state
        liveSpeakers.delete(String(liveId));
        liveMicRequests.delete(String(liveId));
      }
    }

    if (offlineUserId) {
      broadcastPresenceUpdate(offlineUserId, false);
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
  logOK(`🔥 AddisGo Server running on port ${PORT}`);
});