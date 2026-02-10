
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js"; // ensure this path
// import other routes...

const app = express();
app.use(cors());
app.use(express.json());

// route mounts
app.use("/api/auth", authRoutes);
// other routes: app.use("/api/users", usersRoutes);

app.get("/", (_, res) => res.json({ message: "AddisGo API running" }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

