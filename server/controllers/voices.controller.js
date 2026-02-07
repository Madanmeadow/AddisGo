let voices = [];
let nextId = 1;

exports.getVoices = (req, res) => {
  const userId = req.user.id;
  const userVoices = voices.filter(v => v.userId === userId);
  res.json(userVoices);
};

exports.createVoice = (req, res) => {
  const userId = req.user.id;
  const { type, content } = req.body;

  if (!type || !content) {
    return res.status(400).json({ message: "Missing data" });
  }

  const newVoice = {
    id: nextId++,
    userId,
    type, // "text" or "video"
    content,
    createdAt: new Date()
  };

  voices.push(newVoice);
  res.status(201).json(newVoice);
};

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
