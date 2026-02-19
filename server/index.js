require("dotenv").config();

const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth.routes");
const postsRoutes = require("./routes/posts.routes");

const app = express();

// CORS (allow Vercel frontend)
app.use(cors({
  origin: ["https://addis-go.vercel.app"],
  credentials: true
}));

app.use(express.json());

// ROUTES
app.use("/api/auth", authRoutes);
app.use("/api/posts", postsRoutes);

// Health check
app.get("/", (req, res) => {
  res.send("AddisGo API running 🚀");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});



