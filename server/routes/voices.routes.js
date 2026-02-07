// server/routes/voices.routes.js

const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth.middleware");
const voicesController = require("../controllers/voices.controller");

router.get("/", auth, voicesController.getVoices);
router.post("/", auth, voicesController.createVoice);
router.delete("/:id", auth, voicesController.deleteVoice);

module.exports = router;

