<!-- src/views/Dashboard.vue -->
<template>
  <Layout>
    <div class="dash-page">
      <!-- ambient background -->
      <div class="bg fx1"></div>
      <div class="bg fx2"></div>
      <div class="bg fx3"></div>

      <!-- top app bar -->
      <header class="topbar glass">
        <div class="brand" @click="scrollToTop">
          <div class="brand-logo">⚡</div>
          <div class="brand-copy">
            <h1>Pulse</h1>
            <p>Elite social cockpit</p>
          </div>
        </div>

        <div class="topbar-actions">
          <button class="top-pill ghost" @click="goTo('/people')">👥</button>
          <button class="top-pill ghost" @click="goTo('/inbox')">💬</button>
          <button class="top-pill live" @click="goTo('/live')">🔴 Live</button>
        </div>
      </header>

      <!-- compact hero -->
      <section class="hero glass">
        <div class="hero-left">
          <div class="hello">WELCOME BACK</div>
          <div class="hero-name">{{ displayName }}</div>
          <div class="hero-line">
            Build, post, call, stream, and run your world from one magical dashboard.
          </div>

          <div class="hero-tags">
            <span class="tag success">{{ socketConnected ? "Socket Connected" : "Offline" }}</span>
            <span class="tag">{{ onlineCount }} online</span>
            <span class="tag">{{ liveCount }} live</span>
            <span class="tag">{{ roomCount }} rooms</span>
          </div>
        </div>

        <div class="hero-right">
          <button class="hero-action primary" @click="openComposer">Create Post</button>
          <button class="hero-action" @click="goTo('/people')">People & Call</button>
        </div>
      </section>

      <!-- tiny status row -->
      <section class="mini-stats">
        <div class="mini-card glass">
          <div class="mini-num">{{ postCount }}</div>
          <div class="mini-label">Posts</div>
        </div>
        <div class="mini-card glass">
          <div class="mini-num">{{ savedCount }}</div>
          <div class="mini-label">Saved</div>
        </div>
        <div class="mini-card glass">
          <div class="mini-num">{{ pinnedCount }}</div>
          <div class="mini-label">Pinned</div>
        </div>
        <div class="mini-card glass">
          <div class="mini-num">{{ unreadCount }}</div>
          <div class="mini-label">Inbox</div>
        </div>
      </section>

      <!-- quick composer -->
      <section class="composer glass">
        <div class="composer-head">
          <div class="avatar">{{ avatarLetter }}</div>
          <div class="composer-meta">
            <div class="composer-name">{{ displayName }}</div>
            <div class="composer-sub">Post to the world</div>
          </div>
          <button class="tiny-btn" @click="toggleComposerExpanded">
            {{ composerExpanded ? "Hide" : "Open" }}
          </button>
        </div>

        <div class="composer-box" @click="openComposer">
          What’s happening?
        </div>

        <transition name="fade-up">
          <div v-if="composerExpanded" class="composer-expanded">
            <textarea
              v-model="newPostText"
              rows="4"
              maxlength="1000"
              placeholder="Write something powerful…"
              class="composer-textarea"
            ></textarea>

            <div class="composer-tags-row">
              <button class="soft-chip" @click="appendTag('#Pulse')">#Pulse</button>
              <button class="soft-chip" @click="appendTag('#Reels')">#Reels</button>
              <button class="soft-chip" @click="appendTag('#Live')">#Live</button>
              <button class="soft-chip" @click="appendTag('#Update')">#Update</button>
            </div>

            <label class="upload-row">
              <input type="file" accept="image/*" hidden @change="onImageChange" />
              <span>🖼️ Image</span>
              <small>{{ imageName || "No file selected" }}</small>
            </label>

            <label class="upload-row">
              <input type="file" accept="video/*" hidden @change="onVideoChange" />
              <span>🎥 Video</span>
              <small>{{ videoName || "No file selected" }}</small>
            </label>

            <div class="composer-actions">
              <button class="action-btn primary" :disabled="posting" @click="submitPost">
                {{ posting ? "Posting..." : "Post 🚀" }}
              </button>
              <button class="action-btn" :disabled="posting" @click="resetComposer">Clear</button>
            </div>
          </div>
        </transition>
      </section>

      <!-- filter rail -->
      <section class="rail">
        <button
          v-for="item in filterOptions"
          :key="item.value"
          class="rail-chip"
          :class="{ active: activeFilter === item.value }"
          @click="setFilter(item.value)"
        >
          {{ item.label }}
        </button>
      </section>

      <!-- feed -->
      <section class="feed">
        <div v-if="loadingPosts" class="glass empty-state">
          Loading your feed...
        </div>

        <div v-else-if="filteredPosts.length === 0" class="glass empty-state">
          No posts yet. Tap the + button and create something.
        </div>

        <article
          v-for="post in filteredPosts"
          :key="post.id"
          class="post-card glass"
        >
          <div class="post-head">
            <div class="post-user">
              <div class="avatar red">{{ getInitial(post.username || post.name || 'U') }}</div>
              <div>
                <div class="post-name">{{ post.username || post.name || `User #${post.user_id || post.id}` }}</div>
                <div class="post-time">{{ formatDate(post.created_at || post.createdAt) }}</div>
              </div>
            </div>

            <button class="tiny-btn" @click="openPostMenu(post)">⋯</button>
          </div>

          <div v-if="post.content || post.text || post.caption" class="post-text">
            {{ post.content || post.text || post.caption }}
          </div>

          <img
            v-if="post.image_url || post.image || post.imageUrl"
            class="post-media"
            :src="post.image_url || post.image || post.imageUrl"
            alt="post image"
          />

          <video
            v-if="post.video_url || post.video || post.videoUrl"
            class="post-media"
            :src="post.video_url || post.video || post.videoUrl"
            controls
            playsinline
            preload="metadata"
          ></video>

          <div class="post-stats">
            <span>❤️ {{ post.likes_count ?? post.likes ?? 0 }}</span>
            <span>💬 {{ post.comments_count ?? post.comments ?? 0 }}</span>
            <span>📌 {{ post.pinned ? 1 : 0 }}</span>
          </div>

          <div class="post-actions">
            <button class="post-btn" @click="likePost(post)">❤️ Like</button>
            <button class="post-btn" @click="commentOnPost(post)">💬 Comment</button>
            <button class="post-btn" @click="savePost(post)">🔖 Save</button>
            <button class="post-btn" @click="sharePost(post)">📤 Share</button>
          </div>
        </article>
      </section>

      <!-- mobile bottom nav -->
      <nav class="bottom-nav glass">
        <button class="nav-item active" @click="goTo('/dashboard')">
          <span>🏠</span>
          <small>Home</small>
        </button>

        <button class="nav-item" @click="goTo('/inbox')">
          <span>💬</span>
          <small>Inbox</small>
        </button>

        <button class="nav-fab" @click="toggleFab">+</button>

        <button class="nav-item" @click="goTo('/live')">
          <span>🔴</span>
          <small>Live</small>
        </button>

        <button class="nav-item" @click="goTo('/people')">
          <span>👥</span>
          <small>People</small>
        </button>

        <button class="nav-item" @click="goTo('/profile')">
          <span>👤</span>
          <small>Profile</small>
        </button>
      </nav>

      <!-- fab overlay -->
      <transition name="fade">
        <div v-if="fabOpen" class="fab-overlay" @click="fabOpen = false"></div>
      </transition>

      <!-- fab menu -->
      <transition name="fab-pop">
        <div v-if="fabOpen" class="fab-sheet glass">
          <div class="sheet-head">
            <div>
              <h3>Quick actions</h3>
              <p>Everything heavy is hidden here for mobile</p>
            </div>
            <button class="sheet-close" @click="fabOpen = false">✕</button>
          </div>

          <div class="sheet-grid">
            <button class="sheet-btn primary" @click="fabAction(openComposer)">
              ✍️
              <span>Create Post</span>
            </button>

            <button class="sheet-btn" @click="fabAction(() => goTo('/people'))">
              👥
              <span>People</span>
            </button>

            <button class="sheet-btn" @click="fabAction(() => goTo('/call'))">
              📞
              <span>1-to-1 Call</span>
            </button>

            <button class="sheet-btn" @click="fabAction(() => goTo('/room'))">
              🎧
              <span>Start Room</span>
            </button>

            <button class="sheet-btn" @click="fabAction(() => goTo('/live'))">
              🔴
              <span>Go Live</span>
            </button>

            <button class="sheet-btn" @click="fabAction(() => goTo('/reels'))">
              🎬
              <span>Open Reels</span>
            </button>

            <button class="sheet-btn" @click="fabAction(() => goTo('/saved'))">
              🔖
              <span>Saved</span>
            </button>

            <button class="sheet-btn" @click="fabAction(refreshAll)">
              🔄
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </transition>

      <!-- tiny post menu -->
      <transition name="fade">
        <div
          v-if="postMenu.open"
          class="fab-overlay"
          @click="closePostMenu"
        ></div>
      </transition>

      <transition name="fab-pop">
        <div v-if="postMenu.open" class="post-menu glass">
          <button @click="savePost(postMenu.post)">🔖 Save</button>
          <button @click="pinPost(postMenu.post)">📌 Pin</button>
          <button @click="sharePost(postMenu.post)">📤 Share</button>
          <button @click="closePostMenu">Cancel</button>
        </div>
      </transition>
    </div>
  </Layout>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import axios from "axios";
