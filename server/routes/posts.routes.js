const express = require("express")
const pool = require("../db")
const router = express.Router()

// GET all posts
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM posts ORDER BY created_at DESC"
    )
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Server error" })
  }
})

// CREATE post
router.post("/", async (req, res) => {
  try {
    const { user_id, caption, image_url, video_url } = req.body

    const result = await pool.query(
      `INSERT INTO posts (user_id, caption, image_url, video_url)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [user_id, caption, image_url, video_url]
    )

    res.json(result.rows[0])

  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Server error" })
  }
})

module.exports = router

