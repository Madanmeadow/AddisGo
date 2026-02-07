import express from "express";
import auth from "../middleware/auth.middleware.js";
import * as voicesController from "../controllers/voices.controller.js";

const router = express.Router();

router.get("/", auth, voicesController.getVoices);
router.post("/", auth, voicesController.createVoice);
router.delete("/:id", auth, voicesController.deleteVoice);

export default router;
