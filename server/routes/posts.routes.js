const express = require("express")
const router = express.Router()
const pool = require("../db")
const multer = require("multer")
const path = require("path")
const authenticate = require("./protected.routes") // your JWT middleware

// ============================
// Multer Config
// ============================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/")
  },
  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() + "-" + Math.round(Math.random() * 1e9)
    cb(null, uniqueName + path.extname(file.originalname))
  }
})

const upload = multer({ storage })

// ============================
// CREATE POST
// ============================
router.post(
  "/",
  authenticate,
  upload.single("file"),
  async (req, res) => {
    try {
      const { caption } = req.body
      const userId = req.user.id

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
        [userId, caption, image_url, video_url]
      )

      res.status(201).json(result.rows[0])
    } catch (err) {
      console.error(err)
      res.status(500).json({ error: "Failed to create post" })
    }
  }
)

// ============================
// GET ALL POSTS (WITH USER + LIKE COUNT)
// ============================
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        posts.id,
        posts.caption,
        posts.image_url,
        posts.video_url,
        posts.created_at,
        users.name AS user_name,
        COUNT(likes.id) AS likes_count
      FROM posts
      JOIN users ON posts.user_id = users.id
      LEFT JOIN likes ON posts.id = likes.post_id
      GROUP BY posts.id, users.name
      ORDER BY posts.created_at DESC
    `)

    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Failed to fetch posts" })
  }
})

// ============================
// GET SINGLE POST
// ============================
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params

    const result = await pool.query(
      `SELECT * FROM posts WHERE id = $1`,
      [id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Post not found" })
    }

    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: "Error fetching post" })
  }
})

// ============================
// DELETE POST (OWNER ONLY)
// ============================
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.id

    const result = await pool.query(
      `DELETE FROM posts WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, userId]
    )

    if (result.rows.length === 0) {
      return res.status(403).json({ error: "Not allowed" })
    }

    res.json({ message: "Post deleted" })
  } catch (err) {
    res.status(500).json({ error: "Delete failed" })
  }
})

// ============================
// LIKE POST
// ============================
router.post("/:id/like", authenticate, async (req, res) => {
  try {
    const userId = req.user.id
    const postId = req.params.id

    await pool.query(
      `INSERT INTO likes (user_id, post_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [userId, postId]
    )

    res.json({ message: "Post liked" })
  } catch (err) {
    res.status(500).json({ error: "Like failed" })
  }
})

// ============================
// UNLIKE POST
// ============================
router.delete("/:id/like", authenticate, async (req, res) => {
  try {
    const userId = req.user.id
    const postId = req.params.id

    await pool.query(
      `DELETE FROM likes WHERE user_id = $1 AND post_id = $2`,
      [userId, postId]
    )

    res.json({ message: "Post unliked" })
  } catch (err) {
    res.status(500).json({ error: "Unlike failed" })
  }
})

// ============================
// ADD COMMENT
// ============================
router.post("/:id/comment", authenticate, async (req, res) => {
  try {
    const userId = req.user.id
    const postId = req.params.id
    const { text } = req.body

    const result = await pool.query(
      `INSERT INTO comments (user_id, post_id, text)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [userId, postId, text]
    )

    res.status(201).json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: "Comment failed" })
  }
})

// ============================
// GET COMMENTS
// ============================
router.get("/:id/comments", async (req, res) => {
  try {
    const postId = req.params.id

    const result = await pool.query(`
      SELECT comments.*, users.name AS user_name
      FROM comments
      JOIN users ON comments.user_id = users.id
      WHERE post_id = $1
      ORDER BY comments.created_at DESC
    `, [postId])

    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch comments" })
  }
})

module.exports = router

