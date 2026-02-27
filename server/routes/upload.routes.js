import express from "express";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { uploadToCloudinary } from "../utils/cloudinaryUpload.js";

const router = express.Router();

router.post(
  "/",
  authenticateToken,
  uploadToCloudinary.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ ok: false, message: "No file uploaded" });
      }

      // ✅ Cloudinary middleware can return different fields depending on version/config.
      const urlRaw =
        req.file?.path ||
        req.file?.secure_url ||
        req.file?.url ||
        req.file?.location ||
        "";

      const url = String(urlRaw).replace("http://", "https://");

      if (!url || !url.startsWith("http")) {
        // This is the exact scenario that causes iPhone "pattern" error later.
        console.error("Upload: invalid url from req.file =", req.file);
        return res.status(500).json({ ok: false, message: "Upload returned invalid URL" });
      }

      const type = req.file.mimetype?.startsWith("video/") ? "video" : "image";

      return res.json({
        ok: true,
        url,
        type,
        // Cloudinary often provides public_id; filename may be undefined
        publicId: req.file?.filename || req.file?.public_id || null,
      });
    } catch (err) {
      console.error("Upload error:", err);
      return res.status(500).json({ ok: false, message: "Upload failed" });
    }
  }
);

export default router;

