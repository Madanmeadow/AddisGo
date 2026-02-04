import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import usersRoutes from "./routes/users.routes.js";

dotenv.config();

const app = express();

app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());

app.use("/api/users", usersRoutes);

app.get("/", (req, res) => {
  res.send("API running");
});

export default app;
