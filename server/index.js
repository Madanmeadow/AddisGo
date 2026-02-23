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