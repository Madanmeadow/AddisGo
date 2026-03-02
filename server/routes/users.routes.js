import express from "express";
import jwt from "jsonwebtoken";
import { pool } from "../db.js";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

/* ============================================================
   AUTH MIDDLEWARE
============================================================ */
function authenticate(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ")
    ? header.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

/* ============================================================
   GET MY PROFILE
   GET /users/me
============================================================ */
router.get("/me", authenticate, async (req, res) => {
  try {
    const userId = Number(req.user.id);

    const result = await pool.query(
      `
      SELECT
        id,
        email,
        name,
        username,
        display_name,
        bio,
        location,
        country,
        website,
        avatar_url,
        cover_url,
        phone,
        birthday,
        gender,
        is_private,
        is_verified,
        created_at,
        updated_at
      FROM users
      WHERE id = $1
      LIMIT 1
      `,
      [userId]
    );

    res.json(result.rows[0] || null);
  } catch (err) {
    console.error("GET /users/me ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   UPDATE MY PROFILE
   PUT /users/me
============================================================ */
router.put("/me", authenticate, async (req, res) => {
  try {
    const userId = Number(req.user.id);

    const {
      username,
      display_name,
      bio,
      location,
      country,
      website,
      avatar_url,
      cover_url,
      phone,
      birthday,
      gender,
      is_private
    } = req.body || {};

    const result = await pool.query(
      `
      UPDATE users
      SET
        username = COALESCE($2, username),
        display_name = COALESCE($3, display_name),
        bio = COALESCE($4, bio),
        location = COALESCE($5, location),
        country = COALESCE($6, country),
        website = COALESCE($7, website),
        avatar_url = COALESCE($8, avatar_url),
        cover_url = COALESCE($9, cover_url),
        phone = COALESCE($10, phone),
        birthday = COALESCE($11, birthday),
        gender = COALESCE($12, gender),
        is_private = COALESCE($13, is_private),
        updated_at = NOW()
      WHERE id = $1
      RETURNING
        id,
        email,
        name,
        username,
        display_name,
        bio,
        location,
        country,
        website,
        avatar_url,
        cover_url,
        phone,
        birthday,
        gender,
        is_private,
        is_verified,
        created_at,
        updated_at
      `,
      [
        userId,
        username,
        display_name,
        bio,
        location,
        country,
        website,
        avatar_url,
        cover_url,
        phone,
        birthday,
        gender,
        is_private
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("PUT /users/me ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   GET PUBLIC PROFILE
   GET /users/:id
============================================================ */
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const result = await pool.query(
      `
      SELECT
        id,
        username,
        display_name,
        bio,
        location,
        country,
        website,
        avatar_url,
        cover_url,
        is_verified,
        created_at
      FROM users
      WHERE id = $1
      LIMIT 1
      `,
      [id]
    );

    res.json(result.rows[0] || null);
  } catch (err) {
    console.error("GET /users/:id ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;