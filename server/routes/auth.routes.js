const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const router = express.Router();

// ✅ TEST
router.get("/test", (req, res) => {
  res.json({ message: "Auth route working ✅" });
});

// ✅ REGISTER
router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    // 🔐 hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // TODO: replace with DB insert later
    global.users = global.users || [];

    const existingUser = global.users.find(u => u.email === email);
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    global.users.push({
      email,
      password: hashedPassword
    });

    res.json({ message: "User registered ✅" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Register failed" });
  }
});

// ✅ LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    global.users = global.users || [];
    const user = global.users.find(u => u.email === email);

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({ token });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Login failed" });
  }
});

module.exports = router;
