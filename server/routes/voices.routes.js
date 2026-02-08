import express from "express";
import {
  getVoices,
  getPublicVoices,
  createVoice,
  deleteVoice
} from "../controllers/voices.controller.js";

const router = express.Router();

router.get("/", getVoices);
router.get("/public", getPublicVoices);
router.post("/", createVoice);
router.delete("/:id", deleteVoice);

export default router;

