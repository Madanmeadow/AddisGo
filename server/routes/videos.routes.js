import express from "express"
import multer from "multer"
import path from "path"
import { pool } from "../db.js"

const router = express.Router()

// Storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/")
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname))
  }
})

const upload = multer({ storage })

// Upload video
router.post("/upload", upload.single("video"), async (req, res) => {
  try {
    const { title } = req.body

    const videoUrl = `/uploads/${req.file.filename}`

    await pool.query(
      "INSERT INTO videos (title, url) VALUES ($1, $2)",
      [title, videoUrl]
    )

    res.json({ message: "Video uploaded successfully" })

  } catch (err) {
    console.log("UPLOAD ERROR:", err)
    res.status(500).json({ message: "Upload failed" })
  }
})

// Get all videos
router.get("/", async (req, res) => {
  try {
    const videos = await pool.query(
      "SELECT * FROM videos ORDER BY id DESC"
    )
    res.json(videos.rows)
  } catch (err) {
    console.log(err)
    res.status(500).json({ message: "Error fetching videos" })
  }
})

export default router

