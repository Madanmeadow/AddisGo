let voices = [];
let nextId = 1;

export function getVoices(req, res) {
  const userId = req.user.id;
  res.json(voices.filter(v => v.userId === userId));
}

export function getPublicVoices(req, res) {
  res.json([...voices].reverse());
}

export function createVoice(req, res) {
  const { type, content } = req.body;

  if (!type || !content) {
    return res.status(400).json({ message: "Missing type or content" });
  }

  const voice = {
    id: nextId++,
    userId: req.user.id,
    username: req.user.email,
    type, // text | video
    content,
    createdAt: new Date().toISOString()
  };

  voices.push(voice);
  res.status(201).json(voice);
}

export function deleteVoice(req, res) {
  const id = Number(req.params.id);
  const index = voices.findIndex(
    v => v.id === id && v.userId === req.user.id
  );

  if (index === -1) {
    return res.status(404).json({ message: "Voice not found" });
  }

  voices.splice(index, 1);
  res.json({ success: true });
}
