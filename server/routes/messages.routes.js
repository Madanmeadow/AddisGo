import express from "express";
import { pool } from "../db.js";

const router = express.Router();

/*
Assumed tables:

CREATE TABLE conversations (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE conversation_members (
  id SERIAL PRIMARY KEY,
  conversation_id INT REFERENCES conversations(id) ON DELETE CASCADE,
  user_id INT REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  conversation_id INT REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id INT REFERENCES users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
*/

// GET /conversations?userId=1
router.get("/conversations", async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: "Missing userId" });
    }

    const q = `
      SELECT
        c.id,
        c.created_at,
        other.user_id AS other_user_id,
        u.username AS other_username,
        u.name AS other_name,
        lm.text AS last_message,
        lm.created_at AS last_message_at
      FROM conversations c
      JOIN conversation_members me
        ON me.conversation_id = c.id
      JOIN conversation_members other
        ON other.conversation_id = c.id
       AND other.user_id <> me.user_id
      JOIN users u
        ON u.id = other.user_id
      LEFT JOIN LATERAL (
        SELECT m.text, m.created_at
        FROM messages m
        WHERE m.conversation_id = c.id
        ORDER BY m.created_at DESC
        LIMIT 1
      ) lm ON TRUE
      WHERE me.user_id = $1
      ORDER BY COALESCE(lm.created_at, c.created_at) DESC
    `;

    const { rows } = await pool.query(q, [userId]);
    res.json(rows);
  } catch (err) {
    console.error("GET /conversations error:", err);
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

// POST /conversations
router.post("/conversations", async (req, res) => {
  const client = await pool.connect();

  try {
    const { userId1, userId2 } = req.body || {};

    if (!userId1 || !userId2) {
      return res.status(400).json({ error: "Missing user ids" });
    }

    if (String(userId1) === String(userId2)) {
      return res.status(400).json({ error: "Cannot create conversation with yourself" });
    }

    await client.query("BEGIN");

    const existing = await client.query(
      `
      SELECT c.id
      FROM conversations c
      JOIN conversation_members m1
        ON m1.conversation_id = c.id AND m1.user_id = $1
      JOIN conversation_members m2
        ON m2.conversation_id = c.id AND m2.user_id = $2
      LIMIT 1
      `,
      [userId1, userId2]
    );

    if (existing.rows.length) {
      await client.query("COMMIT");
      return res.json({ id: existing.rows[0].id });
    }

    const created = await client.query(
      `INSERT INTO conversations DEFAULT VALUES RETURNING id, created_at`
    );

    const conversationId = created.rows[0].id;

    await client.query(
      `
      INSERT INTO conversation_members (conversation_id, user_id)
      VALUES ($1, $2), ($1, $3)
      `,
      [conversationId, userId1, userId2]
    );

    await client.query("COMMIT");
    res.status(201).json({ id: conversationId });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("POST /conversations error:", err);
    res.status(500).json({ error: "Failed to create conversation" });
  } finally {
    client.release();
  }
});

// GET /messages?conversationId=1
router.get("/messages", async (req, res) => {
  try {
    const { conversationId } = req.query;

    if (!conversationId) {
      return res.status(400).json({ error: "Missing conversationId" });
    }

    const { rows } = await pool.query(
      `
      SELECT
        id,
        conversation_id,
        sender_id,
        text,
        created_at
      FROM messages
      WHERE conversation_id = $1
      ORDER BY created_at ASC
      `,
      [conversationId]
    );

    res.json(rows);
  } catch (err) {
    console.error("GET /messages error:", err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// POST /messages
router.post("/messages", async (req, res) => {
  try {
    const { conversationId, sender_id, text } = req.body || {};

    if (!conversationId || !sender_id || !String(text || "").trim()) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const { rows } = await pool.query(
      `
      INSERT INTO messages (conversation_id, sender_id, text)
      VALUES ($1, $2, $3)
      RETURNING
        id,
        conversation_id,
        sender_id,
        text,
        created_at
      `,
      [conversationId, sender_id, String(text).trim()]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("POST /messages error:", err);
    res.status(500).json({ error: "Failed to send message" });
  }
});

export default router;




