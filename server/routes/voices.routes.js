import express from "express";
import multer from "multer";
import auth from "../middleware/auth.middleware.js";
import {
  getVoices,
  createVoice,
  deleteVoice,
  getPublicVoices
} from "../controllers/voices.controller.js";

const router = express.Router();

const upload = multer({ dest: "uploads/" });

// 🌍 Public feed
router.get("/public", getPublicVoices);

// 🔐 Private (auth)
router.get("/", auth, getVoices);
router.post("/", auth, upload.single("video"), createVoice);
router.delete("/:id", auth, deleteVoice);

export default router;

