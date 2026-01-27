import { pool } from '../db.js';
import { v4 as uuid } from 'uuid';

export async function acknowledgeVoice(req, res) {
  const userId = req.userId;
  const voiceId = req.params.id;

  // Check voice exists & not archived
  const voice = await pool.query(
    `SELECT id, author_id, archived
     FROM voices
     WHERE id=$1`,
    [voiceId]
  );

  if (!voice.rowCount || voice.rows[0].archived) {
    return res.sendStatus(404);
  }

  // Prevent self-acknowledgement
  if (voice.rows[0].author_id === userId) {
    return res.sendStatus(204);
  }

  try {
    await pool.query(
      `INSERT INTO acknowledgements (id, voice_id, user_id)
       VALUES ($1, $2, $3)`,
      [uuid(), voiceId, userId]
    );
  } catch (err) {
    // Duplicate acknowledgement → silent success
    return res.sendStatus(204);
  }

  res.sendStatus(204);
}
