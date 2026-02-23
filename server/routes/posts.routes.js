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
      LEFT JOIN users ON posts.user_id = users.id
      ORDER BY posts.created_at DESC
    `)

    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Failed to fetch posts" })
  }
})

/* ================= CREATE POST ================= */

router.post(
  "/",
  authenticateToken,
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "video", maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const { caption } = req.body

      let imageUrl = null
      let videoUrl = null

      if (req.files?.image) {
        imageUrl = `/uploads/${req.files.image[0].filename}`
      }

      if (req.files?.video) {
        videoUrl = `/uploads/${req.files.video[0].filename}`
      }

      const result = await pool.query(
        `
        INSERT INTO posts (user_id, caption, image_url, video_url)
        VALUES ($1, $2, $3, $4)
        RETURNING *
        `,
        [req.user.id, caption, imageUrl, videoUrl]
      )

      res.json(result.rows[0])
    } catch (err) {
      console.error(err)
      res.status(500).json({ error: "Create post failed" })
    }
  }
)

export default router