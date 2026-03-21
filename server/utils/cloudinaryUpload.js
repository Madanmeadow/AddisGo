// server/utils/cloudinaryUpload.js
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";

// Cloudinary config (Railway env vars)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Storage config
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    return {
      folder: "pulse/uploads", // or "addisgo/uploads"
      resource_type: "auto", // image or video
      public_id: `img_${Date.now()}`,
    };
  },
});

// ✅ THIS is what gives you .single(), .fields(), etc.
export const uploadToCloudinary = multer({ storage });