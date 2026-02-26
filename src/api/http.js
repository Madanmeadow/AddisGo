import { toast } from "../lib/toast";
import { BUILD_ID } from "../config/build";

const apiUrl = import.meta.env.VITE_API_URL;

function getToken() {
  return localStorage.getItem("token");
}

function logoutHard() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "/login";
}

export async function apiFetch(path, options = {}) {
  const url = `${apiUrl}${path}${path.includes("?") ? "&" : "?"}v=${encodeURIComponent(BUILD_ID)}`;

  const headers = new Headers(options.headers || {});
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  // If sending JSON body and not FormData:
  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let res;
  try {
    res = await fetch(url, { ...options, headers });
  } catch (e) {
    toast.error("Network error. Check internet / backend.");
    throw e;
  }

  let data = null;
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    try { data = await res.json(); } catch {}
  } else {
    try { data = await res.text(); } catch {}
  }

  if (res.status === 401) {
    toast.error("Session expired. Please login again.");
    logoutHard();
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const msg = (data && (data.error || data.message)) ? (data.error || data.message) : `Request failed (${res.status})`;
    toast.error(msg);
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}