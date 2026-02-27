// server/routes/users.routes.js
import express from "express";
import { pool } from "../db.js";
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
    username: baseName, // keep for UI compatibility
    display_name: row.display_name || row.name || baseName,
    bio: row.bio || "",
    avatar_url: row.avatar_url || "",
    created_at: row.created_at || null,
  };
}

async function detectUserColumns() {
  const r = await pool.query(
    `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='users'
    `
  );
  return new Set(r.rows.map((x) => x.column_name));
}

function clampStr(v, max) {
  if (v === undefined || v === null) return undefined;
  return String(v).trim().slice(0, max);
}

/* =========================
   GET /users  (People list)
========================= */
router.get("/", authenticateToken, async (req, res) => {
  try {
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

    const q = String(req.query.q || "").trim().toLowerCase();

    let result;
    if (q) {
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

    const r = await pool.query(`SELECT ${select} FROM users WHERE id=$1 LIMIT 1`, [
      userId,
    ]);
    if (!r.rows.length) return res.status(404).json({ error: "User not found" });

    res.json(normalizeUser(r.rows[0]));
  } catch (err) {
    console.error("GET /users/me ERROR:", err);
    res.status(500).json({ error: err.message || "Failed to load profile" });
  }
});

/* =========================
   UPDATE /users/me
   ✅ Supports BOTH PUT + PATCH
   ✅ Saves display_name into display_name if exists, else into name
   ✅ Saves bio/avatar_url only if columns exist
========================= */
async function updateMeHandler(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const cols = await detectUserColumns();
    const { display_name, bio, avatar_url } = req.body || {};

    const dn = clampStr(display_name, 80);
    const b = clampStr(bio, 500);
    const av = clampStr(avatar_url, 500);

    // Never allow blob: to be saved
    if (av && !av.startsWith("http")) {
      return res.status(400).json({ error: "avatar_url must be a valid http(s) URL" });
    }

    const sets = [];
    const vals = [];
    let i = 1;

    // display name: prefer display_name column, fallback to name column
    if (dn !== undefined) {
      if (cols.has("display_name")) {
        sets.push(`display_name = $${i++}`);
        vals.push(dn);
      } else if (cols.has("name")) {
        sets.push(`name = $${i++}`);
        vals.push(dn);
      }
    }

    if (b !== undefined && cols.has("bio")) {
      sets.push(`bio = $${i++}`);
      vals.push(b);
    }

    if (av !== undefined && cols.has("avatar_url")) {
      sets.push(`avatar_url = $${i++}`);
      vals.push(av);
    }

    // If user table doesn't have bio/avatar_url columns, don’t crash — return a clear message
    if (!sets.length) {
      return res.status(400).json({
        error:
          "No updatable profile columns found. Add display_name/bio/avatar_url columns (or at least name).",
      });
    }

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

    if (!r.rows.length) return res.status(404).json({ error: "User not found" });

    res.json(normalizeUser(r.rows[0]));
  } catch (err) {
    console.error("UPDATE /users/me ERROR:", err);
    res.status(500).json({ error: err.message || "Failed to update profile" });
  }
}

router.patch("/me", authenticateToken, updateMeHandler);
router.put("/me", authenticateToken, updateMeHandler); // ✅ THIS FIXES YOUR PHONE SAVE

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

    const r = await pool.query(`SELECT ${select} FROM users WHERE id=$1 LIMIT 1`, [
      userId,
    ]);
    if (!r.rows.length) return res.status(404).json({ error: "User not found" });

    res.json(normalizeUser(r.rows[0]));
  } catch (err) {
    console.error("GET /users/:id ERROR:", err);
    res.status(500).json({ error: err.message || "Failed to load user" });
  }
});

export default router;