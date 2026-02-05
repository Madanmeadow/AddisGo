const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;

/* =======================
   MIDDLEWARE
======================= */
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* =======================
   STATIC FILES
   (uploaded videos)
======================= */
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* =======================
   ROOT CHECK (IMPORTANT)
======================= */
app.get("/", (req, res) => {
  res.json({
    status: "OK",
    message: "MeDan API is running 🚀",
    time: new Date().toISOString()
  });
});

/* =======================
   API ROUTES (example)
======================= */
// Example videos route (you can replace later)
app.get("/api/videos", (req, res) => {
  res.json([
    {
      id: 1,
      creator: "@creator1",
      videoUrl: "http://localhost:5000/uploads/sample1.mp4"
    },
    {
      id: 2,
      creator: "@creator2",
      videoUrl: "http://localhost:5000/uploads/sample2.mp4"
    }
  ]);
});

/* =======================
   START SERVER
======================= */
app.listen(PORT, () => {
  console.log(`✅ MeDan API running on http://localhost:${PORT}`);
});
