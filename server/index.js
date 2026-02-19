require("dotenv").config();

const express = require("express");
const cors = require("cors");

const routes = require("./routes/routes");

const app = express();

// ================= CORS =================
app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://addis-go.vercel.app"
  ],
  credentials: true
}));

// ================= JSON =================
app.use(express.json());

// ================= ROUTES =================
app.use("/api", routes);

// ================= HEALTH CHECK =================
app.get("/", (req, res) => {
  res.send("🚀 AddisGo API running");
});

// ================= START =================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});


