import axios from "axios";

export const api = axios.create({
  baseURL: "http://localhost:5000/api"
});

export const login = (data) =>
  api.post("/auth/login", data);

export const healthCheck = () =>
  api.get("/health");

