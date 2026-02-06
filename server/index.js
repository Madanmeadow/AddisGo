import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";

import authRoutes from "./routes/auth.routes.js";
import conversationRoutes from "./routes/conversation.routes.js";
import messageRoutes from "./routes/message.routes.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" }
});

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "API running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/messages", messageRoutes);

/* 🔥 SOCKET.IO */
io.on("connection", (socket) => {
  console.log("🟢 Connected:", socket.id);

  socket.on("join-conversation", (conversationId) => {
    socket.join(conversationId);
  });

  socket.on("send-message", (message) => {
    io.to(message.conversationId).emit("new-message", message);
  });

  // STEP 6 — TYPING
  socket.on("typing", ({ conversationId, userId }) => {
    socket.to(conversationId).emit("user-typing", userId);
  });

  socket.on("stop-typing", ({ conversationId }) => {
    socket.to(conversationId).emit("user-stop-typing");
  });

  socket.on("disconnect", () => {
    console.log("🔴 Disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);