import Layout from "@/components/Layout.vue";

const router = useRouter();

const me = ref(null);
const posts = ref([]);
const loadingPosts = ref(false);
const socketConnected = ref(true);

const onlineCount = ref(2);
const liveCount = ref(0);
const roomCount = ref(1);
const unreadCount = ref(0);

const savedCount = ref(0);
const pinnedCount = ref(0);

const fabOpen = ref(false);
const composerExpanded = ref(false);
const posting = ref(false);

const newPostText = ref("");
const imageFile = ref(null);
const videoFile = ref(null);
const imageName = ref("");
const videoName = ref("");

const activeFilter = ref("all");

const postMenu = ref({
  open: false,
  post: null,
});

const filterOptions = [
  { label: "All", value: "all" },
  { label: "Videos", value: "video" },
  { label: "Images", value: "image" },
  { label: "Text", value: "text" },
  { label: "Following", value: "following" },
];

const displayName = computed(() => {
  return (
    me.value?.username ||
    me.value?.name ||
    localStorage.getItem("username") ||
    "Creator"
  );
});

const avatarLetter = computed(() => getInitial(displayName.value));

const postCount = computed(() => posts.value.length);

const filteredPosts = computed(() => {
  if (activeFilter.value === "all") return posts.value;

  if (activeFilter.value === "video") {
    return posts.value.filter(
      (p) => p.video_url || p.video || p.videoUrl
    );
  }

  if (activeFilter.value === "image") {
    return posts.value.filter(
      (p) => p.image_url || p.image || p.imageUrl
    );
  }

  if (activeFilter.value === "text") {
    return posts.value.filter(
      (p) =>
        (p.content || p.text || p.caption) &&
        !(p.image_url || p.image || p.imageUrl) &&
        !(p.video_url || p.video || p.videoUrl)
    );
  }

  if (activeFilter.value === "following") {
    return posts.value.filter((p) => p.is_following || p.following);
  }

  return posts.value;
});

