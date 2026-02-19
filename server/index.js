require("dotenv").config()
const express = require("express")
const cors = require("cors")
const path = require("path")
const fs = require("fs")

const app = express()

// ==============================
// ✅ Ensure uploads folder exists
// ==============================
const uploadPath = path.join(__dirname, "uploads")
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true })
}

// ==============================
// ✅ Middleware
// ==============================
app.use(cors({
  origin: "*",
  credentials: true
}))

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// ==============================
// ✅ Static folder for uploaded media
// ==============================
app.use("/uploads", express.static(uploadPath))

// ==============================
// ✅ Routes
// ==============================
app.use("/api/auth", require("./routes/auth.routes"))
app.use("/api/posts", require("./routes/posts.routes"))

// ==============================
// ✅ Health Check
// ==============================
app.get("/health", (req, res) => {
  res.json({ status: "OK", message: "AddisGo API running 🚀" })
})

// ==============================
// ❌ 404 Handler
// ==============================
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" })
})

// ==============================
// 🚀 Start Server
// ==============================
const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
  console.log(`🔥 AddisGo Server running on port ${PORT}`)
})




