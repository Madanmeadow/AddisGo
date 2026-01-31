const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const router = express.Router();

// TEMP in-memory user store (replace with DB later)
const users = [];

/**
 * TEST
 */
router.get("/test", (req, res) => {
  res.json({ message: "Auth route working ✅" });
});

/**
 * REGISTER
 */
router.post("/register", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ message: "Missing fields" });

  const exists = users.find(u => u.email === email);
  if (exists)
    return res.status(400).json({ message: "User already exists" });

  const hashed = await bcrypt.hash(password, 10);
  users.push({ email, password: hashed });

  res.json({ message: "User registered ✅" });
});

/**
 * LOGIN
 */
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const user = users.find(u => u.email === email);
  if (!user)
    return res.status(401).json({ message: "Invalid credentials" });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid)
    return res.status(401).json({ message: "Invalid credentials" });

  const token = jwt.sign(
    { email },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

  res.json({ token });
});

module.exports = router;
