// src/utils/media.js
export function getMedia(url, apiUrl = import.meta.env.VITE_API_URL) {
  if (!url) return "";
  const u = String(url);

  // ✅ New world (Cloudinary): already https
  if (u.startsWith("http")) return u;

  // ✅ Old world (/uploads/...): try to load from API (only works if file still exists)
  return `${apiUrl}${u.startsWith("/") ? "" : "/"}${u}`;
}