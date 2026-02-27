// server/routes/upload.routes.js
import express from "express";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { uploadToCloudinary } from "../utils/cloudinaryUpload.js";

const router = express.Router();

// Accept BOTH keys: "file" and "image"
const uploadAny = uploadToCloudinary.fields([
  { name: "file", maxCount: 1 },
  { name: "image", maxCount: 1 },
]);

router.post("/", authenticateToken, (req, res) => {
  uploadAny(req, res, (err) => {
    // ✅ Multer errors become JSON (no more HTML Internal Server Error)
    if (err) {
      console.error("MULTER UPLOAD ERROR:", err);
      return res.status(400).json({
        ok: false,
        message: err.message || "Upload error",
        code: err.code || "UPLOAD_ERROR",
      });
    }

    try {
      // Pick whichever key user sent
      const file =
        req.files?.file?.[0] ||
        req.files?.image?.[0] ||
        req.file ||
        null;

      if (!file) {
        return res.status(400).json({ ok: false, message: "No file uploaded" });
      }

      // multer-storage-cloudinary usually gives .path as the URL
      const url =
        (file.path || file.secure_url || file.url || "").replace("http://", "https://");

      const type = file.mimetype?.startsWith("video/") ? "video" : "image";

      return res.json({
        ok: true,
        url,
        type,
        publicId: file.filename || file.public_id || null,
      });
    } catch (e) {
      console.error("UPLOAD ROUTE ERROR:", e);
      return res.status(500).json({ ok: false, message: "Upload failed" });
    }
  });
});

export default router;
