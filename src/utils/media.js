// src/utils/media.js

/* ===============================
   FILE TYPE HELPERS
================================= */

export function isImage(url = "") {
  return /\.(jpg|jpeg|png|gif|webp|avif)$/i.test(url);
}

export function isVideo(url = "") {
  return /\.(mp4|webm|ogg|mov)$/i.test(url);
}

export function isAudio(url = "") {
  return /\.(mp3|wav|ogg)$/i.test(url);
}

/* ===============================
   SAFE MEDIA URL
   (prevents undefined crashes)
================================= */

export function safeMedia(url) {
  if (!url) return "";
  return url.startsWith("http") ? url : `${import.meta.env.VITE_API_URL || ""}${url}`;
}

/* ===============================
   FORMAT FILE SIZE
================================= */

export function formatFileSize(bytes) {
  if (!bytes || isNaN(bytes)) return "0 KB";

  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}

/* ===============================
   FORMAT DATE (modern)
================================= */

export function formatDate(dateString) {
  if (!dateString) return "";

  const date = new Date(dateString);

  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ===============================
   TIME AGO (for posts/reels/live)
================================= */

export function timeAgo(dateString) {
  if (!dateString) return "";

  const now = new Date();
  const past = new Date(dateString);
  const seconds = Math.floor((now - past) / 1000);

  const intervals = [
    { label: "y", seconds: 31536000 },
    { label: "mo", seconds: 2592000 },
    { label: "d", seconds: 86400 },
    { label: "h", seconds: 3600 },
    { label: "m", seconds: 60 },
  ];

  for (const interval of intervals) {
    const count = Math.floor(seconds / interval.seconds);
    if (count > 0) return `${count}${interval.label}`;
  }

  return "now";
}