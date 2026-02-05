const API_URL = import.meta.env.VITE_API_URL || "";

export async function getTrendingVideos() {
  const res = await fetch(`${API_URL}/api/videos/trending`);
  if (!res.ok) throw new Error("Trending fetch failed");
  return res.json();
}

export async function getExploreVideos(page = 1, limit = 6) {
  const res = await fetch(
    `${API_URL}/api/videos/explore?page=${page}&limit=${limit}`
  );
  if (!res.ok) throw new Error("Explore fetch failed");
  return res.json();
}
