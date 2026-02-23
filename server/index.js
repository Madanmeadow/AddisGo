import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import http from "http"
import { Server } from "socket.io"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import path from "path"
import { fileURLToPath } from "url"

import { pool } from "./db.js"
import postsRoutes from "./routes/posts.routes.js"

dotenv.config()

const app = express()
const server = http.createServer(app)

const PORT = process.env.PORT || 5000

/* ================= MIDDLEWARE ================= */
app.use(cors({ origin: "*", credentials: true }))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

/* ================= STATIC UPLOADS ================= */
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
app.use("/uploads", express.static(path.join(__dirname, "uploads")))

/* ================= AUTH ROUTES ================= */
app.post("/auth/register", async (req, res) => {
  try {
    const { username, email, password } = req.body
    const hashedPassword = await bcrypt.hash(password, 10)

    const result = await pool.query(
      "INSERT INTO users (username, email, password) VALUES ($1,$2,$3) RETURNING id, username",
      [username, email, hashedPassword]
    )

    res.json(result.rows[0])
  } catch (err) {
    console.error("REGISTER ERROR:", err)
    res.status(500).json({ error: "Register failed" })
  }
})

app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body

    const result = await pool.query("SELECT * FROM users WHERE email=$1", [email])
    if (!result.rows.length) return res.status(400).json({ error: "User not found" })

    const user = result.rows[0]
    const valid = await bcrypt.compare(password, user.password)
    if (!valid) return res.status(400).json({ error: "Wrong password" })

    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    )

    res.json({ token, user: { id: user.id, username: user.username } })
  } catch (err) {
    console.error("LOGIN ERROR:", err)
    res.status(500).json({ error: "Login failed" })
  }
})

/* ================= ROUTES ================= */
app.use("/posts", postsRoutes)

/* ================= SOCKET.IO ================= */
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
})

const onlineUsers = new Map() // userId -> socketId

io.on("connection", (socket) => {
  console.log("🔌 Connected:", socket.id)

  socket.on("register-user", (userId) => {
    onlineUsers.set(String(userId), socket.id)
    io.emit("online-users", Array.from(onlineUsers.entries()))
  })

  // Chat rooms
  socket.on("join-room", (room) => socket.join(room))
  socket.on("send-message", (data) => io.to(data.room).emit("receive-message", data))

  // Video call signaling
  socket.on("call-user", ({ to, offer }) => io.to(to).emit("incoming-call", { offer, from: socket.id }))
  socket.on("answer-call", ({ to, answer }) => io.to(to).emit("call-answered", { answer }))
  socket.on("ice-candidate", ({ to, candidate }) => io.to(to).emit("ice-candidate", candidate))
  socket.on("end-call", ({ to }) => io.to(to).emit("call-ended"))

  socket.on("disconnect", () => {
    for (const [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId)
        break
      }
    }
    io.emit("online-users", Array.from(onlineUsers.entries()))
    console.log("❌ Disconnected:", socket.id)
  })
})

/* ================= HEALTH ================= */
app.get("/", (req, res) => res.send("🚀 AddisGo backend running"))

server.listen(PORT, () => console.log(`🔥 AddisGo running on port ${PORT}`))