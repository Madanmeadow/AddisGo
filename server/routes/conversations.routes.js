import express from "express"
import { pool } from "../db.js"
import { authenticateToken } from "../middleware/auth.middleware.js"

const router = express.Router()

// My conversations
router.get("/", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        c.id,
        c.created_at,
        (
          SELECT COALESCE(u.username, u.name, u.email, 'User')
          FROM conversation_participants cp2
          JOIN users u ON u.id = cp2.user_id
          WHERE cp2.conversation_id = c.id
            AND cp2.user_id <> $1
          LIMIT 1
        ) AS title,
        (
          SELECT m.text
          FROM messages m
          WHERE m.conversation_id = c.id
          ORDER BY m.created_at DESC
          LIMIT 1
        ) AS last_text,
        (
          SELECT m.created_at
          FROM messages m
          WHERE m.conversation_id = c.id
          ORDER BY m.created_at DESC
          LIMIT 1
        ) AS last_time
      FROM conversations c
      JOIN conversation_participants cp ON cp.conversation_id = c.id
      WHERE cp.user_id = $1
      ORDER BY COALESCE(
        (SELECT m.created_at FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1),
        c.created_at
      ) DESC
      `,
      [req.user.id]
    )

    res.json(result.rows)
  } catch (err) {
    console.error("GET /conversations ERROR:", err)
    res.status(500).json({ error: err.message })
  }
})

/**
 * Create or get 1:1 conversation with another user
 * body: { otherUserId }
 */
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { otherUserId } = req.body
    if (!otherUserId) return res.status(400).json({ error: "otherUserId required" })
    if (Number(otherUserId) === Number(req.user.id))
      return res.status(400).json({ error: "Cannot chat with yourself" })

    // Check if conversation already exists for these 2 users
    const existing = await pool.query(
      `
      SELECT cp1.conversation_id AS id
      FROM conversation_participants cp1
      JOIN conversation_participants cp2
        ON cp1.conversation_id = cp2.conversation_id
      WHERE cp1.user_id = $1 AND cp2.user_id = $2
      LIMIT 1
      `,
      [req.user.id, otherUserId]
    )

    if (existing.rows.length) {
      return res.json({ id: existing.rows[0].id })
    }

    // Create new conversation
    const created = await pool.query(
      `INSERT INTO conversations DEFAULT VALUES RETURNING id`,
      []
    )
    const conversationId = created.rows[0].id

    // Add participants
    await pool.query(
      `INSERT INTO conversation_participants (conversation_id, user_id) VALUES ($1,$2),($1,$3)`,
      [conversationId, req.user.id, otherUserId]
    )

    res.json({ id: conversationId })
  } catch (err) {
    console.error("POST /conversations ERROR:", err)
    res.status(500).json({ error: err.message })
  }
})

export default router