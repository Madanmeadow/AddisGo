import express from "express";
const router = express.Router();

router.post("/login", (req, res) => {
  res.json({ token: "fake-token", user: { id: "user123" } });
});

export default router;



