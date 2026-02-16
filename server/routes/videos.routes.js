import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import {
  createVideo,
  getVideos
} from "../controllers/videos.controller.js";

const router = express.Router();

/* =========================
   ENSURE UPLOAD FOLDER EXISTS
========================= */

const uploadDir = "uploads/videos";

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/* =========================
   MULTER CONFIG
========================= */

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, Date.now() + "-" + name + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
});

/* =========================
   ROUTES
========================= */

// POST /api/videos
router.post("/", upload.single("video"), createVideo);

// GET /api/videos
router.get("/", getVideos);

export default router;



