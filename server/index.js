require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
const videoRoutes = require("./routes/video.routes");

app.use("/uploads", express.static("uploads"));
app.use("/api/videos", videoRoutes);

app.use(cors());
app.use(express.json());

app.get("/api/auth", (req, res) => {
  res.json({ message: "Auth API running ✅" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
