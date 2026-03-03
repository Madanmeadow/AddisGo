// server/routes/posts.routes.js
import express from "express";
import { pool } from "../db.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

const router = express.Router();

/**
 * GET /posts
 * (safe, no joins)
 */
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, user_id, caption, image_url, video_url, created_at
      FROM posts
      ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("GET /posts ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /posts
 * Body: { caption, image_url, video_url }
 * NOTE: image_url/video_url should be the Cloudinary "url" returned from /upload
 */
router.post("/", authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    const caption = (req.body.caption || "").toString().trim();

    // Cloudinary URLs should be full https links
    const image_url = (req.body.image_url || "").toString().trim();
    const video_url = (req.body.video_url || "").toString().trim();

    if (!caption && !image_url && !video_url) {
      return res.status(400).json({ error: "Post must include text, image, or video." });
    }

    // Basic safety: prevent relative paths from being saved going forward
    const safeImage = image_url.startsWith("http") ? image_url : "";
    const safeVideo = video_url.startsWith("http") ? video_url : "";

    const result = await pool.query(
      `
      INSERT INTO posts (user_id, caption, image_url, video_url)
      VALUES ($1, $2, $3, $4)
      RETURNING id, user_id, caption, image_url, video_url, created_at
      `,
      [userId, caption, safeImage, safeVideo]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("POST /posts ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;