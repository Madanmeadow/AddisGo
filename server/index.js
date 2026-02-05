const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
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

// ✅ List videos with PRODUCTION-SAFE URLs
app.get("/api/videos", (req, res) => {
  const uploadsDir = path.join(__dirname, "uploads");

  if (!fs.existsSync(uploadsDir)) {
    return res.json([]);
  }

  const files = fs.readdirSync(uploadsDir);

  const baseUrl = `${req.protocol}://${req.get("host")}`;

  const videos = files
    .filter(file => file.endsWith(".mp4") || file.endsWith(".webm"))
    .map(file => ({
      filename: file,
      url: `${baseUrl}/uploads/${file}`
    }));

  res.json(videos);
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${PORT}`);
});
