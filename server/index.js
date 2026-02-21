import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { Server } from "socket.io";
import http from "http";
import pkg from "pg";

dotenv.config();
const { Pool } = pkg;

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

/* ===================================
   PATH FIX (ES MODULES)
=================================== */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ===================================
   MIDDLEWARE
=================================== */

app.use(cors());
app.use(express.json());

/* ===================================
   DATABASE
=================================== */

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

/* ===================================
   STATIC UPLOADS (VERY IMPORTANT)
=================================== */

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* ===================================
   MULTER CONFIG
=================================== */

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({ storage });

/* ===================================
   AUTH MIDDLEWARE
=================================== */

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

/* ===================================
   AUTH ROUTES
=================================== */

app.post("/auth/register", async (req, res) => {
  const { name, email, password } = req.body;

  const hashedPassword = await bcrypt.hash(password, 10);

  const result = await pool.query(
    "INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *",
    [name, email, hashedPassword]
  );

  res.json(result.rows[0]);
});

app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;

  const result = await pool.query(
    "SELECT * FROM users WHERE email=$1",
    [email]
  );

  if (result.rows.length === 0) {
    return res.status(400).json({ message: "User not found" });
  }

  const user = result.rows[0];

  const validPassword = await bcrypt.compare(password, user.password);

  if (!validPassword) {
    return res.status(400).json({ message: "Wrong password" });
  }

  const token = jwt.sign(
    { id: user.id, name: user.name },
    process.env.JWT_SECRET
  );

  res.json({ token, user });
});

/* ===================================
   POSTS
=================================== */

app.get("/posts", authenticateToken, async (req, res) => {
  const result = await pool.query(`
    SELECT posts.*, users.name
    FROM posts
    JOIN users ON posts.user_id = users.id
    ORDER BY posts.created_at DESC
  `);

  res.json(result.rows);
});

app.post("/posts", authenticateToken, upload.single("file"), async (req, res) => {
  const { content } = req.body;

  let image_url = null;
  let video_url = null;

  if (req.file) {
    const filePath = `/uploads/${req.file.filename}`;

    if (req.file.mimetype.startsWith("image")) {
      image_url = filePath;
    }

    if (req.file.mimetype.startsWith("video")) {
      video_url = filePath;
    }
  }

  const result = await pool.query(
    "INSERT INTO posts (user_id, caption, image_url, video_url) VALUES ($1, $2, $3, $4) RETURNING *",
    [req.user.id, content, image_url, video_url]
  );

  res.json(result.rows[0]);
});

/* ===================================
   SOCKET.IO (ONLINE USERS + CALL)
=================================== */

const onlineUsers = new Map();

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("register-user", (userId) => {
    onlineUsers.set(userId, socket.id);
    io.emit("online-users", Array.from(onlineUsers.entries()));
  });

  socket.on("call-user", (data) => {
    io.to(data.to).emit("incoming-call", {
      offer: data.offer,
      from: socket.id
    });
  });

  socket.on("answer-call", (data) => {
    io.to(data.to).emit("call-answered", {
      answer: data.answer
    });
  });

  socket.on("ice-candidate", (data) => {
    io.to(data.to).emit("ice-candidate", data.candidate);
  });

  socket.on("disconnect", () => {
    for (let [userId, sockId] of onlineUsers.entries()) {
      if (sockId === socket.id) {
        onlineUsers.delete(userId);
      }
    }
    io.emit("online-users", Array.from(onlineUsers.entries()));
  });
});

/* ===================================
   START SERVER
=================================== */

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});