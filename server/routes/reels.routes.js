import express from "express";
import multer from "multer";
import jwt from "jsonwebtoken";
import { v2 as cloudinary } from "cloudinary";

import { pool } from "../db.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

const router = express.Router();

/* ---------------------------
   Cloudinary config
--------------------------- */
if (!cloudinary.config().cloud_name) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

/* ---------------------------
   Multer (memory)
--------------------------- */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 60 * 1024 * 1024 }, // 60MB
});

/* ---------------------------
   Helpers
--------------------------- */
function safeInt(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function getUserIdOptional(req) {
  try {
    const h = req.headers.authorization || "";
    if (!h.startsWith("Bearer ")) return null;
    const token = h.slice(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded?.id ?? decoded?.user?.id ?? null;
  } catch {
    return null;
  }
}

function detectResourceType(mimetype = "") {
  if (mimetype.startsWith("video/")) return "video";
  if (mimetype.startsWith("image/")) return "image";
  // fallback: treat unknown as "video" if extension is video-like (client sometimes omits mimetype)
  return "video";
}

function uploadToCloudinaryBuffer(buffer, { folder = "addisgo/reels", resource_type = "video" } = {}) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type, // "video" or "image"
      },
      (err, result) => {
        if (err) return reject(err);
        resolve(result);
      }
    );
    stream.end(buffer);
  });
}

