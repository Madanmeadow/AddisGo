import express from "express";
import { pool } from "../db.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

const router = express.Router();

/**
 * GET /likes/:postId
 * Returns: { count, likedByMe }
 */
router.get("/:postId", authenticateToken, async (req, res) => {
  try {
    const postId = Number(req.params.postId);
    const userId = req.user?.id;

    if (!postId) return res.status(400).json({ error: "Invalid postId" });
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const countRes = await pool.query(
      `SELECT COUNT(*)::int AS count FROM post_likes WHERE post_id = $1`,
      [postId]
    );

    const meRes = await pool.query(
      `SELECT 1 FROM post_likes WHERE post_id = $1 AND user_id = $2 LIMIT 1`,
      [postId, userId]
    );

    res.json({ count: countRes.rows[0].count, likedByMe: meRes.rowCount > 0 });
  } catch (err) {
    console.error("GET /likes/:postId ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /likes/:postId/toggle
 * Returns: { count, likedByMe }
 */
router.post("/:postId/toggle", authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const postId = Number(req.params.postId);
    const userId = req.user?.id;

    if (!postId) return res.status(400).json({ error: "Invalid postId" });
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    await client.query("BEGIN");

    const exists = await client.query(
      `SELECT id FROM post_likes WHERE post_id = $1 AND user_id = $2 LIMIT 1`,
      [postId, userId]
    );

    let likedByMe = false;

    if (exists.rowCount > 0) {
      await client.query(`DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2`, [postId, userId]);
      likedByMe = false;
    } else {
      await client.query(
        `INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [postId, userId]
      );
      likedByMe = true;
    }

    const countRes = await client.query(
      `SELECT COUNT(*)::int AS count FROM post_likes WHERE post_id = $1`,
      [postId]
    );

    await client.query("COMMIT");

    res.json({ count: countRes.rows[0].count, likedByMe });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("POST /likes/:postId/toggle ERROR:", err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

export default router;