import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// Load env variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
import authRoutes from "./routes/auth.routes.js";

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "AddisGo API",
    time: new Date().toISOString()
  });
});

// Mount routes
app.use("/api/auth", authRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
