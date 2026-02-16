import pool from "../db.js";

/* =========================
   CREATE VIDEO POST
========================= */
export const createVideo = async (req, res) => {
  try {
    const { caption, user_id } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: "Video file is required" });
    }

    const videoUrl = `/uploads/videos/${req.file.filename}`;

    const result = await pool.query(
      `INSERT INTO posts (user_id, video_url, caption)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [user_id, videoUrl, caption]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Create video error:", error.message);
    res.status(500).json({ message: "Failed to upload video" });
  }
};

/* =========================
   GET VIDEO FEED
========================= */
export const getVideos = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT posts.*, users.name
      FROM posts
      JOIN users ON posts.user_id = users.id
      ORDER BY posts.created_at DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("Fetch videos error:", error.message);
    res.status(500).json({ message: "Failed to fetch videos" });
  }
};
