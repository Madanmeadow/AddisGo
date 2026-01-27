import { pool } from '../db.js';

export async function getUserProfile(req, res) {
  const viewerId = req.userId;
  const profileId = req.params.id;

  // Check mute (viewer muted profile?)
  const muteCheck = await pool.query(
    `SELECT muted FROM connections
     WHERE user_id=$1 AND target_user_id=$2`,
    [viewerId, profileId]
  );

  if (muteCheck.rowCount && muteCheck.rows[0].muted) {
    return res.sendStatus(404); // silent
  }

  // Get profile (minimal)
  const userResult = await pool.query(
    `SELECT id, name, handle, voice_tag, presence, created_at
     FROM users
     WHERE id=$1`,
    [profileId]
  );

  if (!userResult.rowCount) return res.sendStatus(404);

  // Get visible voices
  const voicesResult = await pool.query(
    `SELECT id, title, body, presence, created_at
     FROM voices
     WHERE author_id=$1
       AND archived=false
     ORDER BY created_at DESC`,
    [profileId]
  );

  res.json({
    user: {
      id: userResult.rows[0].id,
      name: userResult.rows[0].name,
      handle: userResult.rows[0].handle,
      voice_tag: userResult.rows[0].voice_tag,
      presence: userResult.rows[0].presence,
      joined_at: userResult.rows[0].created_at
    },
    voices: voicesResult.rows
  });
}
