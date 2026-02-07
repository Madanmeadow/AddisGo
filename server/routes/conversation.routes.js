import express from "express";
import auth from "../middleware/auth.middleware.js";

const router = express.Router();

/**
 * GET /api/conversations
 * Protected
 */
router.get("/", auth, async (req, res) => {
  try {
    // temporary demo response (can replace with DB later)
    res.json({
      conversations: []
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch conversations" });
  }
});

export default router;

