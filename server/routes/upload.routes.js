const express = require("express")
const multer = require("multer")
const path = require("path")
const router = express.Router()

// Storage config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/")
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname)
  }
})

const upload = multer({ storage })

// POST /api/upload
router.post("/", upload.single("file"), (req, res) => {
  const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`

  res.json({
    success: true,
    url: fileUrl
  })
})

module.exports = router



