import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";

const app = express();
app.use(cors());
app.use(express.json());

// 🔐 In-memory user store (temporary)
const users = [];

/* =========================
   REGISTER
========================= */
app.post("/api/register", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false });
  }

  const exists = users.find(u => u.email === email);
  if (exists) {
    return res.status(400).json({ success: false, message: "User exists" });
  }

  const hashed = await bcrypt.hash(password, 10);
  users.push({ email, password: hashed });

  res.json({ success: true });
});

/* =========================
   LOGIN
========================= */
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  const user = users.find(u => u.email === email);
  if (!user) {
    return res.status(401).json({ success: false });
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return res.status(401).json({ success: false });
  }

  res.show = true;
  res.json({ success: true });
});

/* =========================
   HEALTH CHECK
========================= */
app.get("/", (_, res) => {
  res.send("AddisGo API running");
});

app.listen(5000, () => {
  console.log("✅ Server running on port 5000");
});


