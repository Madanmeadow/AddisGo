import { pool } from '../db.js';

export async function requireOnboarding(req, res, next) {
  const result = await pool.query(
    `SELECT onboarding_complete FROM users WHERE id=$1`,
    [req.userId]
  );

  if (!result.rowCount) return res.sendStatus(401);
  if (!result.rows[0].onboarding_complete) {
    return res.status(403).json({ code: 'ONBOARDING_REQUIRED' });
  }

  next();
}
