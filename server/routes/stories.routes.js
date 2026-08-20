import express from "express";
import jwt from "jsonwebtoken";
import { pool } from "../db.js";
import { uploadToCloudinary } from "../utils/cloudinaryUpload.js";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

/* ---------- auth ---------- */
function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const token = authHeader.slice(7);
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

/* ---------- POST /stories (Cloudinary) ---------- */
router.post("/", authenticate, uploadToCloudinary.single("media"), async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!req.file) return res.status(400).json({ error: "No media file" });

    // multer-storage-cloudinary returns the Cloudinary URL in req.file.path
    const mediaUrl = req.file.path || req.file.secure_url;
    const mediaType =
      req.body.type ||
      req.file.resource_type ||
      (req.file.mimetype?.startsWith("video/") ? "video" : "image");

    const caption = (req.body.caption || "").trim();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const { rows } = await pool.query(
      `INSERT INTO stories (user_id, media_url, media_type, caption, expires_at)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id, user_id, media_url, media_type, caption, created_at, expires_at`,
      [userId, mediaUrl, mediaType, caption, expiresAt]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("POST /stories error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ---------- GET /stories (feed) ---------- */
router.get("/", authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT s.*,
        u.username, u.display_name, u.name, u.avatar_url
       FROM stories s
       JOIN users u ON u.id = s.user_id
       WHERE s.expires_at > NOW()
       ORDER BY s.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error("GET /stories error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ---------- GET /stories/:userId ---------- */
router.get("/:userId", authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM stories
       WHERE user_id = $1 AND expires_at > NOW()
       ORDER BY created_at DESC`,
      [req.params.userId]
    );
    res.json(rows);
  } catch (err) {
    console.error("GET /stories/:userId error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;