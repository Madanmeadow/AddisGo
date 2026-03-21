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
    {
      id: user.id,
      email: user.email,
      username: user.username,
      display_name: user.display_name,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

async function ensureFollowsTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS follows (
        id SERIAL PRIMARY KEY,
        follower_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        following_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT now(),
        UNIQUE (follower_id, following_id)
      )
    `);
  } catch (err) {
    console.error("ensureFollowsTable ERROR:", err);
  }
}

async function getFollowStats(userId, viewerId = null) {
  try {
    const followersQ = pool.query(
      `SELECT COUNT(*)::int AS count FROM follows WHERE following_id = $1`,
      [userId]
    );

    const followingQ = pool.query(
      `SELECT COUNT(*)::int AS count FROM follows WHERE follower_id = $1`,
      [userId]
    );

    const isFollowingQ = viewerId
      ? pool.query(
          `SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2 LIMIT 1`,
          [viewerId, userId]
        )
      : Promise.resolve({ rows: [] });

    const [followersR, followingR, isFollowingR] = await Promise.all([
      followersQ,
      followingQ,
      isFollowingQ,
    ]);

    return {
      followers: followersR.rows[0]?.count || 0,
      following: followingR.rows[0]?.count || 0,
      is_following: !!isFollowingR.rows.length,
    };
  } catch (err) {
    console.error("getFollowStats ERROR:", err);
    return {
      followers: 0,
      following: 0,
      is_following: false,
    };
  }
}

async function safeUserRow(u, viewerId = null) {
  if (!u) return null;

  const followStats = await getFollowStats(u.id, viewerId);

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
    followers: followStats.followers,
    following: followStats.following,
    is_following: followStats.is_following,
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
    const displayNorm =
      String(display_name || "").trim() ||
      nameNorm ||
      usernameNorm ||
      emailNorm.split("@")[0];

    const exists = await pool.query(`SELECT id FROM users WHERE email = $1`, [emailNorm]);
    if (exists.rows.length) {
      return res.status(409).json({ error: "Email already registered" });
    }

    if (usernameNorm) {
      const uex = await pool.query(
        `SELECT id FROM users WHERE lower(username) = lower($1)`,
        [usernameNorm]
      );
      if (uex.rows.length) {
        return res.status(409).json({ error: "Username already taken" });
      }
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

    return res.json({ token, user: await safeUserRow(user) });
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
    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }

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

    if (!found.rows.length) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = found.rows[0];
    const ok = await bcrypt.compare(String(password), user.password);
    if (!ok) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = signToken(user);
    return res.json({ token, user: await safeUserRow(user, user.id) });
  } catch (err) {
    console.error("POST /users/login ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
});

/* =========================
   GET ME
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

    if (!result.rows.length) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json(await safeUserRow(result.rows[0], req.user.id));
  } catch (err) {
    console.error("GET /users/me ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
});

/* =========================
   UPDATE ME
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

    if (username) {
      const uex = await pool.query(
        `SELECT id FROM users WHERE lower(username)=lower($1) AND id <> $2`,
        [String(username).trim(), req.user.id]
      );
      if (uex.rows.length) {
        return res.status(409).json({ error: "Username already taken" });
      }
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

    return res.json(await safeUserRow(result.rows[0], req.user.id));
  } catch (err) {
    console.error("PUT /users/me ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
});

/* =========================
   USERS LIST
========================= */
router.get("/", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        id,
        name,
        email,
        username,
        display_name,
        bio,
        avatar_url,
        location,
        country,
        website,
        cover_url,
        is_private,
        is_verified,
        last_seen,
        created_at,
        updated_at
      FROM users
      ORDER BY created_at DESC
      LIMIT 200
      `
    );

    const mapped = await Promise.all(
      result.rows.map((u) => safeUserRow(u, req.user.id))
    );

    return res.json(mapped);
  } catch (err) {
    console.error("GET /users ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
});

/* =========================
   USER BY USERNAME
========================= */
router.get("/username/:username", authenticateToken, async (req, res) => {
  try {
    const uname = String(req.params.username || "").trim();
    if (!uname) {
      return res.status(400).json({ error: "Invalid username" });
    }

    const result = await pool.query(
      `
      SELECT
        id, name, email, created_at,
        username, display_name,
        bio, avatar_url, phone, location, country, website, cover_url, birthday, gender,
        is_private, is_verified, last_seen, updated_at
      FROM users
      WHERE lower(username) = lower($1)
      LIMIT 1
      `,
      [uname]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json(await safeUserRow(result.rows[0], req.user.id));
  } catch (err) {
    console.error("GET /users/username/:username ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
});

/* =========================
   FOLLOW USER
========================= */
router.post("/:id/follow", authenticateToken, async (req, res) => {
  try {
    await ensureFollowsTable();

    const followerId = Number(req.user.id);
    const followingId = Number(req.params.id);

    if (!followingId) {
      return res.status(400).json({ error: "Invalid user id" });
    }

    if (followerId === followingId) {
      return res.status(400).json({ error: "You cannot follow yourself" });
    }

    await pool.query(
      `
      INSERT INTO follows (follower_id, following_id)
      VALUES ($1, $2)
      ON CONFLICT (follower_id, following_id) DO NOTHING
      `,
      [followerId, followingId]
    );

    const stats = await getFollowStats(followingId, followerId);
    return res.json({ ok: true, ...stats });
  } catch (err) {
    console.error("POST /users/:id/follow ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
});

/* =========================
   UNFOLLOW USER
========================= */
router.delete("/:id/follow", authenticateToken, async (req, res) => {
  try {
    await ensureFollowsTable();

    const followerId = Number(req.user.id);
    const followingId = Number(req.params.id);

    if (!followingId) {
      return res.status(400).json({ error: "Invalid user id" });
    }

    await pool.query(
      `DELETE FROM follows WHERE follower_id = $1 AND following_id = $2`,
      [followerId, followingId]
    );

    const stats = await getFollowStats(followingId, followerId);
    return res.json({ ok: true, ...stats });
  } catch (err) {
    console.error("DELETE /users/:id/follow ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
});

/* =========================
   USER FOLLOW STATS
========================= */
router.get("/:id/follow-stats", authenticateToken, async (req, res) => {
  try {
    await ensureFollowsTable();

    const userId = Number(req.params.id);
    if (!userId) {
      return res.status(400).json({ error: "Invalid user id" });
    }

    const stats = await getFollowStats(userId, req.user.id);
    return res.json(stats);
  } catch (err) {
    console.error("GET /users/:id/follow-stats ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
});

/* =========================
   USER BY ID
========================= */
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) {
      return res.status(400).json({ error: "Invalid user id" });
    }

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

    if (!result.rows.length) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json(await safeUserRow(result.rows[0], req.user.id));
  } catch (err) {
    console.error("GET /users/:id ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;