function getToken() {
  return localStorage.getItem("token") || "";
}

function authHeaders(extra = {}) {
  const token = getToken();
  return {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...extra,
    },
  };
}

function goTo(path) {
  router.push(path);
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function toggleFab() {
  fabOpen.value = !fabOpen.value;
}

function fabAction(fn) {
  fabOpen.value = false;
  fn();
}

function openComposer() {
  composerExpanded.value = true;
  fabOpen.value = false;
  setTimeout(() => {
    const el = document.querySelector(".composer");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, 40);
}

function toggleComposerExpanded() {
  composerExpanded.value = !composerExpanded.value;
}

function setFilter(value) {
  activeFilter.value = value;
}

function appendTag(tag) {
  if (!newPostText.value.includes(tag)) {
    newPostText.value = `${newPostText.value} ${tag}`.trim();
  }
}

function onImageChange(e) {
  const file = e.target.files?.[0];
  imageFile.value = file || null;
  imageName.value = file?.name || "";
}

function onVideoChange(e) {
  const file = e.target.files?.[0];
  videoFile.value = file || null;
  videoName.value = file?.name || "";
}

function resetComposer() {
  newPostText.value = "";
  imageFile.value = null;
  videoFile.value = null;
  imageName.value = "";
  videoName.value = "";
}

function closePostMenu() {
  postMenu.value.open = false;
  postMenu.value.post = null;
}

function openPostMenu(post) {
  postMenu.value.open = true;
  postMenu.value.post = post;
}

function getInitial(name) {
  return String(name || "U").trim().charAt(0).toUpperCase();
}

function formatDate(value) {
  if (!value) return "Just now";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Just now";
  return d.toLocaleString();
}

async function fetchMe() {
  try {
    const { data } = await axios.get("/api/users/me", authHeaders());
    me.value = data;
  } catch {
    me.value = {
      username: localStorage.getItem("username") || "minmadan40",
    };
  }
}

async function fetchPosts() {
  loadingPosts.value = true;
  try {
    const { data } = await axios.get("/api/posts", authHeaders());
    posts.value = Array.isArray(data) ? data : data?.posts || [];
  } catch (err) {
    console.error("fetchPosts error:", err);
    posts.value = [];
  } finally {
    loadingPosts.value = false;
    recomputeSmallStats();
  }
}

function recomputeSmallStats() {
  savedCount.value = posts.value.filter((p) => p.saved).length;
  pinnedCount.value = posts.value.filter((p) => p.pinned).length;
}

async function submitPost() {
  if (!newPostText.value.trim() && !imageFile.value && !videoFile.value) return;

  posting.value = true;

  try {
    let imageUrl = "";
    let videoUrl = "";

    if (imageFile.value) {
      const fd = new FormData();
      fd.append("file", imageFile.value);

      const up = await axios.post(
        "/api/upload",
        fd,
        authHeaders({ "Content-Type": "multipart/form-data" })
      );

      imageUrl =
        up.data?.url || up.data?.imageUrl || up.data?.secure_url || "";
    }

    if (videoFile.value) {
      const fd = new FormData();
      fd.append("file", videoFile.value);

      const up = await axios.post(
        "/api/upload",
        fd,
        authHeaders({ "Content-Type": "multipart/form-data" })
      );

      videoUrl =
        up.data?.url || up.data?.videoUrl || up.data?.secure_url || "";
    }

    const payload = {
      content: newPostText.value.trim(),
      text: newPostText.value.trim(),
      image_url: imageUrl,
      video_url: videoUrl,
    };

    await axios.post("/api/posts", payload, authHeaders());
    resetComposer();
    composerExpanded.value = false;
    await fetchPosts();
  } catch (err) {
    console.error("submitPost error:", err);
    alert("Post failed. Check your route or payload shape.");
  } finally {
    posting.value = false;
  }
}

async function likePost(post) {
  try {
    await axios.post(`/api/likes/${post.id}`, {}, authHeaders());
    post.likes_count = (post.likes_count ?? post.likes ?? 0) + 1;
  } catch (err) {
    console.error("likePost error:", err);
  }
}

function commentOnPost(post) {
  router.push(`/post/${post.id}`);
}

function sharePost(post) {
  const url = `${window.location.origin}/post/${post.id}`;
  navigator.clipboard?.writeText(url);
  closePostMenu();
}

function savePost(post) {
  post.saved = !post.saved;
  recomputeSmallStats();
  closePostMenu();
}

function pinPost(post) {
  post.pinned = !post.pinned;
  recomputeSmallStats();
  closePostMenu();
}

async function refreshAll() {
  fabOpen.value = false;
  await Promise.all([fetchMe(), fetchPosts()]);
}

onMounted(async () => {
  await refreshAll();
});
</script>

<style scoped>
:root {
  --bg: #07111f;
  --bg2: #0a1630;
  --card: rgba(18, 26, 47, 0.72);
  --line: rgba(255, 255, 255, 0.08);
  --text: #eef3ff;
  --muted: #9fb0d1;
  --primary: #ff4d6d;
  --primary-2: #7c4dff;
  --success: #29d391;
  --warning: #f4b740;
  --shadow: 0 12px 32px rgba(0, 0, 0, 0.32);
}

* {
  box-sizing: border-box;
}

.dash-page {
  position: relative;
  min-height: 100vh;
  padding: 14px 12px 110px;
  color: var(--text);
  background:
    radial-gradient(circle at top left, rgba(124, 77, 255, 0.16), transparent 25%),
    radial-gradient(circle at top right, rgba(255, 77, 109, 0.14), transparent 28%),
    linear-gradient(180deg, #040a16 0%, #07111f 45%, #08152b 100%);
  overflow-x: hidden;
}

.bg {
  position: fixed;
  inset: auto;
  border-radius: 999px;
  filter: blur(60px);
  opacity: 0.28;
  pointer-events: none;
  z-index: 0;
  animation: floaty 12s ease-in-out infinite;
}

.fx1 {
  width: 180px;
  height: 180px;
  left: -40px;
  top: 80px;
  background: rgba(124, 77, 255, 0.35);
}

.fx2 {
  width: 220px;
  height: 220px;
  right: -40px;
  top: 180px;
  background: rgba(255, 77, 109, 0.26);
  animation-delay: 2s;
}

.fx3 {
  width: 180px;
  height: 180px;
  left: 30%;
  bottom: 120px;
  background: rgba(0, 180, 255, 0.18);
  animation-delay: 4s;
}

.glass {
  position: relative;
  z-index: 1;
  background: var(--card);
  border: 1px solid var(--line);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  box-shadow: var(--shadow);
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px;
  border-radius: 20px;
  margin-bottom: 12px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  cursor: pointer;
}

.brand-logo {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, var(--primary-2), var(--primary));
  font-size: 20px;
  box-shadow: 0 8px 24px rgba(124, 77, 255, 0.35);
}

.brand-copy {
  min-width: 0;
}

.brand-copy h1 {
  margin: 0;
  font-size: 18px;
  line-height: 1.05;
}

.brand-copy p {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--muted);
  white-space: nowrap;
}

.topbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.top-pill {
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.05);
  color: var(--text);
  border-radius: 999px;
  padding: 10px 12px;
  font-size: 12px;
}

