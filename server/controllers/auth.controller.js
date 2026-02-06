import bcrypt from "bcryptjs";
import { signToken } from "../utils/jwt.js";

// TEMP in-memory user store (replace with DB later)
const users = [];

/**
 * POST /api/auth/register
 */
export const register = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ message: "Missing fields" });

  const exists = users.find((u) => u.email === email);
  if (exists)
    return res.status(409).json({ message: "User already exists" });

  const hashed = await bcrypt.hash(password, 10);

  const user = {
    id: users.length + 1,
    email,
    password: hashed,
  };

  users.push(user);

  const token = signToken({ id: user.id, email: user.email });

  res.status(201).json({
    message: "User registered",
    token,
    user: { id: user.id, email: user.email },
  });
};

/**
 * POST /api/auth/login
 */
export const login = async (req, res) => {
  const { email, password } = req.body;

  const user = users.find((u) => u.email === email);
  if (!user)
    return res.status(401).json({ message: "Invalid credentials" });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid)
    return res.status(401).json({ message: "Invalid credentials" });

  const token = signToken({ id: user.id, email: user.email });

  res.json({
    message: "Login successful",
    token,
    user: { id: user.id, email: user.email },
  });
};
