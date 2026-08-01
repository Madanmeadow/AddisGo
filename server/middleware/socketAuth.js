// server/middleware/socketAuth.js
import jwt from "jsonwebtoken";

export default function socketAuth(io) {
  io.use((socket, next) => {
    try {
      // Match however your frontend sends the token
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.query?.token ||
        socket.handshake.headers?.authorization?.replace("Bearer ", "");

      if (!token) {
        return next(new Error("Authentication required"));
      }

      // Use the same secret your HTTP auth uses
      const secret = process.env.JWT_SECRET || "your-jwt-secret";
      const decoded = jwt.verify(token, secret);

      // This is what socketLocation.js reads
      socket.data.user = {
        id: decoded.id || decoded.userId,
        username: decoded.username || decoded.email || "User",
      };

      next();
    } catch (err) {
      console.error("Socket auth failed:", err.message);
      next(new Error("Invalid token"));
    }
  });
}