import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "../db.js";

const router = express.Router();

/* ================= MULTER (LOCAL UPLOADS) ================= */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
  destination: path.join(__dirname, "../uploads"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});

const upload = multer({ storage });

/* ================= HELPERS ================= */
function safeBool(v) {
  return v === true || v === "true" || v === 1 || v === "1";
}

/* ============================================================
   ✅ GET POSTS (WITH AUTHOR INFO)  <---- FIXES "User #"
   Returns:
   - author_name, author_username, author_avatar_url
   - caption, image_url, video_url, created_at
============================================================ */
router.get("/", async (req, res) => {
  try {
    // optional query: ?limit=50
    const limit = Math.min(Number(req.query.limit || 200), 500);

    const result = await pool.query(
      `
      SELECT
        p.id,
        p.user_id,
        COALESCE(u.display_name, u.username, u.name, split_part(u.email,'@',1), 'User ' || p.user_id) AS author_name,
        COALESCE(u.username, split_part(u.email,'@',1), 'user' || p.user_id) AS author_username,
        u.avatar_url AS author_avatar_url,

        p.caption,
        p.image_url,
        p.video_url,
        p.created_at

      FROM posts p
      LEFT JOIN users u ON u.id = p.user_id
      ORDER BY p.created_at DESC
      LIMIT $1
      `,
      [limit]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("GET /posts ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   ✅ CREATE POST (JSON)
   Body: { user_id, caption, image_url?, video_url? }
============================================================ */
router.post("/", async (req, res) => {
  try {
    const { user_id, caption, image_url, video_url } = req.body || {};
    if (!user_id) return res.status(400).json({ error: "user_id is required" });

    const cap = String(caption || "").trim();

    const created = await pool.query(
      `
      INSERT INTO posts (user_id, caption, image_url, video_url)
      VALUES ($1, $2, $3, $4)
      RETURNING id, user_id, caption, image_url, video_url, created_at
      `,
      [Number(user_id), cap, image_url || null, video_url || null]
    );

    // return created post with author info as well
    const post = created.rows[0];

    const author = await pool.query(
      `
      SELECT
        COALESCE(display_name, username, name, split_part(email,'@',1), 'User ' || id) AS author_name,
        COALESCE(username, split_part(email,'@',1), 'user' || id) AS author_username,
        avatar_url AS author_avatar_url
      FROM users
      WHERE id=$1
      LIMIT 1
      `,
      [Number(user_id)]
    );

    const a = author.rows[0] || {
      author_name: `User ${user_id}`,
      author_username: `user${user_id}`,
      author_avatar_url: null,
    };

    res.json({ ...post, ...a });
  } catch (err) {
    console.error("POST /posts ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   ✅ CREATE POST (MULTIPART UPLOAD) - OPTIONAL
   Form-data fields:
   - user_id (required)
   - caption
   - image (optional file)
   - video (optional file)

   Note: this stores file in /server/uploads and returns /uploads/xxx
============================================================ */
router.post("/upload", upload.fields([{ name: "image" }, { name: "video" }]), async (req, res) => {
  try {
    const user_id = req.body?.user_id;
    const caption = String(req.body?.caption || "").trim();
    if (!user_id) return res.status(400).json({ error: "user_id is required" });

    const imageFile = req.files?.image?.[0] || null;
    const videoFile = req.files?.video?.[0] || null;

    const image_url = imageFile ? `/uploads/${imageFile.filename}` : null;
    const video_url = videoFile ? `/uploads/${videoFile.filename}` : null;

    const created = await pool.query(
      `
      INSERT INTO posts (user_id, caption, image_url, video_url)
      VALUES ($1, $2, $3, $4)
      RETURNING id, user_id, caption, image_url, video_url, created_at
      `,
      [Number(user_id), caption, image_url, video_url]
    );

    const post = created.rows[0];

    const author = await pool.query(
      `
      SELECT
        COALESCE(display_name, username, name, split_part(email,'@',1), 'User ' || id) AS author_name,
        COALESCE(username, split_part(email,'@',1), 'user' || id) AS author_username,
        avatar_url AS author_avatar_url
      FROM users
      WHERE id=$1
      LIMIT 1
      `,
      [Number(user_id)]
    );

    const a = author.rows[0] || {
      author_name: `User ${user_id}`,
      author_username: `user${user_id}`,
      author_avatar_url: null,
    };

    res.json({ ...post, ...a });
  } catch (err) {
    console.error("POST /posts/upload ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   ✅ DELETE POST (owner only)
   Body: { user_id }  (simple owner check)
============================================================ */
router.delete("/:id", async (req, res) => {
  try {
    const postId = Number(req.params.id);
    const userId = Number(req.body?.user_id || 0);
    if (!postId) return res.status(400).json({ error: "Invalid post id" });
    if (!userId) return res.status(400).json({ error: "user_id is required" });

    const found = await pool.query(`SELECT user_id FROM posts WHERE id=$1 LIMIT 1`, [postId]);
    if (!found.rows.length) return res.status(404).json({ error: "Post not found" });

    if (Number(found.rows[0].user_id) !== userId) {
      return res.status(403).json({ error: "Not allowed" });
    }

    await pool.query(`DELETE FROM posts WHERE id=$1`, [postId]);
    res.json({ ok: true, id: postId });
  } catch (err) {
    console.error("DELETE /posts/:id ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;