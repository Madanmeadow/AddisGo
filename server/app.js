const protectedRoutes = require("./routes/protected.routes");

app.use("/api", protectedRoutes);
