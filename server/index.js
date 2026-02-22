import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import http from "http";
import { Server } from "socket.io";
import pkg from "pg";

dotenv.config();
const { Pool } = pkg;

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

app.use(cors());
app.use(express.json());

/* =============================
   PATH FIX
============================= */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* =============================
   DATABASE
============================= */

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

/* =============================
   STATIC UPLOADS
============================= */

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* =============================
   MULTER
============================= */

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) =>
    cb(null, Date.now() + "-" + file.originalname)
});
const upload = multer({ storage });

/* =============================
   AUTH MIDDLEWARE
============================= */

function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.sendStatus(401);

  const token = header.split(" ")[1];

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

/* =============================
   AUTH ROUTES
============================= */

app.post("/auth/register", async (req, res) => {
  const { name, email, password } = req.body;

  const hashed = await bcrypt.hash(password, 10);

  const result = await pool.query(
    "INSERT INTO users(name,email,password) VALUES($1,$2,$3) RETURNING *",
    [name, email, hashed]
  );

  res.json(result.rows[0]);
});

app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;

  const result = await pool.query(
    "SELECT * FROM users WHERE email=$1",
    [email]
  );

  if (!result.rows.length)
    return res.status(400).json({ message: "User not found" });

  const user = result.rows[0];

  const valid = await bcrypt.compare(password, user.password);
  if (!valid)
    return res.status(400).json({ message: "Wrong password" });

  const token = jwt.sign(
    { id: user.id, name: user.name },
    process.env.JWT_SECRET
  );

  res.json({ token, user });
});

/* =============================
   POSTS
============================= */

app.get("/posts", auth, async (req, res) => {
  const result = await pool.query(`
    SELECT posts.*, users.name
    FROM posts
    JOIN users ON posts.user_id = users.id
    ORDER BY posts.created_at DESC
  `);

  res.json(result.rows);
});

app.post("/posts", auth, upload.single("file"), async (req, res) => {
  let image_url = null;
  let video_url = null;

  if (req.file) {
    const pathUrl = `/uploads/${req.file.filename}`;

    if (req.file.mimetype.startsWith("image"))
      image_url = pathUrl;

    if (req.file.mimetype.startsWith("video"))
      video_url = pathUrl;
  }

  const result = await pool.query(
    "INSERT INTO posts(user_id, caption, image_url, video_url) VALUES($1,$2,$3,$4) RETURNING *",
    [req.user.id, req.body.content, image_url, video_url]
  );

  res.json(result.rows[0]);
});

/* =============================
   MULTIPLE LIVE STREAMS
============================= */

const liveStreams = new Map();
/*
liveStreams structure:
{
  streamId: {
     hostId,
     hostSocketId
  }
}
*/

io.on("connection", (socket) => {
  console.log("Connected:", socket.id);

  /* ===== START LIVE ===== */

  socket.on("start-live", ({ userId }) => {
    const streamId = `stream-${userId}`;

    liveStreams.set(streamId, {
      hostId: userId,
      hostSocketId: socket.id
    });

    socket.join(streamId);

    io.emit("live-list", Array.from(liveStreams.keys()));
  });

  /* ===== JOIN LIVE ===== */

  socket.on("join-live", (streamId) => {
    socket.join(streamId);

    const stream = liveStreams.get(streamId);
    if (stream) {
      socket.to(stream.hostSocketId).emit("viewer-joined", {
        viewerId: socket.id
      });
    }
  });

  /* ===== WEBRTC SIGNALING ===== */

  socket.on("live-offer", (data) => {
    socket.to(data.to).emit("live-offer", {
      offer: data.offer,
      from: socket.id
    });
  });

  socket.on("live-answer", (data) => {
    socket.to(data.to).emit("live-answer", data.answer);
  });

  socket.on("live-ice", (data) => {
    socket.to(data.to).emit("live-ice", data.candidate);
  });

  /* ===== END LIVE ===== */

  socket.on("end-live", (streamId) => {
    liveStreams.delete(streamId);
    io.emit("live-list", Array.from(liveStreams.keys()));
  });

  socket.on("disconnect", () => {
    for (let [id, stream] of liveStreams.entries()) {
      if (stream.hostSocketId === socket.id) {
        liveStreams.delete(id);
        io.emit("live-list", Array.from(liveStreams.keys()));
      }
    }
  });
});

/* =============================
   START SERVER
============================= */

const PORT = process.env.PORT || 5000;
server.listen(PORT, () =>
  console.log("🚀 Server running on", PORT)
);