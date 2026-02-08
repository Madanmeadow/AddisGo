import dotenv from "dotenv";
dotenv.config();

import pool from "./db.js";

try {
  const conn = await pool.getConnection();
  console.log("✅ MySQL connected successfully!");
  conn.release();
  process.exit(0);
} catch (err) {
  console.error("❌ DB ERROR:", err.message);
  process.exit(1);
}
