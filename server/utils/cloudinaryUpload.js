// server/utils/cloudinaryUpload.js
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "./cloudinary.js";

function safeBaseName(name = "file") {
  const base = String(name).replace(/\.[^/.]+$/, "");
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
      public_id: `${cleanName}-${unique}`,
    };
  },
});

export const uploadToCloudinary = multer({ storage });