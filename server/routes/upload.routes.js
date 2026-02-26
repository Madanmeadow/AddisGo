import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// If you have auth middleware, you can enable it:
// import { authenticateToken } from "../middleware/auth.middleware.js";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads folder exists
const UPLOAD_DIR = path.join(__dirname, "..", "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

/**
 * Multer disk storage
 * - Works on Railway (ephemeral disk, but fine for now)
 * - Handles iPhone HEIC/HEIF, jpg, png, webp, gif, mp4, mov, etc.
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const safeOriginal = (file.originalname || "upload")
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
  limits: {
    // Tune this as needed. iPhone photos can be big.
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: (req, file, cb) => {
    // Allow all images + videos (including HEIC/HEIF)
    const ok =
      file.mimetype?.startsWith("image/") ||
      file.mimetype?.startsWith("video/") ||
      file.mimetype === "application/octet-stream"; // some clients send this

    if (!ok) return cb(new Error(`Unsupported mimetype: ${file.mimetype}`));
    cb(null, true);
  },
});

/**
 * Build a public base URL for returned file URLs.
 * If you have a stable env var, prefer it:
 *   PUBLIC_BASE_URL=https://your-railway-service.up.railway.app
 */
function getBaseUrl(req) {
  const fromEnv = process.env.PUBLIC_BASE_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  // behind proxies, req.protocol can be wrong unless trust proxy is enabled in server/index.js
  const proto = (req.headers["x-forwarded-proto"] || req.protocol || "https")
    .toString()
    .split(",")[0]
    .trim();

  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `${proto}://${host}`;
}

/**
 * POST /upload
 * Accepts multipart/form-data with ANY of these field names:
 * - file, image, photo, media, upload
 *
 * Returns:
 * { ok:true, url, filename, mimetype, size }
 */
router.post(
  "/",
  // authenticateToken, // enable if you want uploads locked to logged-in users
  upload.any(),
  (req, res) => {
    try {
      const files = req.files || [];
      if (!files.length) {
        return res.status(400).json({
          ok: false,
          error:
            "No file received. Make sure you send multipart/form-data with a file field like: file | image | photo | media",
          debug: {
            contentType: req.headers["content-type"],
            bodyKeys: Object.keys(req.body || {}),
          },
        });
      }

      // Pick the first file; (you can expand later to multi-upload)
      const f = files[0];

      const baseUrl = getBaseUrl(req);
      const url = `${baseUrl}/uploads/${encodeURIComponent(f.filename)}`;

      return res.json({
        ok: true,
        url,
        filename: f.filename,
        originalname: f.originalname,
        mimetype: f.mimetype,
        size: f.size,
        fieldname: f.fieldname,
      });
    } catch (err) {
      console.error("UPLOAD ERROR:", err);
      return res.status(500).json({ ok: false, error: err.message });
    }
  }
);

// Multer error handler (clean errors to client)
router.use((err, req, res, next) => {
  if (!err) return next();
  console.error("UPLOAD ROUTE ERROR:", err);
  return res.status(400).json({
    ok: false,
    error: err.message,
    hint:
      err.code === "LIMIT_FILE_SIZE"
        ? "File too large. Increase multer limits or compress on client."
        : undefined,
  });
});

export default router;



