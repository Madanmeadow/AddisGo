import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";

const PORT = process.env.PORT;

if (!PORT) {
  console.error("❌ PORT is not defined");
  process.exit(1);
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
