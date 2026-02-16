// src/services/videoService.js

import axios from "axios";
import API_URL from "../config";

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

export const uploadVideo = async (formData) => {
  return await api.post("/api/posts/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

export const getVideos = async () => {
  return await api.get("/api/posts");
};

