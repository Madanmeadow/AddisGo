const express = require("express")
const cors = require("cors")
const path = require("path")
require("dotenv").config()

// Database
const { Pool } = require("pg")

// Routes
const authRoutes = require("./routes/auth.routes")
const postsRoutes = require("./routes/posts.routes")

const app = express()

/* =============================
   DATABASE CONNECTION
============================= */

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production"
    ? { rejectUnauthorized: false }
    : false,
})

pool.connect()
  .then(() => console.log("✅ PostgreSQL Connected"))
  .catch(err => console.error("❌ DB Connection Error:", err))

// Make pool accessible in routes
app.locals.pool = pool

/* =============================
   MIDDLEWARE
============================= */

app.use(cors({
  origin: true,
  credentials: true,
}))

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Serve uploads folder (IMPORTANT for images/videos)
app.use("/uploads", express.static(path.join(__dirname, "uploads")))

/* =============================
   ROUTES
============================= */

app.use("/api/auth", authRoutes)
app.use("/api/posts", postsRoutes)

/* =============================
   HEALTH CHECK
============================= */

app.get("/", (req, res) => {
  res.json({ message: "🚀 AddisGo API running" })
})

/* =============================
   START SERVER
============================= */

const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
})