.top-pill.live {
  background: linear-gradient(135deg, rgba(255, 77, 109, 0.28), rgba(124, 77, 255, 0.22));
  border-color: rgba(255, 77, 109, 0.25);
}

.hero {
  border-radius: 24px;
  padding: 16px;
  margin-bottom: 12px;
}

.hero-left {
  margin-bottom: 14px;
}

.hello {
  font-size: 10px;
  letter-spacing: 0.16em;
  color: #ffdce3;
  opacity: 0.85;
  margin-bottom: 6px;
}

.hero-name {
  font-size: 28px;
  font-weight: 800;
  line-height: 1;
  margin-bottom: 8px;
}

.hero-line {
  color: var(--muted);
  font-size: 14px;
  line-height: 1.45;
  margin-bottom: 12px;
}

.hero-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tag {
  border-radius: 999px;
  padding: 7px 10px;
  font-size: 11px;
  color: var(--text);
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--line);
}

.tag.success {
  background: rgba(41, 211, 145, 0.13);
  color: #c7ffe8;
  border-color: rgba(41, 211, 145, 0.25);
}

.hero-right {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.hero-action {
  height: 46px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.06);
  color: var(--text);
  font-weight: 700;
}

.hero-action.primary,
.action-btn.primary,
.sheet-btn.primary {
  background: linear-gradient(135deg, #ff4d6d, #ff7a45);
  color: white;
  border: none;
}

.mini-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-bottom: 12px;
}

