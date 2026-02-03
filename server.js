import cors from "cors";

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://ethioaddisgo.com",
    ],
    credentials: true,
  })
);
