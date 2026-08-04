import { reactive } from "vue"

const feed = reactive({
  posts: [],
  loading: false,
  error: "",
  likesByPost: {},
  likeBusyByPost: {},
  savedPostIds: [],
  pinnedPostIds: [],
})

const SAVED_KEY = "pulse_dashboard_saved_posts_v1"
const PINNED_KEY = "pulse_dashboard_pinned_posts_v1"

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback))
  } catch {
    return fallback
  }
}

feed.savedPostIds = readJson(SAVED_KEY, [])
feed.pinnedPostIds = readJson(PINNED_KEY, [])

function persistSaved() {
  try { localStorage.setItem(SAVED_KEY, JSON.stringify(feed.savedPostIds)) } catch {}
}

function persistPinned() {
  try { localStorage.setItem(PINNED_KEY, JSON.stringify(feed.pinnedPostIds)) } catch {}
}

export function useFeed() {
  /* ---------- posts ---------- */
  async function fetchPosts(apiUrl, token) {
    feed.loading = true
    feed.error = ""
    try {
      const res = await fetch(`${apiUrl}/posts`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const data = await res.json()
      if (!res.ok) {
        feed.error = data?.error || "Failed to load posts"
        feed.posts = []
        return
      }
      feed.posts = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : []
    } catch {
      feed.error = "Failed to load posts"
      feed.posts = []
    } finally {
      feed.loading = false
    }
  }

  /* ---------- ensure posts (for Profile.vue) ---------- */
  async function ensurePosts(apiUrl, token) {
    if (feed.posts.length > 0) return
    await fetchPosts(apiUrl, token)
  }

  /* ---------- get user posts ---------- */
  function getUserPosts(userId) {
    if (!userId) return []
    const id = String(userId)
    return feed.posts.filter(p => {
      const postUserId = String(
        p.user_id ?? p.userId ?? p.author_id ?? p.authorId ?? p.created_by ?? p.user?.id ?? p.author?.id ?? ""
      )
      return postUserId === id && !p.video_url
    })
  }

  /* ---------- get user reels ---------- */
  function getUserReels(userId) {
    if (!userId) return []
    const id = String(userId)
    return feed.posts.filter(p => {
      const postUserId = String(
        p.user_id ?? p.userId ?? p.author_id ?? p.authorId ?? p.created_by ?? p.user?.id ?? p.author?.id ?? ""
      )
      return postUserId === id && !!p.video_url
    })
  }

  /* ---------- likes ---------- */
  async function ensureLikeState(postId, apiUrl, token) {
    if (!token) return
    const id = Number(postId)
    if (!id) return
    try {
      const res = await fetch(`${apiUrl}/posts/${id}/likes`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) return
      const items = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : []
      const meId = String(JSON.parse(localStorage.getItem("user") || "{}").id)
      const likedByMe = items.some((l) => String(l.user_id || l.userId) === meId)
      feed.likesByPost = { ...feed.likesByPost, [id]: { count: items.length, likedByMe } }
    } catch {}
  }

  async function toggleLike(postId, apiUrl, token) {
    if (!token) throw new Error("Login required")
    const id = Number(postId)
    if (!id) throw new Error("Invalid post")
    feed.likeBusyByPost = { ...feed.likeBusyByPost, [id]: true }
    const current = feed.likesByPost[id] || { count: 0, likedByMe: false }
    try {
      const method = current.likedByMe ? "DELETE" : "POST"
      const res = await fetch(`${apiUrl}/posts/${id}/like`, {
        method,
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error("Like failed")
      const delta = current.likedByMe ? -1 : 1
      feed.likesByPost = {
        ...feed.likesByPost,
        [id]: { count: Math.max(0, (current.count || 0) + delta), likedByMe: !current.likedByMe },
      }
    } catch (err) { throw err } finally {
      feed.likeBusyByPost = { ...feed.likeBusyByPost, [id]: false }
    }
  }

  /* ---------- saved ---------- */
  function isSaved(postId) { return feed.savedPostIds.includes(Number(postId)) }
  function toggleSave(postId) {
    const id = Number(postId)
    if (!id) return
    const idx = feed.savedPostIds.indexOf(id)
    idx >= 0 ? feed.savedPostIds.splice(idx, 1) : feed.savedPostIds.push(id)
    persistSaved()
  }

  /* ---------- pinned ---------- */
  function isPinned(postId) { return feed.pinnedPostIds.includes(Number(postId)) }
  function togglePin(postId) {
    const id = Number(postId)
    if (!id) return
    const idx = feed.pinnedPostIds.indexOf(id)
    idx >= 0 ? feed.pinnedPostIds.splice(idx, 1) : feed.pinnedPostIds.push(id)
    persistPinned()
  }

  return {
    feed,
    fetchPosts,
    ensurePosts,
    getUserPosts,
    getUserReels,
    ensureLikeState,
    toggleLike,
    isSaved,
    isPinned,
    toggleSave,
    togglePin,
  }
}