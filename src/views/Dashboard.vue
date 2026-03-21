<!-- src/views/Dashboard.vue -->
<template>
  <Layout>
    <div class="dashPage">
      <div class="bg-orb orb1"></div>
      <div class="bg-orb orb2"></div>
      <div class="bg-grid"></div>

      <!-- TOP BAR -->
      <header class="topBar glass">
        <div class="brandWrap" @click="goHome">
          <div class="brandIcon">⚡</div>
          <div class="brandText">
            <div class="brandTitle">Pulse</div>
            <div class="brandSub">Elite social cockpit</div>
          </div>
        </div>

        <div class="topBarActions">
          <button class="chip online" :class="{ offline: !socketConnected }">
            <span class="dot"></span>
            {{ socketConnected ? "Online" : "Offline" }}
          </button>

          <button class="chip iconOnly" @click="openComposer">✍️</button>
          <button class="chip iconOnly" @click="goPeople">👥</button>
          <button class="chip iconOnly" @click="goLive">🔴</button>
        </div>
      </header>

      <!-- COMPACT HERO -->
      <section class="heroCard glass">
        <div class="heroTop">
          <div>
            <div class="heroEyebrow">WELCOME BACK</div>
            <h1 class="heroTitle">{{ displayName }}</h1>
            <p class="heroSub">
              {{ greeting }}, build, post, call, and stream from one clean mobile dashboard.
            </p>
          </div>

          <button class="heroMainBtn" @click="openComposer">Create Post</button>
        </div>

        <div class="heroStats">
          <button class="miniStat glassLite" @click="setFilter('all')">
            <strong>{{ stats.posts }}</strong>
            <span>Posts</span>
          </button>

          <button class="miniStat glassLite" @click="setFilter('videos')">
            <strong>{{ stats.videos }}</strong>
            <span>Videos</span>
          </button>

          <button class="miniStat glassLite" @click="goPeople">
            <strong>{{ serverStats.onlineUsers }}</strong>
            <span>Online</span>
          </button>

          <button class="miniStat glassLite" @click="goLive">
            <strong>{{ serverStats.liveStreams }}</strong>
            <span>Live</span>
          </button>
        </div>
      </section>

      <!-- COMPOSER -->
      <section class="composerCard glass" :class="{ open: composerOpen }">
        <div class="composerHead">
          <div class="authorBlock" @click="goProfile(me.id)">
            <div class="authorAvatar">
              <img v-if="avatarUrl" :src="avatarUrl" class="authorAvatarImg" alt="avatar" />
              <span v-else>{{ displayName.charAt(0).toUpperCase() }}</span>
            </div>

            <div>
              <div class="authorName">{{ displayName }}</div>
              <div class="authorSub">Post to the world</div>
            </div>
          </div>

          <button class="pillBtn" @click="toggleComposer">
            {{ composerOpen ? "Hide" : "Open" }}
          </button>
        </div>

        <div v-if="composerOpen">
          <textarea
            v-model="composerText"
            class="composerInput"
            placeholder="What’s happening?"
            maxlength="500"
          ></textarea>

          <div class="composerMeta">
            <span>{{ composerText.length }} chars</span>

            <div class="composerTags">
              <button class="tagLite" @click="appendTag('#Pulse')">#Pulse</button>
              <button class="tagLite" @click="appendTag('#Reels')">#Reels</button>
              <button class="tagLite" @click="appendTag('#Live')">#Live</button>
            </div>
          </div>

          <div class="composerActions">
            <label class="mediaBtn">
              🖼️ Image
              <input type="file" accept="image/*" hidden @change="pickImage" />
            </label>

            <label class="mediaBtn">
              🎥 Video
              <input type="file" accept="video/*" hidden @change="pickVideo" />
            </label>

            <button class="mediaBtn primaryBtn" @click="submitPost" :disabled="posting || !canSubmitPost">
              {{ posting ? "Posting..." : "Post 🚀" }}
            </button>

            <button class="mediaBtn" @click="clearComposer">Clear</button>
          </div>

          <div v-if="selectedMediaName" class="pickedMedia">
            Selected: {{ selectedMediaName }}
          </div>
        </div>
      </section>

      <!-- FEED FILTERS -->
      <section class="feedTools glass">
        <div class="tabRow">
          <button class="tabChip" :class="{ active: tab === 'forYou' }" @click="setTab('forYou')">For You</button>
          <button class="tabChip" :class="{ active: tab === 'reels' }" @click="setTab('reels')">Reels</button>
          <button class="tabChip" :class="{ active: tab === 'following' }" @click="setTab('following')">Following</button>
          <button class="tabChip" :class="{ active: tab === 'saved' }" @click="setTab('saved')">Saved</button>
          <button class="tabChip" :class="{ active: tab === 'pinned' }" @click="setTab('pinned')">Pinned</button>
        </div>

        <div class="filterRow">
          <button class="filterChip" :class="{ active: filterType === 'all' }" @click="setFilter('all')">All</button>
          <button class="filterChip" :class="{ active: filterType === 'videos' }" @click="setFilter('videos')">Videos</button>
          <button class="filterChip" :class="{ active: filterType === 'images' }" @click="setFilter('images')">Images</button>
          <button class="filterChip" :class="{ active: filterType === 'text' }" @click="setFilter('text')">Text</button>
          <span class="resultChip">{{ filteredPosts.length }} shown</span>
        </div>
      </section>

      <!-- FEED -->
      <section class="feedList">
        <article
          v-for="post in filteredPosts"
          :key="post.id"
          class="feedCard glass"
        >
          <div class="feedHead">
            <div class="feedAuthor" @click="goProfile(resolvePostUserId(post))">
              <div class="feedAvatar">
                <img
                  v-if="post.author_avatar || post.avatar_url"
                  :src="mediaUrl(post.author_avatar || post.avatar_url)"
                  class="feedAvatarImg"
                  alt="avatar"
                />
                <span v-else>{{ getAuthorInitial(post) }}</span>
              </div>

              <div class="feedAuthorMeta">
                <div class="feedAuthorName">
                  {{ post.display_name || post.author_name || post.username || `User #${resolvePostUserId(post)}` }}
                </div>
                <div class="feedAuthorSub">
                  {{ formatDateTime(post.created_at || post.createdAt) }}
                </div>
              </div>
            </div>

            <span class="postTypeChip">
              {{
                post.video_url
                  ? "VIDEO"
                  : post.image_url
                    ? "IMAGE"
                    : "TEXT"
              }}
            </span>
          </div>

          <div v-if="post.caption" class="feedCaption">
            {{ post.caption }}
          </div>

          <img
            v-if="post.image_url"
            class="feedMedia"
            :src="mediaUrl(post.image_url)"
            loading="lazy"
            alt="post image"
          />

          <video
            v-else-if="post.video_url"
            class="feedMedia"
            :src="mediaUrl(post.video_url)"
            controls
            playsinline
            preload="metadata"
          ></video>

          <div class="feedActions">
            <button class="actionBtn" @click="toggleLike(post)">
              ❤️ {{ post.likes_count || 0 }}
            </button>
            <button class="actionBtn">
              💬 {{ post.comments_count || 0 }}
            </button>
            <button class="actionBtn" @click="toggleSave(post)">
              {{ savedIds.includes(post.id) ? "Saved" : "Save" }}
            </button>
            <button class="actionBtn" @click="sharePost(post)">
              Share
            </button>
          </div>
        </article>

        <div v-if="!filteredPosts.length && !loading" class="emptyFeed glass">
          <div class="emptyIcon">✨</div>
          <div class="emptyTitle">Nothing here yet</div>
          <div class="emptySub">Try another filter, post something new, or refresh the feed.</div>
        </div>
      </section>

      <!-- FAB MENU OVERLAY -->
      <transition name="fade">
        <div v-if="fabOpen" class="fabOverlay" @click="fabOpen = false"></div>
      </transition>

      <!-- FAB SHEET -->
      <transition name="sheetUp">
        <div v-if="fabOpen" class="fabSheet glass">
          <div class="sheetHead">
            <div>
              <h3>Quick Actions</h3>
              <p>Heavy dashboard actions are hidden here for mobile.</p>
            </div>
            <button class="closeBtn" @click="fabOpen = false">✕</button>
          </div>

          <div class="sheetGrid">
            <button class="sheetBtn primaryBtn" @click="fabAction(openComposer)">
              ✍️ <span>Create Post</span>
            </button>
            <button class="sheetBtn" @click="fabAction(goPeople)">
              👥 <span>People</span>
            </button>
            <button class="sheetBtn" @click="fabAction(goCalls)">
              📞 <span>1-to-1 Call</span>
            </button>
            <button class="sheetBtn" @click="fabAction(openRooms)">
              🎧 <span>Room</span>
            </button>
            <button class="sheetBtn" @click="fabAction(goLive)">
              🔴 <span>Go Live</span>
            </button>
            <button class="sheetBtn" @click="fabAction(() => setTab('reels'))">
              🎞 <span>Reels</span>
            </button>
            <button class="sheetBtn" @click="fabAction(() => setTab('saved'))">
              💾 <span>Saved</span>
            </button>
            <button class="sheetBtn" @click="fabAction(refreshAll)">
              🔄 <span>Refresh</span>
            </button>
          </div>
        </div>
      </transition>

      <!-- BOTTOM NAV -->
      <nav class="bottomNav glass">
        <button class="navBtn active" @click="goHome">
          <span>🏠</span>
          <small>Home</small>
        </button>

        <button class="navBtn" @click="goCalls">
          <span>💬</span>
          <small>Inbox</small>
        </button>

        <button class="navFab" @click="toggleFab">+</button>

        <button class="navBtn" @click="goLive">
          <span>🔴</span>
          <small>Live</small>
        </button>

        <button class="navBtn" @click="goPeople">
          <span>👥</span>
          <small>People</small>
        </button>

        <button class="navBtn" @click="goProfile(me.id)">
          <span>👤</span>
          <small>Profile</small>
        </button>
      </nav>
    </div>
  </Layout>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount, reactive, ref } from "vue"
