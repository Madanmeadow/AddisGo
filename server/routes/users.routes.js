import express from "express";
import { pool } from "../db.js";

const router = express.Router();

/* =========================
   AUTH MIDDLEWARE (inline)
   - Uses same JWT_SECRET as server/index.js env
========================= */
import jwt from "jsonwebtoken";
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

function auth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const [type, token] = header.split(" ");
    if (type !== "Bearer" || !token) {
      return res.status(401).json({ error: "Missing token" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, username, iat, exp }
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

/* =========================
   GET /users
   - Used by Dashboard "People" panel
   - Requires auth (matches your frontend)
========================= */
router.get("/", auth, async (req, res) => {
  try {
    const r = await pool.query(
      `
      SELECT
        id,
        COALESCE(display_name, username, name, split_part(email,'@',1)) AS display_name,
        bio,
        avatar_url
      FROM users
      ORDER BY id DESC
      `
    );

    res.json(r.rows);
  } catch (err) {
    console.error("GET /users ERROR:", err);
    res.status(500).json({ error: "Failed to load users" });
  }
});

/* =========================
   GET /users/me
   - Logged-in user's profile
========================= */
router.get("/me", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const r = await pool.query(
      `
      SELECT
        id,
        email,
        username,
        name,
        display_name,
        bio,
        avatar_url,
        created_at
      FROM users
      WHERE id=$1
      LIMIT 1
      `,
      [userId]
    );

    if (!r.rows.length) return res.status(404).json({ error: "User not found" });

    res.json(r.rows[0]);
  } catch (err) {
    console.error("GET /users/me ERROR:", err);
    res.status(500).json({ error: "Failed to load profile" });
  }
});

/* =========================
   PATCH /users/me
   - Update profile fields
========================= */
router.patch("/me", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const display_name =
      req.body.display_name === undefined ? null : String(req.body.display_name).trim();
    const bio = req.body.bio === undefined ? null : String(req.body.bio).trim();
    const avatar_url =
      req.body.avatar_url === undefined ? null : String(req.body.avatar_url).trim();

    const r = await pool.query(
      `
      UPDATE users
      SET
        display_name = COALESCE($2, display_name),
        bio          = COALESCE($3, bio),
        avatar_url   = COALESCE($4, avatar_url)
      WHERE id=$1
      RETURNING
        id,
        email,
        username,
        name,
        display_name,
        bio,
        avatar_url,
        created_at
      `,
      [userId, display_name, bio, avatar_url]
    );

    if (!r.rows.length) return res.status(404).json({ error: "User not found" });

    res.json(r.rows[0]);
  } catch (err) {
    console.error("PATCH /users/me ERROR:", err);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

/* =========================
   GET /users/:id
   - Public profile info
========================= */
router.get("/:id", async (req, res) => {
  try {
    const userId = req.params.id;

    const r = await pool.query(
      `
      SELECT
        id,
        COALESCE(display_name, username, name, split_part(email,'@',1)) AS display_name,
        bio,
        avatar_url,
        created_at
      FROM users
      WHERE id=$1
      LIMIT 1
      `,
      [userId]
    );

    if (!r.rows.length) return res.status(404).json({ error: "User not found" });

    res.json(r.rows[0]);
  } catch (err) {
    console.error("GET /users/:id ERROR:", err);
    res.status(500).json({ error: "Failed to load user" });
  }
});

/* =========================
   GET /users/:id/posts
   - For Profile grid/feed
========================= */
router.get("/:id/posts", async (req, res) => {
  try {
    const userId = req.params.id;

    const r = await pool.query(
      `
      SELECT
        id,
        user_id,
        caption,
        image_url,
        video_url,
        created_at
      FROM posts
      WHERE user_id=$1
      ORDER BY created_at DESC
      `,
      [userId]
    );

    res.json(r.rows);
  } catch (err) {
    console.error("GET /users/:id/posts ERROR:", err);
    res.status(500).json({ error: "Failed to load posts" });
  }
});

/* =========================
   GET /users/:id/stats
   - post count + likes received
   - Supports likes table name: post_likes OR likes
========================= */
router.get("/:id/stats", async (req, res) => {
  try {
    const userId = req.params.id;

    const postsCount = await pool.query(
      `SELECT COUNT(*) FROM posts WHERE user_id=$1`,
      [userId]
    );

    // try post_likes first, fallback to likes
    let likes = 0;
    try {
      const lr = await pool.query(
        `
        SELECT COUNT(*)
        FROM post_likes pl
        JOIN posts p ON p.id = pl.post_id
        WHERE p.user_id=$1
        `,
        [userId]
      );
      likes = Number(lr.rows[0].count);
    } catch {
      const lr2 = await pool.query(
        `
        SELECT COUNT(*)
        FROM likes l
        JOIN posts p ON p.id = l.post_id
        WHERE p.user_id=$1
        `,
        [userId]
      );
      likes = Number(lr2.rows[0].count);
    }

    res.json({
      posts: Number(postsCount.rows[0].count),
      likes,
    });
  } catch (err) {
    console.error("GET /users/:id/stats ERROR:", err);
    res.status(500).json({ error: "Failed to load stats" });
  }
});

export default router;