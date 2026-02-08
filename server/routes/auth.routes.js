import express from "express";
import bcrypt from "bcrypt";
import db from "../db.js";

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields required" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const sql =
      "INSERT INTO users (name, email, password) VALUES (?, ?, ?)";

    db.query(sql, [name, email, hashedPassword], (err, result) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY") {
          return res.status(409).json({ message: "Email already exists" });
        }
        return res.status(500).json({ error: err.message });
      }

      res.status(201).json({
        message: "User registered successfully",
        userId: result.insertId,
      });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;








