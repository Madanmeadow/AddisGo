const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 5000;

/* =======================
   MIDDLEWARE
======================= */
app.use(cors());
app.use(express.json());

// serve uploaded videos publicly
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* =======================
   MULTER CONFIG
======================= */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
});

/* =======================
   ROUTES
======================= */

// health check
app.get("/", (req, res) => {
  res.json({
    status: "OK",
    message: "MeDan API is running 🚀"
  });
});

// upload video
app.post("/api/upload", upload.single("video"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  res.json({
    success: true,
    filename: req.file.filename,
    url: `/uploads/${req.file.filename}`
  });
});

// 🔥🔥🔥 THIS IS THE FIX 🔥🔥🔥
app.get("/api/videos", (req, res) => {
  const uploadsDir = path.join(__dirname, "uploads");

  fs.readdir(uploadsDir, (err, files) => {
    if (err) {
      return res.status(500).json({ error: "Failed to read uploads folder" });
    }

    const videos = files
      .filter(file => file.endsWith(".mp4") || file.endsWith(".webm"))
      .map(file => ({
        filename: file,
        url: `http://localhost:${PORT}/uploads/${file}`
      }))
      .reverse(); // newest first

    res.json(videos);
  });
});

/* =======================
   START SERVER
======================= */
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});

