const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function getToken() {
  return localStorage.getItem("token") || "";
}

export async function fetchStories() {
  const res = await fetch(`${API_URL}/stories`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error("Failed to fetch stories");
  return res.json();
}

export async function createStory(formData) {
  const res = await fetch(`${API_URL}/stories`, {
    method: "POST",
    headers: { Authorization: `Bearer ${getToken()}` },
    body: formData,
  });
  if (!res.ok) throw new Error("Failed to upload story");
  return res.json();
}