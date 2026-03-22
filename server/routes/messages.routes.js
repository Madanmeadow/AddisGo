import express from "express";
import { pool } from "../db.js";

const router = express.Router();

/* =========================
   CREATE OR GET CONVERSATION
========================= */
router.post("/conversations", async (req, res) => {
  try {
    const { userId1, userId2 } = req.body;

    if (!userId1 || !userId2) {
      return res.status(400).json({ error: "Missing users" });
    }

    // check existing
    const existing = await pool.query(
      `
      SELECT c.id
      FROM conversations c
      JOIN conversation_members m1 ON m1.conversation_id = c.id AND m1.user_id = $1
      JOIN conversation_members m2 ON m2.conversation_id = c.id AND m2.user_id = $2
      LIMIT 1
      `,
      [userId1, userId2]
    );

    if (existing.rows.length) {
      return res.json({ id: existing.rows[0].id });
    }

    // create
    const convo = await pool.query(
      `INSERT INTO conversations DEFAULT VALUES RETURNING id`
    );

    const id = convo.rows[0].id;

    await pool.query(
      `
      INSERT INTO conversation_members (conversation_id, user_id)
      VALUES ($1,$2), ($1,$3)
      `,
      [id, userId1, userId2]
    );

    res.json({ id });

  } catch (err) {
    console.error("❌ create conversation error:", err);
    res.status(500).json({ error: "Failed to create conversation" });
  }
});

export default router;




