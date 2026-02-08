import { v4 as uuid } from "uuid";

const voices = [];

// GET current user's voices
export const getVoices = (req, res) => {
  const userId = req.headers["x-user-id"];
  res.json(voices.filter(v => v.userId === userId));
};

// PUBLIC FEED
export const getPublicVoices = (req, res) => {
  res.json(voices);
};

// CREATE VOICE
export const createVoice = (req, res) => {
  const userId = req.headers["x-user-id"];
  const { type, content } = req.body;

  if (!content) {
    return res.status(400).json({ message: "Content required" });
  }

  const newVoice = {
    id: uuid(),
    userId,
    type,
    content,
    createdAt: new Date()
  };

  voices.unshift(newVoice);
  res.status(201).json(newVoice);
};

// DELETE VOICE
export const deleteVoice = (req, res) => {
  const userId = req.headers["x-user-id"];
  const { id } = req.params;

  const index = voices.findIndex(
    v => v.id === id && v.userId === userId
  );

  if (index === -1) {
    return res.status(404).json({ message: "Voice not found" });
  }

  voices.splice(index, 1);
  res.json({ success: true });
};
