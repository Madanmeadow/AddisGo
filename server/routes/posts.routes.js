// server/routes/posts.routes.js
import express from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";
import { pool } from "../db.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

const router = express.Router();

/* =========================
   CLOUDINARY
========================= */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/* =========================
   MULTER (MEMORY, NOT DISK)
========================= */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 80 * 1024 * 1024, // 80MB
  },
});

/* =========================
   HELPERS
========================= */
async function postExists(postId) {
  const check = await pool.query(
    `SELECT id FROM posts WHERE id = $1 LIMIT 1`,
    [postId]
  );
  return !!check.rows[0];
}

function uploadBufferToCloudinary(fileBuffer, folder, resourceType = "image") {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    streamifier.createReadStream(fileBuffer).pipe(uploadStream);
  });
}

/* =========================
   GET POSTS
========================= */
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        p.id,
        p.user_id,
        p.caption,
        p.image_url,
        p.video_url,
        p.created_at,
        u.display_name,
        u.username,
        u.avatar_url,
        COALESCE(cc.comment_count, 0) AS comment_count
      FROM posts p
      LEFT JOIN users u
        ON u.id = p.user_id
      LEFT JOIN (
        SELECT post_id, COUNT(*)::int AS comment_count
        FROM comments
        GROUP BY post_id
      ) cc
        ON cc.post_id = p.id
      ORDER BY p.created_at DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error("GET /posts ERROR:", err);
    res.status(500).json({ error: err.message || "Failed to fetch posts" });
  }
});

/* =========================
   CREATE POST
========================= */
router.post(
  "/",
  authenticateToken,
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "video", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const userId = Number(req.user?.id);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const caption = String(req.body?.caption || "").trim();

      const imageFile = req.files?.image?.[0] || null;
      const videoFile = req.files?.video?.[0] || null;

      let image_url = null;
      let video_url = null;

      if (imageFile?.buffer) {
        const uploadedImage = await uploadBufferToCloudinary(
          imageFile.buffer,
          "pulse/posts/images",
          "image"
        );
        image_url = uploadedImage.secure_url;
      }

      if (videoFile?.buffer) {
        const uploadedVideo = await uploadBufferToCloudinary(
          videoFile.buffer,
          "pulse/posts/videos",
          "video"
        );
        video_url = uploadedVideo.secure_url;
      }

      if (!caption && !image_url && !video_url) {
        return res.status(400).json({ error: "caption, image, or video is required" });
      }

      const insert = await pool.query(
        `
        INSERT INTO posts (user_id, caption, image_url, video_url)
        VALUES ($1, $2, $3, $4)
        RETURNING id, user_id, caption, image_url, video_url, created_at
        `,
        [userId, caption || null, image_url, video_url]
      );

      const created = insert.rows[0];

      const withUser = await pool.query(
        `
        SELECT
          p.id,
          p.user_id,
          p.caption,
          p.image_url,
          p.video_url,
          p.created_at,
          u.display_name,
          u.username,
          u.avatar_url,
          0::int AS comment_count
        FROM posts p
        LEFT JOIN users u ON u.id = p.user_id
        WHERE p.id = $1
        LIMIT 1
        `,
        [created.id]
      );

      res.json(withUser.rows[0] || created);
    } catch (err) {
      console.error("POST /posts ERROR:", err);
      res.status(500).json({ error: err.message || "Post failed" });
    }
  }
);

