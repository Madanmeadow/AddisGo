import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "../db.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

const router = express.Router();

/* ================= MULTER (TEMP LOCAL) ================= */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
  destination: path.join(__dirname, "../uploads"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

/* ================= CREATE REEL =================
   Expects: FormData { video, caption? }
   - Inserts into reels (video_url, thumb_url, duration_sec)
   - Also inserts into posts (video_url) so it appears in For You
=============================================== */
router.post("/", authenticateToken, upload.single("video"), async (req, res) => {
  try {
    const userId = req.user.id;
    const caption = (req.body.caption || "").toString();

    if (!req.file) return res.status(400).json({ error: "Video is required." });

    // If you already use Cloudinary upload somewhere else, replace this with that URL.
    const videoUrl = `/uploads/${req.file.filename}`;

    // optional (you can add later)
    const thumbUrl = req.body.thumb_url ? String(req.body.thumb_url) : null;
    const durationSec = req.body.duration_sec ? Number(req.body.duration_sec) : null;

    // 1) reels table (MATCH YOUR REAL COLUMNS)
    const reelResult = await pool.query(
      `
      INSERT INTO reels (user_id, caption, video_url, thumb_url, duration_sec)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
      `,
      [userId, caption, videoUrl, thumbUrl, Number.isFinite(durationSec) ? durationSec : null]
    );

    const reel = reelResult.rows[0];

    // 2) posts table (so it shows in For You feed)
    const postResult = await pool.query(
      `
      INSERT INTO posts (user_id, caption, video_url)
      VALUES ($1, $2, $3)
      RETURNING *
      `,
      [userId, caption, videoUrl]
    );

    const post = postResult.rows[0];

    return res.json({ reel, post });
  } catch (err) {
    console.error("POST /reels ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;