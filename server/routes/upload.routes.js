// server/routes/upload.routes.js
import express from "express";
import multer from "multer";
import cloudinary from "../utils/cloudinary.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

const router = express.Router();

/**
 * Use memory storage so we upload directly to Cloudinary
 * (no /uploads folder = no "dark media after deploy")
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 150 * 1024 * 1024 }, // 150MB
});

/** Cloudinary upload helper (buffer -> upload_stream) */
function uploadBufferToCloudinary(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
    stream.end(buffer);
  });
}

/**
 * POST /upload
 * form-data: file
 * returns: { url, public_id, resource_type, format, bytes, width, height, duration }
 */
router.post("/", authenticateToken, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const mime = req.file.mimetype || "";
    const isVideo = mime.startsWith("video/");
    const isImage = mime.startsWith("image/");

    if (!isVideo && !isImage) {
      return res.status(400).json({ error: "Only image/video files supported" });
    }

    const folder = isVideo ? "pulse/videos" : "pulse/images";

    const result = await uploadBufferToCloudinary(req.file.buffer, {
      folder,
      resource_type: isVideo ? "video" : "image",
      // quality/performance knobs (safe defaults)
      overwrite: false,
      secure: true,
    });

    return res.json({
      url: result.secure_url,
      public_id: result.public_id,
      resource_type: result.resource_type,
      format: result.format,
      bytes: result.bytes,
      width: result.width,
      height: result.height,
      duration: result.duration,
    });
  } catch (err) {
    console.error("POST /upload ERROR:", err);
    return res.status(500).json({ error: err.message || "Upload failed" });
  }
});

export default router;