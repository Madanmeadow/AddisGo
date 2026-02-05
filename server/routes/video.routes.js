const express = require("express");
const router = express.Router();
const db = require("../db"); // make sure this path is correct

/**
 * GET /api/videos
 * Get all videos (basic list)
 */
router.get("/", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        id,
        title,
        thumbnail_url,
        username,
        views,
        created_at
      FROM videos
      ORDER BY created_at DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error("Get videos error:", err);
    res.status(500).json({ message: "Failed to fetch videos" });
  }
});

/**
 * GET /api/videos/trending
 * Get top videos by views
 */
router.get("/trending", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        id,
        title,
        thumbnail_url,
        username,
        views
      FROM videos
      ORDER BY views DESC
      LIMIT 6
    `);

    res.json(result.rows);
  } catch (err) {
    console.error("Trending videos error:", err);
    res.status(500).json({ message: "Failed to load trending videos" });
  }
});

/**
 * GET /api/videos/:id
 * Get single video by ID
 */
router.get("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.query(
      `
      SELECT *
      FROM videos
      WHERE id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Video not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Get video error:", err);
    res.status(500).json({ message: "Failed to fetch video" });
  }
});

module.exports = router;
