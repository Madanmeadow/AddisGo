require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const authRoutes = require("./routes/auth.routes");

const app = express();

/* CORS */
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://addisgo-2.onrender.com",
    ],
    credentials: true,
  })
);

app.use(express.json());

/* API ROUTES */
app.use("/api/auth", authRoutes);

/* SERVE FRONTEND */
const distPath = path.join(__dirname, "..", "dist");
app.use(express.static(distPath));

/* SPA FALLBACK (IMPORTANT) */
app.get("*", (_, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT}`)
);
