import express from "express"
import { pool } from "../db.js"
import { authenticateToken } from "../middleware/auth.middleware.js"

const router = express.Router()

// List users for starting chats (exclude yourself)
router.get("/", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        id,
        COALESCE(username, name, email, 'User') AS display_name
      FROM users
      WHERE id <> $1
      ORDER BY id DESC
      LIMIT 200
      `,
      [req.user.id]
    )
    res.json(result.rows)
  } catch (err) {
    console.error("GET /users ERROR:", err)
    res.status(500).json({ error: err.message })
  }
})

export default router