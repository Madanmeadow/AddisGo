import { verifySession } from '../utils/jwt.js';

export function requireAuth(req, res, next) {
  const token = req.cookies.medan_session;
  if (!token) return res.sendStatus(401);

  try {
    const decoded = verifySession(token);
    req.userId = decoded.id;
    next();
  } catch {
    return res.sendStatus(401);
  }
}
