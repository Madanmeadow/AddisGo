const express = require("express");
const multer = require("multer");
const path = require("path");

const router = express.Router();

const storage = multer.diskStorage({
  destination: "uploads/videos",
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

router.post("/upload", upload.single("video"), (req, res) => {
  res.json({
    message: "Video saved",
    file: `/uploads/videos/${req.file.filename}`,
  });
});

module.exports = router;

