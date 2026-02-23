<template>
  <Layout>
    <div class="page">
      <!-- LEFT -->
      <aside class="left">
        <div class="brand">
          <div class="brand-icon">🔥</div>
          <div class="brand-text">
            <div class="brand-title">AddisGo</div>
            <div class="brand-sub">Social • Live • Chat</div>
          </div>
        </div>

        <div class="panel">
          <div class="panel-title">🔴 Live Now</div>
          <button class="btn btn-primary w100" @click="startLive">Go Live</button>

          <div v-if="liveStreams.length === 0" class="hint mt12">
            No one live right now
          </div>

          <div
            v-for="stream in liveStreams"
            :key="stream"
            class="live-card"
            @click="joinLive(stream)"
          >
            <span class="dot"></span>
            <span class="live-name">{{ stream }}</span>
          </div>
        </div>

        <div class="panel">
          <div class="panel-title">⚡ Quick Actions</div>
          <button class="btn w100" @click="fetchPosts">Refresh Feed</button>
          <button class="btn w100 mt10" @click="scrollToTop">Scroll Top</button>
        </div>
      </aside>

      <!-- CENTER -->
      <main class="center">
        <!-- Create Post -->
        <section class="composer">
          <div class="composer-head">
            <div class="avatar big">{{ myInitial }}</div>
            <div class="composer-meta">
              <div class="me">{{ me?.username || "You" }}</div>
              <div class="small muted">Share something with the world</div>
            </div>
          </div>

          <textarea
            v-model="caption"
            class="input"
            placeholder="What's happening?"
            rows="3"
          ></textarea>

          <!-- Upload row -->
          <div class="upload-row">
            <label class="file-pill">
              <input type="file" accept="image/*" @change="onPickImage" />
              📷 Image
            </label>

            <label class="file-pill">
              <input type="file" accept="video/*" @change="onPickVideo" />
              🎥 Video
            </label>

            <button class="btn btn-primary" :disabled="posting" @click="submitPost">
              {{ posting ? "Posting..." : "Post 🚀" }}
            </button>
          </div>

          <!-- Previews -->
          <div v-if="imagePreview || videoPreview" class="previews">
            <div v-if="imagePreview" class="preview-card">
              <div class="preview-top">
                <span>Image preview</span>
                <button class="x" @click="clearImage">✕</button>
              </div>
              <img :src="imagePreview" class="preview-media" />
            </div>

            <div v-if="videoPreview" class="preview-card">
              <div class="preview-top">
                <span>Video preview</span>
                <button class="x" @click="clearVideo">✕</button>
              </div>
              <video :src="videoPreview" controls class="preview-media"></video>
            </div>
          </div>

          <div v-if="error" class="alert">{{ error }}</div>
        </section>

        <!-- Feed Controls -->
        <section class="feed-head">
          <div class="feed-title">Feed</div>
          <div class="feed-actions">
            <input
              v-model="search"
              class="search"
              placeholder="Search posts..."
            />
            <select v-model="filter" class="select">
              <option value="all">All</option>
              <option value="text">Text</option>
              <option value="image">Image</option>
              <option value="video">Video</option>
            </select>
          </div>
        </section>

        <!-- Feed -->
        <section class="feed">
          <div v-if="loading" class="state">Loading posts...</div>

          <div v-else-if="filteredPosts.length === 0" class="state">
            No posts found.
          </div>

          <article
            v-else
            v-for="post in filteredPosts"
            :key="post.id"
            class="post"
          >
            <header class="post-head">
              <div class="avatar">{{ getInitial(post.username) }}</div>
              <div class="who">
                <div class="name">{{ post.username || "Unknown" }}</div>
                <div class="time">{{ formatDate(post.created_at) }}</div>
              </div>
            </header>

            <div v-if="post.caption" class="text">
              {{ post.caption }}
            </div>

            <img
              v-if="post.image_url"
              class="media"
              :src="getMedia(post.image_url)"
              alt="post image"
              loading="lazy"
            />

            <video
              v-if="post.video_url"
              class="media"
              :src="getMedia(post.video_url)"
              controls
              preload="metadata"
            ></video>

            <footer class="post-foot">
              <button class="pill" @click="copyLink(post)">🔗 Copy Link</button>
              <button class="pill" @click="shareText(post)">📤 Share</button>
            </footer>
          </article>
        </section>
      </main>

      <!-- RIGHT -->
      <aside class="right">
        <div class="panel">
          <div class="panel-title">🟢 System</div>
          <div class="kv">
            <div class="k">API</div>
            <div class="v">{{ apiUrl }}</div>
          </div>
          <div class="kv">
            <div class="k">Posts</div>
            <div class="v">{{ posts.length }}</div>
          </div>
          <div class="kv">
            <div class="k">Status</div>
            <div class="v">
              <span :class="['badge', socketConnected ? 'ok' : 'bad']">
                {{ socketConnected ? "Socket Connected" : "Socket Offline" }}
              </span>
            </div>
          </div>
        </div>

        <div class="panel">
          <div class="panel-title">✨ Tips</div>
          <div class="hint">
            • Use Image/Video buttons to upload media<br />
            • Posts are ordered newest first<br />
            • If you see nothing after refresh, it’s always field mismatch
          </div>
        </div>
      </aside>
    </div>
  </Layout>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from "vue"
