// server/index.js
import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import http from "http"
import path from "path"
import { fileURLToPath } from "url"
import { Server } from "socket.io"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"

import { pool } from "./db.js"

// Routes (ESM default exports)
import postsRoutes from "./routes/posts.routes.js"
import usersRoutes from "./routes/users.routes.js"
import conversationsRoutes from "./routes/conversations.routes.js"
import messagesRoutes from "./routes/messages.routes.js"
import uploadRoutes from "./routes/upload.routes.js";
dotenv.config()

/* =========================
   APP + SERVER
========================= */
const app = express()
const server = http.createServer(app)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PORT = process.env.PORT || 5000
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "*" // optional if you want to lock later

/* =========================
   MIDDLEWARE
========================= */
app.use(
  cors({
    origin: CLIENT_ORIGIN === "*" ? "*" : CLIENT_ORIGIN,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
  })
)

app.use(express.json({ limit: "15mb" }))
app.use(express.urlencoded({ extended: true }))

/* =========================
   STATIC UPLOADS
========================= */

// IMPORTANT: your upload routes save into server/uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")))
app.use("/api/upload", uploadRoutes);
/* =========================
   DB HEALTH (optional)
========================= */
pool.on("connect", () => console.log("✅ PostgreSQL Connected"))

/* =========================
   AUTH (register/login)
   NOTE: users table columns differ between setups.
   This code tries username, then name.
========================= */
function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username || user.name || user.email || `User${user.id}`
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  )
}

app.post("/auth/register", async (req, res) => {
  try {
    const { username, name, email, password } = req.body
    if (!email || !password) return res.status(400).json({ error: "Email and password required" })

    // pick a display field safely
    const display = username || name || email.split("@")[0]

    const hashed = await bcrypt.hash(password, 10)

    // Try insert into a common schema.
    // If your users table does NOT have username column, it will still work if it has "name".
    // If both exist, it fills both safely.
    let created
    try {
      created = await pool.query(
        `INSERT INTO users (username, email, password) VALUES ($1,$2,$3) RETURNING id, username, email`,
        [display, email, hashed]
      )
    } catch (e1) {
      // fallback for users(name,email,password)
      created = await pool.query(
        `INSERT INTO users (name, email, password) VALUES ($1,$2,$3) RETURNING id, name, email`,
        [display, email, hashed]
      )
    }

    const userRow = created.rows[0]
    const token = signToken(userRow)

    res.json({
      token,
      user: {
        id: userRow.id,
        username: userRow.username || userRow.name || userRow.email
      }
    })
  } catch (err) {
    console.error("REGISTER ERROR:", err)
    res.status(500).json({ error: "Register failed" })
  }
})

app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ error: "Email and password required" })

    const found = await pool.query(`SELECT * FROM users WHERE email=$1 LIMIT 1`, [email])
    if (!found.rows.length) return res.status(400).json({ error: "User not found" })

    const user = found.rows[0]
    const ok = await bcrypt.compare(password, user.password)
    if (!ok) return res.status(400).json({ error: "Wrong password" })

    const token = signToken(user)

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username || user.name || user.email
      }
    })
  } catch (err) {
    console.error("LOGIN ERROR:", err)
    res.status(500).json({ error: "Login failed" })
  }
})

/* =========================
   API ROUTES
========================= */
app.use("/posts", postsRoutes)
app.use("/users", usersRoutes)
app.use("/conversations", conversationsRoutes)
app.use("/messages", messagesRoutes)

/* =========================
   HEALTH
========================= */
app.get("/", (req, res) => res.send("🚀 AddisGo backend running"))

/* =========================
   SOCKET.IO (Realtime Engine)
   - online users
   - chat rooms + conversation rooms
   - message persistence to Postgres
   - live list events (lightweight)
========================= */
const io = new Server(server, {
  cors: {
    origin: CLIENT_ORIGIN === "*" ? "*" : CLIENT_ORIGIN,
    methods: ["GET", "POST"]
  }
})

const onlineUsers = new Map() // userId -> socketId
const liveStreams = new Set() // simple stream ids / user ids

