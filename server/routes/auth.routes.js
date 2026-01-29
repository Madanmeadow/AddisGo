const express = require("express");
const router = express.Router();

// test
router.get("/test", (req, res) => {
  res.json({ message: "Auth route working ✅" });
});

// register
router.post("/register", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Missing fields" });
  }

  res.json({
    message: "User registered (mock)",
    user: { email }
  });
});

// login
router.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Missing fields" });
  }

  res.json({
    message: "Login successful (mock)",
    token: "fake-jwt-token"
  });
});

module.exports = router;