import Layout from "../components/Layout.vue"
import { io } from "socket.io-client"

const apiUrl = import.meta.env.VITE_API_URL
const token = localStorage.getItem("token")
const me = (() => {
  try { return JSON.parse(localStorage.getItem("user") || "null") } catch { return null }
})()

/* ================= STATE ================= */
const posts = ref([])
const loading = ref(true)
const posting = ref(false)
const error = ref("")

const caption = ref("")
const imageFile = ref(null)
const videoFile = ref(null)
const imagePreview = ref("")
const videoPreview = ref("")

const search = ref("")
const filter = ref("all")

/* ================= SOCKET ================= */
let socket = null
const socketConnected = ref(false)
const liveStreams = ref([])

/* ================= HELPERS ================= */
const myInitial = computed(() => (me?.username ? me.username[0].toUpperCase() : "A"))

function getInitial(username) {
  return (username?.charAt(0) || "?").toUpperCase()
}

function formatDate(d) {
  if (!d) return ""
  const date = new Date(d)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleString()
}

function getMedia(url) {
  if (!url) return ""
  if (url.startsWith("http")) return url
  return `${apiUrl}${url}`
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" })
}

/* ================= FETCH POSTS ================= */
async function fetchPosts() {
  try {
    loading.value = true
    error.value = ""

    const res = await fetch(`${apiUrl}/posts`)
    const data = await res.json()

    // Safety: if backend returns {error:"..."} don't break UI
    if (!Array.isArray(data)) {
      console.log("GET /posts returned:", data)
      posts.value = []
      error.value = data?.error || "Failed to load posts"
      return
    }

    // Your SQL already orders DESC, so keep as-is
    posts.value = data
  } catch (err) {
    console.error("Fetch posts error:", err)
    posts.value = []
    error.value = "Failed to fetch posts"
  } finally {
    loading.value = false
  }
}

/* ================= CREATE POST ================= */
async function submitPost() {
  // don’t allow empty
  if (!caption.value.trim() && !imageFile.value && !videoFile.value) return

  try {
    posting.value = true
    error.value = ""

    const form = new FormData()
    form.append("caption", caption.value || "")
    if (imageFile.value) form.append("image", imageFile.value)
    if (videoFile.value) form.append("video", videoFile.value)

    const res = await fetch(`${apiUrl}/posts`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form
    })

    const newPost = await res.json()
    if (!res.ok) {
      error.value = newPost?.error || "Post failed"
      return
    }

    // instant insert
    posts.value.unshift(newPost)

    // reset
    caption.value = ""
    clearImage()
    clearVideo()
    scrollToTop()
  } catch (err) {
    console.error("Submit post error:", err)
    error.value = "Post failed"
  } finally {
    posting.value = false
  }
}

/* ================= FILE PICKERS ================= */
function onPickImage(e) {
  const f = e.target.files?.[0]
  if (!f) return
  imageFile.value = f
  imagePreview.value = URL.createObjectURL(f)
}

function onPickVideo(e) {
  const f = e.target.files?.[0]
  if (!f) return
  videoFile.value = f
  videoPreview.value = URL.createObjectURL(f)
}

