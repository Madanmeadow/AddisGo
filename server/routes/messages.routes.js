import express from 'express'
import { pool } from '../db.js'

const router = express.Router()

// GET /messages?otherUserId=123  OR  ?conversationId=123
router.get('/', async (req, res) => {
  try {
    const myId = req.user.id
    const { conversationId, otherUserId, userId } = req.query
    const targetUserId = otherUserId || userId

    let convId = conversationId

    if (!convId && targetUserId) {
      const ex = await pool.query(
        `SELECT cp1.conversation_id AS id
         FROM conversation_participants cp1
         JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
         WHERE cp1.user_id = $1 AND cp2.user_id = $2 LIMIT 1`,
        [myId, targetUserId]
      )
      if (ex.rows.length) {
        convId = ex.rows[0].id
      } else {
        const nc = await pool.query(`INSERT INTO conversations DEFAULT VALUES RETURNING id`)
        convId = nc.rows[0].id
        await pool.query(
          `INSERT INTO conversation_participants (conversation_id, user_id) VALUES ($1,$2),($1,$3)`,
          [convId, myId, targetUserId]
        )
      }
    }

    if (!convId) return res.status(400).json({ error: 'conversationId or otherUserId required' })

    // Security check
    const mem = await pool.query(
      `SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2`,
      [convId, myId]
    )
    if (mem.rows.length === 0) return res.status(403).json({ error: 'Access denied' })

    const result = await pool.query(
      `SELECT
        m.id, m.conversation_id, m.sender_id,
        COALESCE(u.username, u.name, u.email, 'User') AS sender_name,
        m.text, m.media_url, m.media_type, m.created_at
      FROM messages m
      LEFT JOIN users u ON u.id = m.sender_id
      WHERE m.conversation_id = $1
      ORDER BY m.created_at ASC`,
      [convId]
    )

    // Mark delivered/read
    await pool.query(
      `INSERT INTO message_reads (message_id, user_id)
       SELECT m.id, $1 FROM messages m
       WHERE m.conversation_id = $2 AND m.sender_id <> $1
         AND NOT EXISTS (
           SELECT 1 FROM message_reads mr2
           WHERE mr2.message_id = m.id AND mr2.user_id = $1
         )
       ON CONFLICT DO NOTHING`,
      [myId, convId]
    )

    res.json(result.rows)
  } catch (err) {
    console.error('GET /messages error:', err)
    res.status(500).json({ error: 'Failed to load messages' })
  }
})

// POST /messages
router.post('/', async (req, res) => {
  try {
    const myId = req.user.id
    const {
      conversationId, otherUserId, userId, receiverId,
      text, content, message,
      mediaUrl, mediaType
    } = req.body

    const targetId = otherUserId || userId || receiverId
    const msgText = (text || content || message || '').trim()
    const msgMedia = mediaUrl || null
    const msgMediaType = mediaType || (msgMedia ? 'image' : 'text')

    if (!msgText && !msgMedia) return res.status(400).json({ error: 'text or media required' })

    let convId = conversationId
    if (!convId && targetId) {
      if (Number(targetId) === Number(myId))
        return res.status(400).json({ error: 'Cannot message yourself' })

      const ex = await pool.query(
        `SELECT cp1.conversation_id AS id
         FROM conversation_participants cp1
         JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
         WHERE cp1.user_id = $1 AND cp2.user_id = $2 LIMIT 1`,
        [myId, targetId]
      )
      if (ex.rows.length) {
        convId = ex.rows[0].id
      } else {
        const nc = await pool.query(`INSERT INTO conversations DEFAULT VALUES RETURNING id`)
        convId = nc.rows[0].id
        await pool.query(
          `INSERT INTO conversation_participants (conversation_id, user_id) VALUES ($1,$2),($1,$3)`,
          [convId, myId, targetId]
        )
      }
    }

    if (!convId) return res.status(400).json({ error: 'conversationId or otherUserId required' })

    const ins = await pool.query(
      `INSERT INTO messages (conversation_id, sender_id, text, media_url, media_type)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id, conversation_id, sender_id, text, media_url, media_type, created_at`,
      [convId, myId, msgText || null, msgMedia, msgMediaType]
    )

    const m = ins.rows[0]
    const s = await pool.query(
      `SELECT COALESCE(username, name, email, 'User') AS sender_name FROM users WHERE id=$1`,
      [myId]
    )

    res.json({
      ...m,
      sender_id: m.sender_id,
      sender_name: s.rows[0]?.sender_name || 'User',
      content: m.text,
      media_url: m.media_url,
      media_type: m.media_type
    })
  } catch (err) {
    console.error('POST /messages error:', err)
    res.status(500).json({ error: 'Failed to send message' })
  }
})

export default router
