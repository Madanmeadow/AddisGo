// =======================================
// 🚀 AddisGo Server - Clean Production Setup
// =======================================

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const pool = require("./db");

const app = express();
app.use(express.json());

app.use(
  cors({
    origin: "*", // ⚠ Change to frontend URL in production
    credentials: true,
  })
);

// =======================================
// 🔍 Safe Route Loader (Prevents Crash)
// =======================================

function loadRoute(path, routePath) {
  try {
    const route = require(routePath);

    if (typeof route !== "function") {
      console.error(`❌ ${routePath} does not export a router correctly`);
      return;
    }

    app.use(path, route);
    console.log(`✅ Loaded route: ${path}`);
  } catch (err) {
    console.error(`❌ Failed loading ${routePath}`);
    console.error(err.message);
  }
}

// =======================================
// 📦 Load Your Existing Routes
// =======================================

loadRoute("/auth", "./routes/auth.routes");
loadRoute("/posts", "./routes/posts.routes");
loadRoute("/conversations", "./routes/conversation.routes");
loadRoute("/messages", "./routes/message.routes");
loadRoute("/users", "./routes/users.routes");
loadRoute("/upload", "./routes/upload.routes");
loadRoute("/videos", "./routes/videos.routes");
loadRoute("/voices", "./routes/voices.routes");
loadRoute("/comments", "./routes/comments.routes");
loadRoute("/responses", "./routes/responses.routes");
loadRoute("/acknowledgements", "./routes/acknowledgements.routes");
loadRoute("/waitlist", "./routes/waitlist.routes");

// =======================================
// ❤️ Health Check
// =======================================

app.get("/", (req, res) => {
  res.json({ status: "AddisGo API running 🚀" });
});

// =======================================
// 🌐 HTTP + Socket.IO Setup
// =======================================

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// =======================================
// 🔌 Real-Time Messaging
// =======================================

io.on("connection", (socket) => {
  console.log("🔌 User connected:", socket.id);

  socket.on("join_conversation", (conversationId) => {
    socket.join(`conversation_${conversationId}`);
  });

  socket.on("send_message", async (data) => {
    try {
      const { conversationId, senderId, content } = data;

      const result = await pool.query(
        `INSERT INTO messages (conversation_id, sender_id, content)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [conversationId, senderId, content]
      );

      const message = result.rows[0];

      io.to(`conversation_${conversationId}`).emit(
        "receive_message",
        message
      );

    } catch (err) {
      console.error("❌ Socket error:", err.message);
    }
  });

  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
  });
});

// =======================================
// 🚀 Start Server
// =======================================

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🔥 AddisGo server running on port ${PORT}`);
});

