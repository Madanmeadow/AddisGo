const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth.routes");

const app = express();

// middleware
app.use(cors());
app.use(express.json());

// test root
app.get("/", (req, res) => {
  res.json({ message: "API running 🚀" });
});

// auth routes
app.use("/api/auth", authRoutes);

module.exports = app;