io.on("connection", (socket) => {
  console.log("🔌 Socket connected:", socket.id)

  /* ===== USER PRESENCE ===== */
  socket.on("register-user", (userId) => {
    if (!userId) return
    onlineUsers.set(String(userId), socket.id)
    io.emit("online-users", Array.from(onlineUsers.entries()))
  })

  /* ===== ROOMS ===== */
  socket.on("join-room", (room) => {
    if (!room) return
    socket.join(String(room))
  })

  // Conversation room (DB-backed)
  socket.on("join-conversation", (conversationId) => {
    if (!conversationId) return
    socket.join(`conv:${conversationId}`)
  })

  /* ===== CHAT (simple room chat) ===== */
  socket.on("send-room-message", (data) => {
    // data: { room, from, text }
    if (!data?.room || !data?.text) return
    io.to(String(data.room)).emit("receive-room-message", {
      room: String(data.room),
      from: data.from || "user",
      text: String(data.text),
      created_at: new Date().toISOString()
    })
  })
  // =============================
// LIVE STREAMING (WebRTC + Chat)
// =============================

// Track who is host per liveId (in-memory MVP)
const liveHosts = new Map(); // liveId -> hostSocketId

function presenceEmit(liveId, io) {
  const room = io.sockets.adapter.rooms.get(`live:${liveId}`);
  const count = room ? room.size : 0;
  io.to(`live:${liveId}`).emit("live:presence", { liveId, viewerCount: count });
}

io.on("connection", (socket) => {
  // create live (host)
  socket.on("live:create", ({ liveId }) => {
    if (!liveId) return;
    socket.data.liveId = liveId;
    socket.data.role = "host";

    liveHosts.set(liveId, socket.id);

    socket.join(`live:${liveId}`);
    // Tell everyone in room who host is
    io.to(`live:${liveId}`).emit("live:host", { liveId, hostSocketId: socket.id });

    presenceEmit(liveId, io);
  });

  // join live (viewer)
  socket.on("live:join", ({ liveId }) => {
    if (!liveId) return;
    socket.data.liveId = liveId;
    socket.data.role = "viewer";

    socket.join(`live:${liveId}`);

    const hostSocketId = liveHosts.get(liveId) || null;
    socket.emit("live:host", { liveId, hostSocketId });

    // Notify host a viewer joined (host will create a peer connection)
    if (hostSocketId) {
      io.to(hostSocketId).emit("live:viewer-joined", {
        liveId,
        viewerSocketId: socket.id,
      });
    }

    presenceEmit(liveId, io);
  });

  socket.on("live:leave", ({ liveId }) => {
    if (!liveId) return;
    socket.leave(`live:${liveId}`);
    presenceEmit(liveId, io);
  });

  // Host ended live
  socket.on("live:end", ({ liveId }) => {
    if (!liveId) return;
    const hostSocketId = liveHosts.get(liveId);
    if (hostSocketId === socket.id) {
      io.to(`live:${liveId}`).emit("live:ended", { liveId });
      liveHosts.delete(liveId);
    }
  });

  // -----------------------------
  // WebRTC Signaling (relay)
  // -----------------------------
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

  // -----------------------------
  // Live chat
  // -----------------------------
  socket.on("live:chat", ({ liveId, message }) => {
    if (!liveId || !message) return;
    io.to(`live:${liveId}`).emit("live:chat", {
      liveId,
      from: socket.user ? { id: socket.user.id, username: socket.user.username } : null,
      message: String(message).slice(0, 500),
      at: new Date().toISOString(),
    });
  });

  socket.on("disconnect", () => {
    const liveId = socket.data?.liveId;
    const role = socket.data?.role;

    if (liveId) {
      // If host disconnected, end live
      if (role === "host" && liveHosts.get(liveId) === socket.id) {
        io.to(`live:${liveId}`).emit("live:ended", { liveId });
        liveHosts.delete(liveId);
      } else {
        const hostSocketId = liveHosts.get(liveId);
        if (hostSocketId) {
          io.to(hostSocketId).emit("live:viewer-left", { liveId, viewerSocketId: socket.id });
        }
      }
      presenceEmit(liveId, io);
    }
  });
});

  /* ===== DB-PERSISTED MESSAGES ===== */
  socket.on("send-message", async (data) => {
    // data: { conversationId, senderId, text }
    try {
      const conversationId = data?.conversationId
      const senderId = data?.senderId
      const text = data?.text?.trim()

      if (!conversationId || !senderId || !text) return

      // Save to DB
      const saved = await pool.query(
        `
        INSERT INTO messages (conversation_id, sender_id, text)
        VALUES ($1,$2,$3)
        RETURNING id, conversation_id, sender_id, text, media_url, created_at
        `,
        [conversationId, senderId, text]
      )

      // Emit to everyone in this conversation room
      io.to(`conv:${conversationId}`).emit("receive-message", saved.rows[0])
    } catch (err) {
      console.error("SOCKET send-message ERROR:", err)
      socket.emit("server-error", { error: "Message failed" })
    }
  })

  /* ===== LIVE (simple list) ===== */
  socket.on("start-live", ({ userId }) => {
    const id = userId ? String(userId) : socket.id
    liveStreams.add(id)
    io.emit("live-list", Array.from(liveStreams))
  })

  socket.on("stop-live", ({ userId }) => {
    const id = userId ? String(userId) : socket.id
    liveStreams.delete(id)
    io.emit("live-list", Array.from(liveStreams))
  })

  socket.on("get-live-list", () => {
    socket.emit("live-list", Array.from(liveStreams))
  })

  /* ===== DISCONNECT ===== */
  socket.on("disconnect", () => {
    // remove from online map
    for (const [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId)
        break
      }
    }

    // remove live if used socket.id as stream id
    liveStreams.delete(socket.id)

    io.emit("online-users", Array.from(onlineUsers.entries()))
    io.emit("live-list", Array.from(liveStreams))

    console.log("❌ Socket disconnected:", socket.id)
  })
})

/* =========================
   START
========================= */
server.listen(PORT, () => {
  console.log(`🔥 AddisGo Server running on port ${PORT}`)
})