const express = require("express");
const router = express.Router();

const authRoutes = require("./auth.routes");
const postsRoutes = require("./posts.routes");

// Mount sub routes
router.use("/auth", authRoutes);
router.use("/posts", postsRoutes);

module.exports = router;
