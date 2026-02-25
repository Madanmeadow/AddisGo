import express from "express";
import { pool } from "../db.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

const router = express.Router();

/**
 * Toggle like
 * POST /likes/:postId
 * returns { ok, liked, likesCount }
 */
router.post("/:postId", authenticateToken, async (req, res) => {
  try {
    const postId = Number(req.params.postId);
    const userId = req.user?.id || req.userId || req.user?.userId;

    if (!postId || !userId) return res.status(400).json({ ok: false, error: "Bad request" });

    const exists = await pool.query(
      `SELECT 1 FROM post_likes WHERE post_id=$1 AND user_id=$2 LIMIT 1`,
      [postId, userId]
    );

    let liked = false;

    if (exists.rows.length) {
      await pool.query(`DELETE FROM post_likes WHERE post_id=$1 AND user_id=$2`, [postId, userId]);
      liked = false;
    } else {
      await pool.query(
        `INSERT INTO post_likes (post_id, user_id) VALUES ($1,$2)`,
        [postId, userId]
      );
      liked = true;
    }

    const countRes = await pool.query(
      `SELECT COUNT(*)::int AS count FROM post_likes WHERE post_id=$1`,
      [postId]
    );

    // 🔔 Realtime update (optional; requires io on req)
    req.io?.emit("post:likeUpdated", { postId, likesCount: countRes.rows[0].count });

    return res.json({ ok: true, liked, likesCount: countRes.rows[0].count });
  } catch (err) {
    console.error("TOGGLE LIKE ERROR:", err);
    res.status(500).json({ ok: false, error: "Like failed" });
  }
});

export default router;