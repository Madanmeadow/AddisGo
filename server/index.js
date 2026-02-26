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
app.set("trust proxy", 1); // ✅ Railway / proxy awareness

const corsOptions = {
  origin: (origin, cb) => {
    // Allow non-browser tools (Postman, curl)
    if (!origin) return cb(null, true);

    // If CLIENT_ORIGIN="*" allow all (but must NOT return "*" when credentials=true)
    if (CLIENT_ORIGIN === "*" || ORIGINS === "*") return cb(null, true);

    // Otherwise allow only configured origins
    if (Array.isArray(ORIGINS) && ORIGINS.includes(origin)) return cb(null, true);

    return cb(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // ✅ Safari/preflight friendly

app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true }));

/* =========================
   STATIC UPLOADS + ROUTES
========================= */
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ✅ no /api
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
    console.error("DB ensure call error:", e);
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
    console.error("DB upsert participant error:", e);
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
    console.error("DB mark joined error:", e);
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
      [Number(userId), JSON.stringify({ roomId: String(roomId), fromUserId: String(hostUserId), kind: String(kind) })]
    );

    // realtime push if online
    io.to(`user:${userId}`).emit("notification:new", {
      type: "missed_call",
      payload: { roomId: String(roomId), fromUserId: String(hostUserId), kind: String(kind) },
    });
  } catch (e) {
    console.error("DB missed notify error:", e);
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
    console.error("DB activate error:", e);
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
    console.error("DB end call error:", e);
  }
}

function scheduleMissedTimer(roomId) {
  const sess = callSessions.get(String(roomId));
  if (!sess) return;

  if (sess.ringTimer) clearTimeout(sess.ringTimer);

  sess.ringTimer = setTimeout(async () => {
    const s = callSessions.get(String(roomId));
    if (!s) return;

    // if nobody joined besides host, or some invited never joined -> mark missed
    const callId = s.dbCallId;
    if (!callId) return;

    for (const uid of s.invitedUserIds) {
      if (uid === s.hostUserId) continue;
      if (s.joinedUserIds.has(uid)) continue;

      await dbMarkMissedAndNotify(callId, roomId, s.hostUserId, s.kind, uid);
    }

    // if call never became active, mark call status missed (optional)
    try {
      await pool.query(
        `UPDATE calls
         SET status=CASE WHEN status='ringing' THEN 'missed' ELSE status END,
             ended_at=CASE WHEN ended_at IS NULL AND status='ringing' THEN NOW() ELSE ended_at END
         WHERE id=$1`,
        [Number(callId)]
      );
    } catch {}

    // keep session in memory or delete it; we’ll delete if not active
    const room = io.sockets.adapter.rooms.get(`call:${roomId}`);
    const count = room ? room.size : 0;
    if (count < 2) {
      callSessions.delete(String(roomId));
    }
  }, RING_TIMEOUT_MS);

  callSessions.set(String(roomId), sess);
}

