import express from "express";

const router = express.Router();

// In-memory store (later replace with DB)
const commentsByVideo = {};

// GET comments for a video
router.get("/:filename", (req, res) => {
  const { filename } = req.params;
  res.json(commentsByVideo[filename] || []);
});

// POST a comment
router.post("/:filename", (req, res) => {
  const { filename } = req.params;
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ error: "Comment text required" });
  }

  if (!commentsByVideo[filename]) {
    commentsByVideo[filename] = [];
  }

  const newComment = {
    id: Date.now(),
    text,
    createdAt: new Date()
  };

  commentsByVideo[filename].push(newComment);
  res.json(newComment);
});

export default router;
