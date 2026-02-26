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

      const url = (req.file.path || "").replace("http://", "https://");
      const type = req.file.mimetype?.startsWith("video/") ? "video" : "image";

      return res.json({
        ok: true,
        url,
        type,
        publicId: req.file.filename,
      });
    } catch (err) {
      console.error("Upload error:", err);
      return res.status(500).json({ ok: false, message: "Upload failed" });
    }
  }
);

export default router;



