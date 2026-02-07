// server/controllers/voices.controller.js

// TEMP in-memory store (replace with DB later)
let voices = [];
let idCounter = 1;

/**
 * GET /api/voices
 * Get all voices for logged-in user
 */
exports.getVoices = (req, res) => {
  const userId = req.user.id;

  const userVoices = voices.filter(v => v.userId === userId);
  res.json(userVoices);
};

/**
 * POST /api/voices
 * Create a new voice (text or video)
 */
exports.createVoice = (req, res) => {
  const userId = req.user.id;
  const { type, content } = req.body;

  if (!type || !content) {
    return res.status(400).json({ message: "Type and content are required" });
  }

  if (!["text", "video"].includes(type)) {
    return res.status(400).json({ message: "Invalid voice type" });
  }

  const newVoice = {
    id: idCounter++,
    userId,
    type,              // "text" | "video"
    content,           // text OR video URL
    createdAt: new Date().toISOString()
  };

  voices.push(newVoice);

  res.status(201).json(newVoice);
};

/**
 * DELETE /api/voices/:id
 * Delete a voice owned by the user
 */
exports.deleteVoice = (req, res) => {
  const userId = req.user.id;
  const voiceId = Number(req.params.id);

  const index = voices.findIndex(
    v => v.id === voiceId && v.userId === userId
  );

  if (index === -1) {
    return res.status(404).json({ message: "Voice not found" });
  }

  voices.splice(index, 1);
  res.json({ success: true });
};
