import express from "express";
import cors from "cors";

import messageRoutes from "./routes/message.routes.js";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// test route
app.get("/", (req, res) => {
  res.json({ message: "API running" });
});

// messaging API
app.use("/api/messages", messageRoutes);

app.listen(PORT, () => {
  console.log(`🔥 Server running on port ${PORT}`);
});
