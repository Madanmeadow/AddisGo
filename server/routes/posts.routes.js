import express from "express"
import multer from "multer"
import path from "path"
import { fileURLToPath } from "url"
import { pool } from "../db.js"
import { authenticateToken } from "../middleware/auth.middleware.js"

const router = express.Router()

/* ================= MULTER STORAGE ================= */
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const storage = multer.diskStorage({
  destination: path.join(__dirname, "../uploads"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
})

const upload = multer({ storage })

/* ================= HELPERS ================= */
const toInt = (v) => {
  const n = Number.parseInt(String(v), 10)
  return Number.isFinite(n) ? n : null
}

const cleanText = (v, max = 2000) => {
  if (typeof v !== "string") return ""
  const t = v.trim()
  if (!t) return ""
  return t.length > max ? t.slice(0, max) : t
}

const ok = (res, payload) => res.json(payload)
const bad = (res, msg) => res.status(400).json({ error: msg })
const notFound = (res, msg) => res.status(404).json({ error: msg })
const serverErr = (res, err, where) => {
  console.error(where, err)
  return res.status(500).json({ error: err.message || "Server error" })
}

/* =========================================================
   POSTS
   ========================================================= */

/* ================= GET POSTS (SAFE: NO JOIN) =================
   Returns base feed. (Your original)
*/
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        user_id,
        caption,
        image_url,
        video_url,
        created_at
      FROM posts
      ORDER BY created_at DESC
    `)

    res.json(result.rows)
  } catch (err) {
    console.error("GET /posts ERROR:", err)
    res.status(500).json({ error: err.message })
  }
})

/* ================= GET POSTS WITH COUNTS (WORLD-CLASS) =================
   GET /posts/feed
   Optional query:
     - viewerUserId=4   (if you want viewer_liked)
     - limit=20
     - offset=0
*/
router.get("/feed", async (req, res) => {
  try {
    const viewerUserId = toInt(req.query.viewerUserId)
    const limit = Math.min(Math.max(toInt(req.query.limit) ?? 20, 1), 50)
    const offset = Math.max(toInt(req.query.offset) ?? 0, 0)

    const result = await pool.query(
      `
      SELECT
        p.id,
        p.user_id,
        p.caption,
        p.image_url,
        p.video_url,
        p.created_at,
        COALESCE(lc.likes_count, 0)::int AS likes_count,
        COALESCE(cc.comments_count, 0)::int AS comments_count,
        CASE
          WHEN $3::int IS NULL THEN false
          ELSE EXISTS (
            SELECT 1
            FROM likes l
            WHERE l.post_id = p.id AND l.user_id = $3::int
          )
        END AS viewer_liked
      FROM posts p
      LEFT JOIN (
        SELECT post_id, COUNT(*)::int AS likes_count
        FROM likes
        GROUP BY post_id
      ) lc ON lc.post_id = p.id
      LEFT JOIN (
        SELECT post_id, COUNT(*)::int AS comments_count
        FROM comments
        GROUP BY post_id
      ) cc ON cc.post_id = p.id
      ORDER BY p.created_at DESC
      LIMIT $1 OFFSET $2
      `,
      [limit, offset, viewerUserId]
    )

    ok(res, { limit, offset, items: result.rows })
  } catch (err) {
    return serverErr(res, err, "GET /posts/feed ERROR")
  }
})

/* ================= CREATE POST =================
   expects:
   - caption
   - image (optional)
   - video (optional)
*/
router.post(
  "/",
  authenticateToken,
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "video", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const caption = typeof req.body.caption === "string" ? req.body.caption : null

      const imageUrl = req.files?.image?.[0]
        ? `/uploads/${req.files.image[0].filename}`
        : null

      const videoUrl = req.files?.video?.[0]
        ? `/uploads/${req.files.video[0].filename}`
        : null

      const result = await pool.query(
        `
        INSERT INTO posts (user_id, caption, image_url, video_url)
        VALUES ($1, $2, $3, $4)
        RETURNING id, user_id, caption, image_url, video_url, created_at
        `,
        [req.user.id, caption || null, imageUrl, videoUrl]
      )

      res.json(result.rows[0])
    } catch (err) {
      console.error("POST /posts ERROR:", err)
      res.status(500).json({ error: err.message })
    }
  }
)

/* =========================================================
   COMMENTS
   Tables:
     comments(id bigserial, post_id int, user_id int, body text, parent_id bigint)
   ========================================================= */

/* ================= GET COMMENTS =================
   GET /posts/:id/comments
   Query:
     - limit (default 50, max 100)
     - offset (default 0)
*/
router.get("/:id/comments", async (req, res) => {
  const postId = toInt(req.params.id)
  if (postId === null) return bad(res, "Invalid post id")

  const limit = Math.min(Math.max(toInt(req.query.limit) ?? 50, 1), 100)
  const offset = Math.max(toInt(req.query.offset) ?? 0, 0)

  try {
    // Ensure post exists (nice UX)
    const postCheck = await pool.query(`SELECT id FROM posts WHERE id=$1`, [postId])
    if (postCheck.rowCount === 0) return notFound(res, "Post not found")

    const result = await pool.query(
      `
      SELECT
        c.id,
        c.post_id,
        c.user_id,
        c.body,
        c.parent_id,
        c.created_at,
        c.updated_at
      FROM comments c
      WHERE c.post_id = $1
      ORDER BY c.created_at ASC, c.id ASC
      LIMIT $2 OFFSET $3
      `,
      [postId, limit, offset]
    )

    ok(res, { postId, limit, offset, items: result.rows })
  } catch (err) {
    return serverErr(res, err, "GET /posts/:id/comments ERROR")
  }
})

/* ================= ADD COMMENT =================
   POST /posts/:id/comments
   Auth required.
   Body:
     - body (string, required)
     - parentId (optional) for reply threads
*/
router.post("/:id/comments", authenticateToken, async (req, res) => {
  const postId = toInt(req.params.id)
  if (postId === null) return bad(res, "Invalid post id")

  const body = cleanText(req.body?.body, 2000)
  if (!body) return bad(res, "Comment body is required")

  const parentId = req.body?.parentId != null ? toInt(req.body.parentId) : null

  try {
    // Ensure post exists
    const postCheck = await pool.query(`SELECT id FROM posts WHERE id=$1`, [postId])
    if (postCheck.rowCount === 0) return notFound(res, "Post not found")

    // If replying, ensure parent exists and belongs to same post
    if (parentId != null) {
      const parentCheck = await pool.query(
        `SELECT id FROM comments WHERE id=$1 AND post_id=$2`,
        [parentId, postId]
      )
      if (parentCheck.rowCount === 0) return bad(res, "Invalid parentId for this post")
    }

    const result = await pool.query(
      `
      INSERT INTO comments (post_id, user_id, body, parent_id)
      VALUES ($1, $2, $3, $4)
      RETURNING id, post_id, user_id, body, parent_id, created_at, updated_at
      `,
      [postId, req.user.id, body, parentId]
    )

    res.status(201).json(result.rows[0])
  } catch (err) {
    return serverErr(res, err, "POST /posts/:id/comments ERROR")
  }
})

/* ================= DELETE COMMENT =================
   DELETE /posts/:id/comments/:commentId
   Auth required, deletes only your own comment.
*/
router.delete("/:id/comments/:commentId", authenticateToken, async (req, res) => {
  const postId = toInt(req.params.id)
  const commentId = toInt(req.params.commentId)

  if (postId === null) return bad(res, "Invalid post id")
  if (commentId === null) return bad(res, "Invalid comment id")

  try {
    const result = await pool.query(
      `
      DELETE FROM comments
      WHERE id = $1 AND post_id = $2 AND user_id = $3
      RETURNING id
      `,
      [commentId, postId, req.user.id]
    )

    if (result.rowCount === 0) {
      return notFound(res, "Comment not found or not owned by user")
    }

    ok(res, { ok: true, deletedCommentId: result.rows[0].id })
  } catch (err) {
    return serverErr(res, err, "DELETE /posts/:id/comments/:commentId ERROR")
  }
})

/* =========================================================
   LIKES
   Table:
     likes(user_id int, post_id int, created_at timestamptz, PK(user_id, post_id))
   ========================================================= */

/* ================= LIKE A POST =================
   POST /posts/:id/like
   Auth required. Idempotent.
*/
router.post("/:id/like", authenticateToken, async (req, res) => {
  const postId = toInt(req.params.id)
  if (postId === null) return bad(res, "Invalid post id")

  try {
    // Ensure post exists
    const postCheck = await pool.query(`SELECT id FROM posts WHERE id=$1`, [postId])
    if (postCheck.rowCount === 0) return notFound(res, "Post not found")

    await pool.query(
      `
      INSERT INTO likes (post_id, user_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
      `,
      [postId, req.user.id]
    )

    const countRes = await pool.query(
      `SELECT COUNT(*)::int AS likes_count FROM likes WHERE post_id=$1`,
      [postId]
    )

    ok(res, { ok: true, postId, likesCount: countRes.rows[0].likes_count })
  } catch (err) {
    return serverErr(res, err, "POST /posts/:id/like ERROR")
  }
})

/* ================= UNLIKE A POST =================
   DELETE /posts/:id/like
   Auth required.
*/
router.delete("/:id/like", authenticateToken, async (req, res) => {
  const postId = toInt(req.params.id)
  if (postId === null) return bad(res, "Invalid post id")

  try {
    await pool.query(
      `
      DELETE FROM likes
      WHERE post_id = $1 AND user_id = $2
      `,
      [postId, req.user.id]
    )

    const countRes = await pool.query(
      `SELECT COUNT(*)::int AS likes_count FROM likes WHERE post_id=$1`,
      [postId]
    )

    ok(res, { ok: true, postId, likesCount: countRes.rows[0].likes_count })
  } catch (err) {
    return serverErr(res, err, "DELETE /posts/:id/like ERROR")
  }
})

/* ================= GET LIKES INFO =================
   GET /posts/:id/likes
   Query:
     - viewerUserId (optional int) => viewerLiked
*/
router.get("/:id/likes", async (req, res) => {
  const postId = toInt(req.params.id)
  if (postId === null) return bad(res, "Invalid post id")

  const viewerUserId = toInt(req.query.viewerUserId)

  try {
    const countRes = await pool.query(
      `SELECT COUNT(*)::int AS likes_count FROM likes WHERE post_id=$1`,
      [postId]
    )

    let viewerLiked = false
    if (viewerUserId != null) {
      const likedRes = await pool.query(
        `SELECT 1 FROM likes WHERE post_id=$1 AND user_id=$2 LIMIT 1`,
        [postId, viewerUserId]
      )
      viewerLiked = likedRes.rowCount > 0
    }

    ok(res, { postId, likesCount: countRes.rows[0].likes_count, viewerLiked })
  } catch (err) {
    return serverErr(res, err, "GET /posts/:id/likes ERROR")
  }
})

export default router