const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Serve uploaded videos publicly
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// --------------------
// MULTER CONFIG
// --------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

// --------------------
// ROOT CHECK
// --------------------
app.get("/", (req, res) => {
  res.json({
    status: "OK",
    message: "MeDan API is running 🚀"
  });
});

// --------------------
// UPLOAD VIDEO
// --------------------
app.post("/api/upload", upload.single("video"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  res.json({
    success: true,
    video: {
      filename: req.file.filename,
      url: `http://localhost:${PORT}/uploads/${req.file.filename}`
    }
  });
});

// --------------------
// 🔥 LIST VIDEOS (THIS WAS MISSING)
// --------------------
app.get("/api/videos", (req, res) => {
  const uploadsDir = path.join(__dirname, "uploads");

  fs.readdir(uploadsDir, (err, files) => {
    if (err) {
      return res.status(500).json({ error: "Failed to read uploads" });
    }

    const videos = files.map(file => ({
      filename: file,
      url: `http://localhost:${PORT}/uploads/${file}`
    }));

    res.json(videos);
  });
});

// --------------------
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});

