import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "../db.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOAD_DIR = path.join(__dirname, "..", "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Multer for direct multipart posting (optional but fixes iPhone issues fast)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const safeOriginal = (file.originalname || "post")
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9._-]/g, "");
    const extFromName = path.extname(safeOriginal);
    const extFromMime =
      file.mimetype === "image/heic" || file.mimetype === "image/heif"
        ? ".heic"
        : file.mimetype === "video/quicktime"
        ? ".mov"
        : "";
    const ext = extFromName || extFromMime || "";
    const base = path.basename(safeOriginal, extFromName || "");
    cb(null, `${Date.now()}-${Math.random().toString(16).slice(2)}-${base}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
});

function getBaseUrl(req) {
  const fromEnv = process.env.PUBLIC_BASE_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const proto = (req.headers["x-forwarded-proto"] || req.protocol || "https")
    .toString()
    .split(",")[0]
    .trim();
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `${proto}://${host}`;
}

/* ================= GET POSTS ================= */
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, user_id, caption, image_url, video_url, created_at
      FROM posts
      ORDER BY created_at DESC
      LIMIT 200
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("GET /posts ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ================= CREATE POST =================
   Supports:
   - application/json: { caption, image_url, video_url }
   - multipart/form-data: caption + file (field names flexible)
*/
router.post(
  "/",
  authenticateToken,
  upload.any(),
  async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const caption = (req.body?.caption || "").toString();

      let image_url = req.body?.image_url || null;
      let video_url = req.body?.video_url || null;

      // If multipart file included, prefer it
      const files = req.files || [];
      if (files.length) {
        const f = files[0];
        const baseUrl = getBaseUrl(req);
        const url = `${baseUrl}/uploads/${encodeURIComponent(f.filename)}`;

        if (f.mimetype?.startsWith("video/")) {
          video_url = url;
          image_url = null;
        } else {
          image_url = url;
          video_url = null;
        }
      }

      // Must have something to post
      if (!caption && !image_url && !video_url) {
        return res.status(400).json({
          error: "Post is empty. Provide caption and/or image_url/video_url and/or a file.",
        });
      }

      const result = await pool.query(
        `
        INSERT INTO posts (user_id, caption, image_url, video_url)
        VALUES ($1, $2, $3, $4)
        RETURNING id, user_id, caption, image_url, video_url, created_at
        `,
        [userId, caption || null, image_url, video_url]
      );

      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error("POST /posts ERROR:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

export default router;