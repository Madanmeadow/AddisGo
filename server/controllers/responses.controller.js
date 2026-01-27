import { pool } from '../db.js';
import { v4 as uuid } from 'uuid';

export async function sendPrivateResponse(req, res) {
  const senderId = req.userId;
  const { voice_id, body } = req.body;

  if (!body || body.trim().length < 5) {
    return res.status(400).json({ error: 'Response too short' });
  }

  // Get voice + author
  const voiceResult = await pool.query(
    `SELECT id, author_id, archived
     FROM voices
     WHERE id=$1`,
    [voice_id]
  );

  if (!voiceResult.rowCount || voiceResult.rows[0].archived) {
    return res.sendStatus(404);
  }

  const targetUserId = voiceResult.rows[0].author_id;

  // Prevent responding to self
  if (senderId === targetUserId) {
    return res.sendStatus(204);
  }

  // Check if sender is muted by author
  const muteCheck = await pool.query(
    `SELECT muted FROM connections
     WHERE user_id=$1 AND target_user_id=$2`,
    [targetUserId, senderId]
  );

  if (muteCheck.rowCount && muteCheck.rows[0].muted) {
    return res.sendStatus(204); // silent drop
  }

  await pool.query(
    `INSERT INTO responses (
      id,
      voice_id,
      author_id,
      target_user_id,
      type,
      body
     )
     VALUES ($1, $2, $3, $4, 'private', $5)`,
    [
      uuid(),
      voice_id,
      senderId,
      targetUserId,
      body.trim()
    ]
  );

  res.sendStatus(201);
}
