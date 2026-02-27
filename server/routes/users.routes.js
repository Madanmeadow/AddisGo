// server/routes/users.routes.js
import express from "express";
import { pool } from "../db.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

const router = express.Router();

/* =========================
   helpers
========================= */
function getAuthUserId(req) {
  // Support multiple JWT payload styles
  return (
    req.user?.id ||
    req.user?.userId ||
    req.user?.user_id ||
    req.user?.sub ||
    null
  );
}

function normalizeUser(row) {
  if (!row) return null;
  const baseName =
    row.display_name ||
    row.name ||
    (row.email ? row.email.split("@")[0] : `User${row.id}`);

  return {
    id: row.id,
    email: row.email || null,
    username: baseName, // keep UI compatibility
    display_name: row.display_name || baseName,
    bio: row.bio || "",
    avatar_url: row.avatar_url || "",
    created_at: row.created_at || null,
  };
}

/* =========================
   GET /users  (People list)
========================= */
router.get("/", authenticateToken, async (req, res) => {
  try {
    const q = String(req.query.q || "").trim().toLowerCase();

    if (q) {
      const r = await pool.query(
        `
        SELECT id, name, email, created_at, display_name, bio, avatar_url
        FROM users
        WHERE
          LOWER(COALESCE(display_name, '')) LIKE $1
          OR LOWER(COALESCE(name, '')) LIKE $1
          OR LOWER(COALESCE(email, '')) LIKE $1
        ORDER BY id DESC
        LIMIT 200
        `,
        [`%${q}%`]
      );
      return res.json(r.rows.map(normalizeUser));
    }

    const r = await pool.query(
      `
      SELECT id, name, email, created_at, display_name, bio, avatar_url
      FROM users
      ORDER BY id DESC
      LIMIT 200
      `
    );

    res.json(r.rows.map(normalizeUser));
  } catch (err) {
    console.error("GET /users ERROR:", err);
    res.status(500).json({ error: err.message || "Failed to load users" });
  }
});

/* =========================
   GET /users/me
========================= */
router.get("/me", authenticateToken, async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const r = await pool.query(
      `
      SELECT id, name, email, created_at, display_name, bio, avatar_url
      FROM users
      WHERE id = $1
      LIMIT 1
      `,
      [userId]
    );

    if (!r.rows.length) return res.status(404).json({ error: "User not found" });
    res.json(normalizeUser(r.rows[0]));
  } catch (err) {
    console.error("GET /users/me ERROR:", err);
    res.status(500).json({ error: err.message || "Failed to load profile" });
  }
});

/* =========================
   PATCH /users/me
   Update: display_name, bio, avatar_url
========================= */
router.patch("/me", authenticateToken, async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const body = req.body || {};
    const display_name =
      body.display_name !== undefined ? String(body.display_name).trim().slice(0, 80) : undefined;
    const bio =
      body.bio !== undefined ? String(body.bio).trim().slice(0, 500) : undefined;
    const avatar_url =
      body.avatar_url !== undefined ? String(body.avatar_url).trim().slice(0, 500) : undefined;

    const sets = [];
    const vals = [];
    let i = 1;

    if (display_name !== undefined) {
      sets.push(`display_name = $${i++}`);
      vals.push(display_name);
    }
    if (bio !== undefined) {
      sets.push(`bio = $${i++}`);
      vals.push(bio);
    }
    if (avatar_url !== undefined) {
      sets.push(`avatar_url = $${i++}`);
      vals.push(avatar_url);
    }

    // If nothing to update, just return current profile
    if (!sets.length) {
      const r0 = await pool.query(
        `
        SELECT id, name, email, created_at, display_name, bio, avatar_url
        FROM users
        WHERE id = $1
        LIMIT 1
        `,
        [userId]
      );
      return res.json(normalizeUser(r0.rows[0]));
    }

    vals.push(userId);

    const r = await pool.query(
      `
      UPDATE users
      SET ${sets.join(", ")}
      WHERE id = $${i}
      RETURNING id, name, email, created_at, display_name, bio, avatar_url
      `,
      vals
    );

    res.json(normalizeUser(r.rows[0]));
  } catch (err) {
    console.error("PATCH /users/me ERROR:", err);
    res.status(500).json({ error: err.message || "Failed to update profile" });
  }
});

export default router;