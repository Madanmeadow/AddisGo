import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/auth.routes.js";
// import messagesRoutes from "./routes/messages.routes.js"; ❌ not yet

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "API running" });
});

app.use("/api/auth", authRoutes);
// app.use("/api/messages", messagesRoutes); ❌ not yet

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
