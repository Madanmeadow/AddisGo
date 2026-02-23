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

import { pool } from "./db.js";

// Routes (ESM default exports)
import postsRoutes from "./routes/posts.routes.js";
import usersRoutes from "./routes/users.routes.js";
import conversationsRoutes from "./routes/conversations.routes.js";
import messagesRoutes from "./routes/messages.routes.js";
import uploadRoutes from "./routes/upload.routes.js";

dotenv.config();

/* =========================
   APP + SERVER
========================= */
const app = express();
const server = http.createServer(app);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 5000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "*"; // can be "https://addis-go.vercel.app"

/* =========================
   MIDDLEWARE
========================= */
app.use(
  cors({
    origin: CLIENT_ORIGIN === "*" ? "*" : CLIENT_ORIGIN.split(",").map(s => s.trim()),
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  })
);

app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true }));

/* =========================
   STATIC UPLOADS + UPLOAD API
========================= */
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/upload", uploadRoutes);

/* =========================
   DB HEALTH (optional)
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
    process.env.JWT_SECRET,
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
        `INSERT INTO users (username, email, password) VALUES ($1,$2,$3) RETURNING id, username, email`,
        [display, email, hashed]
      );
    } catch (e1) {
      created = await pool.query(
        `INSERT INTO users (name, email, password) VALUES ($1,$2,$3) RETURNING id, name, email`,
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
   API ROUTES
========================= */
app.use("/posts", postsRoutes);
app.use("/users", usersRoutes);
app.use("/conversations", conversationsRoutes);
app.use("/messages", messagesRoutes);

/* =========================
   HEALTH
========================= */
app.get("/", (req, res) => res.send("🚀 AddisGo backend running"));

/* =========================
   SOCKET.IO (Realtime Engine)
   ✅ FIXED: no nested connections
   ✅ Supports:
      - online users
      - room chat
      - DB conversation messages
      - LIVE one-to-many WebRTC signaling + chat
      - live-list for dashboard
========================= */
const io = new Server(server, {
  cors: {
    origin: CLIENT_ORIGIN === "*" ? "*" : CLIENT_ORIGIN.split(",").map(s => s.trim()),
    methods: ["GET", "POST"],
  },
});

const onlineUsers = new Map(); // userId -> socketId

// Live list for dashboard (ids)
const liveStreams = new Set(); // liveId strings

