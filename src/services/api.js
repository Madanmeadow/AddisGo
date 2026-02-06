const API_BASE = import.meta.env.VITE_API_BASE_URL;

export async function healthCheck() {
  const res = await fetch(`${API_BASE}/api/health`);
  if (!res.ok) throw new Error('Backend not reachable');
  return res.json();
}
