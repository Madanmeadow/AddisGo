/* =========================================================
   🔥 ADDISGO BACKEND (Option B - Matches Current DB)
   Vue + Node + PostgreSQL + Railway
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

dotenv.config();

const { Pool } = pkg;
const app = express();
const server = http.createServer(app);

/* =========================================================
   BASIC MIDDLEWARE
========================================================= */

app.use(cors({
  origin: process.env.FRONTEND_URL || "*",
  credentials: true
}));

app.use(express.json());

/* =========================================================
   PATH FIX (ES MODULE)
========================================================= */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* =========================================================
   STATIC UPLOADS
========================================================= */

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
  .catch(err => console.error("❌ DB Error:", err));

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
   ROOT
========================================================= */

app.get("/", (req, res) => {
  res.json({ message: "🔥 AddisGo Server Running" });
});

/* =========================================================
   AUTH ROUTES
========================================================= */

// REGISTER
app.post("/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ message: "All fields required" });

    const existing = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (existing.rows.length > 0)
      return res.status(400).json({ message: "Email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await pool.query(
      `INSERT INTO users (name, email, password)
       VALUES ($1, $2, $3)
       RETURNING id, name, email`,
      [name, email, hashedPassword]
    );

    res.status(201).json(user.rows[0]);

  } catch (err) {
    console.error("REGISTER ERROR:", err);
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
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ message: "Login failed" });
  }
});

/* =========================================================
   POSTS ROUTES (MATCHES YOUR TABLE)
========================================================= */

// CREATE POST
app.post("/posts", authenticateToken, upload.single("file"), async (req, res) => {
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
    console.error("CREATE POST ERROR:", err);
    res.status(500).json({ message: "Post failed" });
  }
});

// GET POSTS
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
    console.error("FETCH POSTS ERROR:", err);
    res.status(500).json({ message: "Failed to fetch posts" });
  }
});

/* =========================================================
   START SERVER
========================================================= */

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 AddisGo running on port ${PORT}`);
});