.mini-card {
  border-radius: 18px;
  padding: 14px 8px;
  text-align: center;
}

.mini-num {
  font-size: 20px;
  font-weight: 800;
}

.mini-label {
  font-size: 11px;
  color: var(--muted);
  margin-top: 4px;
}

.composer {
  border-radius: 24px;
  padding: 14px;
  margin-bottom: 12px;
}

.composer-head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar {
  width: 42px;
  height: 42px;
  min-width: 42px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #ff5876, #ff7b4d);
  color: #fff;
  font-weight: 800;
}

.avatar.red {
  width: 44px;
  height: 44px;
  min-width: 44px;
}

.composer-meta {
  min-width: 0;
  flex: 1;
}

.composer-name {
  font-weight: 800;
  font-size: 15px;
}

.composer-sub {
  color: var(--muted);
  font-size: 12px;
}

.tiny-btn {
  height: 34px;
  border-radius: 999px;
  padding: 0 12px;
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.05);
  color: var(--text);
  font-size: 12px;
}

.composer-box {
  margin-top: 12px;
  min-height: 54px;
  border-radius: 18px;
  padding: 16px;
  color: #b9c5df;
  background: rgba(0, 0, 0, 0.22);
  border: 1px solid var(--line);
}

.composer-expanded {
  margin-top: 12px;
}

