import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import pkg from "pg";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const { Pool } = pkg;
const app = express();
const server = http.createServer(app);

/* =============================
   BASIC CONFIG
============================= */

app.use(cors({
  origin: process.env.FRONTEND_URL || "*",
  credentials: true
}));

app.use(express.json());

/* =============================
   FILE PATH (for ES modules)
============================= */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* =============================
   STATIC UPLOADS
============================= */

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* =============================
   DATABASE (Railway Postgres)
============================= */

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production"
    ? { rejectUnauthorized: false }
    : false
});

pool.connect()
  .then(() => console.log("PostgreSQL Connected"))
  .catch(err => console.error("DB Connection Error:", err));

/* =============================
   TEST ROUTE
============================= */

app.get("/", (req, res) => {
  res.json({ message: "AddisGo Server Running" });
});

/* =============================
   MESSAGES REST API
============================= */

// Get chat history between two users
app.get("/api/messages/:user1/:user2", async (req, res) => {
  try {
    const { user1, user2 } = req.params;

    const result = await pool.query(
      `SELECT * FROM messages
       WHERE (sender_id = $1 AND receiver_id = $2)
       OR (sender_id = $2 AND receiver_id = $1)
       ORDER BY created_at ASC`,
      [user1, user2]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

/* =============================
   SOCKET.IO (REAL-TIME)
============================= */

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "*",
    methods: ["GET", "POST"]
  }
});

const onlineUsers = new Map();

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Register logged in user
  socket.on("registerUser", (userId) => {
    onlineUsers.set(userId, socket.id);
    console.log("User registered:", userId);
  });

  // Send Message
  socket.on("sendMessage", async ({ senderId, receiverId, message }) => {
    try {
      // Save to DB
      const savedMessage = await pool.query(
        `INSERT INTO messages (sender_id, receiver_id, message)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [senderId, receiverId, message]
      );

      const receiverSocket = onlineUsers.get(receiverId);

      // Emit to receiver
      if (receiverSocket) {
        io.to(receiverSocket).emit("receiveMessage", savedMessage.rows[0]);
      }

      // Emit back to sender (for confirmation)
      socket.emit("messageSent", savedMessage.rows[0]);

    } catch (err) {
      console.error("Message error:", err);
    }
  });

  /* =============================
     VIDEO CALL SIGNALING
  ============================= */

  socket.on("callUser", ({ to, offer }) => {
    const receiverSocket = onlineUsers.get(to);
    if (receiverSocket) {
      io.to(receiverSocket).emit("incomingCall", {
        from: socket.id,
        offer
      });
    }
  });

  socket.on("answerCall", ({ to, answer }) => {
    io.to(to).emit("callAnswered", answer);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);

    for (let [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        break;
      }
    }
  });
});

/* =============================
   START SERVER
============================= */

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});