/* =========================
   COMMENTS: GET
========================= */
router.get("/:postId/comments", async (req, res) => {
  try {
    const postId = Number(req.params.postId);
    if (!postId) return res.status(400).json({ error: "Invalid post id" });

    const exists = await postExists(postId);
    if (!exists) return res.status(404).json({ error: "Post not found" });

    const result = await pool.query(
      `
      SELECT
        c.id,
        c.post_id,
        c.user_id,
        c.body,
        c.created_at,
        u.username,
        u.display_name,
        u.avatar_url
      FROM comments c
      LEFT JOIN users u ON u.id = c.user_id
      WHERE c.post_id = $1
      ORDER BY c.created_at DESC
      `,
      [postId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("GET /posts/:postId/comments ERROR:", err);
    res.status(500).json({ error: err.message || "Failed to load comments" });
  }
});

/* =========================
   COMMENTS: POST
========================= */
router.post("/:postId/comments", authenticateToken, async (req, res) => {
  try {
    const postId = Number(req.params.postId);
    if (!postId) return res.status(400).json({ error: "Invalid post id" });

    const exists = await postExists(postId);
    if (!exists) return res.status(404).json({ error: "Post not found" });

    const userId = Number(req.user?.id);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const body = String(req.body?.body || "").trim();
    if (!body) return res.status(400).json({ error: "Comment body is required" });
    if (body.length > 500) return res.status(400).json({ error: "Comment too long" });

    const insert = await pool.query(
      `
      INSERT INTO comments (post_id, user_id, body)
      VALUES ($1, $2, $3)
      RETURNING id, post_id, user_id, body, created_at
      `,
      [postId, userId, body]
    );

    const withUser = await pool.query(
      `
      SELECT
        c.id,
        c.post_id,
        c.user_id,
        c.body,
        c.created_at,
        u.username,
        u.display_name,
        u.avatar_url
      FROM comments c
      LEFT JOIN users u ON u.id = c.user_id
      WHERE c.id = $1
      LIMIT 1
      `,
      [insert.rows[0].id]
    );

    res.json(withUser.rows[0] || insert.rows[0]);
  } catch (err) {
    console.error("POST /posts/:postId/comments ERROR:", err);
    res.status(500).json({ error: err.message || "Failed to send comment" });
  }
});

/* =========================
   COMMENTS: DELETE
========================= */
router.delete("/:postId/comments/:commentId", authenticateToken, async (req, res) => {
  try {
    const postId = Number(req.params.postId);
    const commentId = Number(req.params.commentId);
    const userId = Number(req.user?.id);

    if (!postId || !commentId) {
      return res.status(400).json({ error: "Invalid post/comment id" });
    }

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const found = await pool.query(
      `
      SELECT id, post_id, user_id
      FROM comments
      WHERE id = $1 AND post_id = $2
      LIMIT 1
      `,
      [commentId, postId]
    );

    const row = found.rows[0];
    if (!row) {
      return res.status(404).json({ error: "Comment not found" });
    }

    if (Number(row.user_id) !== userId) {
      return res.status(403).json({ error: "You can only delete your own comment" });
    }

    await pool.query(`DELETE FROM comments WHERE id = $1`, [commentId]);

    res.json({ ok: true, id: commentId, post_id: postId });
  } catch (err) {
    console.error("DELETE /posts/:postId/comments/:commentId ERROR:", err);
    res.status(500).json({ error: err.message || "Delete failed" });
  }
});
/* =========================
   LIKES (FIXED ENDPOINTS)
========================= */

// GET /api/posts/:postId/likes  (matches frontend)
router.get("/:postId/likes", async (req, res) => {
  try {
    const postId = Number(req.params.postId);
    if (!postId) return res.status(400).json({ error: "Invalid postId" });

    const userId = req.user?.id || null;

    const countRes = await pool.query(
      `SELECT COUNT(*)::int AS count FROM post_likes WHERE post_id = $1`,
      [postId]
    );

    let likedByMe = false;
    if (userId) {
      const meRes = await pool.query(
        `SELECT 1 FROM post_likes WHERE post_id = $1 AND user_id = $2 LIMIT 1`,
        [postId, userId]
      );
      likedByMe = meRes.rowCount > 0;
    }

    res.json({ count: countRes.rows[0].count, likedByMe });
  } catch (err) {
    console.error("GET /posts/:postId/likes ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/posts/:postId/like  (matches frontend toggle)
router.put("/:postId/like", authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const postId = Number(req.params.postId);
    const userId = Number(req.user?.id);
    if (!postId) return res.status(400).json({ error: "Invalid postId" });
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    await client.query("BEGIN");

    const exists = await client.query(
      `SELECT id FROM post_likes WHERE post_id = $1 AND user_id = $2 LIMIT 1`,
      [postId, userId]
    );

    let likedByMe = false;
    if (exists.rowCount > 0) {
      await client.query(
        `DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2`,
        [postId, userId]
      );
      likedByMe = false;
    } else {
      await client.query(
        `INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [postId, userId]
      );
      likedByMe = true;
    }

    const countRes = await client.query(
      `SELECT COUNT(*)::int AS count FROM post_likes WHERE post_id = $1`,
      [postId]
    );

    await client.query("COMMIT");
    res.json({ count: countRes.rows[0].count, likedByMe });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("PUT /posts/:postId/like ERROR:", err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

/* =========================
   REACTIONS (NEW)
========================= */

// GET /api/posts/:postId/reactions
router.get("/:postId/reactions", async (req, res) => {
  try {
    const postId = Number(req.params.postId);
    if (!postId) return res.status(400).json({ error: "Invalid postId" });

    const result = await pool.query(
      `
      SELECT reaction_type, COUNT(*)::int AS count
      FROM post_reactions
      WHERE post_id = $1
      GROUP BY reaction_type
      `,
      [postId]
    );

    const userId = req.user?.id || null;
    let myReactions = [];
    if (userId) {
      const meRes = await pool.query(
        `SELECT reaction_type FROM post_reactions WHERE post_id = $1 AND user_id = $2`,
        [postId, userId]
      );
      myReactions = meRes.rows.map((r) => r.reaction_type);
    }

    res.json({ counts: result.rows, myReactions });
  } catch (err) {
    console.error("GET /posts/:postId/reactions ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/posts/:postId/react
router.post("/:postId/react", authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const postId = Number(req.params.postId);
    const userId = Number(req.user?.id);
    const { reaction = "like" } = req.body;

    const VALID = ["like", "love", "fire", "laugh", "wow", "sad", "angry"];
    const type = VALID.includes(reaction) ? reaction : "like";

    if (!postId) return res.status(400).json({ error: "Invalid postId" });
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    await client.query("BEGIN");

    // Toggle: if exists delete it, else add it (and remove other reactions from same user on same post)
    const existing = await client.query(
      `SELECT id, reaction_type FROM post_reactions WHERE post_id = $1 AND user_id = $2 LIMIT 1`,
      [postId, userId]
    );

    let action = "added";
    if (existing.rowCount > 0) {
      if (existing.rows[0].reaction_type === type) {
        // Same reaction = remove (toggle off)
        await client.query(
          `DELETE FROM post_reactions WHERE post_id = $1 AND user_id = $2`,
          [postId, userId]
        );
        action = "removed";
      } else {
        // Different reaction = switch
        await client.query(
          `UPDATE post_reactions SET reaction_type = $3 WHERE post_id = $1 AND user_id = $2`,
          [postId, userId, type]
        );
        action = "updated";
      }
    } else {
      await client.query(
        `INSERT INTO post_reactions (post_id, user_id, reaction_type) VALUES ($1, $2, $3)`,
        [postId, userId, type]
      );
    }

    const countsRes = await client.query(
      `SELECT reaction_type, COUNT(*)::int AS count FROM post_reactions WHERE post_id = $1 GROUP BY reaction_type`,
      [postId]
    );

    const myRes = await client.query(
      `SELECT reaction_type FROM post_reactions WHERE post_id = $1 AND user_id = $2`,
      [postId, userId]
    );

    await client.query("COMMIT");

    res.json({
      action,
      counts: countsRes.rows,
      myReactions: myRes.rows.map((r) => r.reaction_type),
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("POST /posts/:postId/react ERROR:", err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

/* =========================
   EDIT / DELETE POST
========================= */

// PUT /api/posts/:postId  (edit caption)
router.put("/:postId", authenticateToken, async (req, res) => {
  try {
    const postId = Number(req.params.postId);
    const userId = Number(req.user?.id);
    const caption = String(req.body?.caption || "").trim();

    if (!postId) return res.status(400).json({ error: "Invalid postId" });
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    // Verify ownership
    const ownerCheck = await pool.query(
      `SELECT user_id FROM posts WHERE id = $1 LIMIT 1`,
      [postId]
    );
    if (!ownerCheck.rows[0]) return res.status(404).json({ error: "Post not found" });
    if (Number(ownerCheck.rows[0].user_id) !== userId) {
      return res.status(403).json({ error: "You can only edit your own post" });
    }

    const result = await pool.query(
      `UPDATE posts SET caption = $1 WHERE id = $2 RETURNING id, user_id, caption, image_url, video_url, created_at`,
      [caption, postId]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("PUT /posts/:postId ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/posts/:postId
router.delete("/:postId", authenticateToken, async (req, res) => {
  try {
    const postId = Number(req.params.postId);
    const userId = Number(req.user?.id);

    if (!postId) return res.status(400).json({ error: "Invalid postId" });
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const ownerCheck = await pool.query(
      `SELECT user_id FROM posts WHERE id = $1 LIMIT 1`,
      [postId]
    );
    if (!ownerCheck.rows[0]) return res.status(404).json({ error: "Post not found" });
    if (Number(ownerCheck.rows[0].user_id) !== userId) {
      return res.status(403).json({ error: "You can only delete your own post" });
    }

    await pool.query(`DELETE FROM posts WHERE id = $1`, [postId]);
    res.json({ ok: true, id: postId });
  } catch (err) {
    console.error("DELETE /posts/:postId ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});
export default router;