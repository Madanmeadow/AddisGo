require("dotenv").config();

const express = require("express");
const cors = require("cors");

const postsRoutes = require("./routes/posts.routes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/posts", postsRoutes);

app.get("/", (req, res) => {
  res.send("AddisGo API running 🚀");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});


