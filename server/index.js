/* =========================================================
   🔥 ADDISGO BACKEND
   Express + PostgreSQL + JWT + Upload + Chat + WebRTC
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
   SOCKET.IO SETUP
========================================================= */

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

/* =========================================================
   SOCKET CONNECTION (CHAT + VIDEO CALL SIGNALING)
========================================================= */

io.on("connection", (socket) => {
  console.log("🔌 User connected:", socket.id);

  // Join global chat room
  socket.on("join-room", (room) => {
    socket.join(room);
  });

  /* -------------------------
     REAL-TIME CHAT
  -------------------------- */
  socket.on("send-message", (data) => {
    io.to(data.room).emit("receive-message", data);
  });

  /* -------------------------
     🔥 VIDEO CALL SIGNALING
  -------------------------- */

  // Caller sends offer
  socket.on("call-user", (data) => {
    socket.to(data.to).emit("incoming-call", {
      offer: data.offer,
      from: socket.id
    });
  });

  // Receiver answers
  socket.on("answer-call", (data) => {
    socket.to(data.to).emit("call-answered", {
      answer: data.answer
    });
  });

  // ICE candidates exchange
  socket.on("ice-candidate", (data) => {
    socket.to(data.to).emit("ice-candidate", data.candidate);
  });

  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
  });
});

/* =========================================================
   BASIC MIDDLEWARE
========================================================= */

app.use(cors());
app.use(express.json());

/* =========================================================
   ES MODULE PATH FIX
========================================================= */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* =========================================================
   ENSURE UPLOADS FOLDER EXISTS
========================================================= */

if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* =========================================================
   DATABASE CONNECTION
========================================================= */

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production"
    ? { rejectUnauthorized: false }
    : false
});

pool.connect()
  .then(() => console.log("✅ PostgreSQL Connected"))
  .catch((err) => console.error("❌ DB Error:", err));

/* =========================================================
   FILE UPLOAD CONFIG
========================================================= */

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) =>
    cb(null, Date.now() + "-" + file.originalname)
});

const upload = multer({ storage });

/* =========================================================
   AUTH MIDDLEWARE
========================================================= */

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token)
    return res.status(401).json({ message: "Access denied" });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err)
      return res.status(403).json({ message: "Invalid token" });

    req.user = user;
    next();
  });
}

/* =========================================================
   ROUTES
========================================================= */

app.get("/", (req, res) => {
  res.json({ message: "🔥 AddisGo Server Running" });
});

/* ---------------- AUTH ---------------- */

app.post("/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existing = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (existing.rows.length > 0)
      return res.status(400).json({ message: "Email already exists" });

    const hashed = await bcrypt.hash(password, 10);

    const user = await pool.query(
      `INSERT INTO users (name, email, password)
       VALUES ($1, $2, $3)
       RETURNING id, name, email`,
      [name, email, hashed]
    );

    res.status(201).json(user.rows[0]);
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Register failed" });
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (user.rows.length === 0)
      return res.status(400).json({ message: "Invalid credentials" });

    const valid = await bcrypt.compare(
      password,
      user.rows[0].password
    );

    if (!valid)
      return res.status(400).json({ message: "Invalid credentials" });

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
    console.error("Login error:", err);
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

      const newPost = await pool.query(
        `INSERT INTO posts (user_id, caption, image_url, video_url)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [user_id, content, image_url, video_url]
      );

      res.status(201).json(newPost.rows[0]);
    } catch (err) {
      console.error("Post error:", err);
      res.status(500).json({ message: "Post failed" });
    }
  }
);

app.get("/posts", authenticateToken, async (req, res) => {
  try {
    const posts = await pool.query(
      `SELECT posts.*, users.name
       FROM posts
       JOIN users ON posts.user_id = users.id
       ORDER BY posts.created_at DESC`
    );

    res.json(posts.rows);
  } catch (err) {
    console.error("Fetch posts error:", err);
    res.status(500).json({ message: "Fetch failed" });
  }
});

/* =========================================================
   START SERVER
========================================================= */

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 AddisGo running on port ${PORT}`);
});