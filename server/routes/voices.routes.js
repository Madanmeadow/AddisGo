const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth.middleware");
const {
  createVoice,
  getMyVoices,
  getAllVoices,
  deleteVoice
} = require("../controllers/voices.controller");

router.post("/", auth, createVoice);
router.get("/me", auth, getMyVoices);
router.get("/", getAllVoices);
router.delete("/:id", auth, deleteVoice);

module.exports = router;
