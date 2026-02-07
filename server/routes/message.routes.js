import express from "express";
import auth from "../middleware/auth.middleware.js";

const router = express.Router();

/**
 * GET /api/messages
 * Protected
 */
router.get("/", auth, async (req, res) => {
  try {
    res.json({
      messages: []
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch messages" });
  }
});

/**
 * POST /api/messages
 */
router.post("/", auth, async (req, res) => {
  const { content } = req.body;

  if (!content) {
    return res.status(400).json({ message: "Message required" });
  }

  res.status(201).json({
    message: "Message sent",
    data: {
      id: Date.now(),
      content,
      userId: req.user.id
    }
  });
});

export default router;