/* =========================================================
   GET /reels
   - page, limit
   - returns counts + liked_by_me (if auth provided)
========================================================= */
router.get("/", async (req, res) => {
  const page = safeInt(req.query.page, 1);
  const limit = safeInt(req.query.limit, 20);
  const offset = (page - 1) * limit;

  const meId = getUserIdOptional(req);

  try {
    const result = await pool.query(
      `
      SELECT
        r.id,
        r.user_id,
        r.caption,
        r.video_url,
        r.image_url,
        r.media_url,
        r.media_type,
        r.created_at,

        u.username,
        u.display_name,

        (SELECT COUNT(*)::int FROM reel_likes rl WHERE rl.reel_id = r.id) AS likes_count,
        (SELECT COUNT(*)::int FROM reel_comments rc WHERE rc.reel_id = r.id) AS comments_count,

        CASE
          WHEN $3::int IS NULL THEN false
          ELSE EXISTS (
            SELECT 1 FROM reel_likes rl2
            WHERE rl2.reel_id = r.id AND rl2.user_id = $3
          )
        END AS liked_by_me
      FROM reels r
      LEFT JOIN users u ON u.id = r.user_id
      ORDER BY r.created_at DESC
      LIMIT $1 OFFSET $2
      `,
      [limit, offset, meId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("GET /reels ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* =========================================================
   POST /reels
   - Auth required
   - Accepts:
     * file upload: fields: video | image | file
     * OR body.media_url / body.video_url / body.image_url
   - Uploads to Cloudinary if file provided
   - Inserts into reels AND also into posts (so ForYou sees it)
   - Returns: { reel, post }
========================================================= */
router.post(
  "/",
  authenticateToken,
  upload.fields([
    { name: "video", maxCount: 1 },
    { name: "image", maxCount: 1 },
    { name: "file", maxCount: 1 },
  ]),
  async (req, res) => {
    const userId = req.user?.id;
    const caption = String(req.body?.caption || "").trim();

    const file =
      req.files?.video?.[0] ||
      req.files?.file?.[0] ||
      req.files?.image?.[0] ||
      null;

    let mediaUrl =
      req.body?.media_url ||
      req.body?.video_url ||
      req.body?.image_url ||
      null;

    let mediaType = String(req.body?.media_type || "").toLowerCase();

    try {
      // 1) If file exists, upload to Cloudinary
      if (file?.buffer) {
        const rt = detectResourceType(file.mimetype);
        const uploaded = await uploadToCloudinaryBuffer(file.buffer, {
          folder: "addisgo/reels",
          resource_type: rt,
        });

        mediaUrl = uploaded?.secure_url || uploaded?.url || null;
        mediaType = rt;
      }

      if (!mediaUrl) {
        return res.status(400).json({ error: "Reel media is required (upload a file or send media_url)." });
      }

      // Normalize type
      if (!mediaType) {
        // infer from URL if not provided
        mediaType = /\.(png|jpg|jpeg|gif|webp)(\?|$)/i.test(mediaUrl) ? "image" : "video";
      }

      const video_url = mediaType === "video" ? mediaUrl : null;
      const image_url = mediaType === "image" ? mediaUrl : null;

      // 2) Insert into reels + posts in one transaction
      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        const reelIns = await client.query(
          `
          INSERT INTO reels (user_id, caption, video_url, image_url, media_url, media_type)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
          `,
          [userId, caption, video_url, image_url, mediaUrl, mediaType]
        );

        const reel = reelIns.rows[0];

        // ALSO create a normal post (For You feed)
        const postIns = await client.query(
          `
          INSERT INTO posts (user_id, caption, video_url, image_url)
          VALUES ($1, $2, $3, $4)
          RETURNING *
          `,
          [userId, caption, video_url, image_url]
        );

        const post = postIns.rows[0];

        await client.query("COMMIT");
        return res.json({ reel, post });
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    } catch (err) {
      console.error("POST /reels ERROR:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

/* =========================================================
   POST /reels/:id/like  (toggle)
   - returns { liked, likes_count }
========================================================= */
router.post("/:id/like", authenticateToken, async (req, res) => {
  const reelId = Number(req.params.id);
  const userId = req.user?.id;

  if (!reelId) return res.status(400).json({ error: "Invalid reel id" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const exists = await client.query(
      `SELECT 1 FROM reel_likes WHERE reel_id = $1 AND user_id = $2 LIMIT 1`,
      [reelId, userId]
    );

    let liked = false;

    if (exists.rowCount > 0) {
      await client.query(`DELETE FROM reel_likes WHERE reel_id = $1 AND user_id = $2`, [reelId, userId]);
      liked = false;
    } else {
      await client.query(
        `INSERT INTO reel_likes (reel_id, user_id) VALUES ($1, $2)`,
        [reelId, userId]
      );
      liked = true;
    }

    const countRes = await client.query(
      `SELECT COUNT(*)::int AS count FROM reel_likes WHERE reel_id = $1`,
      [reelId]
    );

    await client.query("COMMIT");
    res.json({ liked, likes_count: countRes.rows[0]?.count ?? 0 });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("POST /reels/:id/like ERROR:", err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

/* =========================================================
   GET /reels/:id/comments
========================================================= */
router.get("/:id/comments", async (req, res) => {
  const reelId = Number(req.params.id);
  if (!reelId) return res.status(400).json({ error: "Invalid reel id" });

  try {
    const result = await pool.query(
      `
      SELECT
        c.id,
        c.reel_id,
        c.user_id,
        c.text,
        c.created_at,
        u.username,
        u.display_name
      FROM reel_comments c
      LEFT JOIN users u ON u.id = c.user_id
      WHERE c.reel_id = $1
      ORDER BY c.created_at DESC
      `,
      [reelId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("GET /reels/:id/comments ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* =========================================================
   POST /reels/:id/comments
   body: { text }
========================================================= */
router.post("/:id/comments", authenticateToken, async (req, res) => {
  const reelId = Number(req.params.id);
  const userId = req.user?.id;
  const text = String(req.body?.text || "").trim();

  if (!reelId) return res.status(400).json({ error: "Invalid reel id" });
  if (!text) return res.status(400).json({ error: "Comment text is required" });

  try {
    const result = await pool.query(
      `
      INSERT INTO reel_comments (reel_id, user_id, text)
      VALUES ($1, $2, $3)
      RETURNING *
      `,
      [reelId, userId, text]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("POST /reels/:id/comments ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;