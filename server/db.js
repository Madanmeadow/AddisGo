// server/db.js
import pkg from "pg";
const { Pool } = pkg;

const connectionString = process.env.DATABASE_URL || "postgresql://username:password@127.0.0.1:5432/addisgo_db";

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

export default pool;



