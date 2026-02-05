// server/controllers/voices.controller.js

let voices = []; // in-memory store (temporary MVP)

exports.createVoice = (req, res) => {
  const { type, content } = req.body;

  if (!type || !content) {
    return res.status(400).json({
      message: "Type and content are required"
    });
  }

  if (!["text", "video"].includes(type)) {
    return res.status(400).json({
      message: "Type must be 'text' or 'video'"
    });
  }

  const voice = {
    id: Date.now(),
    userId: req.user?.id || req.user?.email, // works with mock JWT
    type,                 // "text" | "video"
    content,              // text OR video URL
    createdAt: new Date()
  };

  voices.unshift(voice); // newest first

  res.status(201).json({
    success: true,
    voice
  });
};

exports.getMyVoices = (req, res) => {
  const userId = req.user?.id || req.user?.email;

  const myVoices = voices.filter(
    v => v.userId === userId
  );

  res.json(myVoices);
};

exports.getAllVoices = (req, res) => {
  res.json(voices);
};

exports.deleteVoice = (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id || req.user?.email;

  const index = voices.findIndex(
    v => v.id == id && v.userId === userId
  );

  if (index === -1) {
    return res.status(404).json({
      message: "Voice not found or unauthorized"
    });
  }

  voices.splice(index, 1);

  res.json({ success: true });
};