// WebRTC live: host per liveId
const liveHosts = new Map(); // liveId -> hostSocketId

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
  socket.data.liveId = null;
  socket.data.role = null;

  /* ===== USER PRESENCE ===== */
  socket.on("register-user", (user) => {
    const userId = typeof user === "object" ? user?.id : user;
    const username = typeof user === "object" ? user?.username : null;
    if (!userId) return;

    socket.data.user = { id: String(userId), username: username || `User${userId}` };
    onlineUsers.set(String(userId), socket.id);

    socket.join(`user:${userId}`);
    emitOnlineUsers();
  });

  /* ===== ROOMS ===== */
  socket.on("join-room", (room) => {
    if (!room) return;
    socket.join(String(room));
  });

  socket.on("join-conversation", (conversationId) => {
    if (!conversationId) return;
    socket.join(`conv:${conversationId}`);
  });

  socket.on("leave-conversation", (conversationId) => {
    if (!conversationId) return;
    socket.leave(`conv:${conversationId}`);
  });

  /* ===== ROOM CHAT (compat: send-message + send-room-message) ===== */
  function emitRoomMessage(data) {
    const room = data?.room;
    const text = data?.text?.trim();
    if (!room || !text) return;

    io.to(String(room)).emit("receive-message", {
      room: String(room),
      from: data.from || socket.data.user?.username || "user",
      text: String(text),
      created_at: new Date().toISOString(),
    });
  }

  socket.on("send-room-message", emitRoomMessage);

  /* ===== DB + ROOM MESSAGE (single event) ===== */
  socket.on("send-message", async (data) => {
    // If it looks like room chat, handle it
    if (data?.room && data?.text) {
      emitRoomMessage(data);
      return;
    }

    // Otherwise: DB conversation message
    try {
      const conversationId = data?.conversationId;
      const senderId = data?.senderId;
      const text = data?.text?.trim();

      if (!conversationId || !senderId || !text) return;

      const saved = await pool.query(
        `
        INSERT INTO messages (conversation_id, sender_id, text)
        VALUES ($1,$2,$3)
        RETURNING id, conversation_id, sender_id, text, media_url, created_at
        `,
        [conversationId, senderId, text]
      );

      io.to(`conv:${conversationId}`).emit("receive-message", saved.rows[0]);
    } catch (err) {
      console.error("SOCKET send-message ERROR:", err);
      socket.emit("server-error", { error: "Message failed" });
    }
  });

  /* =========================
     LIVE STREAMING (WebRTC One-to-Many) + Chat
  ========================= */

  // Host starts live
  socket.on("live:create", ({ liveId }) => {
    if (!liveId) return;

    socket.data.liveId = liveId;
    socket.data.role = "host";

    liveHosts.set(liveId, socket.id);

    // show in dashboard list
    liveStreams.add(String(liveId));
    emitLiveList();

    socket.join(`live:${liveId}`);
    io.to(`live:${liveId}`).emit("live:host", { liveId, hostSocketId: socket.id });

    emitLivePresence(liveId);
  });

  // Viewer joins live
  socket.on("live:join", ({ liveId }) => {
    if (!liveId) return;

    socket.data.liveId = liveId;
    socket.data.role = "viewer";

    socket.join(`live:${liveId}`);

    const hostSocketId = liveHosts.get(liveId) || null;
    socket.emit("live:host", { liveId, hostSocketId });

    if (hostSocketId) {
      io.to(hostSocketId).emit("live:viewer-joined", {
        liveId,
        viewerSocketId: socket.id,
      });
    }

    emitLivePresence(liveId);
  });

  socket.on("live:leave", ({ liveId }) => {
    if (!liveId) return;
    socket.leave(`live:${liveId}`);
    emitLivePresence(liveId);
  });

  // Host ends live
  socket.on("live:end", ({ liveId }) => {
    if (!liveId) return;

    const hostSocketId = liveHosts.get(liveId);
    if (hostSocketId === socket.id) {
      io.to(`live:${liveId}`).emit("live:ended", { liveId });

      liveHosts.delete(liveId);

      liveStreams.delete(String(liveId));
      emitLiveList();
    }
  });

  // Live chat
  socket.on("live:chat", ({ liveId, message }) => {
    if (!liveId || !message) return;

    io.to(`live:${liveId}`).emit("live:chat", {
      liveId,
      from: socket.data.user
        ? { id: socket.data.user.id, username: socket.data.user.username }
        : { id: "anon", username: "Anon" },
      message: String(message).slice(0, 700),
      at: new Date().toISOString(),
    });
  });

  // WebRTC signaling relay
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

  /* ===== LEGACY LIVE LIST (keep old buttons safe) ===== */
  socket.on("start-live", ({ userId }) => {
    const id = userId ? String(userId) : socket.id;
    liveStreams.add(id);
    emitLiveList();
  });

  socket.on("stop-live", ({ userId }) => {
    const id = userId ? String(userId) : socket.id;
    liveStreams.delete(id);
    emitLiveList();
  });

  socket.on("get-live-list", () => {
    socket.emit("live-list", Array.from(liveStreams));
  });

  /* ===== DISCONNECT ===== */
  socket.on("disconnect", () => {
    // remove from online users map
    for (const [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        break;
      }
    }

    // clean live host
    const liveId = socket.data?.liveId;
    const role = socket.data?.role;

    if (liveId) {
      if (role === "host" && liveHosts.get(liveId) === socket.id) {
        io.to(`live:${liveId}`).emit("live:ended", { liveId });
        liveHosts.delete(liveId);

        liveStreams.delete(String(liveId));
        emitLiveList();
      } else if (role === "viewer") {
        const hostSocketId = liveHosts.get(liveId);
        if (hostSocketId) {
          io.to(hostSocketId).emit("live:viewer-left", {
            liveId,
            viewerSocketId: socket.id,
          });
        }
      }
      emitLivePresence(liveId);
    }

    // remove legacy live id if socket.id was used
    liveStreams.delete(socket.id);

    emitOnlineUsers();
    emitLiveList();

    console.log("❌ Socket disconnected:", socket.id);
  });
});

/* =========================
   START
========================= */
server.listen(PORT, () => {
  console.log(`🔥 AddisGo Server running on port ${PORT}`);
});