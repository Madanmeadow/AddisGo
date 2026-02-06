import express from "express";
import auth from "../middleware/auth.js";

const router = express.Router();
const conversations = [];

router.get("/", auth, (req, res) => {
  res.json({ conversations });
});

router.post("/", auth, (req, res) => {
  const convo = {
    id: Date.now().toString(),
    participants: [req.user.id, req.body.participantId]
  };
  conversations.push(convo);
  res.json(convo);
});

export default router;

