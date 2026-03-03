// server/routes/posts.routes.js
import express from "express";
import { pool } from "../db.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

const router = express.Router();

/* ✅ GET POSTS */
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

/* ✅ CREATE POST (JSON)
   body can include:
   - caption (text)
   - image_url (Cloudinary https)
   - video_url (Cloudinary https)
*/
router.post("/create", authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { caption, text, image_url, video_url } = req.body || {};

    const finalCaption = (caption ?? text ?? "").trim();

    if (!finalCaption && !image_url && !video_url) {
      return res.status(400).json({ error: "Post must include text or media." });
    }

    // Safety: only allow http(s) for media (Cloudinary links)
    const safeImg = image_url && String(image_url).startsWith("http") ? String(image_url) : null;
    const safeVid = video_url && String(video_url).startsWith("http") ? String(video_url) : null;

    const result = await pool.query(
      `
      INSERT INTO posts (user_id, caption, image_url, video_url)
      VALUES ($1, $2, $3, $4)
      RETURNING id, user_id, caption, image_url, video_url, created_at
      `,
      [userId, finalCaption || null, safeImg, safeVid]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("POST /posts/create ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;