function clearImage() {
  if (imagePreview.value) URL.revokeObjectURL(imagePreview.value)
  imagePreview.value = ""
  imageFile.value = null
}

function clearVideo() {
  if (videoPreview.value) URL.revokeObjectURL(videoPreview.value)
  videoPreview.value = ""
  videoFile.value = null
}

/* ================= SHARE ================= */
async function copyLink(post) {
  // You can later replace with real post permalink route
  const link = `${window.location.origin}/dashboard#post-${post.id}`
  try {
    await navigator.clipboard.writeText(link)
    alert("Copied link!")
  } catch {
    alert("Copy failed")
  }
}

function shareText(post) {
  const text = `${post.username || "Someone"}: ${post.caption || ""}`
  if (navigator.share) {
    navigator.share({ title: "AddisGo", text })
  } else {
    alert(text)
  }
}

/* ================= FILTERED POSTS ================= */
const filteredPosts = computed(() => {
  const q = search.value.trim().toLowerCase()

  return posts.value.filter((p) => {
    // filter by type
    if (filter.value === "text" && (p.image_url || p.video_url)) return false
    if (filter.value === "image" && !p.image_url) return false
    if (filter.value === "video" && !p.video_url) return false

    // search
    if (!q) return true
    const hay = `${p.username || ""} ${p.caption || ""}`.toLowerCase()
    return hay.includes(q)
  })
})

/* ================= LIVE (HOOKS PLACEHOLDER) ================= */
function startLive() {
  // Your live feature uses sockets already — keep this simple
  socket?.emit("start-live", { userId: me?.id })
}

function joinLive(stream) {
  socket?.emit("join-live", stream)
  alert("Joined " + stream)
}

/* ================= INIT ================= */
onMounted(async () => {
  await fetchPosts()

  // socket
  socket = io(apiUrl, { transports: ["websocket", "polling"] })

  socket.on("connect", () => {
    socketConnected.value = true
    if (me?.id) socket.emit("register-user", me.id)
  })

  socket.on("disconnect", () => {
    socketConnected.value = false
  })

  socket.on("live-list", (streams) => {
    liveStreams.value = Array.isArray(streams) ? streams : []
  })

  // If your server later emits "newPost", this will instantly update feed
  socket.on("newPost", (post) => {
    if (post?.id) posts.value.unshift(post)
  })
})

onBeforeUnmount(() => {
  try { socket?.disconnect() } catch {}
  clearImage()
  clearVideo()
})
</script>

<style scoped>
/* Layout */
.page {
  display: grid;
  grid-template-columns: 280px 1fr 320px;
  gap: 22px;
  max-width: 1400px;
  margin: 0 auto;
  padding: 26px;
}

/* Responsive */
@media (max-width: 1200px) {
  .page { grid-template-columns: 260px 1fr; }
  .right { display: none; }
}
@media (max-width: 860px) {
  .page { grid-template-columns: 1fr; }
  .left { order: 2; }
}

/* Panels */
.left, .right { position: sticky; top: 16px; height: fit-content; }
.panel {
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 18px;
  padding: 16px;
  margin-bottom: 18px;
  backdrop-filter: blur(10px);
}
.panel-title {
  font-weight: 800;
  margin-bottom: 12px;
  color: rgba(255,255,255,0.95);
}

/* Brand */
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 18px;
}
.brand-icon { font-size: 26px; }
.brand-title { font-size: 22px; font-weight: 900; letter-spacing: 0.3px; }
.brand-sub { font-size: 12px; opacity: 0.75; }

/* Composer */
.center { min-width: 0; }
.composer {
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 22px;
  padding: 18px;
  margin-bottom: 16px;
  backdrop-filter: blur(10px);
}
.composer-head {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 12px;
}
.me { font-weight: 900; }
.small { font-size: 12px; }
.muted { opacity: 0.7; }

/* Inputs */
.input {
  width: 100%;
  border: none;
  outline: none;
  background: rgba(0,0,0,0.35);
  color: white;
  border-radius: 16px;
  padding: 12px 14px;
  font-size: 14px;
  resize: none;
}
.upload-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 12px;
  flex-wrap: wrap;
}
.file-pill {
  background: rgba(255,255,255,0.10);
  border: 1px solid rgba(255,255,255,0.14);
  border-radius: 999px;
  padding: 10px 12px;
  cursor: pointer;
  user-select: none;
}
.file-pill input { display: none; }