.composer-textarea {
  width: 100%;
  resize: vertical;
  min-height: 110px;
  border-radius: 18px;
  padding: 14px;
  background: rgba(0, 0, 0, 0.22);
  border: 1px solid var(--line);
  color: var(--text);
  outline: none;
  font: inherit;
}

.composer-tags-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.soft-chip {
  border-radius: 999px;
  padding: 8px 12px;
  font-size: 12px;
  background: rgba(124, 77, 255, 0.12);
  color: #e7defe;
  border: 1px solid rgba(124, 77, 255, 0.18);
}

.upload-row {
  margin-top: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 48px;
  border-radius: 16px;
  padding: 0 14px;
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.05);
  font-size: 14px;
}

.upload-row small {
  color: var(--muted);
  text-align: right;
}

.composer-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 12px;
}

.action-btn {
  height: 46px;
  border-radius: 14px;
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.06);
  color: var(--text);
  font-weight: 800;
}

.rail {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 4px 2px 12px;
  margin-bottom: 2px;
  scrollbar-width: none;
}

.rail::-webkit-scrollbar {
  display: none;
}

.rail-chip {
  flex: 0 0 auto;
  height: 38px;
  border-radius: 999px;
  padding: 0 14px;
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.05);
  color: var(--text);
  font-size: 12px;
  font-weight: 700;
}

.rail-chip.active {
  background: linear-gradient(135deg, rgba(255, 77, 109, 0.28), rgba(124, 77, 255, 0.22));
  border-color: rgba(255, 77, 109, 0.22);
}

.feed {
  display: grid;
  gap: 12px;
}

.post-card {
  border-radius: 24px;
  padding: 14px;
}

