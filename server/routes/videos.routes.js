import express from "express";
import multer from "multer";
import {
  createVideo,
  getVideos
} from "../controllers/videos.controller.js";

const router = express.Router();

/* =========================
   MULTER CONFIG (LOCAL UPLOADS)
========================= */

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/videos");
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
});

/* =========================
   ROUTES
========================= */

// Upload video
router.post("/", upload.single("video"), createVideo);

// Get feed
router.get("/", getVideos);

export default router;


