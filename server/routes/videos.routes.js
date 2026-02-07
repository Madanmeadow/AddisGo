const express = require("express");
const multer = require("multer");
const auth = require("../middleware/auth.middleware");

const router = express.Router();

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({ storage });

router.post("/", auth, upload.single("video"), (req, res) => {
  const videoUrl = `/uploads/${req.file.filename}`;
  res.json({ videoUrl });
});

module.exports = router;
