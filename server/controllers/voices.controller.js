let voices = [];
let idCounter = 1;

/**
 * PUBLIC FEED – anyone can see
 * GET /api/voices/public
 */
export const getPublicVoices = (req, res) => {
  const sorted = [...voices].sort((a, b) => b.createdAt - a.createdAt);
  res.json(sorted);
};

/**
 * USER VOICES – private
 * GET /api/voices
 */
export const getVoices = (req, res) => {
  const userId = req.user.id;
  res.json(voices.filter(v => v.userId === userId));
};

/**
 * CREATE VOICE – text or video
 * POST /api/voices
 */
export const createVoice = (req, res) => {
  const userId = req.user.id;
  const { text, type } = req.body;

  let videoUrl = null;
  if (req.file) {
    videoUrl = `/uploads/${req.file.filename}`;
  }

  const newVoice = {
    id: idCounter++,
    userId,
    text: text || "",
    type: type || "text",
    videoUrl,
    createdAt: Date.now()
  };

  voices.push(newVoice);
  res.status(201).json(newVoice);
};

/**
 * DELETE VOICE
 */
export const deleteVoice = (req, res) => {
  const userId = req.user.id;
  const voiceId = Number(req.params.id);

  voices = voices.filter(v => !(v.id === voiceId && v.userId === userId));
  res.json({ success: true });
};

