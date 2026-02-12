import express from "express"
import cors from "cors"
import dotenv from "dotenv"

import authRoutes from "./routes/auth.routes.js"
import videoRoutes from "./routes/videos.routes.js"

dotenv.config()

const app = express()

app.use(cors())
app.use(express.json())

// Serve uploaded videos
app.use("/uploads", express.static("uploads"))

// Routes
app.use("/api/auth", authRoutes)
app.use("/api/videos", videoRoutes)

const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
  console.log("Server running on port", PORT)
})



