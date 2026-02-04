import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import authRoutes from "./server/routes/users.routes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Needed for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://ethiaddisgo.com",
    "https://addisgo-2.onrender.com"
  ],
  credentials: true,
}));

app.use(express.json());

// API routes
app.use("/api/auth", authRoutes);

// 🔥 SERVE FRONTEND BUILD
app.use(express.static(path.join(__dirname, "dist")));

// 🔥 SPA FALLBACK — THIS FIXES REFRESH
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
