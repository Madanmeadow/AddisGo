export async function apiFetch(url, options = {}) {
  const res = await fetch(url, options);

  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");

  const data = isJson ? await res.json().catch(() => null) : await res.text();

  if (!res.ok) {
    // If backend returns HTML, show a clean message instead of dumping HTML
    const message =
      typeof data === "string"
        ? `Server error (${res.status}). Check Railway logs.`
        : (data?.error || data?.message || `Request failed (${res.status})`);

    const err = new Error(message);
    err.status = res.status;
    err.raw = data;
    throw err;
  }

  return data;
}