import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import videoRoutes from "./routes/videos.routes.js";
import authRoutes from "./routes/auth.routes.js";


const app = express();

/* =========================
   MIDDLEWARE
========================= */
app.use(cors());
app.use(express.json());

// Serve uploaded videos (if storing locally)
app.use("/uploads", express.static("uploads"));

/* =========================
   ROUTES
========================= */
app.use("/api/auth", authRoutes);
app.use("/api/videos", videoRoutes);

// Health check
app.get("/", (req, res) => {
  res.send("AddisGo API running 🚀");
});

/* =========================
   CREATE TABLES (PRODUCTION ONLY)
========================= */
const createTables = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        video_url TEXT,
        caption TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("Tables ready ✅");
  } catch (err) {
    console.error("Error creating tables:", err.message);
  }
};

/* =========================
   START SERVER
========================= */
const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);

  // Only run table creation if DATABASE_URL exists
 if (process.env.NODE_ENV === "production") {
  await createTables();
}

});


