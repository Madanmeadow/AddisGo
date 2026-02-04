import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

// TEMP in-memory users (replace with DB later)
const users = [];

app.use(cors({
  origin: "*", // change later to your domain
  credentials: true
}));
app.use(express.json());

/* =========================
   REGISTER
========================= */
app.post("/api/register", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ message: "Missing fields" });

  const exists = users.find(u => u.email === email);
  if (exists)
    return res.status(400).json({ message: "User already exists" });

  const hash = await bcrypt.hash(password, 10);
  users.push({ email, password: hash });

  res.json({ success: true });
});

/* =========================
   LOGIN
========================= */
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  const user = users.find(u => u.email === email);
  if (!user) return res.status(401).json({ message: "Invalid credentials" });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).json({ message: "Invalid credentials" });

  const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: "7d" });

  res.json({ token });
});

/* =========================
   HEALTH CHECK
========================= */
app.get("/api/health", (_, res) => {
  res.send("API OK");
});

app.listen(PORT, () =>
  console.log(`🔥 Backend running on port ${PORT}`)
);
