import express from "express";
import { pool } from "../db.js";

const router = express.Router();

/* =========================
   GET MESSAGES FOR A CONVERSATION
   GET /messages?conversationId=123
========================= */
router.get("/", async (req, res) => {
  try {
    const { conversationId } = req.query;

    if (!conversationId) {
      return res.status(400).json({ error: "conversationId required" });
    }

    const result = await pool.query(
      `
      SELECT
        m.id,
        m.conversation_id,
        m.sender_id,
        COALESCE(u.username, u.name, u.email, 'User') AS sender_name,
        m.text,
        m.created_at
      FROM messages m
      LEFT JOIN users u ON u.id = m.sender_id
      WHERE m.conversation_id = $1
      ORDER BY m.created_at ASC
      `,
      [conversationId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("❌ GET /messages error:", err);
    res.status(500).json({ error: "Failed to load messages" });
  }
});

/* =========================
   SEND MESSAGE
   POST /messages
   body: { conversationId, senderId, text }
========================= */
router.post("/", async (req, res) => {
  try {
    const { conversationId, senderId, text } = req.body;

    if (!conversationId || !senderId || !text?.trim()) {
      return res.status(400).json({
        error: "conversationId, senderId, and text are required",
      });
    }

    const inserted = await pool.query(
      `
      INSERT INTO messages (conversation_id, sender_id, text)
      VALUES ($1, $2, $3)
      RETURNING id, conversation_id, sender_id, text, created_at
      `,
      [conversationId, senderId, text.trim()]
    );

    const msg = inserted.rows[0];

    const sender = await pool.query(
      `
      SELECT COALESCE(username, name, email, 'User') AS sender_name
      FROM users
      WHERE id = $1
      LIMIT 1
      `,
      [senderId]
    );

    res.json({
      ...msg,
      sender_name: sender.rows[0]?.sender_name || "User",
    });
  } catch (err) {
    console.error("❌ POST /messages error:", err);
    res.status(500).json({ error: "Failed to send message" });
  }
});

/* =========================
   GET USER CONVERSATIONS
   GET /messages/conversations?userId=1
   This matches your Inbox.vue shape
========================= */
router.get("/conversations", async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "userId required" });
    }

    const result = await pool.query(
      `
      SELECT
        c.id,
        c.created_at,
        c.created_at AS updated_at,

        other.id AS other_user_id,
        other.username AS other_username,
        other.name AS other_name,

        lm.text AS last_message,
        lm.created_at AS last_message_at

      FROM conversations c

      JOIN conversation_members me
        ON me.conversation_id = c.id
       AND me.user_id = $1

      JOIN conversation_members other_member
        ON other_member.conversation_id = c.id
       AND other_member.user_id <> $1

      JOIN users other
        ON other.id = other_member.user_id

      LEFT JOIN LATERAL (
        SELECT m.text, m.created_at
        FROM messages m
        WHERE m.conversation_id = c.id
        ORDER BY m.created_at DESC
        LIMIT 1
      ) lm ON true

      ORDER BY COALESCE(lm.created_at, c.created_at) DESC
      `,
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("❌ GET /messages/conversations error:", err);
    res.status(500).json({ error: "Failed to load conversations" });
  }
});

export default router;



