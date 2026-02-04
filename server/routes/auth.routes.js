const express = require("express");
const jwt = require("jsonwebtoken");

const router = express.Router();

/* TEMP IN-MEMORY USERS (FOR NOW) */
const users = [];

/* REGISTER */
router.post("/register", (req, res) => {
  const { email, password } = req.body;

  const exists = users.find((u) => u.email === email);
  if (exists) {
    return res.status(400).json({ message: "User already exists" });
  }

  users.push({ email, password });

  res.json({ message: "Registered successfully" });
});

/* LOGIN */
router.post("/login", (req, res) => {
  const { email, password } = req.body;

  const user = users.find(
    (u) => u.email === email && u.password === password
  );

  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = jwt.sign(
    { email },
    process.env.JWT_SECRET || "dev_secret",
    { expiresIn: "1d" }
  );

  res.json({ token });
});

module.exports = router;
