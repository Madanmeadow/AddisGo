import express from "express";
import { pool } from "../db.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

const router = express.Router();

/**
 * GET /users/:id  (public profile)
 */
router.get("/:id", async (req, res) => {
  try {
    const id = String(req.params.id || "").trim();
    if (!id) return res.status(400).json({ error: "Missing user id" });

    const r = await pool.query(
      `SELECT id,
              COALESCE(display_name, username, name, split_part(email,'@',1)) AS display_name,
              bio,
              avatar_url
       FROM users
       WHERE id=$1
       LIMIT 1`,
      [id]
    );

    if (!r.rows.length) return res.status(404).json({ error: "User not found" });
    res.json(r.rows[0]);
  } catch (e) {
    console.error("GET /users/:id error:", e);
    res.status(500).json({ error: "Failed to load profile" });
  }
});

/**
 * GET /users/me  (my profile)
 */
router.get("/me/profile", authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    const r = await pool.query(
      `SELECT id,
              COALESCE(display_name, username, name, split_part(email,'@',1)) AS display_name,
              bio,
              avatar_url
       FROM users
       WHERE id=$1
       LIMIT 1`,
      [userId]
    );
    res.json(r.rows[0] || null);
  } catch (e) {
    console.error("GET /users/me/profile error:", e);
    res.status(500).json({ error: "Failed to load profile" });
  }
});

/**
 * PUT /users/me  (update my profile)
 * body: { display_name, bio, avatar_url }
 */
router.put("/me", authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { display_name, bio, avatar_url } = req.body || {};

    const r = await pool.query(
      `UPDATE users
       SET display_name = COALESCE($1, display_name),
           bio          = COALESCE($2, bio),
           avatar_url   = COALESCE($3, avatar_url)
       WHERE id=$4
       RETURNING id,
                 COALESCE(display_name, username, name, split_part(email,'@',1)) AS display_name,
                 bio,
                 avatar_url`,
      [
        display_name === "" ? null : display_name,
        bio === "" ? null : bio,
        avatar_url === "" ? null : avatar_url,
        userId,
      ]
    );

    res.json(r.rows[0]);
  } catch (e) {
    console.error("PUT /users/me error:", e);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

export default router;