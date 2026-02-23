import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "./cloudinary.js";

function safeBaseName(name = "file") {
  // remove extension
  const base = name.replace(/\.[^/.]+$/, "");
  // keep letters/numbers/-/_ only
  return base
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "")
    .slice(0, 60) || "upload";
}

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const mime = file?.mimetype || "";
    const isVideo = mime.startsWith("video/");
    const folder = "addisgo";

    const cleanName = safeBaseName(file?.originalname);
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    return {
      folder,
      resource_type: isVideo ? "video" : "image",

      // Cloudinary will create something like: addisgo/170...-abc123-filename
      public_id: `${unique}-${cleanName}`,

      // Optional (recommended):
      // If you want consistent web playback, Cloudinary can deliver mp4/webm transforms anyway.
      // format: isVideo ? "mp4" : "jpg",

      // Optional: better caching/versioning behavior
      overwrite: false,
    };
  },
});

export const uploadToCloudinary = multer({
  storage,
  limits: { fileSize: 60 * 1024 * 1024 }, // 60MB
});