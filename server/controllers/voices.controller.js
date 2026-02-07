// In-memory store (temporary, replace with DB later)
let voices = [];
let nextId = 1;

/**
 * GET /api/voices
 * Get voices for logged-in user
 */
exports.getVoices = (req, res) => {
  const userId = req.user.id;
  const userVoices = voices.filter(v => v.userId === userId);
  res.json(userVoices);
};

/**
 * GET /api/voices/public
 * Public feed (everyone)
 */
exports.getPublicVoices = (req, res) => {
  // newest first
  res.json([...voices].reverse());
};

/**
 * POST /api/voices
 * Create text or video voice
 */
exports.createVoice = (req, res) => {
  const { type, content } = req.body;

  if (!type || !content) {
    return res.status(400).json({ message: "Missing type or content" });
  }

  const newVoice = {
    id: nextId++,
    userId: req.user.id,
    username: req.user.email, // simple for now
    type, // "text" | "video"
    content,
    createdAt: new Date().toISOString()
  };

  voices.push(newVoice);
  res.status(201).json(newVoice);
};

/**
 * DELETE /api/voices/:id
 * Delete voice owned by user
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

