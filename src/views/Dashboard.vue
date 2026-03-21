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

          <button class="chip iconOnly" @click="openComposer" aria-label="Create post">✍️</button>
          <button class="chip iconOnly" @click="goPeople" aria-label="People">👥</button>
          <button class="chip iconOnly" @click="goLive" aria-label="Go live">🔴</button>
        </div>
      </header>

      <!-- HERO -->
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
      <section class="composerCard glass">
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

            <button
              class="mediaBtn primaryBtn"
              @click="submitPost"
              :disabled="posting || !canSubmitPost"
            >
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
              {{ post.video_url ? "VIDEO" : post.image_url ? "IMAGE" : "TEXT" }}
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

            <button class="actionBtn" @click="openComments(post)">
              💬 {{ post.comment_count || 0 }}
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

      <!-- COMMENTS DRAWER -->
      <transition name="fade">
        <div v-if="commentsOpen" class="fabOverlay" @click="closeComments"></div>
      </transition>

      <transition name="sheetUp">
        <div v-if="commentsOpen" class="commentsSheet glass">
          <div class="sheetHead">
            <div>
              <h3>Comments</h3>
              <p>{{ activeCommentPost?.caption || "Post discussion" }}</p>
            </div>
            <button class="closeBtn" @click="closeComments">✕</button>
          </div>

          <div class="commentsList">
            <div v-if="commentsLoading" class="commentState">Loading comments...</div>
            <div v-else-if="commentsError" class="commentState err">{{ commentsError }}</div>
            <div v-else-if="comments.length === 0" class="commentState">No comments yet.</div>

            <div v-for="c in comments" :key="c.id" class="commentRow">
              <div class="commentAvatar">
                <img
                  v-if="c.avatar_url"
                  :src="mediaUrl(c.avatar_url)"
                  class="commentAvatarImg"
                  alt="avatar"
                />
                <span v-else>{{ String(c.display_name || c.username || "U").charAt(0).toUpperCase() }}</span>
              </div>

              <div class="commentBody">
                <div class="commentName">{{ c.display_name || c.username || "User" }}</div>
                <div class="commentText">{{ c.body }}</div>
                <div class="commentTime">{{ formatDateTime(c.created_at) }}</div>
              </div>
            </div>
          </div>

          <div class="commentComposer">
            <input
              v-model="commentDraft"
              class="commentInput"
              type="text"
              placeholder="Write a comment..."
              @keydown.enter="sendComment"
            />
            <button class="commentSend" @click="sendComment" :disabled="commentSending || !commentDraft.trim()">
              {{ commentSending ? "..." : "Send" }}
            </button>
          </div>
        </div>
      </transition>

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
              💬 <span>Inbox</span>
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

        <button class="navFab floatingFab" @click="toggleFab" aria-label="Quick actions">+</button>
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
const tab = ref("following")
const filterType = ref("all")

const composerText = ref("")
const selectedImage = ref(null)
const selectedVideo = ref(null)
const selectedMediaName = ref("")
const fabOpen = ref(false)

const posts = ref([])
const savedIds = ref(JSON.parse(localStorage.getItem("pulse_saved_ids") || "[]"))
const commentsOpen = ref(false)
const commentsLoading = ref(false)
const commentsError = ref("")
const comments = ref([])
const activeCommentPost = ref(null)
const commentDraft = ref("")
const commentSending = ref(false)

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
  return !!composerText.value.trim() || !!selectedImage.value || !!selectedVideo.value
})

const filteredPosts = computed(() => {
  let list = [...posts.value]

  if (tab.value === "saved") {
    list = list.filter((p) => savedIds.value.includes(p.id))
  } else if (tab.value === "reels") {
    list = list.filter((p) => !!p.video_url)
  } else if (tab.value === "following") {
    list = list.filter((p) => p.is_following || true)
  }

  if (filterType.value === "videos") {
    list = list.filter((p) => !!p.video_url)
  } else if (filterType.value === "images") {
    list = list.filter((p) => !!p.image_url)
  } else if (filterType.value === "text") {
    list = list.filter((p) => !p.image_url && !p.video_url)
  }

  list.sort((a, b) => new Date(b.created_at || b.createdAt || 0) - new Date(a.created_at || a.createdAt || 0))
  return list
})

