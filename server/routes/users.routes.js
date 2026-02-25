import express from "express";
import { pool } from "../db.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

const router = express.Router();

async function hasColumn(table, column) {
  const r = await pool.query(
    `
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = $1 AND column_name = $2
    LIMIT 1
    `,
    [table, column]
  );
  return r.rowCount > 0;
}

router.get("/", authenticateToken, async (req, res) => {
  try {
    const usernameExists = await hasColumn("users", "username");

    const sql = usernameExists
      ? `
        SELECT
          id,
          COALESCE(username, name, email, 'User') AS display_name
        FROM users
        WHERE id <> $1
        ORDER BY id DESC
        LIMIT 200
      `
      : `
        SELECT
          id,
          COALESCE(name, email, 'User') AS display_name
        FROM users
        WHERE id <> $1
        ORDER BY id DESC
        LIMIT 200
      `;

    const result = await pool.query(sql, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    console.error("GET /users ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;