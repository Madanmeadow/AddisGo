const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());

// make uploads public
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ensure uploads folder exists
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// multer config (MOBILE SAFE)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads"),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + "-medan-video" + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB
});

// 📤 UPLOAD ROUTE
app.post("/api/upload", upload.single("video"), (req, res) => {
  res.json({
    success: true,
    filename: req.file.filename,
    url: `/uploads/${req.file.filename}`
  });
});

// 📼 LIST VIDEOS
app.get("/api/videos", (req, res) => {
  const files = fs.readdirSync(uploadDir).reverse();
  res.json(
    files.map(f => ({
      filename: f,
      url: `/uploads/${f}`
    }))
  );
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Server running on port", PORT));
