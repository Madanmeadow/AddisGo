import pool from "../db.js";
import cloudinary from "../utils/cloudinary.js";

export const createVideo = async (req, res) => {
  try {
    const { caption, user_id } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: "No video uploaded" });
    }

    const result = await cloudinary.uploader.upload(req.file.path, {
      resource_type: "video",
      folder: "addisgo/videos",
    });

    const videoUrl = result.secure_url;

    const newVideo = await pool.query(
      `INSERT INTO posts (user_id, video_url, caption)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [user_id, videoUrl, caption]
    );

    res.status(201).json({
      message: "Video uploaded successfully",
      video: newVideo.rows[0],
    });

  } catch (error) {
    console.error("Upload error:", error.message);
    res.status(500).json({ message: "Failed to upload video" });
  }
};


export const getVideos = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT posts.id,
             posts.video_url,
             posts.caption,
             posts.created_at,
             users.name
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
