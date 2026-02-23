import express from "express"
import multer from "multer"
import path from "path"
import { fileURLToPath } from "url"

import { pool } from "../db.js"
import { authenticateToken } from "../middleware/auth.middleware.js"

const router = express.Router()

/* ================= MULTER ================= */
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const storage = multer.diskStorage({
  destination: path.join(__dirname, "../uploads"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
})

const upload = multer({ storage })

/* ================= GET POSTS ================= */
router.get("/", async (req, res) => {
  try {
    // Aliases make SQL safer + clearer
    const result = await pool.query(`
      SELECT
        p.id,
        p.user_id,
        p.caption,
        p.image_url,
        p.video_url,
        p.created_at,
        u.username
      FROM posts p
      LEFT JOIN users u ON u.id = p.user_id
      ORDER BY p.created_at DESC
    `)

    res.json(result.rows)
  } catch (err) {
    console.error("GET /posts ERROR:", err)
    res.status(500).json({ error: err.message })
  }
})

/* ================= CREATE POST =================
   Supports:
   - caption (text)
   - image (file input name="image")
   - video (file input name="video")
*/
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

      const imageUrl = req.files?.image?.[0]
        ? `/uploads/${req.files.image[0].filename}`
        : null

      const videoUrl = req.files?.video?.[0]
        ? `/uploads/${req.files.video[0].filename}`
        : null

      const result = await pool.query(
        `
        INSERT INTO posts (user_id, caption, image_url, video_url)
        VALUES ($1, $2, $3, $4)
        RETURNING id, user_id, caption, image_url, video_url, created_at
        `,
        [req.user.id, caption || null, imageUrl, videoUrl]
      )

      // attach username for frontend convenience
      const row = result.rows[0]
      row.username = req.user.username

      res.json(row)
    } catch (err) {
      console.error("POST /posts ERROR:", err)
      res.status(500).json({ error: err.message })
    }
  }
)

export default router