import { useRouter } from "vue-router"
import { io } from "socket.io-client"
import Layout from "../components/Layout.vue"

const router = useRouter()
const apiBase = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "")
const token = localStorage.getItem("token") || ""

const me = (() => {
  try {
    return JSON.parse(localStorage.getItem("user") || "null") || {}
  } catch {
    return {}
  }
})()

const avatarUrl = computed(() => me?.avatar_url || me?.avatarUrl || "")
const displayName = computed(() =>
  me?.display_name || me?.displayName || me?.name || me?.username || "Creator"
)

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return "Good morning"
  if (h < 18) return "Good afternoon"
  return "Good evening"
})

const socketConnected = ref(false)
const loading = ref(false)
const posting = ref(false)
const composerOpen = ref(false)
const search = ref("")
const tab = ref("following")
const filterType = ref("all")

const composerText = ref("")
const selectedFile = ref(null)
const selectedMediaName = ref("")
const fabOpen = ref(false)

const posts = ref([])
const savedIds = ref(JSON.parse(localStorage.getItem("pulse_saved_ids") || "[]"))
const pinnedIds = ref(JSON.parse(localStorage.getItem("pulse_pinned_ids") || "[]"))

const serverStats = reactive({
  onlineUsers: 0,
  liveStreams: 0,
  directCalls: 0,
  callRooms: 0,
})