io.on("connection", (socket) => {
  console.log("🔌 Socket connected:", socket.id);
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
     ✅ CALLS: 1:1 (kept working)
  ========================= */

  // 1:1 dashboard caller
  socket.on("call:request", async ({ toUserId, kind = "audio" }) => {
    const from = socket.data.user;
    if (!from?.id) return socket.emit("call:error", { message: "Not online. Emit user:online first." });

    const calleeUserId = String(toUserId);
    const calleeSocketId = onlineUsers.get(calleeUserId);

    if (!calleeSocketId) {
      socket.emit("call:error", { message: "User is offline." });
      return;
    }

    const roomId = makeCallRoomId(socket);
    const callKind = kind === "video" ? "video" : "audio";

    const invitedUserIds = new Set([String(from.id), calleeUserId]);
    const joinedUserIds = new Set([String(from.id)]);

    const dbCallId = await dbEnsureCall(roomId, callKind, from.id);

    // host joins as joined
    if (dbCallId) {
      await dbUpsertParticipant(dbCallId, from.id, "host", "joined");
      await dbUpsertParticipant(dbCallId, calleeUserId, "member", "invited");
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

    scheduleMissedTimer(roomId);

    socket.emit("call:ringing", { roomId: String(roomId), kind: callKind });

    io.to(`user:${calleeUserId}`).emit("call:incoming", {
      roomId: String(roomId),
      kind: callKind,
      fromUserId: String(from.id),
      fromName: from.username || `User${from.id}`,
      isGroup: false,
    });
  });

  /* =========================
     ✅ CALLS: GROUP (NEW)
     - call:group:create
     - call:group:invite
  ========================= */

  socket.on("call:group:create", async ({ toUserIds = [], kind = "video" }) => {
    const from = socket.data.user;
    if (!from?.id) return socket.emit("call:error", { message: "Not online." });

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

    scheduleMissedTimer(roomId);

    // host navigates immediately
    socket.emit("call:ringing", { roomId: String(roomId), kind: callKind, isGroup: true });

    // invite each callee (only if online)
    for (const uid of all) {
      if (uid === String(from.id)) continue;

      const targetSocketId = onlineUsers.get(uid);
      if (!targetSocketId) continue;

      io.to(`user:${uid}`).emit("call:incoming", {
        roomId: String(roomId),
        kind: callKind,
        fromUserId: String(from.id),
        fromName: from.username || `User${from.id}`,
        isGroup: true,
      });
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

    // DB add invited
    if (sess.dbCallId) {
      for (const uid of newIds) {
        await dbUpsertParticipant(sess.dbCallId, uid, "member", "invited");
      }
    }

    // push incoming call popup
    for (const uid of newIds) {
      const targetSocketId = onlineUsers.get(uid);
      if (!targetSocketId) continue;

      io.to(`user:${uid}`).emit("call:incoming", {
        roomId: String(roomId),
        kind: sess.kind,
        fromUserId: String(sess.hostUserId),
        fromName: `User${sess.hostUserId}`,
        isGroup: true,
      });
    }

    // update participants list to the call room
    emitCallParticipants(roomId);
  });

  /* =========================
     ✅ CALLS: ACCEPT / JOIN / END
  ========================= */

  socket.on("call:accept", async ({ roomId }) => {
    const sess = callSessions.get(String(roomId));
    if (!sess) return;

    // accept is UI-level, we keep it as a signal to caller/room
    io.to(`call:${roomId}`).emit("call:accepted", { roomId: String(roomId), kind: sess.kind });
  });

  socket.on("call:reject", async ({ roomId }) => {
    const sess = callSessions.get(String(roomId));
    if (!sess) return;

    const myId = socket.data.user?.id ? String(socket.data.user.id) : null;

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

    // tell call room
    io.to(`call:${roomId}`).emit("call:ended", { roomId: String(roomId), reason: "rejected" });
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

    // if 2+ joined, ready (your Call.vue uses this)
    if (count >= 2) {
      io.to(`call:${roomId}`).emit("call:ready", {
        roomId: String(roomId),
        kind: sess.kind,
      });
    }
  });

  socket.on("call:end", async ({ roomId }) => {
    const sess = callSessions.get(String(roomId));

    // DB end call
    await dbEndCall(roomId);

    // end for everyone
    io.to(`call:${roomId}`).emit("call:ended", { roomId: String(roomId), reason: "ended" });

    if (sess?.ringTimer) clearTimeout(sess.ringTimer);
    callSessions.delete(String(roomId));
  });

  socket.on("call:cancel", async ({ roomId }) => {
    const sess = callSessions.get(String(roomId));
    if (!sess) return;

    // end + mark ended
    await dbEndCall(roomId);
    io.to(`call:${roomId}`).emit("call:ended", { roomId: String(roomId), reason: "canceled" });

    if (sess.ringTimer) clearTimeout(sess.ringTimer);
    callSessions.delete(String(roomId));
  });

  /* =========================
     ✅ CALLS: WebRTC RELAY
     - Now supports {to} for group mesh
     - Still supports old broadcast (no to)
  ========================= */

  socket.on("call:webrtc:offer", ({ roomId, offer, to }) => {
    if (!roomId || !offer) return;

    // NEW: targeted signaling
    if (to) {
      io.to(String(to)).emit("call:webrtc:offer", {
        roomId: String(roomId),
        offer,
        from: socket.id,
      });
      return;
    }

    // OLD: broadcast to room (1:1 still works)
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
     LIVE STREAMING (unchanged)
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
      }
    }

    if (offlineUserId) {
      broadcastPresenceUpdate(offlineUserId, false);
    }

    emitPresenceList();
    emitOnlineUsersLegacy();

    console.log("❌ Socket disconnected:", socket.id);
  });
});

/* =========================
   START
========================= */
server.listen(PORT, () => {
  console.log(`🔥 AddisGo Server running on port ${PORT}`);
});