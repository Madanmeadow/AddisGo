import express from 'express'
import { pool } from '../db.js'

const router = express.Router()

// GET /conversations (or /api/conversations)
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id
    const result = await pool.query(
      `SELECT
        c.id AS conversation_id,
        c.created_at,
        other.id AS other_user_id,
        COALESCE(other.username, other.name, other.email, 'User') AS other_name,
        other.username AS other_username,
        lm.text AS last_message,
        lm.media_type AS last_message_type,
        lm.created_at AS last_message_at,
        (
          SELECT COUNT(*) FROM messages msg
          WHERE msg.conversation_id = c.id
            AND msg.sender_id <> $1
            AND NOT EXISTS (
              SELECT 1 FROM message_reads mr
              WHERE mr.message_id = msg.id AND mr.user_id = $1
            )
        ) AS unread_count
      FROM conversations c
      JOIN conversation_participants cp ON cp.conversation_id = c.id AND cp.user_id = $1
      JOIN conversation_participants cp2 ON cp2.conversation_id = c.id AND cp2.user_id <> $1
      JOIN users other ON other.id = cp2.user_id
      LEFT JOIN LATERAL (
        SELECT text, media_type, created_at
        FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1
      ) lm ON true
      ORDER BY COALESCE(lm.created_at, c.created_at) DESC`,
      [userId]
    )

    const list = result.rows.map(r => ({
      id: r.conversation_id,
      otherUserId: String(r.other_user_id),
      other_user_id: String(r.other_user_id),
      name: r.other_name,
      other_name: r.other_name,
      other_username: r.other_username,
      lastMessage: r.last_message || '',
      last_message: r.last_message || '',
      lastMessageType: r.last_message_type,
      last_message_type: r.last_message_type,
      lastMessageAt: r.last_message_at,
      last_message_at: r.last_message_at,
      unread: Number(r.unread_count),
      unread_count: Number(r.unread_count),
      updated_at: r.created_at
    }))

    res.json(list)
  } catch (err) {
    console.error('GET /conversations error:', err)
    res.status(500).json({ error: 'Failed to load conversations' })
  }
})

// POST /conversations  body: { otherUserId }
router.post('/', async (req, res) => {
  try {
    const { otherUserId } = req.body
    if (!otherUserId) return res.status(400).json({ error: 'otherUserId required' })
    if (Number(otherUserId) === Number(req.user.id))
      return res.status(400).json({ error: 'Cannot chat with yourself' })

    const existing = await pool.query(
      `SELECT cp1.conversation_id AS id
       FROM conversation_participants cp1
       JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
       WHERE cp1.user_id = $1 AND cp2.user_id = $2 LIMIT 1`,
      [req.user.id, otherUserId]
    )

    if (existing.rows.length) return res.json({ id: existing.rows[0].id })

    const created = await pool.query(`INSERT INTO conversations DEFAULT VALUES RETURNING id`)
    const cid = created.rows[0].id
    await pool.query(
      `INSERT INTO conversation_participants (conversation_id, user_id) VALUES ($1,$2),($1,$3)`,
      [cid, req.user.id, otherUserId]
    )

    res.json({ id: cid })
  } catch (err) {
    console.error('POST /conversations error:', err)
    res.status(500).json({ error: err.message })
  }
})

export default router