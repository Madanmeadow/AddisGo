const express = require("express");
const router = express.Router();
const pool = require("../db");

// 📌 CREATE CONVERSATION (if not exists)
router.post("/create", async (req, res) => {
  try {
    const { user1, user2 } = req.body;

    // Check if conversation already exists
    const existing = await pool.query(`
      SELECT c.id
      FROM conversations c
      JOIN conversation_participants cp1 
        ON cp1.conversation_id = c.id AND cp1.user_id = $1
      JOIN conversation_participants cp2 
        ON cp2.conversation_id = c.id AND cp2.user_id = $2
    `, [user1, user2]);

    if (existing.rows.length > 0) {
      return res.json({ conversationId: existing.rows[0].id });
    }

    // Create conversation
    const conversation = await pool.query(
      `INSERT INTO conversations DEFAULT VALUES RETURNING *`
    );

    const conversationId = conversation.rows[0].id;

    await pool.query(
      `INSERT INTO conversation_participants (conversation_id, user_id)
       VALUES ($1, $2), ($1, $3)`,
      [conversationId, user1, user2]
    );

    res.json({ conversationId });

  } catch (err) {
    console.error(err);
    res.status(500).json("Server error");
  }
});


// 📥 GET USER CONVERSATIONS (Inbox)
router.get("/conversations/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await pool.query(`
      SELECT 
        c.id as conversation_id,
        MAX(m.created_at) as last_message_time,
        (
          SELECT content 
          FROM messages 
          WHERE conversation_id = c.id 
          ORDER BY created_at DESC 
          LIMIT 1
        ) as last_message
      FROM conversations c
      JOIN conversation_participants cp 
        ON cp.conversation_id = c.id
      LEFT JOIN messages m 
        ON m.conversation_id = c.id
      WHERE cp.user_id = $1
      GROUP BY c.id
      ORDER BY last_message_time DESC
    `, [userId]);

    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json("Server error");
  }
});


// 📩 GET MESSAGES INSIDE CONVERSATION
router.get("/conversation/:conversationId", async (req, res) => {
  try {
    const { conversationId } = req.params;

    const messages = await pool.query(
      `SELECT * FROM messages
       WHERE conversation_id = $1
       ORDER BY created_at ASC`,
      [conversationId]
    );

    res.json(messages.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json("Server error");
  }
});


// ➕ SEND MESSAGE (HTTP version)
router.post("/send", async (req, res) => {
  try {
    const { conversationId, senderId, content } = req.body;

    const message = await pool.query(
      `INSERT INTO messages (conversation_id, sender_id, content)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [conversationId, senderId, content]
    );

    res.json(message.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json("Server error");
  }
});

module.exports = router;