/* Buttons */
.btn {
  border: none;
  cursor: pointer;
  border-radius: 999px;
  padding: 10px 14px;
  background: rgba(255,255,255,0.12);
  color: white;
  transition: 0.18s;
}
.btn:hover { transform: translateY(-1px); }
.btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
.btn-primary {
  background: linear-gradient(45deg, #ff416c, #ff4b2b);
}
.w100 { width: 100%; }
.mt10 { margin-top: 10px; }
.mt12 { margin-top: 12px; }

/* Previews */
.previews {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 12px;
}
@media (max-width: 860px) {
  .previews { grid-template-columns: 1fr; }
}
.preview-card {
  background: rgba(0,0,0,0.35);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 16px;
  padding: 10px;
}
.preview-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  opacity: 0.85;
  margin-bottom: 8px;
}
.preview-media {
  width: 100%;
  max-height: 320px;
  object-fit: cover;
  border-radius: 12px;
  background: #000;
}
.x {
  border: none;
  background: rgba(255,255,255,0.12);
  color: white;
  border-radius: 8px;
  padding: 6px 10px;
  cursor: pointer;
}

/* Feed header */
.feed-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin: 10px 0 14px;
}
.feed-title {
  font-size: 18px;
  font-weight: 900;
}
.feed-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}
.search {
  background: rgba(0,0,0,0.35);
  border: 1px solid rgba(255,255,255,0.12);
  color: white;
  padding: 10px 12px;
  border-radius: 999px;
  outline: none;
}
.select {
  background: rgba(0,0,0,0.35);
  border: 1px solid rgba(255,255,255,0.12);
  color: white;
  padding: 10px 12px;
  border-radius: 999px;
  outline: none;
}

/* Post cards */
.feed { display: grid; gap: 14px; }
.post {
  background: rgba(0,0,0,0.50);
  border: 1px solid rgba(255,255,255,0.10);
  border-radius: 22px;
  padding: 16px;
}
.post-head {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 10px;
}
.who .name { font-weight: 900; }
.who .time { font-size: 12px; opacity: 0.75; }
.text { margin: 8px 0 10px; line-height: 1.5; }
.media {
  width: 100%;
  border-radius: 18px;
  margin-top: 10px;
  background: #000;
  max-height: 700px;
  object-fit: cover;
}

/* Post footer */
.post-foot {
  display: flex;
  gap: 10px;
  margin-top: 12px;
  flex-wrap: wrap;
}
.pill {
  border: 1px solid rgba(255,255,255,0.16);
  background: rgba(255,255,255,0.10);
  color: white;
  padding: 8px 12px;
  border-radius: 999px;
  cursor: pointer;
}

/* Avatar */
.avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: linear-gradient(45deg, #ff416c, #ff4b2b);
  display: grid;
  place-items: center;
  font-weight: 900;
}
.avatar.big { width: 52px; height: 52px; }

/* Live cards */
.live-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 14px;
  background: rgba(255,0,0,0.12);
  border: 1px solid rgba(255,0,0,0.18);
  cursor: pointer;
  margin-top: 10px;
}
.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: red;
}
.live-name { font-weight: 700; }

/* State */
.state {
  text-align: center;
  padding: 30px 10px;
  opacity: 0.85;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.10);
  border-radius: 18px;
}
.hint { opacity: 0.75; font-size: 13px; line-height: 1.5; }
.alert {
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 14px;
  background: rgba(255, 80, 80, 0.18);
  border: 1px solid rgba(255, 80, 80, 0.35);
  color: rgba(255,255,255,0.95);
}

/* Right side KV */
.kv {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}
.kv:last-child { border-bottom: none; }
.k { opacity: 0.7; }
.v { text-align: right; word-break: break-all; }

/* Badges */
.badge {
  padding: 6px 10px;
  border-radius: 999px;
  font-weight: 700;
  font-size: 12px;
  border: 1px solid rgba(255,255,255,0.12);
}
.badge.ok { background: rgba(0,255,120,0.12); }
.badge.bad { background: rgba(255,80,80,0.14); }
</style>