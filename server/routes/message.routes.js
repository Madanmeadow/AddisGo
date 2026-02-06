import express from "express";

const router = express.Router();

// temp in-memory store (later DB)
const messages = [];

// GET all messages
router.get("/", (req, res) => {
  res.json({ messages });
});

// POST new message
router.post("/", (req, res) => {
  const { text, senderId, receiverId } = req.body;

  if (!text || !senderId || !receiverId) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const message = {
    id: messages.length + 1,
    text,
    senderId,
    receiverId,
    createdAt: new Date()
  };

  messages.push(message);

  res.status(201).json(message);
});

export default router;



