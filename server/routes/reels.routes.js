import express from "express";
import { pool } from "../db.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

const router = express.Router();

/* =========================
   GET /reels?cursor=ID&limit=10
   Infinite scroll (newest first)
========================= */
router.get("/", authenticateToken, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit || 10), 30);
    const cursor = Number(req.query.cursor || 0);

    const where = cursor ? `WHERE r.id < $1` : "";
    const params = cursor ? [cursor, limit] : [limit];

    const sql = `
      SELECT
        r.id,
        r.user_id,
        r.caption,
        r.video_url,
        r.thumb_url,
        r.duration_sec,
        r.created_at,
        COALESCE(u.display_name, u.name, u.email, 'User') AS author_name,
        COALESCE(u.avatar_url, '') AS author_avatar,
        (SELECT COUNT(*)::int FROM reel_likes rl WHERE rl.reel_id = r.id) AS like_count,
        (SELECT COUNT(*)::int FROM reel_comments rc WHERE rc.reel_id = r.id) AS comment_count,
        EXISTS (
          SELECT 1 FROM reel_likes rl
          WHERE rl.reel_id = r.id AND rl.user_id = $${cursor ? 3 : 2}
        ) AS liked_by_me
      FROM reels r
      LEFT JOIN users u ON u.id = r.user_id
      ${where}
      ORDER BY r.id DESC
      LIMIT $${cursor ? 2 : 1}
    `;

    const qparams = cursor ? [cursor, limit, req.user.id] : [limit, req.user.id];
    const result = await pool.query(sql, qparams);

    const nextCursor = result.rows.length ? result.rows[result.rows.length - 1].id : null;
    res.json({ items: result.rows, nextCursor });
  } catch (err) {
    console.error("GET /reels ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* =========================
   POST /reels
   body: { caption, video_url, thumb_url, duration_sec }
========================= */
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { caption = "", video_url, thumb_url = "", duration_sec = 0 } = req.body || {};
    if (!video_url) return res.status(400).json({ error: "video_url required" });

    const r = await pool.query(
      `
      INSERT INTO reels (user_id, caption, video_url, thumb_url, duration_sec)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
      `,
      [req.user.id, String(caption).slice(0, 500), String(video_url), String(thumb_url), Number(duration_sec) || 0]
    );

    res.json(r.rows[0]);
  } catch (err) {
    console.error("POST /reels ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* =========================
   POST /reels/:id/like  (toggle)
========================= */
router.post("/:id/like", authenticateToken, async (req, res) => {
  try {
    const reelId = Number(req.params.id);
    if (!reelId) return res.status(400).json({ error: "Invalid reel id" });

    const existing = await pool.query(
      `SELECT 1 FROM reel_likes WHERE reel_id=$1 AND user_id=$2`,
      [reelId, req.user.id]
    );

    if (existing.rows.length) {
      await pool.query(`DELETE FROM reel_likes WHERE reel_id=$1 AND user_id=$2`, [reelId, req.user.id]);
      return res.json({ ok: true, liked: false });
    } else {
      await pool.query(
        `INSERT INTO reel_likes (reel_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [reelId, req.user.id]
      );
      return res.json({ ok: true, liked: true });
    }
  } catch (err) {
    console.error("POST /reels/:id/like ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* =========================
   GET /reels/:id/comments
========================= */
router.get("/:id/comments", authenticateToken, async (req, res) => {
  try {
    const reelId = Number(req.params.id);
    const r = await pool.query(
      `
      SELECT rc.id, rc.text, rc.created_at, rc.user_id,
             COALESCE(u.display_name, u.name, u.email, 'User') AS author_name,
             COALESCE(u.avatar_url, '') AS author_avatar
      FROM reel_comments rc
      LEFT JOIN users u ON u.id = rc.user_id
      WHERE rc.reel_id=$1
      ORDER BY rc.id DESC
      LIMIT 200
      `,
      [reelId]
    );
    res.json(r.rows);
  } catch (err) {
    console.error("GET /reels/:id/comments ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* =========================
   POST /reels/:id/comments
========================= */
router.post("/:id/comments", authenticateToken, async (req, res) => {
  try {
    const reelId = Number(req.params.id);
    const text = String(req.body?.text || "").trim();
    if (!text) return res.status(400).json({ error: "Comment required" });

    const r = await pool.query(
      `
      INSERT INTO reel_comments (reel_id, user_id, text)
      VALUES ($1, $2, $3)
      RETURNING *
      `,
      [reelId, req.user.id, text.slice(0, 500)]
    );

    res.json(r.rows[0]);
  } catch (err) {
    console.error("POST /reels/:id/comments ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;