import { pool } from '../db.js';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';

/* helpers */
const hash = (t) =>
  crypto.createHash('sha256').update(t).digest('hex');

/* REQUEST MAGIC LINK */
export async function requestLink(req, res) {
  const { email, inviteCode } = req.body;

  if (!email || !inviteCode) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  // 1️⃣ check invite
  const invite = await pool.query(
    'SELECT * FROM invites WHERE code=$1 AND used=false',
    [inviteCode]
  );

  if (!invite.rowCount) {
    return res.status(403).json({ error: 'Invalid invite code' });
  }

  // 2️⃣ create token
  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashed = hash(rawToken);

  await pool.query(
    `INSERT INTO magic_links (email, token, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '15 minutes')`,
    [email, hashed]
  );

  const magicLink =
    `${process.env.FRONTEND_URL}/auth/verify?token=${rawToken}`;

  console.log('\n🔗 MAGIC LOGIN LINK\n', magicLink, '\n');

  res.json({ message: 'Login link sent if invite is valid' });
}

/* VERIFY MAGIC LINK */
export async function verifyLink(req, res) {
  const { token } = req.body;
  if (!token) return res.sendStatus(400);

  const hashed = hash(token);

  const link = await pool.query(
    `SELECT email FROM magic_links
     WHERE token=$1 AND expires_at > NOW()`,
    [hashed]
  );

  if (!link.rowCount) {
    return res.status(401).json({ error: 'Invalid or expired link' });
  }

  const email = link.rows[0].email;

  let user = await pool.query(
    'SELECT id, onboarding_complete FROM users WHERE email=$1',
    [email]
  );

  let userId;
  let onboarded = false;

  if (!user.rowCount) {
    userId = uuid();
    await pool.query(
      'INSERT INTO users (id, email) VALUES ($1, $2)',
      [userId, email]
    );
  } else {
    userId = user.rows[0].id;
    onboarded = user.rows[0].onboarding_complete;
  }

  const session = jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.cookie('medan_session', session, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict'
  });

  await pool.query(
    'DELETE FROM magic_links WHERE token=$1',
    [hashed]
  );

  res.json({ onboarding_required: !onboarded });
}
