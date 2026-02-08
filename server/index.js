import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes.js";
import voicesRoutes from "./routes/voices.routes.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

app.use("/api/auth", authRoutes);
app.use("/api/voices", voicesRoutes);

app.get("/", (req, res) => {
  res.send("AddisGo API running 🚀");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log("Server running on", PORT));



