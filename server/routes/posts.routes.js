// server/routes/posts.routes.js
import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "../db.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

const router = express.Router();

/* =========================
   MULTER STORAGE (LOCAL UPLOADS)
========================= */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
  destination: path.join(__dirname, "../uploads"),
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${String(file.originalname || "file").replace(/\s+/g, "_")}`);
  },
});

const upload = multer({ storage });

/* =========================
   HELPERS
========================= */
async function postExists(postId) {
  const check = await pool.query(
    `SELECT id FROM posts WHERE id = $1 LIMIT 1`,
    [postId]
  );
  return !!check.rows[0];
}

/* =========================
   GET POSTS
   ✅ includes comment_count
   ✅ includes user display fields
========================= */
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        p.id,
        p.user_id,
        p.caption,
        p.image_url,
        p.video_url,
        p.created_at,
        u.display_name,
        u.username,
        u.avatar_url,
        COALESCE(cc.comment_count, 0) AS comment_count
      FROM posts p
      LEFT JOIN users u
        ON u.id = p.user_id
      LEFT JOIN (
        SELECT post_id, COUNT(*)::int AS comment_count
        FROM comments
        GROUP BY post_id
      ) cc
        ON cc.post_id = p.id
      ORDER BY p.created_at DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error("GET /posts ERROR:", err);
    res.status(500).json({ error: err.message || "Failed to fetch posts" });
  }
});

/* =========================
   CREATE POST
========================= */
router.post(
  "/",
  authenticateToken,
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "video", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const userId = Number(req.user?.id);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const caption = String(req.body?.caption || "").trim();

      const imageFile = req.files?.image?.[0] || null;
      const videoFile = req.files?.video?.[0] || null;

      const image_url = imageFile ? `/uploads/${imageFile.filename}` : null;
      const video_url = videoFile ? `/uploads/${videoFile.filename}` : null;

      if (!caption && !image_url && !video_url) {
        return res.status(400).json({ error: "caption, image, or video is required" });
      }

      const insert = await pool.query(
        `
        INSERT INTO posts (user_id, caption, image_url, video_url)
        VALUES ($1, $2, $3, $4)
        RETURNING id, user_id, caption, image_url, video_url, created_at
        `,
        [userId, caption || null, image_url, video_url]
      );

      const created = insert.rows[0];

      const withUser = await pool.query(
        `
        SELECT
          p.id,
          p.user_id,
          p.caption,
          p.image_url,
          p.video_url,
          p.created_at,
          u.display_name,
          u.username,
          u.avatar_url,
          0::int AS comment_count
        FROM posts p
        LEFT JOIN users u ON u.id = p.user_id
        WHERE p.id = $1
        LIMIT 1
        `,
        [created.id]
      );

      res.json(withUser.rows[0] || created);
    } catch (err) {
      console.error("POST /posts ERROR:", err);
      res.status(500).json({ error: err.message || "Post failed" });
    }
  }
);

/* =========================
   COMMENTS: GET
========================= */
router.get("/:postId/comments", async (req, res) => {
  try {
    const postId = Number(req.params.postId);
    if (!postId) return res.status(400).json({ error: "Invalid post id" });

    const exists = await postExists(postId);
    if (!exists) return res.status(404).json({ error: "Post not found" });

    const result = await pool.query(
      `
      SELECT
        c.id,
        c.post_id,
        c.user_id,
        c.body,
        c.created_at,
        u.username,
        u.display_name,
        u.avatar_url
      FROM comments c
      LEFT JOIN users u ON u.id = c.user_id
      WHERE c.post_id = $1
      ORDER BY c.created_at DESC
      `,
      [postId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("GET /posts/:postId/comments ERROR:", err);
    res.status(500).json({ error: err.message || "Failed to load comments" });
  }
});

/* =========================
   COMMENTS: POST
========================= */
router.post("/:postId/comments", authenticateToken, async (req, res) => {
  try {
    const postId = Number(req.params.postId);
    if (!postId) return res.status(400).json({ error: "Invalid post id" });

    const exists = await postExists(postId);
    if (!exists) return res.status(404).json({ error: "Post not found" });

    const userId = Number(req.user?.id);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const body = String(req.body?.body || "").trim();
    if (!body) return res.status(400).json({ error: "Comment body is required" });
    if (body.length > 500) return res.status(400).json({ error: "Comment too long" });

    const insert = await pool.query(
      `
      INSERT INTO comments (post_id, user_id, body)
      VALUES ($1, $2, $3)
      RETURNING id, post_id, user_id, body, created_at
      `,
      [postId, userId, body]
    );

    const withUser = await pool.query(
      `
      SELECT
        c.id,
        c.post_id,
        c.user_id,
        c.body,
        c.created_at,
        u.username,
        u.display_name,
        u.avatar_url
      FROM comments c
      LEFT JOIN users u ON u.id = c.user_id
      WHERE c.id = $1
      LIMIT 1
      `,
      [insert.rows[0].id]
    );

    res.json(withUser.rows[0] || insert.rows[0]);
  } catch (err) {
    console.error("POST /posts/:postId/comments ERROR:", err);
    res.status(500).json({ error: err.message || "Failed to send comment" });
  }
});

/* =========================
   COMMENTS: DELETE
========================= */
router.delete("/:postId/comments/:commentId", authenticateToken, async (req, res) => {
  try {
    const postId = Number(req.params.postId);
    const commentId = Number(req.params.commentId);
    const userId = Number(req.user?.id);

    if (!postId || !commentId) {
      return res.status(400).json({ error: "Invalid post/comment id" });
    }

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const found = await pool.query(
      `
      SELECT id, post_id, user_id
      FROM comments
      WHERE id = $1 AND post_id = $2
      LIMIT 1
      `,
      [commentId, postId]
    );

    const row = found.rows[0];
    if (!row) {
      return res.status(404).json({ error: "Comment not found" });
    }

    if (Number(row.user_id) !== userId) {
      return res.status(403).json({ error: "You can only delete your own comment" });
    }

    await pool.query(
      `DELETE FROM comments WHERE id = $1`,
      [commentId]
    );

    res.json({ ok: true, id: commentId, post_id: postId });
  } catch (err) {
    console.error("DELETE /posts/:postId/comments/:commentId ERROR:", err);
    res.status(500).json({ error: err.message || "Delete failed" });
  }
});

export default router;