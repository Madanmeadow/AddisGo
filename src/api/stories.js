const API_URL = import.meta.env.VITE_API_URL || "";

function authHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchStories() {
  const res = await fetch(`${API_URL}/stories`, {
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error("Failed to fetch stories");
  return res.json();
}

export async function createStory(formData) {
  const res = await fetch(`${API_URL}/stories`, {
    method: "POST",
    headers: { ...authHeaders() }, // DO NOT set Content-Type — browser sets it with boundary for FormData
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Upload failed (${res.status})`);
  }
  return res.json();
}