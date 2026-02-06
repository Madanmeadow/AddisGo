import express from "express";
import cors from "cors";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";

// Routes
import authRoutes from "./routes/auth.routes.js";
import voicesRoutes from "./routes/voices.routes.js";
import videosRoutes from "./routes/videos.routes.js";

// Resolve __dirname (ESM fix)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

/* ======================
   MIDDLEWARE
====================== */
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

/* ======================
   STATIC FILES
====================== */
// Uploaded videos
app.use("/videos", express.static(path.join(__dirname, "uploads/videos")));

/* ======================
   HEALTH CHECK
====================== */
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "AddisGo API",
    time: new Date().toISOString(),
  });
});

/* ======================
   API ROUTES
====================== */
app.use("/api/auth", authRoutes);
app.use("/api/voices", voicesRoutes);
app.use("/api/videos", videosRoutes);

/* ======================
   404 HANDLER
====================== */
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

/* ======================
   SERVER START
====================== */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🔥 AddisGo API running on http://localhost:${PORT}`);
});
