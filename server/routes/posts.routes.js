import express from "express"
import multer from "multer"
import path from "path"
import { fileURLToPath } from "url"
import { pool } from "../db.js"
import { authenticateToken } from "../middleware/auth.middleware.js"

const router = express.Router()

/* ================= MULTER STORAGE ================= */
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const storage = multer.diskStorage({
  destination: path.join(__dirname, "../uploads"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
})

const upload = multer({ storage })

/* ================= GET POSTS (SAFE: NO JOIN) ================= */
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        user_id,
        caption,
        image_url,
        video_url,
        created_at
      FROM posts
      ORDER BY created_at DESC
    `)

    res.json(result.rows)
  } catch (err) {
    console.error("GET /posts ERROR:", err)
    res.status(500).json({ error: err.message })
  }
})

/* ================= CREATE POST =================
   expects:
   - caption
   - image (optional)
   - video (optional)
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

      // return new row so frontend can instantly display it
      res.json(result.rows[0])
    } catch (err) {
      console.error("POST /posts ERROR:", err)
      res.status(500).json({ error: err.message })
    }
  }
)

export default router