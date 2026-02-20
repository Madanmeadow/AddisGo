require("dotenv").config()

const express = require("express")
const cors = require("cors")
const path = require("path")

const app = express()

// ============================
// MIDDLEWARE
// ============================

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use(
  cors({
    origin: true, // Allow all origins (for development)
      
    credentials: true
  })
)

// ============================
// STATIC FOLDER FOR UPLOADS
// ============================

app.use("/uploads", express.static(path.join(__dirname, "uploads")))

// ============================
// ROUTES
// ============================

const authRoutes = require("./routes/auth.routes")
const postsRoutes = require("./routes/posts.routes")

app.use("/auth", authRoutes)
app.use("/posts", postsRoutes)

// ============================
// HEALTH CHECK ROUTE
// ============================

app.get("/", (req, res) => {
  res.send("🚀 AddisGo API running successfully")
})

// ============================
// GLOBAL ERROR HANDLER
// ============================

app.use((err, req, res, next) => {
  console.error("GLOBAL ERROR:", err)
  res.status(500).json({
    error: "Internal server error"
  })
})

// ============================
// START SERVER
// ============================

const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
})
