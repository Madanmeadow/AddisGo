// server/routes/upload.routes.js
import express from "express";
import multer from "multer";
import cloudinary from "../utils/cloudinary.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

const router = express.Router();

// memory storage (no /uploads folder = no disappearing files)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 60 * 1024 * 1024 }, // 60MB
});

// POST /api/upload  (field name: "media")
router.post("/", authenticateToken, upload.single("media"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded (media)." });

    const mime = req.file.mimetype || "";
    const isVideo = mime.startsWith("video/");
    const resource_type = isVideo ? "video" : "image";

    const folder = process.env.CLOUDINARY_FOLDER || "addisgo";

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type,
          // good defaults
          overwrite: false,
          // for videos, Cloudinary can generate streaming formats later
        },
        (err, uploaded) => (err ? reject(err) : resolve(uploaded))
      );

      stream.end(req.file.buffer);
    });

    res.json({
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
    console.error("UPLOAD ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;