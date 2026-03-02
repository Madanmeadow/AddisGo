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
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname.replace(/\s+/g, "_")),
});

const upload = multer({ storage });

/* =========================
   GET POSTS (WITH USER NAMES)
   ✅ still returns user_id (frontend uses it)
   ✅ also returns display_name/username/avatar_url for later
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
        u.avatar_url
      FROM posts p
      LEFT JOIN users u ON u.id = p.user_id
      ORDER BY p.created_at DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error("GET /posts ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* =========================
   CREATE POST
   ✅ FIX: user_id from JWT, not from frontend
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
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const caption = String(req.body?.caption || "").trim();

      const imageFile = req.files?.image?.[0] || null;
      const videoFile = req.files?.video?.[0] || null;

      const image_url = imageFile ? `/uploads/${imageFile.filename}` : null;
      const video_url = videoFile ? `/uploads/${videoFile.filename}` : null;

      if (!caption && !image_url && !video_url) {
        return res.status(400).json({ error: "caption, image, or video is required" });
      }

      const result = await pool.query(
        `
        INSERT INTO posts (user_id, caption, image_url, video_url)
        VALUES ($1, $2, $3, $4)
        RETURNING id, user_id, caption, image_url, video_url, created_at
        `,
        [userId, caption || null, image_url, video_url]
      );

      res.json(result.rows[0]);
    } catch (err) {
      console.error("POST /posts ERROR:", err);
      res.status(500).json({ error: err.message });
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

    const result = await pool.query(
      `
      SELECT
        c.id,
        c.post_id,
        c.user_id,
        c.body,
        c.created_at,
        u.username,
        u.display_name
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
    res.status(500).json({ error: err.message });
  }
});

/* =========================
   COMMENTS: POST
========================= */
router.post("/:postId/comments", authenticateToken, async (req, res) => {
  try {
    const postId = Number(req.params.postId);
    if (!postId) return res.status(400).json({ error: "Invalid post id" });

    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const body = String(req.body?.body || "").trim();
    if (!body) return res.status(400).json({ error: "Comment body is required" });

    const insert = await pool.query(
      `
      INSERT INTO comments (post_id, user_id, body)
      VALUES ($1, $2, $3)
      RETURNING id, post_id, user_id, body, created_at
      `,
      [postId, userId, body]
    );

    // return with username/display_name like your UI expects
    const withUser = await pool.query(
      `
      SELECT
        c.id, c.post_id, c.user_id, c.body, c.created_at,
        u.username, u.display_name
      FROM comments c
      LEFT JOIN users u ON u.id = c.user_id
      WHERE c.id = $1
      `,
      [insert.rows[0].id]
    );

    res.json(withUser.rows[0]);
  } catch (err) {
    console.error("POST /posts/:postId/comments ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;