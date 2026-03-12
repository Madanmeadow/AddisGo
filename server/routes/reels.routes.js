import express from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";
import { pool } from "../db.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

const router = express.Router();

/* ================= CLOUDINARY ================= */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/* ================= MULTER (MEMORY, NOT DISK) ================= */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 150 * 1024 * 1024, // 150MB for reels
  },
});

function uploadBufferToCloudinary(fileBuffer, folder, resourceType = "video") {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    streamifier.createReadStream(fileBuffer).pipe(uploadStream);
  });
}

/* ================= CREATE REEL =================
   Expects: FormData { video, caption? }
   - Inserts into reels
   - Also inserts into posts so it appears in For You
================================================ */
router.post("/", authenticateToken, upload.single("video"), async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    const caption = String(req.body?.caption || "").trim();

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!req.file?.buffer) {
      return res.status(400).json({ error: "Video is required." });
    }

    const uploadedVideo = await uploadBufferToCloudinary(
      req.file.buffer,
      "addisgo/reels/videos",
      "video"
    );

    const videoUrl = uploadedVideo.secure_url;

    const thumbUrl =
      typeof uploadedVideo.secure_url === "string"
        ? uploadedVideo.secure_url.replace("/video/upload/", "/video/upload/so_1/")
        : null;

    const durationSec =
      Number.isFinite(Number(uploadedVideo.duration))
        ? Number(uploadedVideo.duration)
        : null;

    // 1) reels table
    const reelResult = await pool.query(
      `
      INSERT INTO reels (user_id, caption, video_url, thumb_url, duration_sec)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
      `,
      [userId, caption || null, videoUrl, thumbUrl, durationSec]
    );

    const reel = reelResult.rows[0];

    // 2) posts table
    const postResult = await pool.query(
      `
      INSERT INTO posts (user_id, caption, video_url)
      VALUES ($1, $2, $3)
      RETURNING *
      `,
      [userId, caption || null, videoUrl]
    );

    const post = postResult.rows[0];

    return res.json({ reel, post });
  } catch (err) {
    console.error("POST /reels ERROR:", err);
    return res.status(500).json({ error: err.message || "Failed to create reel." });
  }
});

export default router;