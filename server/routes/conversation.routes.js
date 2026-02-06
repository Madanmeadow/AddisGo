import express from "express";

const router = express.Router();

// TEMP in-memory store
const conversations = [];

// Create or get conversation
router.post("/", (req, res) => {
  const { userIds } = req.body;

  if (!userIds || userIds.length < 2) {
    return res.status(400).json({ message: "At least 2 users required" });
  }

  // Check if conversation already exists
  let convo = conversations.find(c =>
    c.userIds.sort().join(",") === userIds.sort().join(",")
  );

  if (!convo) {
    convo = {
      id: Date.now().toString(),
      userIds,
      createdAt: new Date()
    };
    conversations.push(convo);
  }

  res.json(convo);
});

// Get user conversations
router.get("/:userId", (req, res) => {
  const { userId } = req.params;
  const userConvos = conversations.filter(c =>
    c.userIds.includes(userId)
  );
  res.json(userConvos);
});

export default router;
