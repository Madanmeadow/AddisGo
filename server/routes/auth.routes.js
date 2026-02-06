import express from "express";

const router = express.Router();

/**
 * POST /api/auth/register
 */
router.post("/register", (req, res) => {
  res.json({
    message: "Register endpoint is alive",
    body: req.body
  });
});

/**
 * POST /api/auth/login
 */
router.post("/login", (req, res) => {
  res.json({
    message: "Login endpoint is alive",
    body: req.body
  });
});

/**
 * GET /api/auth
 * (optional sanity check)
 */
router.get("/", (req, res) => {
  res.json({ message: "Auth routes working" });
});

export default router;

