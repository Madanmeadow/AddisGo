const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const router = express.Router();

// TEST ROUTE
router.get("/test", (req, res) => {
  res.json({ message: "Auth route working ✅" });
});

// REGISTER
router.post("/register", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Missing fields" });
  }

  const hashed = await bcrypt.hash(password, 10);

  // TEMP: pretend DB save
  global.users = global.users || [];
  global.users.push({ email, password: hashed });

  res.json({ message: "User registered ✅" });
});

// LOGIN
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const user = (global.users || []).find(u => u.email === email);
  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return res.status(401).json({ message: "Invalid credentials" });
  }
const authMiddleware = require("../middleware/auth.middleware");

router.get("/profile", authMiddleware, (req, res) => {
  res.json({
    id: req.user.id,
    email: req.user.email
  });
});

  const token = jwt.sign(
    { email },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

  res.json({ token });
});

module.exports = router;
