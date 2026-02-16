// server/routes/videos.routes.js

import express from "express";
import multer from "multer";
import {
  createVideo,
  getVideos,
} from "../controllers/videos.controller.js";

const router = express.Router();

// temp storage before Cloudinary upload
const upload = multer({ dest: "temp/" });

router.post("/", upload.single("video"), createVideo);
router.get("/", getVideos);

export default router;




