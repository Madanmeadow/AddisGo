import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
const voicesRoutes = require("./routes/voices.routes");

app.use("/api/voices", voicesRoutes);

const app = express();
app.use(cors());
app.use(express.json());

const users = [];
const JWT_SECRET = "supersecret123";

app.post("/api/auth/register", async (req, res) => {
  const { email, password } = req.body;

  if (users.find((u) => u.email === email)) {
    return res.status(400).json({ message: "User exists" });
  }

  const hashed = await bcrypt.hash(password, 10);
  users.push({ email, password: hashed });

  res.json({ message: "Registered" });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;

  const user = users.find((u) => u.email === email);
  if (!user) return res.status(401).json({ message: "Invalid" });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).json({ message: "Invalid" });

  const token = jwt.sign({ email }, JWT_SECRET);
  res.json({ token });
});

app.get("/api/health", (req, res) => {
  res.json({ message: "API running" });
});

app.listen(5000, () => console.log("API running"));

