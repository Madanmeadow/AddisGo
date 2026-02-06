import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

/**
 * Health check (IMPORTANT for Render)
 */
app.get("/", (req, res) => {
  res.json({ message: "API running" });
});

/**
 * Auth – login (temporary)
 */
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Missing credentials" });
  }

  res.json({
    token: "fake-jwt-token",
    user: { email }
  });
});

/**
 * 404 handler
 */
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
