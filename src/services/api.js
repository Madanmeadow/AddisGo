import axios from "axios";

const api = axios.create({
  baseURL: "https://addisgo-api.onrender.com",

});

export default api;
