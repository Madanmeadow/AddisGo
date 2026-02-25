import express from "express";
import { pool } from "../db.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

const router = express.Router();

/**
 * GET comments for a post
 * GET /posts/:postId/comments
 */
router.get("/posts/:postId/comments", async (req, res) => {
  try {
    const postId = Number(req.params.postId);
    if (!postId) return res.status(400).json({ error: "Invalid postId" });

    const result = await pool.query(
      `
      SELECT
        c.id,
        c.post_id,
        c.user_id,
        c.content,
        c.created_at
      FROM post_comments c
      WHERE c.post_id = $1
      ORDER BY c.created_at ASC
      `,
      [postId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("GET comments ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST a comment
 * POST /posts/:postId/comments
 * body: { content }
 */
router.post("/posts/:postId/comments", authenticateToken, async (req, res) => {
  try {
    const postId = Number(req.params.postId);
    const userId = req.user?.id; // from JWT middleware
    const content = (req.body?.content || "").trim();

    if (!postId) return res.status(400).json({ error: "Invalid postId" });
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!content) return res.status(400).json({ error: "Comment is empty" });

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
    console.error("POST comment ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE a comment (only owner)
 * DELETE /comments/:commentId
 */
router.delete("/comments/:commentId", authenticateToken, async (req, res) => {
  try {
    const commentId = Number(req.params.commentId);
    const userId = req.user?.id;

    if (!commentId) return res.status(400).json({ error: "Invalid commentId" });

    const result = await pool.query(
      `
      DELETE FROM post_comments c
      WHERE c.id = $1 AND c.user_id = $2
      RETURNING c.id
      `,
      [commentId, userId]
    );

    if (result.rowCount === 0) {
      return res.status(403).json({ error: "Not allowed or not found" });
    }

    res.json({ ok: true, id: result.rows[0].id });
  } catch (err) {
    console.error("DELETE comment ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;