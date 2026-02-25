import express from "express";
import { pool } from "../db.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

const router = express.Router();

/**
 * GET /comments/:postId
 * Returns array: [{id, post_id, user_id, content, created_at, name, email}]
 */
router.get("/:postId", authenticateToken, async (req, res) => {
  try {
    const postId = Number(req.params.postId);
    if (!postId) return res.status(400).json({ error: "Invalid postId" });

    // If you don't have users table, this still works because LEFT JOIN is optional.
    // If it errors because users doesn't exist, remove the join lines.
    const result = await pool.query(
      `
      SELECT
        c.id,
        c.post_id,
        c.user_id,
        c.content,
        c.created_at,
        u.username AS name,
        u.email AS email
      FROM post_comments c
      LEFT JOIN users u ON u.id = c.user_id
      WHERE c.post_id = $1
      ORDER BY c.created_at DESC
      `,
      [postId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("GET /comments/:postId ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /comments/:postId
 * Body: { content }
 * Returns created comment row
 */
router.post("/:postId", authenticateToken, async (req, res) => {
  try {
    const postId = Number(req.params.postId);
    const userId = req.user?.id; // from your JWT middleware
    const content = String(req.body?.content || "").trim();

    if (!postId) return res.status(400).json({ error: "Invalid postId" });
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!content) return res.status(400).json({ error: "Comment is required" });

    const result = await pool.query(
      `
      INSERT INTO post_comments (post_id, user_id, content)
      VALUES ($1, $2, $3)
      RETURNING id, post_id, user_id, content, created_at
      `,
      [postId, userId, content]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("POST /comments/:postId ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;