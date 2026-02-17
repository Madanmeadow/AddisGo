const express = require("express");
const router = express.Router();
const pool = require("../db");


// ======================
// CREATE POST
// ======================
router.post("/create", async (req, res) => {
  try {
    const { text, videoUrl } = req.body;

    const result = await pool.query(
      "INSERT INTO posts (text, video_url) VALUES ($1, $2) RETURNING *",
      [text || "", videoUrl || ""]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create post" });
  }
});

// ======================
// GET ALL POSTS
// ======================
router.get("/", async (req, res) => {
  try {
    const posts = await pool.query(
      "SELECT * FROM posts ORDER BY created_at DESC"
    );

    res.json(posts.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch posts" });
  }
});

// ======================
// LIKE POST
// ======================
router.put("/:id/like", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "UPDATE posts SET likes = likes + 1 WHERE id = $1 RETURNING *",
      [id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Like failed" });
  }
});

// ======================
// COMMENT
// ======================
router.post("/:id/comment", async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;

    const result = await pool.query(
      "INSERT INTO comments (post_id, text) VALUES ($1, $2) RETURNING *",
      [id, text]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Comment failed" });
  }
});

module.exports = router;
