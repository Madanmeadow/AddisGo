import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// routes
import authRoutes from "./routes/auth.routes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

/* =====================
   Middleware
===================== */
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* =====================
   Health check
===================== */
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "AddisGo API",
    time: new Date().toISOString(),
  });
});

/* =====================
   Routes
===================== */
app.use("/api/auth", authRoutes);

/* =====================
   404 fallback
===================== */
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

/* =====================
   Start server
===================== */
app.listen(PORT, () => {
  console.log(`🚀 AddisGo API running on http://localhost:${PORT}`);
});
