import express from "express";
import jwt from "jsonwebtoken";

const router = express.Router();

const SECRET = "dev-secret"; // move to env later

router.get("/", (req, res) => {
  res.json({ message: "Auth routes working" });
});

router.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Missing credentials" });
  }

  // demo user
  const token = jwt.sign(
    { id: 1, email },
    SECRET,
    { expiresIn: "7d" }
  );

  res.json({
    token,
    user: { id: 1, email }
  });
});

export default router;



