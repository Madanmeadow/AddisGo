const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Serve uploaded videos
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Multer config
const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

// Health check
app.get("/", (req, res) => {
  res.json({
    status: "OK",
    message: "MeDan API is running 🚀"
  });
});

// Upload video
app.post("/api/upload", upload.single("video"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  res.json({
    success: true,
    url: `http://localhost:${PORT}/uploads/${req.file.filename}`
  });
});

// ✅ Get all uploaded videos
app.get("/api/videos", (req, res) => {
  const files = fs.readdirSync(uploadDir);

  const videos = files.map(file => ({
    url: `http://localhost:${PORT}/uploads/${file}`
  }));

  res.json(videos.reverse()); // newest first
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});