const stats = computed(() => {
  const myId = String(me?.id || "")
  const myPosts = posts.value.filter((p) => String(resolvePostUserId(p)) === myId)
  return {
    posts: myPosts.length,
    videos: myPosts.filter((p) => !!p.video_url).length,
  }
})

const canSubmitPost = computed(() => {
  return !!composerText.value.trim() || !!selectedFile.value
})

const filteredPosts = computed(() => {
  let list = [...posts.value]

  if (tab.value === "saved") {
    list = list.filter((p) => savedIds.value.includes(p.id))
  } else if (tab.value === "pinned") {
    list = list.filter((p) => pinnedIds.value.includes(p.id))
  } else if (tab.value === "reels") {
    list = list.filter((p) => !!p.video_url)
  }

  if (filterType.value === "videos") {
    list = list.filter((p) => !!p.video_url)
  } else if (filterType.value === "images") {
    list = list.filter((p) => !!p.image_url)
  } else if (filterType.value === "text") {
    list = list.filter((p) => !p.image_url && !p.video_url)
  }

  if (search.value.trim()) {
    const q = search.value.trim().toLowerCase()
    list = list.filter((p) =>
      [p.caption, p.display_name, p.author_name, p.username]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    )
  }

  list.sort((a, b) => new Date(b.created_at || b.createdAt || 0) - new Date(a.created_at || a.createdAt || 0))
  return list
})

