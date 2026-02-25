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
    if (!Number.isFinite(postId) || postId <= 0) {
      return res.status(400).json({ error: "Invalid postId" });
    }

    const result = await pool.query(
      `
      SELECT
        id,
        post_id,
        user_id,
        body,
        parent_id,
        created_at,
        updated_at
      FROM comments
      WHERE post_id = $1
      ORDER BY created_at ASC, id ASC
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
 * body: { body, parentId? }
 */
router.post("/posts/:postId/comments", authenticateToken, async (req, res) => {
  try {
    const postId = Number(req.params.postId);
    const userId = req.user?.id;
    const body = String(req.body?.body ?? "").trim();
    const parentIdRaw = req.body?.parentId;

    if (!Number.isFinite(postId) || postId <= 0) {
      return res.status(400).json({ error: "Invalid postId" });
    }
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!body) return res.status(400).json({ error: "Comment is empty" });

    const parentId =
      parentIdRaw === null || parentIdRaw === undefined || parentIdRaw === ""
        ? null
        : Number(parentIdRaw);

    if (parentId !== null && (!Number.isFinite(parentId) || parentId <= 0)) {
      return res.status(400).json({ error: "Invalid parentId" });
    }

    const inserted = await pool.query(
      `
      INSERT INTO comments (post_id, user_id, body, parent_id)
      VALUES ($1, $2, $3, $4)
      RETURNING id, post_id, user_id, body, parent_id, created_at, updated_at
      `,
      [postId, userId, body, parentId]
    );

    res.status(201).json(inserted.rows[0]);
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

    if (!Number.isFinite(commentId) || commentId <= 0) {
      return res.status(400).json({ error: "Invalid commentId" });
    }
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    // IMPORTANT: no alias + RETURNING id (fixes the "c" error)
    const result = await pool.query(
      `
      DELETE FROM comments
      WHERE id = $1 AND user_id = $2
      RETURNING id
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