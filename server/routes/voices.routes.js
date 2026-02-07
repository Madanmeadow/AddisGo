import express from "express";
import auth from "../middleware/auth.middleware.js";
import {
  getVoices,
  getPublicVoices,
  createVoice,
  deleteVoice
} from "../controllers/voices.controller.js";

const router = express.Router();

router.get("/", auth, getVoices);
router.get("/public", getPublicVoices);
router.post("/", auth, createVoice);
router.delete("/:id", auth, deleteVoice);

export default router;
