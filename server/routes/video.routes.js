const express = require("express");
const router = express.Router();
const db = require("../db");

/**
 * GET /api/videos
 * Latest videos
 */
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query(`
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

    res.json(rows);
  } catch (err) {
    console.error("GET /videos error:", err);
    res.status(500).json({ message: "Failed to fetch videos" });
  }
});

/**
 * GET /api/videos/trending
 */
router.get("/trending", async (req, res) => {
  try {
    const [rows] = await db.query(`
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

    res.json(rows);
  } catch (err) {
    console.error("Trending error:", err);
    res.status(500).json({ message: "Failed to load trending videos" });
  }
});

/**
 * GET /api/videos/explore?page=1&limit=6
 * Infinite scroll feed
 */
router.get("/explore", async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 6;
  const offset = (page - 1) * limit;

  try {
    const [rows] = await db.query(
      `
      SELECT
        id,
        title,
        thumbnail_url,
        username,
        views
      FROM videos
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
      `,
      [limit, offset]
    );

    res.json(rows);
  } catch (err) {
    console.error("Explore error:", err);
    res.status(500).json({ message: "Failed to load explore feed" });
  }
});

module.exports = router;
