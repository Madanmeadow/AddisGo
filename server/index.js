import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import videosRoutes from "./routes/videos.routes.js";
import commentsRoutes from "./routes/comments.routes.js";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/videos", videosRoutes);
app.use("/api/comments", commentsRoutes);

app.get("/", (req, res) => {
  res.json({
    status: "OK",
    message: "MeDan API is running 🚀"
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🔥 Server running on port ${PORT}`);
});
