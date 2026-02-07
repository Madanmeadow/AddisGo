const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth.middleware");
const voicesController = require("../controllers/voices.controller");

// PUBLIC (no auth)
router.get("/public", voicesController.getPublicVoices);

// PRIVATE (auth)
router.get("/", auth, voicesController.getVoices);
router.post("/", auth, voicesController.createVoice);
router.delete("/:id", auth, voicesController.deleteVoice);

module.exports = router;