function setTab(next) {
  tab.value = next
}

function setFilter(next) {
  filterType.value = next
}

function toggleComposer() {
  composerOpen.value = !composerOpen.value
}

function openComposer() {
  composerOpen.value = true
  fabOpen.value = false
  window.scrollTo({ top: 0, behavior: "smooth" })
}

function toggleFab() {
  fabOpen.value = !fabOpen.value
}

function fabAction(fn) {
  fabOpen.value = false
  fn()
}

function goHome() {
  router.push("/dashboard")
}

function goLive() {
  router.push("/live")
}

function goCalls() {
  router.push("/messages")
}

function openRooms() {
  router.push("/roomcall")
}

function goPeople() {
  router.push("/people")
}

function goProfile(userId) {
  if (!userId) {
    router.push("/profile")
    return
  }
  if (String(userId) === String(me?.id || "")) {
    router.push("/profile")
    return
  }
  router.push(`/profile/${userId}`)
}

function resolvePostUserId(post) {
  return (
    post.user_id ??
    post.userId ??
    post.author_id ??
    post.authorId ??
    post.created_by ??
    post.user?.id ??
    post.author?.id ??
    ""
  )
}

function getAuthorInitial(post) {
  const name =
    post.display_name ||
    post.author_name ||
    post.username ||
    "U"
  return String(name).charAt(0).toUpperCase()
}

