const express = require("express");
const router = express.Router();
const pool = require("../db");

/*
====================================================
🟢 CREATE CONVERSATION (1-to-1)
====================================================
Body:
{
  user1: 1,
  user2: 2
}
*/
router.post("/create", async (req, res) => {
  try {
    const { user1, user2 } = req.body;

    if (!user1 || !user2) {
      return res.status(400).json("Both users are required");
    }

    // Check if conversation already exists
    const existing = await pool.query(
      `
      SELECT c.id
      FROM conversations c
      JOIN conversation_participants cp1 
        ON cp1.conversation_id = c.id AND cp1.user_id = $1
      JOIN conversation_participants cp2 
        ON cp2.conversation_id = c.id AND cp2.user_id = $2
      `,
      [user1, user2]
    );

    if (existing.rows.length > 0) {
      return res.json({ conversationId: existing.rows[0].id });
    }

    // Create new conversation
    const newConversation = await pool.query(
      `INSERT INTO conversations DEFAULT VALUES RETURNING *`
    );

    const conversationId = newConversation.rows[0].id;

    // Add both users to participants
    await pool.query(
      `
      INSERT INTO conversation_participants (conversation_id, user_id)
      VALUES ($1, $2), ($1, $3)
      `,
      [conversationId, user1, user2]
    );

    res.json({ conversationId });

  } catch (error) {
    console.error("❌ Create conversation error:", error);
    res.status(500).json("Server error");
  }
});


/*
====================================================
🟢 GET ALL CONVERSATIONS FOR USER (Inbox)
====================================================
GET /conversations/user/1
*/
router.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const conversations = await pool.query(
      `
      SELECT 
        c.id AS conversation_id,
        MAX(m.created_at) AS last_message_time,
        (
          SELECT content 
          FROM messages 
          WHERE conversation_id = c.id 
          ORDER BY created_at DESC 
          LIMIT 1
        ) AS last_message
      FROM conversations c
      JOIN conversation_participants cp 
        ON cp.conversation_id = c.id
      LEFT JOIN messages m 
        ON m.conversation_id = c.id
      WHERE cp.user_id = $1
      GROUP BY c.id
      ORDER BY last_message_time DESC
      `,
      [userId]
    );

    res.json(conversations.rows);

  } catch (error) {
    console.error("❌ Get conversations error:", error);
    res.status(500).json("Server error");
  }
});


/*
====================================================
🟢 GET SINGLE CONVERSATION DETAILS
====================================================
GET /conversations/1
*/
router.get("/:conversationId", async (req, res) => {
  try {
    const { conversationId } = req.params;

    const conversation = await pool.query(
      `
      SELECT * FROM conversations
      WHERE id = $1
      `,
      [conversationId]
    );

    if (conversation.rows.length === 0) {
      return res.status(404).json("Conversation not found");
    }

    res.json(conversation.rows[0]);

  } catch (error) {
    console.error("❌ Get conversation error:", error);
    res.status(500).json("Server error");
  }
});

module.exports = router;