.post-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.post-user {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.post-name {
  font-size: 15px;
  font-weight: 800;
}

.post-time {
  font-size: 12px;
  color: var(--muted);
}

.post-text {
  margin-top: 12px;
  line-height: 1.5;
  color: #eef2fc;
  word-break: break-word;
}

.post-media {
  width: 100%;
  border-radius: 18px;
  margin-top: 12px;
  display: block;
  border: 1px solid var(--line);
  background: #08111f;
  max-height: 520px;
  object-fit: cover;
}

.post-stats {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  margin-top: 12px;
  color: var(--muted);
  font-size: 12px;
}

.post-actions {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-top: 12px;
}

.post-btn {
  min-height: 40px;
  border-radius: 12px;
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.05);
  color: var(--text);
  font-size: 12px;
  font-weight: 700;
}

.empty-state {
  border-radius: 22px;
  padding: 20px;
  text-align: center;
  color: var(--muted);
}

.bottom-nav {
  position: fixed;
  left: 10px;
  right: 10px;
  bottom: 10px;
  z-index: 40;
  border-radius: 24px;
  display: grid;
  grid-template-columns: 1fr 1fr 72px 1fr 1fr 1fr;
  align-items: center;
  gap: 4px;
  min-height: 74px;
  padding: 8px;
}

.nav-item {
  background: transparent;
  border: none;
  color: var(--text);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  font-size: 11px;
}

.nav-item span {
  font-size: 20px;
}

.nav-item.active small {
  color: #ffd7df;
}

.nav-fab {
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

.fab-overlay {
  position: fixed;
  inset: 0;
  background: rgba(3, 8, 16, 0.54);
  z-index: 45;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

.fab-sheet {
  position: fixed;
  left: 12px;
  right: 12px;
  bottom: 98px;
  z-index: 50;
  border-radius: 26px;
  padding: 16px;
}

.sheet-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 14px;
}

.sheet-head h3 {
  margin: 0;
  font-size: 18px;
}

.sheet-head p {
  margin: 4px 0 0;
  color: var(--muted);
  font-size: 12px;
}

.sheet-close {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.05);
  color: var(--text);
}

.sheet-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.sheet-btn {
  min-height: 74px;
  border-radius: 18px;
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.05);
  color: var(--text);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-weight: 800;
}

.sheet-btn span:first-child {
  font-size: 22px;
}

.post-menu {
  position: fixed;
  left: 12px;
  right: 12px;
  bottom: 98px;
  z-index: 55;
  border-radius: 24px;
  padding: 10px;
  display: grid;
  gap: 8px;
}

.post-menu button {
  min-height: 46px;
  border-radius: 14px;
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.05);
  color: var(--text);
  font-weight: 700;
}

.fade-enter-active,
.fade-leave-active,
.fade-up-enter-active,
.fade-up-leave-active,
.fab-pop-enter-active,
.fab-pop-leave-active {
  transition: all 0.22s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.fade-up-enter-from,
.fade-up-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

.fab-pop-enter-from,
.fab-pop-leave-to {
  opacity: 0;
  transform: translateY(18px) scale(0.98);
}

@keyframes floaty {
  0%,
  100% {
    transform: translateY(0px) translateX(0px);
  }
  50% {
    transform: translateY(-12px) translateX(8px);
  }
}

@media (max-width: 420px) {
  .brand-copy h1 {
    font-size: 16px;
  }

  .brand-copy p {
    font-size: 11px;
  }

  .hero-name {
    font-size: 24px;
  }

  .mini-stats {
    grid-template-columns: repeat(2, 1fr);
  }

  .post-actions {
    grid-template-columns: 1fr 1fr;
  }

  .bottom-nav {
    grid-template-columns: 1fr 1fr 68px 1fr 1fr 1fr;
  }
}

@media (min-width: 768px) {
  .dash-page {
    max-width: 760px;
    margin: 0 auto;
    padding-left: 16px;
    padding-right: 16px;
  }

  .hero {
    display: flex;
    justify-content: space-between;
    gap: 18px;
    align-items: center;
  }

  .hero-left {
    margin-bottom: 0;
    flex: 1;
  }

  .hero-right {
    width: 240px;
  }
}
</style>