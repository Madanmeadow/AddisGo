import express from "express";
import authMiddleware from "../middleware/auth.middleware.js";

const router = express.Router();

/* GET messages */
router.get("/", authMiddleware, (req, res) => {
  res.json({
    messages: [],
    userId: req.user.id
  });
});

/* POST message */
router.post("/", authMiddleware, (req, res) => {
  const { content } = req.body;

  res.status(201).json({
    id: Date.now(),
    userId: req.user.id,
    type: "text",
    content,
    createdAt: new Date()
  });
});

export default router;

