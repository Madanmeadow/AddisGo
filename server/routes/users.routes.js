// server/routes/users.routes.js
import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../db.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

const router = express.Router();

/* =========================
   HELPERS
========================= */
function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, username: user.username, display_name: user.display_name },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function safeUserRow(u) {
  if (!u) return null;
  return {
    id: u.id,
    name: u.name ?? null,
    email: u.email ?? null,
    username: u.username ?? null,
    display_name: u.display_name ?? u.name ?? null,
    bio: u.bio ?? null,
    avatar_url: u.avatar_url ?? null,
    phone: u.phone ?? null,
    location: u.location ?? null,
    country: u.country ?? null,
    website: u.website ?? null,
    cover_url: u.cover_url ?? null,
    birthday: u.birthday ?? null,
    gender: u.gender ?? null,
    is_private: !!u.is_private,
    is_verified: !!u.is_verified,
    last_seen: u.last_seen ?? null,
    created_at: u.created_at ?? null,
    updated_at: u.updated_at ?? null,
  };
}

/* =========================
   AUTH: REGISTER
========================= */
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, username, display_name } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }

    const emailNorm = String(email).trim().toLowerCase();
    const nameNorm = String(name || "").trim();
    const usernameNorm = String(username || "").trim() || null;
    const displayNorm = String(display_name || "").trim() || nameNorm || usernameNorm || emailNorm.split("@")[0];

    const exists = await pool.query(`SELECT id FROM users WHERE email = $1`, [emailNorm]);
    if (exists.rows.length) return res.status(409).json({ error: "Email already registered" });

    if (usernameNorm) {
      const uex = await pool.query(`SELECT id FROM users WHERE lower(username) = lower($1)`, [usernameNorm]);
      if (uex.rows.length) return res.status(409).json({ error: "Username already taken" });
    }

    const hash = await bcrypt.hash(String(password), 10);

    const result = await pool.query(
      `
      INSERT INTO users (name, email, password, username, display_name)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING
        id, name, email, created_at,
        username, display_name,
        bio, avatar_url, phone, location, country, website, cover_url, birthday, gender,
        is_private, is_verified, last_seen, updated_at
      `,
      [nameNorm || displayNorm, emailNorm, hash, usernameNorm, displayNorm]
    );

    const user = result.rows[0];
    const token = signToken(user);

    return res.json({ token, user: safeUserRow(user) });
  } catch (err) {
    console.error("POST /users/register ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
});

/* =========================
   AUTH: LOGIN
========================= */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "email and password are required" });

    const emailNorm = String(email).trim().toLowerCase();
    const found = await pool.query(
      `
      SELECT
        id, name, email, password, created_at,
        username, display_name,
        bio, avatar_url, phone, location, country, website, cover_url, birthday, gender,
        is_private, is_verified, last_seen, updated_at
      FROM users
      WHERE email = $1
      `,
      [emailNorm]
    );

    if (!found.rows.length) return res.status(401).json({ error: "Invalid credentials" });

    const user = found.rows[0];
    const ok = await bcrypt.compare(String(password), user.password);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const token = signToken(user);
    return res.json({ token, user: safeUserRow(user) });
  } catch (err) {
    console.error("POST /users/login ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
});

/* =========================
   GET ME (PROFILE HEADER)
========================= */
router.get("/me", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        id, name, email, created_at,
        username, display_name,
        bio, avatar_url, phone, location, country, website, cover_url, birthday, gender,
        is_private, is_verified, last_seen, updated_at
      FROM users
      WHERE id = $1
      `,
      [req.user.id]
    );

    if (!result.rows.length) return res.status(404).json({ error: "User not found" });
    return res.json(safeUserRow(result.rows[0]));
  } catch (err) {
    console.error("GET /users/me ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
});

/* =========================
   UPDATE ME (EDIT PROFILE)
   ✅ This makes Email/Location/Bio etc editable
========================= */
router.put("/me", authenticateToken, async (req, res) => {
  try {
    const {
      display_name,
      username,
      bio,
      avatar_url,
      phone,
      location,
      country,
      website,
      cover_url,
      birthday,
      gender,
      is_private,
    } = req.body || {};

    // username uniqueness (if changing)
    if (username) {
      const uex = await pool.query(
        `SELECT id FROM users WHERE lower(username)=lower($1) AND id <> $2`,
        [String(username).trim(), req.user.id]
      );
      if (uex.rows.length) return res.status(409).json({ error: "Username already taken" });
    }

    const result = await pool.query(
      `
      UPDATE users SET
        display_name = COALESCE($1, display_name),
        username     = COALESCE($2, username),
        bio          = COALESCE($3, bio),
        avatar_url   = COALESCE($4, avatar_url),
        phone        = COALESCE($5, phone),
        location     = COALESCE($6, location),
        country      = COALESCE($7, country),
        website      = COALESCE($8, website),
        cover_url    = COALESCE($9, cover_url),
        birthday     = COALESCE($10, birthday),
        gender       = COALESCE($11, gender),
        is_private   = COALESCE($12, is_private),
        updated_at   = now()
      WHERE id = $13
      RETURNING
        id, name, email, created_at,
        username, display_name,
        bio, avatar_url, phone, location, country, website, cover_url, birthday, gender,
        is_private, is_verified, last_seen, updated_at
      `,
      [
        display_name ?? null,
        username ?? null,
        bio ?? null,
        avatar_url ?? null,
        phone ?? null,
        location ?? null,
        country ?? null,
        website ?? null,
        cover_url ?? null,
        birthday ?? null,
        gender ?? null,
        typeof is_private === "boolean" ? is_private : null,
        req.user.id,
      ]
    );

    return res.json(safeUserRow(result.rows[0]));
  } catch (err) {
    console.error("PUT /users/me ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
});

/* =========================
   USERS LIST (PEOPLE)
   ✅ fixes your 404 /users
========================= */
router.get("/", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        id,
        username,
        display_name,
        avatar_url,
        bio,
        location,
        country,
        is_private,
        is_verified,
        last_seen,
        created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT 200
      `
    );

    return res.json(result.rows.map(safeUserRow));
  } catch (err) {
    console.error("GET /users ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
});

/* =========================
   USER BY ID (PROFILE PAGE)
========================= */
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid user id" });

    const result = await pool.query(
      `
      SELECT
        id, name, email, created_at,
        username, display_name,
        bio, avatar_url, phone, location, country, website, cover_url, birthday, gender,
        is_private, is_verified, last_seen, updated_at
      FROM users
      WHERE id = $1
      `,
      [id]
    );

    if (!result.rows.length) return res.status(404).json({ error: "User not found" });
    return res.json(safeUserRow(result.rows[0]));
  } catch (err) {
    console.error("GET /users/:id ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;