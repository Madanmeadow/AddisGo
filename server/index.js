import express from "express";
import cors from "cors";

const app = express();

/* =========================
   MIDDLEWARE
========================= */
app.use(cors({
  origin: "*", // allow frontend + local dev
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

/* =========================
   HEALTH CHECK / ROOT
========================= */
app.get("/", (req, res) => {
  res.json({ message: "API running" });
});

/* =========================
   AUTH (NO DATABASE VERSION)
========================= */
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Missing credentials" });
  }

  // temporary fake login (no DB)
  const fakeToken = "demo-token-123";

  res.json({
    token: fakeToken,
    user: {
      id: 1,
      email
    }
  });
});

app.post("/api/auth/register", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Missing credentials" });
  }

  res.json({
    message: "User registered",
    user: {
      id: Date.now(),
      email
    }
  });
});

/* =========================
   DASHBOARD / FEED (MOCK)
========================= */
app.get("/api/feed", (req, res) => {
  res.json([
    {
      id: 1,
      type: "video",
      url: "https://www.w3schools.com/html/mov_bbb.mp4"
    },
    {
      id: 2,
      type: "video",
      url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4"
    }
  ]);
});

/* =========================
   START SERVER
========================= */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
