import { pool } from '../db.js';
import { generateToken, hashToken } from '../utils/tokens.js';

export async function requestLink(req, res) {
  const { email, inviteToken } = req.body;

  const invite = await pool.query(
    `SELECT * FROM invites WHERE token=$1 AND status='active'`,
    [inviteToken]
  );

  if (!invite.rowCount) return res.sendStatus(403);

  const magicToken = generateToken();
  const hashed = hashToken(magicToken);

  await pool.query(
    `INSERT INTO magic_links (email, token, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '15 minutes')`,
    [email, hashed]
  );

  // 🔌 Send email here
  // link: /auth/verify?token=${magicToken}

  res.sendStatus(200);
}
