import express from "express";
import { pool } from "../db.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

const router = express.Router();

/**
 * Get comments for a post
 * GET /comments/:postId
 */
router.get("/:postId", async (req, res) => {
  try {
    const postId = Number(req.params.postId);
    if (!postId) return res.status(400).json({ ok: false, error: "Bad request" });

    const result = await pool.query(
      `
      SELECT c.id, c.post_id, c.user_id, c.text, c.created_at,
             COALESCE(u.username, u.name, u.email, 'User') AS username
      FROM post_comments c
      LEFT JOIN users u ON u.id = c.user_id
      WHERE c.post_id = $1
      ORDER BY c.created_at ASC
      `,
      [postId]
    );

    res.json({ ok: true, comments: result.rows });
  } catch (err) {
    console.error("GET COMMENTS ERROR:", err);
    res.status(500).json({ ok: false, error: "Failed to load comments" });
  }
});

/**
 * Add comment
 * POST /comments/:postId  body: { text }
 */
router.post("/:postId", authenticateToken, async (req, res) => {
  try {
    const postId = Number(req.params.postId);
    const userId = req.user?.id || req.userId || req.user?.userId;
    const text = String(req.body?.text || "").trim();

    if (!postId || !userId || !text) {
      return res.status(400).json({ ok: false, error: "Text required" });
    }

    const saved = await pool.query(
      `
      INSERT INTO post_comments (post_id, user_id, text)
      VALUES ($1,$2,$3)
      RETURNING id, post_id, user_id, text, created_at
      `,
      [postId, userId, text]
    );

    const userRes = await pool.query(
      `SELECT COALESCE(username, name, email, 'User') AS username FROM users WHERE id=$1`,
      [userId]
    );

    const payload = { ...saved.rows[0], username: userRes.rows[0]?.username || "User" };

    // 🔔 Realtime update
    req.io?.emit("post:commentAdded", payload);

    res.json({ ok: true, comment: payload });
  } catch (err) {
    console.error("ADD COMMENT ERROR:", err);
    res.status(500).json({ ok: false, error: "Comment failed" });
  }
});

export default router;