function mediaUrl(path) {
  if (!path) return ""
  if (/^https?:\/\//i.test(path) || path.startsWith("blob:") || path.startsWith("data:")) return path
  return `${apiBase}${path.startsWith("/") ? "" : "/"}${path}`
}

function formatDateTime(value) {
  if (!value) return "Recently"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString()
}

async function fetchServerStats() {
  try {
    const res = await fetch(`${apiBase}/api/server-stats`)
    if (!res.ok) return
    const data = await res.json()
    serverStats.onlineUsers = Number(data.onlineUsers || 0)
    serverStats.liveStreams = Number(data.liveStreams || 0)
    serverStats.directCalls = Number(data.directCalls || 0)
    serverStats.callRooms = Number(data.callRooms || 0)
  } catch {}
}

async function fetchPosts() {
  try {
    const res = await fetch(`${apiBase}/posts`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) throw new Error("failed")
    const data = await res.json()
    posts.value = Array.isArray(data) ? data : data.posts || []
    localStorage.setItem("posts", JSON.stringify(posts.value))
  } catch {
    const cached = JSON.parse(localStorage.getItem("posts") || "[]")
    posts.value = Array.isArray(cached) ? cached : []
  }
}

function persistCollections() {
  localStorage.setItem("pulse_saved_ids", JSON.stringify(savedIds.value))
  localStorage.setItem("pulse_pinned_ids", JSON.stringify(pinnedIds.value))
}

function toggleSave(post) {
  const id = post.id
  if (savedIds.value.includes(id)) {
    savedIds.value = savedIds.value.filter((x) => x !== id)
  } else {
    savedIds.value = [...savedIds.value, id]
  }
  persistCollections()
}

function toggleLike(post) {
  post.likes_count = Number(post.likes_count || 0) + 1
}

function sharePost(post) {
  const text = `${window.location.origin}/profile/${resolvePostUserId(post)}`
  navigator.clipboard?.writeText(text).catch(() => {})
}

function appendTag(tag) {
  if (!composerText.value.includes(tag)) {
    composerText.value = `${composerText.value} ${tag}`.trim()
  }
}

function pickImage(e) {
  const file = e.target.files?.[0]
  if (!file) return
  selectedFile.value = file
  selectedMediaName.value = file.name
}

function pickVideo(e) {
  const file = e.target.files?.[0]
  if (!file) return
  selectedFile.value = file
  selectedMediaName.value = file.name
}

function clearComposer() {
  composerText.value = ""
  selectedFile.value = null
  selectedMediaName.value = ""
}

async function submitPost() {
  if (!canSubmitPost.value) return

  posting.value = true
  try {
    let image_url = ""
    let video_url = ""

    if (selectedFile.value) {
      const formData = new FormData()
      formData.append("file", selectedFile.value)

      try {
        const uploadRes = await fetch(`${apiBase}/upload`, {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        })

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json()
          const uploaded = uploadData.url || uploadData.fileUrl || uploadData.image_url || uploadData.video_url || ""
          if (selectedFile.value.type.startsWith("video/")) video_url = uploaded
          else image_url = uploaded
        }
      } catch {}
    }

    const payload = {
      caption: composerText.value.trim(),
      image_url,
      video_url,
    }

    const res = await fetch(`${apiBase}/posts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    })

    if (res.ok) {
      await fetchPosts()
      clearComposer()
      composerOpen.value = false
      return
    }

    const localPost = {
      id: Date.now(),
      user_id: me?.id,
      display_name: displayName.value,
      username: me?.username || "",
      author_avatar: avatarUrl.value,
      caption: composerText.value.trim(),
      image_url,
      video_url,
      created_at: new Date().toISOString(),
      likes_count: 0,
      comments_count: 0,
    }
    posts.value.unshift(localPost)
    clearComposer()
    composerOpen.value = false
  } finally {
    posting.value = false
  }
}

let socket = null

function connectSocket() {
  try {
    socket = io(apiBase, {
      transports: ["websocket"],
      auth: { token },
    })

    socket.on("connect", () => {
      socketConnected.value = true
      if (me?.id) {
        socket.emit("register-user", {
          id: String(me.id),
          username: me?.username || me?.display_name || me?.name || "User",
        })
      }
    })

    socket.on("disconnect", () => {
      socketConnected.value = false
    })
  } catch {
    socketConnected.value = false
  }
}

async function refreshAll() {
  loading.value = true
  await Promise.all([fetchPosts(), fetchServerStats()])
  loading.value = false
}

onMounted(async () => {
  connectSocket()
  await refreshAll()
})

onBeforeUnmount(() => {
  try {
    socket?.disconnect?.()
  } catch {}
})
</script>

<style scoped>
.dashPage {
  position: relative;
  min-height: 100vh;
  padding: 12px 12px 98px;
  color: white;
  background:
    radial-gradient(900px 580px at 0% 0%, rgba(255, 75, 125, 0.14), transparent),
    radial-gradient(900px 680px at 100% 0%, rgba(91, 140, 255, 0.16), transparent),
    linear-gradient(180deg, #07101c 0%, #091423 42%, #060d19 100%);
  overflow-x: hidden;
}

.bg-grid {
  position: fixed;
  inset: 0;
  pointer-events: none;
  background-image:
    linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
  background-size: 38px 38px;
  mask-image: linear-gradient(to bottom, rgba(255,255,255,.16), transparent 75%);
}

.bg-orb {
  position: fixed;
  border-radius: 999px;
  filter: blur(80px);
  pointer-events: none;
  opacity: .34;
}
.orb1 {
  width: 220px;
  height: 220px;
  left: -40px;
  top: 80px;
  background: rgba(255, 65, 108, 0.32);
}
.orb2 {
  width: 260px;
  height: 260px;
  right: -70px;
  top: 180px;
  background: rgba(91, 140, 255, 0.28);
}

.glass {
  position: relative;
  z-index: 2;
  background: rgba(255,255,255,0.055);
  border: 1px solid rgba(255,255,255,0.11);
  backdrop-filter: blur(16px);
  box-shadow: 0 14px 44px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.04);
  border-radius: 24px;
}

.glassLite {
  background: rgba(255,255,255,.05);
  border: 1px solid rgba(255,255,255,.08);
}

.topBar,
.heroCard,
.feedTools,
.composerCard,
.feedCard,
.emptyFeed {
  margin-bottom: 12px;
}

.topBar {
  padding: 12px;
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
}

.brandWrap {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.brandIcon {
  width: 52px;
  height: 52px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  font-size: 28px;
  background: linear-gradient(135deg, #ff2a6d, #5b8cff);
  box-shadow: 0 12px 28px rgba(91,140,255,.22);
}

.brandTitle {
  font-size: 20px;
  font-weight: 950;
}

.brandSub {
  opacity: .75;
  font-size: 13px;
}

.topBarActions,
.tabRow,
.filterRow,
.feedActions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.chip,
.pillBtn,
.tabChip,
.filterChip,
.resultChip,
.actionBtn,
.mediaBtn,
.tagLite {
  border: none;
  color: white;
  cursor: pointer;
  border-radius: 999px;
  background: rgba(255,255,255,.08);
  border: 1px solid rgba(255,255,255,.11);
  font-weight: 800;
}

.chip,
.pillBtn,
.tabChip,
.filterChip,
.resultChip,
.actionBtn,
.mediaBtn,
.tagLite {
  padding: 10px 14px;
}

.chip.online {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(53,227,161,.12);
  border-color: rgba(53,227,161,.22);
}

.chip.online.offline {
  background: rgba(255,255,255,.08);
  border-color: rgba(255,255,255,.12);
}

.iconOnly {
  min-width: 42px;
  padding: 10px 12px;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #35e3a1;
}

.heroCard,
.feedTools,
.composerCard,
.feedCard,
.emptyFeed {
  padding: 16px;
}

.heroTop {
  display: grid;
  gap: 14px;
}

.heroEyebrow {
  font-size: 12px;
  letter-spacing: .18em;
  opacity: .78;
  font-weight: 900;
}

.heroTitle {
  margin: 8px 0 6px;
  font-size: 32px;
  line-height: 1.02;
  font-weight: 950;
}

.heroSub,
.emptySub {
  margin: 0;
  opacity: .86;
  line-height: 1.5;
}

.heroMainBtn {
  border: none;
  border-radius: 999px;
  padding: 14px 16px;
  color: white;
  font-size: 16px;
  font-weight: 900;
  background: linear-gradient(90deg, #ff4a57, #ff4141);
}

.heroStats {
  margin-top: 14px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.miniStat {
  border-radius: 18px;
  padding: 14px;
  text-align: center;
  color: white;
  border: none;
}

.miniStat strong {
  display: block;
  font-size: 24px;
  font-weight: 950;
}

.miniStat span {
  display: block;
  opacity: .72;
  margin-top: 4px;
}

.tabChip.active,
.filterChip.active {
  background: linear-gradient(90deg, #ff2a6d, #ff5a5f);
  border-color: transparent;
}

.composerHead,
.composerMeta,
.composerActions,
.feedHead {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.authorBlock,
.feedAuthor {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}

.authorAvatar,
.feedAvatar {
  width: 58px;
  height: 58px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  font-size: 24px;
  font-weight: 950;
  background: linear-gradient(135deg, #ff4b7d, #7b7dff);
  color: white;
  overflow: hidden;
}

.authorAvatarImg,
.feedAvatarImg {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.authorName,
.feedAuthorName {
  font-size: 18px;
  font-weight: 950;
}

.authorSub,
.feedAuthorSub {
  opacity: .72;
  font-size: 13px;
}

.composerInput {
  width: 100%;
  min-height: 110px;
  margin-top: 12px;
  resize: vertical;
  border: 1px solid rgba(255,255,255,.1);
  background: rgba(0,0,0,.22);
  color: white;
  border-radius: 18px;
  padding: 14px;
  outline: none;
}

.composerTags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.pickedMedia {
  margin-top: 10px;
  opacity: .8;
  font-size: 14px;
}

.primaryBtn {
  background: linear-gradient(90deg, #ff2a6d, #ff595a);
  border-color: transparent;
}

.feedCaption {
  margin-top: 14px;
  line-height: 1.55;
  font-size: 16px;
}

.feedMedia {
  width: 100%;
  border-radius: 18px;
  margin-top: 14px;
  background: rgba(255,255,255,.05);
  max-height: 700px;
  object-fit: cover;
}

.postTypeChip {
  padding: 9px 12px;
  border-radius: 999px;
  background: rgba(255,77,98,.14);
  border: 1px solid rgba(255,77,98,.22);
  font-weight: 900;
}

.emptyFeed {
  text-align: center;
}

.emptyIcon {
  font-size: 34px;
}

.emptyTitle {
  margin-top: 8px;
  font-size: 22px;
  font-weight: 950;
}

.bottomNav {
  position: fixed;
  left: 10px;
  right: 10px;
  bottom: 10px;
  z-index: 40;
  min-height: 74px;
  padding: 8px;
  display: grid;
  grid-template-columns: 1fr 1fr 72px 1fr 1fr 1fr;
  align-items: center;
  gap: 4px;
}

.navBtn {
  background: transparent;
  border: none;
  color: white;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  font-size: 11px;
}

.navBtn span {
  font-size: 20px;
}

.navFab {
  width: 58px;
  height: 58px;
  margin: 0 auto;
  border-radius: 50%;
  border: none;
  color: white;
  font-size: 30px;
  background: linear-gradient(135deg, #7c4dff, #ff4d6d);
  box-shadow: 0 14px 28px rgba(124, 77, 255, 0.42);
}

.fabOverlay {
  position: fixed;
  inset: 0;
  background: rgba(3, 8, 16, 0.54);
  z-index: 45;
  backdrop-filter: blur(4px);
}

.fabSheet {
  position: fixed;
  left: 12px;
  right: 12px;
  bottom: 98px;
  z-index: 50;
  padding: 16px;
}

.sheetHead {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 14px;
}

.sheetHead h3 {
  margin: 0;
  font-size: 18px;
}

.sheetHead p {
  margin: 4px 0 0;
  opacity: .75;
  font-size: 12px;
}

.closeBtn {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: 1px solid rgba(255,255,255,.11);
  background: rgba(255,255,255,.05);
  color: white;
}

.sheetGrid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.sheetBtn {
  min-height: 74px;
  border-radius: 18px;
  border: 1px solid rgba(255,255,255,.11);
  background: rgba(255,255,255,.05);
  color: white;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-weight: 800;
}

.fade-enter-active,
.fade-leave-active,
.sheetUp-enter-active,
.sheetUp-leave-active {
  transition: all .22s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.sheetUp-enter-from,
.sheetUp-leave-to {
  opacity: 0;
  transform: translateY(18px);
}

@media (max-width: 760px) {
  .topBar,
  .composerHead,
  .composerMeta,
  .composerActions,
  .feedHead {
    align-items: flex-start;
  }

  .bottomNav {
    grid-template-columns: 1fr 1fr 68px 1fr 1fr 1fr;
  }
}
</style>