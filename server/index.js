import "dotenv/config"
import express from "express"
import cors from "cors"
import sqlite3 from "sqlite3"
import { open } from "sqlite"

const app = express()
app.use(cors())
app.use(express.json())

const PORT = process.env.PORT || 3000
const WHATSAPP_NUMBER = process.env.WHATSAPP_NUMBER || "1415XXXXXXX"

const db = await open({
  filename: "./database.db",
  driver: sqlite3.Database
})

await db.exec(`
  CREATE TABLE IF NOT EXISTS booking_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT,
    name TEXT,
    phone TEXT,
    pickup TEXT,
    checkin TEXT,
    checkout TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`)

app.post("/api/requests", async (req, res) => {
  const { type, name, phone, pickup, checkin, checkout, notes } = req.body

  await db.run(
    `INSERT INTO booking_requests (type, name, phone, pickup, checkin, checkout, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [type, name, phone, pickup || "", checkin || "", checkout || "", notes || ""]
  )

  let message = ""
  if (type === "hotel") {
    message =
`New HOTEL booking request (Addis Ababa)
Name: ${name}
Phone/WhatsApp: ${phone}
Check-in: ${checkin || "-"}
Check-out: ${checkout || "-"}
Notes: ${notes || "-"}`
  } else {
    message =
`New DRIVER booking request (Addis Ababa)
Name: ${name}
Phone/WhatsApp: ${phone}
Pickup: ${pickup || "-"}
Notes: ${notes || "-"}`
  }

  const waLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
  res.json({ success: true, waLink })
})

app.listen(PORT, () => {
  console.log(`AddisGo server running: http://localhost:${PORT}`)
})
