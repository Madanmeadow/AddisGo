const express = require("express")
const multer = require("multer")
const path = require("path")
const jwt = require("jsonwebtoken")
const pool = require("../db")

const router = express.Router()

// ==============================
// 🔐 Auth Middleware
// ==============================
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1]
  if (!token) return res.status(401).json({ message: "No token provided" })

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded
    next()
  } catch (err) {
    return res.status(403).json({ message: "Invalid token" })
  }
}

// ==============================
// 📂 Multer Setup
// ==============================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/")
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname)
  }
})

const upload = multer({ storage })

// ==============================
// 📝 CREATE POST
// ==============================
router.post("/", authMiddleware, upload.single("media"), async (req, res) => {
  try {
    const { caption } = req.body
    const user_id = req.user.id

    let image_url = null
    let video_url = null

    if (req.file) {
      if (req.file.mimetype.startsWith("image")) {
        image_url = `/uploads/${req.file.filename}`
      } else if (req.file.mimetype.startsWith("video")) {
        video_url = `/uploads/${req.file.filename}`
      }
    }

    const result = await pool.query(
      `INSERT INTO posts (user_id, caption, image_url, video_url)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [user_id, caption, image_url, video_url]
    )

    res.status(201).json({
      message: "Post created 🚀",
      post: result.rows[0]
    })

  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Failed to create post" })
  }
})

// ==============================
// 📥 GET ALL POSTS
// ==============================
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT posts.*, users.name
      FROM posts
      JOIN users ON posts.user_id = users.id
      ORDER BY created_at DESC
    `)

    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch posts" })
  }
})

module.exports = router

module.exports = router

