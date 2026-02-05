import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsDir = path.join(__dirname, "../uploads");

// GET VIDEOS
router.get("/", (req, res) => {
  if (!fs.existsSync(uploadsDir)) {
    return res.json([]);
  }

  const files = fs.readdirSync(uploadsDir);

  const videos = files.map(file => ({
    filename: file,
    url: `${req.protocol}://${req.get("host")}/uploads/${file}`
  }));

  res.json(videos.reverse());
});

export default router;
