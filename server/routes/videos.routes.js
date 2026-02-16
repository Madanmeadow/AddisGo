import express from "express";
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../utils/cloudinary.js";
import { createVideo, getVideos } from "../controllers/videos.controller.js";

const router = express.Router();

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "addisgo_videos",
    resource_type: "video",
  },
});

const upload = multer({ storage });

router.post("/", upload.single("video"), createVideo);
router.get("/", getVideos);

export default router;




