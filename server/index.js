/* =========================================================
   🔥 ADDISGO BACKEND CORE
   Express + PostgreSQL + Auth + Upload + Realtime + WebRTC
========================================================= */

import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import pkg from "pg";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import multer from "multer";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

dotenv.config();

const { Pool } = pkg;
const app = express();
const server = http.createServer(app);

/* =========================================================
   🔐 ENV CHECK
========================================================= */

if (!process.env.JWT_SECRET) {
  console.error("❌ JWT_SECRET missing in environment");
  process.exit(1);
}

/* =========================================================
   🌍 MIDDLEWARE
========================================================= */

app.use(cors({
  origin: "*",
  credentials: true
}));

app.use(express.json({ limit: "10mb" }));

/* =========================================================
   📁 ES MODULE PATH FIX
========================================================= */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* =========================================================
   📂 UPLOAD FOLDER
========================================================= */

const uploadPath = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath);
}

app.use("/uploads", express.static(uploadPath));

/* =========================================================
   🗄 DATABASE
========================================================= */

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production"
    ? { rejectUnauthorized: false }
    : false
});

pool.connect()
  .then(() => console.log("✅ PostgreSQL Connected"))
  .catch(err => console.error("❌ DB Connection Error:", err));

/* =========================================================
   📤 FILE UPLOAD
========================================================= */

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadPath),
  filename: (_, file, cb) =>
    cb(null, Date.now() + "-" + file.originalname)
});

const upload = multer({ storage });

/* =========================================================
   🔐 AUTH MIDDLEWARE
========================================================= */

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: "Invalid token" });

    req.user = user;
    next();
  });
}

/* =========================================================
   🔌 SOCKET.IO
========================================================= */

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// userId -> socketId
const onlineUsers = new Map();

io.on("connection", (socket) => {
  console.log("🔌 Connected:", socket.id);

  /* ===============================
     REGISTER USER ONLINE
  ================================ */
  socket.on("register-user", (userId) => {
    onlineUsers.set(userId, socket.id);

    io.emit("online-users", Array.from(onlineUsers.keys()));
  });

  /* ===============================
     REAL-TIME CHAT
  ================================ */
  socket.on("send-message", ({ room, message }) => {
    io.to(room).emit("receive-message", message);
  });

  /* ===============================
     VIDEO CALL SIGNALING
  ================================ */

  socket.on("call-user", ({ toUserId, fromUserId, offer }) => {
    const targetSocket = onlineUsers.get(toUserId);

    if (targetSocket) {
      io.to(targetSocket).emit("incoming-call", {
        fromUserId,
        offer
      });
    }
  });

  socket.on("answer-call", ({ toUserId, answer }) => {
    const targetSocket = onlineUsers.get(toUserId);

    if (targetSocket) {
      io.to(targetSocket).emit("call-answered", { answer });
    }
  });

  socket.on("disconnect", () => {
    for (const [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        break;
      }
    }

    io.emit("online-users", Array.from(onlineUsers.keys()));
    console.log("❌ Disconnected:", socket.id);
  });
});

/* =========================================================
   🌐 ROUTES
========================================================= */

app.get("/", (_, res) => {
  res.json({ status: "🔥 AddisGo Server Running" });
});

/* ---------------- AUTH ---------------- */

app.post("/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existing = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await pool.query(
      `INSERT INTO users (name, email, password)
       VALUES ($1, $2, $3)
       RETURNING id, name, email`,
      [name, email, hashedPassword]
    );

    res.status(201).json(newUser.rows[0]);

  } catch (err) {
    console.error("Register Error:", err);
    res.status(500).json({ message: "Registration failed" });
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (user.rows.length === 0) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(
      password,
      user.rows[0].password
    );

    if (!valid) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user.rows[0].id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id: user.rows[0].id,
        name: user.rows[0].name,
        email: user.rows[0].email
      }
    });

  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ message: "Login failed" });
  }
});

/* ---------------- POSTS ---------------- */

app.post(
  "/posts",
  authenticateToken,
  upload.single("file"),
  async (req, res) => {
    try {
      const { content } = req.body;
      const user_id = req.user.id;

      let image_url = null;
      let video_url = null;

      if (req.file) {
        if (req.file.mimetype.startsWith("image")) {
          image_url = `/uploads/${req.file.filename}`;
        } else if (req.file.mimetype.startsWith("video")) {
          video_url = `/uploads/${req.file.filename}`;
        }
      }

      const result = await pool.query(
        `INSERT INTO posts (user_id, caption, image_url, video_url)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [user_id, content, image_url, video_url]
      );

      res.status(201).json(result.rows[0]);

    } catch (err) {
      console.error("Post Error:", err);
      res.status(500).json({ message: "Post failed" });
    }
  }
);

app.get("/posts", authenticateToken, async (_, res) => {
  try {
    const posts = await pool.query(
      `SELECT posts.*, users.name
       FROM posts
       JOIN users ON posts.user_id = users.id
       ORDER BY posts.created_at DESC`
    );

    res.json(posts.rows);

  } catch (err) {
    console.error("Fetch Posts Error:", err);
    res.status(500).json({ message: "Failed to fetch posts" });
  }
});

/* =========================================================
   🚀 START SERVER
========================================================= */

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 AddisGo backend running on port ${PORT}`);
});