// server/routes/users.routes.js
import express from "express";
import { pool } from "../db.js";

// If you already have auth middleware, keep it.
// (This matches your style from posts.routes.js)
import { authenticateToken } from "../middleware/auth.middleware.js";

const router = express.Router();

/* =========================
   Helpers
========================= */
function normalizeUser(row) {
  if (!row) return null;

  const id = row.id;
  const email = row.email || null;

  // Support BOTH schemas:
  // - old: username
  // - current: name + display_name
  const baseName =
    row.display_name ||
    row.username ||
    row.name ||
    (email ? String(email).split("@")[0] : `User${id}`);

  return {
    id,
    email,
    username: baseName,            // keep for UI compatibility
    display_name: row.display_name || baseName,
    bio: row.bio || "",
    avatar_url: row.avatar_url || "",
    created_at: row.created_at || null,
  };
}

async function detectUserColumns() {
  // Detect which columns exist in `users` so we never query a missing column.
  const r = await pool.query(
    `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='users'
    `
  );
  const set = new Set(r.rows.map((x) => x.column_name));
  return set;
}

/* =========================
   GET /users  (People list)
   Requires auth (because your Dashboard calls with Bearer token)
========================= */
router.get("/", authenticateToken, async (req, res) => {
  try {
    const cols = await detectUserColumns();

    // Build a safe SELECT list depending on what exists
    const select = [
      "id",
      cols.has("email") ? "email" : null,
      cols.has("created_at") ? "created_at" : null,
      cols.has("display_name") ? "display_name" : null,
      cols.has("bio") ? "bio" : null,
      cols.has("avatar_url") ? "avatar_url" : null,
      cols.has("username") ? "username" : null,
      cols.has("name") ? "name" : null,
    ]
      .filter(Boolean)
      .join(", ");

    const q = String(req.query.q || "").trim().toLowerCase();

    let result;
    if (q) {
      // search by display_name / username / name / email (only if columns exist)
      const whereParts = [];
      const params = [];
      let i = 1;

      if (cols.has("display_name")) {
        whereParts.push(`LOWER(display_name) LIKE $${i++}`);
        params.push(`%${q}%`);
      }
      if (cols.has("username")) {
        whereParts.push(`LOWER(username) LIKE $${i++}`);
        params.push(`%${q}%`);
      }
      if (cols.has("name")) {
        whereParts.push(`LOWER(name) LIKE $${i++}`);
        params.push(`%${q}%`);
      }
      if (cols.has("email")) {
        whereParts.push(`LOWER(email) LIKE $${i++}`);
        params.push(`%${q}%`);
      }

      // If no searchable columns exist, just return all users
      const where =
        whereParts.length > 0 ? `WHERE (${whereParts.join(" OR ")})` : "";

      result = await pool.query(
        `
        SELECT ${select}
        FROM users
        ${where}
        ORDER BY id DESC
        LIMIT 200
        `,
        params
      );
    } else {
      result = await pool.query(
        `
        SELECT ${select}
        FROM users
        ORDER BY id DESC
        LIMIT 200
        `
      );
    }

    res.json(result.rows.map(normalizeUser));
  } catch (err) {
    console.error("GET /users ERROR:", err);
    res.status(500).json({ error: err.message || "Failed to load users" });
  }
});

/* =========================
   GET /users/me  (My profile)
========================= */
router.get("/me", authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const cols = await detectUserColumns();
    const select = [
      "id",
      cols.has("email") ? "email" : null,
      cols.has("created_at") ? "created_at" : null,
      cols.has("display_name") ? "display_name" : null,
      cols.has("bio") ? "bio" : null,
      cols.has("avatar_url") ? "avatar_url" : null,
      cols.has("username") ? "username" : null,
      cols.has("name") ? "name" : null,
    ]
      .filter(Boolean)
      .join(", ");

    const r = await pool.query(
      `SELECT ${select} FROM users WHERE id=$1 LIMIT 1`,
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
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { display_name, bio, avatar_url } = req.body || {};

    const cols = await detectUserColumns();
    if (!cols.has("display_name") && !cols.has("bio") && !cols.has("avatar_url")) {
      return res.status(400).json({
        error:
          "Profile columns not found. Add display_name, bio, avatar_url to users table.",
      });
    }

    const sets = [];
    const vals = [];
    let i = 1;

    if (cols.has("display_name") && display_name !== undefined) {
      sets.push(`display_name = $${i++}`);
      vals.push(String(display_name).trim().slice(0, 80));
    }
    if (cols.has("bio") && bio !== undefined) {
      sets.push(`bio = $${i++}`);
      vals.push(String(bio).trim().slice(0, 500));
    }
    if (cols.has("avatar_url") && avatar_url !== undefined) {
      sets.push(`avatar_url = $${i++}`);
      vals.push(String(avatar_url).trim().slice(0, 500));
    }

    if (!sets.length) return res.json({ ok: true });

    vals.push(userId);

    const select = [
      "id",
      cols.has("email") ? "email" : null,
      cols.has("created_at") ? "created_at" : null,
      cols.has("display_name") ? "display_name" : null,
      cols.has("bio") ? "bio" : null,
      cols.has("avatar_url") ? "avatar_url" : null,
      cols.has("username") ? "username" : null,
      cols.has("name") ? "name" : null,
    ]
      .filter(Boolean)
      .join(", ");

    const r = await pool.query(
      `
      UPDATE users
      SET ${sets.join(", ")}
      WHERE id = $${i}
      RETURNING ${select}
      `,
      vals
    );

    res.json(normalizeUser(r.rows[0]));
  } catch (err) {
    console.error("PATCH /users/me ERROR:", err);
    res.status(500).json({ error: err.message || "Failed to update profile" });
  }
});

/* =========================
   GET /users/:id  (Public profile)
========================= */
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const userId = Number(req.params.id);
    if (!userId) return res.status(400).json({ error: "Invalid user id" });

    const cols = await detectUserColumns();
    const select = [
      "id",
      cols.has("created_at") ? "created_at" : null,
      cols.has("display_name") ? "display_name" : null,
      cols.has("bio") ? "bio" : null,
      cols.has("avatar_url") ? "avatar_url" : null,
      cols.has("username") ? "username" : null,
      cols.has("name") ? "name" : null,
    ]
      .filter(Boolean)
      .join(", ");

    const r = await pool.query(
      `SELECT ${select} FROM users WHERE id=$1 LIMIT 1`,
      [userId]
    );
    if (!r.rows.length) return res.status(404).json({ error: "User not found" });

    res.json(normalizeUser(r.rows[0]));
  } catch (err) {
    console.error("GET /users/:id ERROR:", err);
    res.status(500).json({ error: err.message || "Failed to load user" });
  }
});

export default router;