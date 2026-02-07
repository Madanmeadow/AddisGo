import express from "express";
import cors from "cors";
import multer from "multer";

const app = express();
const upload = multer();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));

/* ================================
   IN-MEMORY FEED (NO DATABASE)
================================ */
let feed = [
  {
    id: 1,
    url: "https://www.w3schools.com/html/mov_bbb.mp4",
    reactions: {
      like: 0,
      fire: 0,
      laugh: 0,
      wow: 0,
    },
    comments: [],
    shares: 0,
    createdAt: Date.now(),
  },
];

/* ================================
   HEALTH CHECK
================================ */
app.get("/", (req, res) => {
  res.json({ message: "API running" });
});

/* ================================
   FEED
================================ */
app.get("/api/feed", (req, res) => {
  res.json(feed);
});

/* ================================
   UPLOAD VIDEO
================================ */
app.post("/api/upload", upload.single("video"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No video uploaded" });
  }

  const video = {
    id: Date.now(),
    url: `data:video/mp4;base64,${req.file.buffer.toString("base64")}`,
    reactions: {
      like: 0,
      fire: 0,
      laugh: 0,
      wow: 0,
    },
    comments: [],
    shares: 0,
    createdAt: Date.now(),
  };

  feed.unshift(video);
  res.json(video);
});

/* ================================
   REACTIONS
================================ */
app.post("/api/react/:id", (req, res) => {
  const { type } = req.body;
  const video = feed.find(v => v.id == req.params.id);

  if (!video) {
    return res.status(404).json({ message: "Video not found" });
  }

  if (video.reactions[type] === undefined) {
    return res.status(400).json({ message: "Invalid reaction type" });
  }

  video.reactions[type]++;
  res.json(video);
});

/* ================================
   SHARES
================================ */
app.post("/api/share/:id", (req, res) => {
  const video = feed.find(v => v.id == req.params.id);

  if (!video) {
    return res.status(404).json({ message: "Video not found" });
  }

  video.shares++;
  res.json(video);
});

/* ================================
   SINGLE VIDEO (FOR SHARING)
================================ */
app.get("/api/video/:id", (req, res) => {
  const video = feed.find(v => v.id == req.params.id);

  if (!video) {
    return res.status(404).json({ message: "Video not found" });
  }

  res.json(video);
});

/* ================================
   START SERVER
================================ */
app.listen(PORT, () => {
  console.log(`🚀 AddisGo API running on port ${PORT}`);
});
