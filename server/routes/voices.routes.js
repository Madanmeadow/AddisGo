import express from "express";
import auth from "../middleware/auth.middleware.js";
import {
  getVoices,
  createVoice,
  deleteVoice
} from "../controllers/voices.controller.js";

const router = express.Router();

router.get("/", auth, getVoices);
router.post("/", auth, createVoice);
router.delete("/:id", auth, deleteVoice);

export default router;
