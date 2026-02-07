import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import authRoutes from "./routes/auth.routes.js";

const app = express();

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

mongoose.connect("mongodb://127.0.0.1:27017/addisgo");

app.use("/api/auth", authRoutes);

app.listen(5000, () => {
  console.log("✅ Server running on http://localhost:5000");
});
