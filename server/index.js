import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT || 5000;

// Needed for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ CORS (important for video streaming)
app.use(cors({
  origin: "*",
  methods: ["GET"]
}));

app.use(express.json());

// ✅ Serve uploaded videos
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ✅ Health check
app.get("/", (req, res) => {
  res.json({
    status: "OK",
    message: "MeDan API is running 🚀"
  });
});

// ✅ Return all uploaded videos
app.get("/api/videos", (req, res) => {
  const uploadsDir = path.join(__dirname, "uploads");

  fs.readdir(uploadsDir, (err, files) => {
    if (err) return res.status(500).json([]);

    const videos = files
      .filter(file => file.endsWith(".mp4") || file.endsWith(".webm"))
      .map(file => ({
        filename: file,
        url: `${req.protocol}://${req.get("host")}/uploads/${file}`
      }));

    res.json(videos);
  });
});

// ✅ Start server
app.listen(PORT, () => {
  console.log(`🔥 Server running on port ${PORT}`);
});
