import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import videosRoutes from "./routes/videos.routes.js";
import authRoutes from "./routes/auth.routes.js";
import commentsRoutes from "./routes/comments.routes.js";

const app = express();
const PORT = process.env.PORT || 10000;

// Needed for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors());
app.use(express.json());

// Static uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.use("/api/videos", videosRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/comments", commentsRoutes);

// Health check
app.get("/", (req, res) => {
  res.json({
    status: "OK",
    message: "MeDan API is running 🚀"
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
