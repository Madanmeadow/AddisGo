const express = require("express");
const auth = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/dashboard", auth, (req, res) => {
  res.json({
    message: "Protected dashboard data 🎉",
    user: req.user
  });
});

module.exports = router;
