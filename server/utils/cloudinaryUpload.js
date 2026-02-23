import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "./cloudinary.js";

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const isVideo = file.mimetype?.startsWith("video/");
    return {
      folder: "addisgo",
      resource_type: isVideo ? "video" : "image",
      public_id: `${Date.now()}-${file.originalname.replace(/\.[^/.]+$/, "")}`,
    };
  },
});

export const uploadToCloudinary = multer({
  storage,
  limits: { fileSize: 60 * 1024 * 1024 }, // 60MB
});