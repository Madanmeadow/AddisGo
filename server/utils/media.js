const API = import.meta.env.VITE_API_URL

export const mediaUrl = (u) => {
  if (!u) return ""
  if (u.startsWith("http")) return u
  const clean = u.startsWith("/") ? u : `/${u}`
  return `${API}${clean}`
}