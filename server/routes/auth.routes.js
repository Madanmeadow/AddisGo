import express from "express";
import { register, login } from "../controllers/auth.controller.js";

const router = express.Router();

/* =====================
   Test route
===================== */
router.get("/", (req, res) => {
  res.json({ message: "Auth routes working" });
});

/* =====================
   Auth routes
===================== */
router.post("/register", register);
router.post("/login", login);

export default router;