function authHeaders(extra = {}) {
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  }
}

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
  const id = `live_${Date.now()}`
  router.push(`/live?mode=host&liveId=${id}`)
}

function goCalls() {
  router.push("/inbox")
}

function openRooms() {
  const id = `room_${Date.now()}`
  router.push(`/roomcall?roomId=${id}&kind=video&name=${encodeURIComponent("Pulse Room")}`)
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
    const res = await fetch(`${apiBase}/posts`)
    if (!res.ok) throw new Error("failed")
    const data = await res.json()
    posts.value = Array.isArray(data) ? data : data.posts || []
  } catch (err) {
    console.error("fetchPosts error:", err)
    posts.value = []
  }
}

function persistCollections() {
  localStorage.setItem("pulse_saved_ids", JSON.stringify(savedIds.value))
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

async function toggleLike(post) {
  const current = Number(post.likes_count || 0)
  post.likes_count = current + 1
  try {
    const res = await fetch(`${apiBase}/posts/${post.id}/like`, { method: "POST" })
    if (res.ok) {
      const data = await res.json()
      post.likes_count = Number(data.likes_count ?? post.likes_count)
      return
    }
  } catch {}
  try {
    await fetch(`${apiBase}/likes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify({ postId: post.id }),
    })
  } catch {}
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
  selectedImage.value = file
  selectedVideo.value = null
  selectedMediaName.value = file.name
}

function pickVideo(e) {
  const file = e.target.files?.[0]
  if (!file) return
  selectedVideo.value = file
  selectedImage.value = null
  selectedMediaName.value = file.name
}

function clearComposer() {
  composerText.value = ""
  selectedImage.value = null
  selectedVideo.value = null
  selectedMediaName.value = ""
}

async function submitPost() {
  if (!canSubmitPost.value) return

  posting.value = true
  try {
    const formData = new FormData()
    if (composerText.value.trim()) formData.append("caption", composerText.value.trim())
    if (selectedImage.value) formData.append("image", selectedImage.value)
    if (selectedVideo.value) formData.append("video", selectedVideo.value)

    const res = await fetch(`${apiBase}/posts`, {
      method: "POST",
      headers: authHeaders(),
      body: formData,
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err?.error || "Post failed")
    }

    await fetchPosts()
    clearComposer()
    composerOpen.value = false
  } catch (err) {
    console.error("submitPost error:", err)
    alert(err?.message || "Post failed")
  } finally {
    posting.value = false
  }
}

async function openComments(post) {
  activeCommentPost.value = post
  commentsOpen.value = true
  commentsLoading.value = true
  commentsError.value = ""
  comments.value = []
  commentDraft.value = ""

  try {
    const res = await fetch(`${apiBase}/posts/${post.id}/comments`)
    if (!res.ok) throw new Error("Failed to load comments")
    const data = await res.json()
    comments.value = Array.isArray(data) ? data : []
  } catch (err) {
    commentsError.value = err?.message || "Failed to load comments"
  } finally {
    commentsLoading.value = false
  }
}

function closeComments() {
  commentsOpen.value = false
  activeCommentPost.value = null
  comments.value = []
  commentsError.value = ""
  commentDraft.value = ""
}

async function sendComment() {
  if (!activeCommentPost.value?.id || !commentDraft.value.trim()) return
  if (!token) {
    commentsError.value = "Login again to comment."
    return
  }

  commentSending.value = true
  commentsError.value = ""

  try {
    const res = await fetch(`${apiBase}/posts/${activeCommentPost.value.id}/comments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify({
        body: commentDraft.value.trim(),
      }),
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data?.error || "Failed to send comment")

    comments.unshift(data)
    commentDraft.value = ""
    activeCommentPost.value.comment_count = Number(activeCommentPost.value.comment_count || 0) + 1
  } catch (err) {
    commentsError.value = err?.message || "Failed to send comment"
  } finally {
    commentSending.value = false
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
  padding: 12px 12px calc(148px + env(safe-area-inset-bottom, 0px));
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
  -webkit-backdrop-filter: blur(16px);
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
  min-width: 0;
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
  flex: 0 0 auto;
}

.brandText {
  min-width: 0;
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
.tagLite,
.commentSend {
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
  word-break: break-word;
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
  min-width: 0;
}

.authorAvatar,
.feedAvatar,
.commentAvatar {
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
  flex: 0 0 auto;
}

.commentAvatar {
  width: 42px;
  height: 42px;
  font-size: 18px;
}

.authorAvatarImg,
.feedAvatarImg,
.commentAvatarImg {
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
.feedAuthorSub,
.commentTime {
  opacity: .72;
  font-size: 13px;
}

.feedAuthorMeta {
  min-width: 0;
}

.feedAuthorName,
.feedAuthorSub {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.composerInput,
.commentInput {
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

.commentInput {
  min-height: auto;
  margin-top: 0;
  padding: 14px 16px;
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
  word-break: break-word;
}

.primaryBtn,
.commentSend {
  background: linear-gradient(90deg, #ff2a6d, #ff595a);
  border-color: transparent;
}

.feedCaption {
  margin-top: 14px;
  line-height: 1.55;
  font-size: 16px;
  word-break: break-word;
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
  flex: 0 0 auto;
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

.commentsSheet,
.fabSheet {
  position: fixed;
  left: 12px;
  right: 12px;
  bottom: calc(108px + env(safe-area-inset-bottom, 0px));
  z-index: 50;
  padding: 16px;
  max-height: 72vh;
  overflow: hidden;
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

.commentsList {
  overflow: auto;
  max-height: 44vh;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-right: 4px;
}

.commentRow {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.commentBody {
  flex: 1;
  min-width: 0;
  padding: 12px;
  border-radius: 16px;
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.08);
}

.commentName {
  font-weight: 900;
  margin-bottom: 6px;
}

.commentText {
  line-height: 1.5;
  word-break: break-word;
}

.commentState {
  padding: 16px;
  border-radius: 14px;
  background: rgba(255,255,255,.08);
}

.commentState.err {
  border: 1px solid rgba(255,80,80,.35);
}

.commentComposer {
  display: flex;
  gap: 10px;
  margin-top: 14px;
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

.bottomNav {
  position: fixed;
  left: 10px;
  right: 10px;
  bottom: calc(10px + env(safe-area-inset-bottom, 0px));
  z-index: 40;
  min-height: 80px;
  padding: 10px 10px calc(12px + env(safe-area-inset-bottom, 0px));
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  align-items: end;
  gap: 4px;
  border-radius: 26px;
  overflow: visible;
}

.navBtn {
  background: transparent;
  border: none;
  color: white;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 11px;
  min-height: 54px;
  padding: 4px 2px;
}

.navBtn span {
  font-size: 20px;
  line-height: 1;
}

.navBtn small {
  font-size: 11px;
  line-height: 1;
  opacity: .92;
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

.floatingFab {
  position: absolute;
  left: 50%;
  top: 0;
  transform: translate(-50%, -38%);
  z-index: 3;
}

.fabOverlay {
  position: fixed;
  inset: 0;
  background: rgba(3, 8, 16, 0.54);
  z-index: 45;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
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
}

@media (max-width: 520px) {
  .topBar {
    flex-direction: column;
    align-items: stretch;
  }

  .topBarActions {
    justify-content: flex-start;
  }

  .brandTitle {
    font-size: 18px;
  }

  .brandSub {
    font-size: 12px;
  }

  .heroTitle {
    font-size: 28px;
  }

  .bottomNav {
    left: 8px;
    right: 8px;
    gap: 2px;
    padding-left: 6px;
    padding-right: 6px;
  }

  .navBtn span {
    font-size: 18px;
  }

  .navBtn small {
    font-size: 10px;
  }

  .floatingFab {
    width: 56px;
    height: 56px;
    font-size: 28px;
  }

  .commentComposer {
    flex-direction: column;
  }

  .commentSend {
    width: 100%;
    padding: 14px 16px;
  }
}
</style>