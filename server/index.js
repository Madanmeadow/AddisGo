/* ======================================================
   🔥 ADDISGO BACKEND - PRODUCTION READY
   Vue + Node + PostgreSQL + Railway
====================================================== */

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

dotenv.config();

const { Pool } = pkg;

/* ======================================================
   APP INIT
====================================================== */

const app = express();
const server = http.createServer(app);

/* ======================================================
   MIDDLEWARE
====================================================== */

app.use(cors({
  origin: process.env.FRONTEND_URL || "*",
  credentials: true
}));

app.use(express.json());

/* ======================================================
   ES MODULE PATH FIX
====================================================== */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ======================================================
   STATIC UPLOADS
====================================================== */

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* ======================================================
   DATABASE CONNECTION (Railway)
====================================================== */

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production"
    ? { rejectUnauthorized: false }
    : false
});

pool.connect()
  .then(() => console.log("✅ PostgreSQL Connected"))
  .catch(err => console.error("❌ Database Error:", err));

/* ======================================================
   MULTER CONFIG
====================================================== */

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({ storage });

/* ======================================================
   AUTH MIDDLEWARE
====================================================== */

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
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

/* ======================================================
   ROOT
====================================================== */

app.get("/", (req, res) => {
  res.json({ message: "🔥 AddisGo Server Running" });
});

/* ======================================================
   AUTH ROUTES
====================================================== */

// REGISTER
app.post("/auth/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password)
      return res.status(400).json({ message: "All fields required" });

    const existing = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (existing.rows.length > 0)
      return res.status(400).json({ message: "Email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await pool.query(
      `INSERT INTO users (username, email, password)
       VALUES ($1, $2, $3)
       RETURNING id, username, email`,
      [username, email, hashedPassword]
    );

    res.status(201).json({
      message: "User created",
      user: user.rows[0]
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Registration failed" });
  }
});

// LOGIN
app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (user.rows.length === 0)
      return res.status(400).json({ message: "Invalid credentials" });

    const validPassword = await bcrypt.compare(
      password,
      user.rows[0].password
    );

    if (!validPassword)
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
        username: user.rows[0].username,
        email: user.rows[0].email
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Login failed" });
  }
});

/* ======================================================
   POSTS ROUTES (Protected)
====================================================== */

// CREATE POST
app.post("/posts", authenticateToken, upload.single("file"), async (req, res) => {
  try {
    const { content } = req.body;
    const user_id = req.user.id;

    const media_url = req.file
      ? `/uploads/${req.file.filename}`
      : null;

    const newPost = await pool.query(
      `INSERT INTO posts (user_id, content, media_url)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [user_id, content, media_url]
    );

    res.status(201).json(newPost.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create post" });
  }
});

// GET ALL POSTS
app.get("/posts", authenticateToken, async (req, res) => {
  try {
    const posts = await pool.query(
      `SELECT posts.*, users.username
       FROM posts
       JOIN users ON posts.user_id = users.id
       ORDER BY posts.created_at DESC`
    );

    res.json(posts.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch posts" });
  }
});

/* ======================================================
   SOCKET.IO (REAL-TIME READY)
====================================================== */

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "*",
    methods: ["GET", "POST"]
  }
});

const onlineUsers = new Map();

io.on("connection", (socket) => {
  console.log("🟢 User connected:", socket.id);

  socket.on("registerUser", (userId) => {
    onlineUsers.set(userId, socket.id);
  });

  socket.on("sendMessage", (data) => {
    const receiverSocket = onlineUsers.get(data.receiverId);
    if (receiverSocket) {
      io.to(receiverSocket).emit("receiveMessage", data);
    }
  });

  socket.on("disconnect", () => {
    for (let [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        break;
      }
    }
    console.log("🔴 User disconnected");
  });
});

/* ======================================================
   START SERVER
====================================================== */

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 AddisGo Server running on port ${PORT}`);
});