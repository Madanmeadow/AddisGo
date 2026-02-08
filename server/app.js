import express from "express";

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.send("AddisGo API running");
});

export default app;




