let voices = [];
let nextId = 1;

/**
 * GET /api/voices
 */
export const getVoices = (req, res) => {
  const userId = req.user.id;
  const userVoices = voices.filter(v => v.userId === userId);
  res.json(userVoices);
};

/**
 * POST /api/voices
 */
export const createVoice = (req, res) => {
  const userId = req.user.id;
  const { type, content } = req.body;

  if (!type || !content) {
    return res.status(400).json({ message: "Type and content required" });
  }

  if (!["text", "video"].includes(type)) {
    return res.status(400).json({ message: "Invalid voice type" });
  }

  const newVoice = {
    id: nextId++,
    userId,
    type,
    content,
    createdAt: new Date()
  };

  voices.unshift(newVoice);
  res.status(201).json(newVoice);
};

/**
 * DELETE /api/voices/:id
 */
export const deleteVoice = (req, res) => {
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
