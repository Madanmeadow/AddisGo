const express = require("express");
const router = express.Router();
const pool = require("../db");

// ================= GET POSTS =================
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM posts ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ================= CREATE POST =================
router.post("/", async (req, res) => {
  try {
    const { user_id, caption, video_url } = req.body;

    const result = await pool.query(
      "INSERT INTO posts (user_id, caption, video_url) VALUES ($1, $2, $3) RETURNING *",
      [user_id, caption, video_url]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
