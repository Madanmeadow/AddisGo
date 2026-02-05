const express = require("express");
const router = express.Router();

router.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (email === "intalhaye@gmail.com" && password === "123456") {
    return res.json({
      token: "mock-jwt-token",
      user: { email }
    });
  }

  res.status(401).json({ message: "Invalid credentials" });
});

router.post("/register", (req, res) => {
  res.json({ success: true });
});

module.exports = router;
