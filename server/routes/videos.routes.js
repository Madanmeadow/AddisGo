import express from "express";
import path from "path";
import fs from "fs";

const router = express.Router();

const uploadsDir = path.join(process.cwd(), "server/uploads");

router.get("/", (req, res) => {
  if (!fs.existsSync(uploadsDir)) {
    return res.json([]);
  }

  const files = fs.readdirSync(uploadsDir);

  const videos = files.map(file => ({
    filename: file,
    url: `/uploads/${file}`
  }));

  res.json(videos);
});

export default router;
