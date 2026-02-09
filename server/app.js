import express from "express";
import cors from "cors";

import uploadRoutes from "./routes/upload.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

// Serve uploaded files
app.use("/uploads", express.static("uploads"));

// Upload route
app.use("/upload", uploadRoutes);

app.get("/", (req, res) => {
  res.json({ status: "AddisGo API running ✅" });
});

export default app;





