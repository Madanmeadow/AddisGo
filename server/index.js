import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";
import pkg from "pg";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const { Pool } = pkg;

/* =====================================
   BASIC APP SETUP
===================================== */

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: "*",
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* =====================================
   DATABASE
===================================== */

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

pool.on("connect", () => {
  console.log("✅ PostgreSQL Connected");
});

/* =====================================
   FILE UPLOAD CONFIG
===================================== */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({ storage });

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* =====================================
   AUTH MIDDLEWARE
===================================== */

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.status(401).json({ error: "No token" });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid token" });
    req.user = user;
    next();
  });
}

/* =====================================
   AUTH ROUTES
===================================== */

app.post("/auth/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const hashed = await bcrypt.hash(password, 10);

    const result = await pool.query(
      "INSERT INTO users (username, email, password) VALUES ($1,$2,$3) RETURNING id, username",
      [username, email, hashed]
    );

    res.json(result.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Register failed" });
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query(
      "SELECT * FROM users WHERE email=$1",
      [email]
    );

    if (!result.rows.length)
      return res.status(400).json({ error: "User not found" });

    const user = result.rows[0];

    const valid = await bcrypt.compare(password, user.password);
    if (!valid)
      return res.status(400).json({ error: "Wrong password" });

    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: { id: user.id, username: user.username }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
});

/* =====================================
   POSTS
===================================== */

app.post("/posts", authenticateToken, upload.single("media"), async (req, res) => {
  try {
    const { content } = req.body;
    const mediaUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const result = await pool.query(
      "INSERT INTO posts (user_id, content, media_url) VALUES ($1,$2,$3) RETURNING *",
      [req.user.id, content, mediaUrl]
    );

    res.json(result.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Post failed" });
  }
});

app.get("/posts", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT posts.*, users.username
      FROM posts
      JOIN users ON posts.user_id = users.id
      ORDER BY posts.created_at DESC
    `);

    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Fetch posts failed" });
  }
});

/* =====================================
   SOCKET.IO REALTIME ENGINE
===================================== */

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const onlineUsers = new Map(); // userId -> socketId

io.on("connection", (socket) => {

  console.log("🔌 Connected:", socket.id);

  /* ===== REGISTER USER ===== */
  socket.on("register-user", (userId) => {
    onlineUsers.set(userId, socket.id);
    io.emit("online-users", Array.from(onlineUsers.entries()));
  });

  /* ===== GLOBAL CHAT ===== */
  socket.on("join-room", (room) => {
    socket.join(room);
  });

  socket.on("send-message", (data) => {
    io.to(data.room).emit("receive-message", data);
  });

  /* ===== VIDEO CALL SIGNALING ===== */
  socket.on("call-user", ({ to, offer }) => {
    io.to(to).emit("incoming-call", {
      offer,
      from: socket.id
    });
  });

  socket.on("answer-call", ({ to, answer }) => {
    io.to(to).emit("call-answered", { answer });
  });

  socket.on("ice-candidate", ({ to, candidate }) => {
    io.to(to).emit("ice-candidate", candidate);
  });

  socket.on("reject-call", ({ to }) => {
    io.to(to).emit("call-rejected");
  });

  socket.on("end-call", ({ to }) => {
    io.to(to).emit("call-ended");
  });
  socket.on("join-room", (room) => {
  socket.join(room);
  });

  socket.on("send-message", (data) => {
  io.to(data.room).emit("receive-message", data);
  });

  /* ===== DISCONNECT CLEANUP ===== */
  socket.on("disconnect", () => {
    for (let [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        break;
      }
    }

    io.emit("online-users", Array.from(onlineUsers.entries()));
    console.log("❌ Disconnected:", socket.id);
  });

});

/* =====================================
   HEALTH CHECK
===================================== */

app.get("/", (req, res) => {
  res.send("🚀 AddisGo backend running");
});

/* =====================================
   START SERVER
===================================== */

server.listen(PORT, () => {
  console.log(`🔥 AddisGo Server running on port ${PORT}`);
});