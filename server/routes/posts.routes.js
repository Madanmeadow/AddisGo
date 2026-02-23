import express from "express"
import multer from "multer"
import path from "path"
import { fileURLToPath } from "url"

import { pool } from "../db.js"
import { authenticateToken } from "../index.js"

const router = express.Router()

/* ================= MULTER ================= */

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const storage = multer.diskStorage({
  destination: path.join(__dirname, "../uploads"),
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname)
  }
})

const upload = multer({ storage })

/* ================= GET POSTS ================= */

router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT posts.*, users.username
      FROM posts
      JOIN users ON posts.user_id = users.id
      ORDER BY posts.created_at DESC
    `)

    res.json(result.rows)

  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Fetch posts failed" })
  }
})

/* ================= CREATE POST ================= */

router.post("/", authenticateToken, upload.single("file"), async (req, res) => {
  try {
    const { content } = req.body

    const mediaUrl = req.file
      ? `/uploads/${req.file.filename}`
      : null

    const result = await pool.query(
      `
      INSERT INTO posts (user_id, content, media_url)
      VALUES ($1,$2,$3)
      RETURNING *
      `,
      [req.user.id, content, mediaUrl]
    )

    const newPost = result.rows[0]

    const userResult = await pool.query(
      "SELECT username FROM users WHERE id=$1",
      [req.user.id]
    )

    newPost.username = userResult.rows[0].username

    res.json(newPost)

  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Post failed" })
  }
})

export default router