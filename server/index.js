import express from "express";
import cors from "cors";
import multer from "multer";
import jwt from "jsonwebtoken";

const app = express();
const upload = multer({ dest: "uploads/" });

app.use(cors());
app.use(express.json());

const videos = [];

// HEALTH CHECK
app.get("/", (_, res) => {
  res.json({ message: "API running" });
});

// AUTH
app.post("/api/auth/login", (req, res) => {
  const token = jwt.sign({ userId: 1 }, "secret", { expiresIn: "7d" });
  res.json({ token });
});

app.post("/api/auth/register", (_, res) => {
  res.json({ message: "Registered" });
});

// FEED
app.get("/api/feed", (_, res) => {
  res.json(videos);
});

// UPLOAD
app.post("/api/videos/upload", upload.single("video"), (req, res) => {
  videos.unshift({
    id: Date.now(),
    url: `https://addisgo.onrender.com/${req.file.path}`,
    likes: 0,
  });
  res.json({ success: true });
});

// LIKE
app.post("/api/videos/:id/like", (req, res) => {
  const video = videos.find(v => v.id == req.params.id);
  if (video) video.likes++;
  res.json({ success: true });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log("Server running on", PORT));
