import { pool } from '../db.js';
import { v4 as uuid } from 'uuid';

const ALLOWED_PRESENCE = ['reflecting', 'writing', 'listening', 'away'];

export async function createVoice(req, res) {
  const userId = req.userId;
  const { title, body, presence, allow_public_responses } = req.body;

  // Quiet validation
  if (!body || body.trim().length < 20) {
    return res.status(400).json({ error: 'Voice too short' });
  }

  if (presence && !ALLOWED_PRESENCE.includes(presence)) {
    return res.status(400).json({ error: 'Invalid presence' });
  }

  const voiceId = uuid();

  await pool.query(
    `INSERT INTO voices (
       id,
       author_id,
       title,
       body,
       presence,
       allow_public_responses
     )
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      voiceId,
      userId,
      title || null,
      body.trim(),
      presence || null,
      allow_public_responses || false
    ]
  );

  res.status(201).json({ id: voiceId });
}
