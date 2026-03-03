// src/utils/media.js

export function safeMedia(url = "") {
  if (!url || typeof url !== "string") return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;

  const base = import.meta.env.VITE_API_URL || "";
  if (!base) return url;

  const join =
    base.endsWith("/") || url.startsWith("/") ? "" : "/";

  return `${base}${join}${url}`;
}

export function getMedia(obj) {
  if (!obj) return "";
  const url =
    obj.image_url ||
    obj.video_url ||
    obj.media_url ||
    obj.avatar_url ||
    obj.profile_image ||
    obj.photo_url ||
    obj.cover_url ||
    "";
  return safeMedia(url);
}