import express from "express";
import auth from "../middleware/auth.js";

const router = express.Router();
const messages = [];

router.get("/:conversationId", auth, (req, res) => {
  res.json({
    messages: messages.filter(
      m => m.conversationId === req.params.conversationId
    )
  });
});

router.post("/", auth, (req, res) => {
  const message = {
    id: Date.now().toString(),
    conversationId: req.body.conversationId,
    senderId: req.user.id,
    text: req.body.text,
    createdAt: new Date()
  };
  messages.push(message);
  res.json(message);
});

export default router;



