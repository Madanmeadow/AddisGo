import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: "*", credentials: true }));
app.use(express.json());

// ---------- TEMP IN-MEMORY DATA ----------
let users = [];
let videos = [];

// ---------- FILE UPLOAD ----------
const uploadDir = "./uploads";
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

// ---------- ROUTES ----------
app.get("/", (_, res) => res.json({ message: "API running" }));

// AUTH
app.post("/api/register", (req, res) => {
  const { email, password } = req.body;
  users.push({ id: Date.now(), email, password });
  res.json({ success: true });
});

app.post("/api/login", (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) return res.status(401).json({ error: "Invalid login" });
  res.json({ success: true, userId: user.id });
});

// FEED
app.get("/api/feed", (_, res) => res.json(videos));

// UPLOAD
app.post("/api/upload", upload.single("video"), (req, res) => {
  const video = {
    id: Date.now(),
    url: `/uploads/${req.file.filename}`,
    likes: 0,
    shares: 0,
    reactions: { like: 0, fire: 0, laugh: 0, wow: 0 },
  };
  videos.unshift(video);
  res.json(video);
});

// LIKE
app.post("/api/like/:id", (req, res) => {
  const v = videos.find(v => v.id == req.params.id);
  if (v) v.likes++;
  res.json(v);
});

// REACT
app.post("/api/react/:id", (req, res) => {
  const { type } = req.body;
  const v = videos.find(v => v.id == req.params.id);
  if (v && v.reactions[type] !== undefined) v.reactions[type]++;
  res.json(v);
});

// SHARE
app.post("/api/share/:id", (req, res) => {
  const v = videos.find(v => v.id == req.params.id);
  if (v) v.shares++;
  res.json(v);
});

// STATIC FILES
app.use("/uploads", express.static("uploads"));

app.listen(PORT, () => console.log("Server running on", PORT));

