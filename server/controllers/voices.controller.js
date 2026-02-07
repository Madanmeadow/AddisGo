let voices = [];

export const getVoices = (req, res) => {
  const userId = req.user.id;
  const userVoices = voices.filter(v => v.userId === userId);
  res.json(userVoices);
};

export const createVoice = (req, res) => {
  const userId = req.user.id;
  const { type, content } = req.body;

  if (!type || !content) {
    return res.status(400).json({ message: "Type and content required" });
  }

  const newVoice = {
    id: voices.length + 1,
    userId,
    type,
    content,
    createdAt: new Date()
  };

  voices.push(newVoice);
  res.status(201).json(newVoice);
};

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
