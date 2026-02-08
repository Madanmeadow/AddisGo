import axios from "axios";

const api = axios.create({
  baseURL: "https://addisgo-1.onrender.com/api", // 🔥 NODE BACKEND ONLY
  headers: {
    "Content-Type": "application/json"
  }
});

export default api;

