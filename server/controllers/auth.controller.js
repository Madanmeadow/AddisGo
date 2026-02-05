import bcrypt from "bcryptjs";
import { signToken } from "../utils/jwt.js";

// TEMP in-memory users (later DB)
const users = [];

// REGISTER
export const register = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Missing fields" });
  }

  const existing = users.find(u => u.username === username);
  if (existing) {
    return res.status(400).json({ message: "User already exists" });
  }

  const hashed = await bcrypt.hash(password, 10);

  const user = {
    id: Date.now(),
    username,
    password: hashed
  };

  users.push(user);

  const token = signToken({ id: user.id, username });

  res.json({
    message: "User registered",
    token,
    user: { id: user.id, username }
  });
};

// LOGIN
export const login = async (req, res) => {
  const { username, password } = req.body;

  const user = users.find(u => u.username === username);
  if (!user) {
    return res.status(400).json({ message: "Invalid credentials" });
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return res.status(400).json({ message: "Invalid credentials" });
  }

  const token = signToken({ id: user.id, username });

  res.json({
    message: "Login successful",
    token,
    user: { id: user.id, username }
  });
};
