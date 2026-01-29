import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000",
  withCredentials: false, // change later if you add cookies/auth
});

export default api;
