const express = require("express")
const router = express.Router()
const multer = require("multer")
const path = require("path")
const jwt = require("jsonwebtoken")
const Post = require("../models/Post")
const User = require("../models/User")
// AUTH MIDDLEWARE
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader) return res.status(401).json({ error: "No token" })

  const token = authHeader.split(" ")[1]

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded
    next()
  } catch {
    res.status(401).json({ error: "Invalid token" })
  }
}

// MULTER STORAGE
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/")
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname))
  }
})

const upload = multer({ storage })

// GET POSTS
router.get("/", async (req, res) => {
  try {
    const posts = await db.Post.findAll({
      include: [{ model: db.User, attributes: ["name"] }],
      order: [["created_at", "DESC"]]
    })

    res.json(posts)

  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// CREATE POST
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

    const post = await db.Post.create({
      caption,
      user_id,
      image_url,
      video_url
    })

    res.json(post)

  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router

