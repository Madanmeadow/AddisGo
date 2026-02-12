import express from "express"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import { pool } from "../db.js"

const router = express.Router()

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body

    const user = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    )

    if (user.rows.length === 0) {
      return res.status(400).json({ message: "User not found" })
    }

    const validPassword = await bcrypt.compare(
      password,
      user.rows[0].password
    )

    if (!validPassword) {
      return res.status(400).json({ message: "Invalid password" })
    }

    const token = jwt.sign(
      { id: user.rows[0].id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    )

    res.json({ token })

  } catch (err) {
    console.log("LOGIN ERROR:", err)
    res.status(500).json({ message: "Server error" })
  }
})

export default router








