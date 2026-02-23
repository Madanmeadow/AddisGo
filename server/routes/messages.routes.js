import express from "express"
import { pool } from "../db.js"
import { authenticateToken } from "../middleware/auth.middleware.js"

const router = express.Router()

// Get messages for a conversation
router.get("/:conversationId", authenticateToken, async (req, res) => {
  try {
    const { conversationId } = req.params

    // Ensure user is participant
    const allowed = await pool.query(
      `
      SELECT 1
      FROM conversation_participants
      WHERE conversation_id = $1 AND user_id = $2
      LIMIT 1
      `,
      [conversationId, req.user.id]
    )
    if (!allowed.rows.length) return res.status(403).json({ error: "Not allowed" })

    const result = await pool.query(
      `
      SELECT id, conversation_id, sender_id, text, media_url, created_at
      FROM messages
      WHERE conversation_id = $1
      ORDER BY created_at ASC
      LIMIT 500
      `,
      [conversationId]
    )

    res.json(result.rows)
  } catch (err) {
    console.error("GET /messages/:conversationId ERROR:", err)
    res.status(500).json({ error: err.message })
  }
})

export default router





