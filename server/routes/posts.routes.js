// server/routes/posts.routes.js
import express from "express";
import { pool } from "../db.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

const router = express.Router();

/* =========================
   HELPERS
========================= */
function isHttpUrl(u) {
  if (!u) return false;
  return String(u).startsWith("http://") || String(u).startsWith("https://");
}

/* =========================
   GET POSTS
   GET /api/posts
========================= */
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        id,
        user_id,
        caption,
        image_url,
        video_url,
        created_at
      FROM posts
      ORDER BY created_at DESC
      LIMIT 200
    `
    );

    res.json(result.rows);
  } catch (err) {
    console.error("GET /posts ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* =========================
   CREATE POST
   POST /api/posts/create
   body: { caption/text, image_url?, video_url? }
========================= */
router.post("/create", authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) return res.status(401).json({ error: "Missing user id (token invalid)." });

    const caption = (req.body.caption ?? req.body.text ?? "").toString().trim();
    const image_url = (req.body.image_url ?? "").toString().trim();
    const video_url = (req.body.video_url ?? "").toString().trim();

    // allow text-only posts
    if (!caption && !image_url && !video_url) {
      return res.status(400).json({ error: "Post must have caption/text or image/video." });
    }

    // require Cloudinary (http/https) to prevent future 404 posts
    // (optional but recommended)
    if (image_url && !isHttpUrl(image_url)) {
      return res.status(400).json({ error: "image_url must be a full Cloudinary URL (http/https)." });
    }
    if (video_url && !isHttpUrl(video_url)) {
      return res.status(400).json({ error: "video_url must be a full Cloudinary URL (http/https)." });
    }

    const result = await pool.query(
      `
      INSERT INTO posts (user_id, caption, image_url, video_url)
      VALUES ($1, $2, $3, $4)
      RETURNING id, user_id, caption, image_url, video_url, created_at
    `,
      [userId, caption, image_url || null, video_url || null]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("POST /posts/create ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* =========================
   DELETE POST (OPTIONAL)
   DELETE /api/posts/:id
========================= */
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const postId = req.params.id;

    const check = await pool.query(`SELECT user_id FROM posts WHERE id=$1`, [postId]);
    if (check.rows.length === 0) return res.status(404).json({ error: "Post not found" });
    if (String(check.rows[0].user_id) !== String(userId))
      return res.status(403).json({ error: "Not allowed" });

    await pool.query(`DELETE FROM posts WHERE id=$1`, [postId]);
    res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /posts ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;