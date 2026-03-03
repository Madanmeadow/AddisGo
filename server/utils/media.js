// src/utils/media.js
export function getMedia(url, apiUrl) {
  if (!url) return "";
  const u = String(url);

  // New Cloudinary/https links
  if (u.startsWith("http")) return u;

  // Backward compatibility for old /uploads links
  // apiUrl example: https://your-railway-server.up.railway.app
  return `${apiUrl}${u}`;
}