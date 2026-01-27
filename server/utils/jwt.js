import jwt from 'jsonwebtoken';

export function signSession(user) {
  return jwt.sign(
    { id: user.id },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifySession(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}
