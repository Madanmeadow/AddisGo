const express = require("express")
const router = express.Router()
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const User = require("../models/User") // adjust if needed

// REGISTER
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await db.User.create({
      name,
      email,
      password: hashedPassword
    })

    res.json({ message: "User created successfully" })

  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body

    const user = await db.User.findOne({ where: { email } })
    if (!user) return res.status(400).json({ error: "User not found" })

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) return res.status(400).json({ error: "Invalid password" })

    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    )

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email }
    })

  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router









