// src/services/videoService.js
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export async function uploadVideo(formData) {
  const res = await axios.post(`${API_URL}/videos/upload`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return res.data;
}

export async function getTrendingVideos() {
  const res = await axios.get(`${API_URL}/videos/trending`);
  return res.data;
}

export async function getExploreVideos(page = 1) {
  const res = await axios.get(`${API_URL}/videos/explore?page=${page}`);
  return res.data;
}
