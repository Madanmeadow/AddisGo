<template>
  <Layout>
    <div class="reels-page">
      <!-- TOP BAR -->
      <header class="topbar">
        <div class="left">
          <div class="title">🎬 Reels</div>
          <div class="sub">Short videos • swipe feed</div>
        </div>

        <div class="right">
          <button class="pill" @click="toggleMute">
            <span v-if="muted">🔇 Muted</span>
            <span v-else>🔊 Sound</span>
          </button>

          <button class="pill primary" @click="openUpload">
            ＋ Upload
          </button>
        </div>
      </header>

      <!-- ERROR / LOADING -->
      <div v-if="error" class="notice err">{{ error }}</div>
      <div v-if="loading && reels.length === 0" class="notice">Loading reels…</div>

      <!-- FEED -->
      <main class="feed" ref="feedRef">
        <section
          v-for="(r, idx) in reels"
          :key="r.id"
          class="reel-card"
        >
          <!-- MEDIA -->
          <div class="media">
            <video
              v-if="isVideo(r)"
              class="video"
              :ref="(el) => setVideoRef(el, r.id)"
              :src="mediaUrl(r)"
              playsinline
              preload="metadata"
              :muted="muted"
              loop
              @click="togglePlay(r.id)"
            />
            <img
              v-else
              class="image"
              :src="mediaUrl(r)"
              alt="reel"
              @click="toggleLike(r)"
            />

            <!-- Overlay -->
            <div class="overlay">
              <div class="meta">
                <div class="name">
                  {{ r.user?.display_name || r.user?.username || r.display_name || r.username || "User" }}
                </div>
                <div v-if="r.caption" class="caption">{{ r.caption }}</div>
              </div>

              <div class="actions">
                <button class="act" @click="toggleLike(r)">
                  <div class="icon" :class="{ liked: !!r.liked_by_me }">❤️</div>
                  <div class="count">{{ r.likes_count ?? 0 }}</div>
                </button>

                <button class="act" @click="openComments(r)">
                  <div class="icon">💬</div>
                  <div class="count">{{ r.comments_count ?? 0 }}</div>
                </button>

                <button class="act" @click="copyLink(r)">
                  <div class="icon">🔗</div>
                  <div class="count">Share</div>
                </button>
              </div>
            </div>

            <!-- Play hint -->
            <div v-if="isVideo(r) && pausedIds.has(r.id)" class="play-hint">
              ▶ Tap to play
            </div>
          </div>
        </section>

        <div v-if="!loading && reels.length === 0" class="empty">
          No reels yet. Upload the first one 🔥
        </div>

        <div v-if="loading && reels.length > 0" class="notice">Loading more…</div>
      </main>

      <!-- UPLOAD MODAL -->
      <div v-if="uploadOpen" class="modal-backdrop" @click.self="closeUpload">
        <div class="modal">
          <div class="modal-head">
            <div class="modal-title">Upload Reel</div>
            <button class="x" @click="closeUpload">✕</button>
          </div>

          <div class="modal-body">
            <div class="row">
              <label class="label">Video (or image)</label>
              <input
                type="file"
                accept="video/*,image/*"
                @change="onPickFile"
              />
              <div class="hint" v-if="pickedFile">
                Selected: <b>{{ pickedFile.name }}</b>
              </div>
            </div>

            <div class="row">
              <label class="label">Caption</label>
              <textarea
                v-model="newCaption"
                class="input"
                placeholder="Say something…"
                rows="3"
              />
            </div>

            <div v-if="uploadErr" class="notice err">{{ uploadErr }}</div>
            <div v-if="uploading" class="notice">Uploading…</div>
          </div>

          <div class="modal-foot">
            <button class="btn" @click="closeUpload" :disabled="uploading">
              Cancel
            </button>
            <button class="btn primary" @click="submitReel" :disabled="uploading || !pickedFile">
              Post Reel
            </button>
          </div>
        </div>
      </div>

      <!-- COMMENTS DRAWER -->
      <div v-if="commentsOpen" class="drawer-backdrop" @click.self="closeComments">
        <div class="drawer">
          <div class="drawer-head">
            <div class="drawer-title">Comments</div>
            <button class="x" @click="closeComments">✕</button>
          </div>

          <div class="drawer-body">
            <div v-if="commentsLoading" class="notice">Loading comments…</div>
            <div v-if="commentsErr" class="notice err">{{ commentsErr }}</div>

            <div v-if="comments.length === 0 && !commentsLoading" class="empty">
              No comments yet. Be first 👇
            </div>

            <div v-for="c in comments" :key="c.id" class="comment">
              <div class="c-top">
                <div class="c-name">
                  {{ c.user?.display_name || c.user?.username || c.display_name || c.username || "User" }}
                </div>
                <div class="c-time">{{ formatTime(c.created_at) }}</div>
              </div>
              <div class="c-text">{{ c.text }}</div>
            </div>
          </div>

          <div class="drawer-foot">
            <input
              class="c-input"
              v-model="commentText"
              placeholder="Write a comment…"
              @keydown.enter.prevent="sendComment"
            />
            <button class="btn primary" @click="sendComment" :disabled="!commentText.trim() || commentsSending">
              Send
            </button>
          </div>
        </div>
      </div>

      <!-- Toast -->
      <div v-if="toast" class="toast">{{ toast }}</div>
    </div>
  </Layout>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import Layout from "../components/Layout.vue";

// If you have auth store:
import { useAuthStore } from "../stores/auth.store";

const auth = useAuthStore();
const token = computed(() => auth?.token || localStorage.getItem("token") || "");

const apiBase = import.meta.env.VITE_API_URL || "";

/* ---------------------------
   State
--------------------------- */
const reels = ref([]);
const loading = ref(false);
const error = ref("");

const feedRef = ref(null);
const videoEls = new Map(); // reelId -> videoEl
const observer = ref(null);
const muted = ref(true);
const pausedIds = ref(new Set());

const page = ref(0);
const hasMore = ref(true);

/* Upload */
const uploadOpen = ref(false);
const pickedFile = ref(null);
const newCaption = ref("");
const uploading = ref(false);
const uploadErr = ref("");

/* Comments */
const commentsOpen = ref(false);
const activeReel = ref(null);
const comments = ref([]);
const commentsLoading = ref(false);
const commentsErr = ref("");
const commentText = ref("");
const commentsSending = ref(false);

/* Toast */
const toast = ref("");
let toastTimer = null;

/* ---------------------------
   Helpers
--------------------------- */
function showToast(msg, ms = 1600) {
  toast.value = msg;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (toast.value = ""), ms);
}

function apiUrl(path) {
  // ensure no double slashes
  if (!apiBase) return path;
  return apiBase.replace(/\/$/, "") + "/" + String(path).replace(/^\//, "");
}

async function apiFetch(path, options = {}) {
  const headers = options.headers ? { ...options.headers } : {};

  if (token.value) headers.Authorization = `Bearer ${token.value}`;

  // If body is plain object, send JSON
  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(apiUrl(path), {
    ...options,
    headers,
    body:
      options.body && !(options.body instanceof FormData)
        ? JSON.stringify(options.body)
        : options.body,
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // backend sometimes returns HTML on error — keep raw
    data = { raw: text };
  }

  if (!res.ok) {
    const msg =
      data?.error ||
      data?.message ||
      (typeof data?.raw === "string" ? data.raw : "") ||
      `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

function isVideo(r) {
  const t = (r.media_type || r.type || "").toLowerCase();
  if (t) return t.includes("video");
  const u = mediaUrl(r);
  return /\.(mp4|mov|webm|m4v)(\?|$)/i.test(u || "");
}

function mediaUrl(r) {
  return (
    r.video_url ||
    r.media_url ||
    r.url || // just in case
    ""
  );
}

function formatTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString();
}

/* ---------------------------
   Video observer
--------------------------- */
function setVideoRef(el, reelId) {
  if (!el) return;
  videoEls.set(reelId, el);
  pausedIds.value.add(reelId);
}

function setupObserver() {
  if (observer.value) observer.value.disconnect();

  observer.value = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        const card = e.target;
        const id = Number(card.getAttribute("data-reel-id"));
        if (!id) continue;

        const v = videoEls.get(id);
        if (!v) continue;

        if (e.isIntersecting && e.intersectionRatio >= 0.6) {
          v.muted = muted.value;
          v.play().then(() => {
            pausedIds.value.delete(id);
          }).catch(() => {
            // iOS may block autoplay until user interacts
            pausedIds.value.add(id);
          });
        } else {
          v.pause();
          pausedIds.value.add(id);
        }
      }
    },
    { threshold: [0.2, 0.6, 0.9] }
  );

  // attach to all cards
  nextTick(() => {
    const cards = feedRef.value?.querySelectorAll?.(".reel-card");
    cards?.forEach((c) => {
      const rid = c.getAttribute("data-reel-id");
      if (rid) observer.value.observe(c);
    });
  });
}

function toggleMute() {
  muted.value = !muted.value;
  // apply to all videos
  for (const v of videoEls.values()) {
    v.muted = muted.value;
  }
  showToast(muted.value ? "Muted" : "Sound on");
}

function togglePlay(reelId) {
  const v = videoEls.get(reelId);
  if (!v) return;

  if (v.paused) {
    v.muted = muted.value;
    v.play().then(() => {
      pausedIds.value.delete(reelId);
    }).catch(() => {
      pausedIds.value.add(reelId);
    });
  } else {
    v.pause();
    pausedIds.value.add(reelId);
  }
}

/* ---------------------------
   Load feed
--------------------------- */
async function loadReels(reset = false) {
  if (loading.value) return;
  loading.value = true;
  error.value = "";

  try {
    if (reset) {
      page.value = 0;
      hasMore.value = true;
      reels.value = [];
      // stop any playing videos
      for (const v of videoEls.values()) v.pause();
      videoEls.clear();
      pausedIds.value = new Set();
    }

    // Your backend might support ?page & ?limit OR just returns latest
    const limit = 10;
    const nextPage = page.value + 1;

    let data;
    try {
      data = await apiFetch(`/reels?page=${nextPage}&limit=${limit}`);
    } catch {
      // fallback if your route doesn't have paging
      data = await apiFetch(`/reels`);
    }

    const list = Array.isArray(data) ? data : (data?.rows || data?.items || []);
    if (reset) reels.value = list;
    else reels.value = [...reels.value, ...list];

    page.value = nextPage;

    // if paging exists: detect end
    if (list.length < limit) hasMore.value = false;

    await nextTick();

    // mark data-reel-id for observer
    const cards = feedRef.value?.querySelectorAll?.(".reel-card");
    cards?.forEach((c, i) => {
      const r = reels.value[i];
      if (r?.id) c.setAttribute("data-reel-id", String(r.id));
    });

    setupObserver();
  } catch (e) {
    error.value = e?.message || "Failed to load reels";
  } finally {
    loading.value = false;
  }
}

function attachInfiniteScroll() {
  const el = feedRef.value;
  if (!el) return;

  const onScroll = async () => {
    if (!hasMore.value || loading.value) return;
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 250;
    if (nearBottom) await loadReels(false);
  };

  el.addEventListener("scroll", onScroll);
  return () => el.removeEventListener("scroll", onScroll);
}

let detachScroll = null;

onMounted(async () => {
  await loadReels(true);
  detachScroll = attachInfiniteScroll();
});

onBeforeUnmount(() => {
  detachScroll?.();
  observer.value?.disconnect?.();
  clearTimeout(toastTimer);
});

/* ---------------------------
   Likes
--------------------------- */
async function toggleLike(r) {
  if (!token.value) return showToast("Login again to like.");

  const id = r.id;
  const currentlyLiked = !!r.liked_by_me;

  // optimistic UI
  r.liked_by_me = !currentlyLiked;
  r.likes_count = (r.likes_count ?? 0) + (currentlyLiked ? -1 : 1);

  try {
    // Support both styles:
    // 1) POST /reels/:id/like  -> { liked: true/false, likes_count }
    // 2) POST /reels/:id/likes or /reels/:id/toggle-like
    let res;
    try {
      res = await apiFetch(`/reels/${id}/like`, { method: "POST" });
    } catch {
      res = await apiFetch(`/reels/${id}/toggle-like`, { method: "POST" });
    }

    if (typeof res?.likes_count === "number") r.likes_count = res.likes_count;
    if (typeof res?.liked === "boolean") r.liked_by_me = res.liked;
  } catch (e) {
    // rollback if failed
    r.liked_by_me = currentlyLiked;
    r.likes_count = (r.likes_count ?? 0) + (currentlyLiked ? 0 : -1) + (currentlyLiked ? 1 : 0);
    showToast(e?.message || "Like failed");
  }
}

/* ---------------------------
   Share link
--------------------------- */
async function copyLink(r) {
  const url = `${window.location.origin}/reels/${r.id}`;
  try {
    await navigator.clipboard.writeText(url);
    showToast("Link copied ✅");
  } catch {
    showToast(url);
  }
}

/* ---------------------------
   Upload
--------------------------- */
function openUpload() {
  uploadErr.value = "";
  uploadOpen.value = true;
}
function closeUpload() {
  if (uploading.value) return;
  uploadOpen.value = false;
  pickedFile.value = null;
  newCaption.value = "";
  uploadErr.value = "";
}

function onPickFile(e) {
  const f = e?.target?.files?.[0];
  if (!f) return;
  pickedFile.value = f;
}

async function submitReel() {
  uploadErr.value = "";
  if (!token.value) return (uploadErr.value = "Login again to upload.");
  if (!pickedFile.value) return (uploadErr.value = "Pick a file first.");

  uploading.value = true;

  try {
    // 1) Upload to Cloudinary via your backend
    const form = new FormData();
    // IMPORTANT: your backend uses .single("file")
    form.append("file", pickedFile.value);

    const up = await apiFetch("/upload", {
      method: "POST",
      body: form,
    });

    const uploadedUrl = up?.url;
    const uploadedType = up?.type || (pickedFile.value.type?.startsWith("video/") ? "video" : "image");

    if (!uploadedUrl) throw new Error("Upload returned no url.");

    // 2) Create reel
    // Support both payload styles
    let created;
    try {
      created = await apiFetch("/reels", {
        method: "POST",
        body: {
          caption: newCaption.value || "",
          video_url: uploadedType === "video" ? uploadedUrl : null,
          image_url: uploadedType === "image" ? uploadedUrl : null,
          // also provide generic
          media_url: uploadedUrl,
          media_type: uploadedType,
        },
      });
    } catch {
      // fallback minimal
      created = await apiFetch("/reels", {
        method: "POST",
        body: {
          caption: newCaption.value || "",
          media_url: uploadedUrl,
          media_type: uploadedType,
        },
      });
    }

    // Add to top
    if (created) reels.value = [created, ...reels.value];

    closeUpload();
    showToast("Reel posted ✅");

    await nextTick();
    setupObserver();
  } catch (e) {
    uploadErr.value = e?.message || "Upload failed";
  } finally {
    uploading.value = false;
  }
}

/* ---------------------------
   Comments
--------------------------- */
function openComments(r) {
  activeReel.value = r;
  commentsOpen.value = true;
  comments.value = [];
  commentText.value = "";
  commentsErr.value = "";
  loadComments();
}
function closeComments() {
  commentsOpen.value = false;
  activeReel.value = null;
  comments.value = [];
  commentText.value = "";
  commentsErr.value = "";
}

async function loadComments() {
  if (!activeReel.value) return;
  commentsLoading.value = true;
  commentsErr.value = "";

  try {
    const id = activeReel.value.id;

    let data;
    try {
      data = await apiFetch(`/reels/${id}/comments`);
    } catch {
      data = await apiFetch(`/reel-comments?reelId=${id}`);
    }

    comments.value = Array.isArray(data) ? data : (data?.rows || []);
  } catch (e) {
    commentsErr.value = e?.message || "Failed to load comments";
  } finally {
    commentsLoading.value = false;
  }
}

async function sendComment() {
  if (!token.value) return showToast("Login again to comment.");
  if (!activeReel.value) return;

  const text = commentText.value.trim();
  if (!text) return;

  commentsSending.value = true;
  commentsErr.value = "";

  try {
    const id = activeReel.value.id;

    let c;
    try {
      c = await apiFetch(`/reels/${id}/comments`, {
        method: "POST",
        body: { text },
      });
    } catch {
      c = await apiFetch(`/reel-comments`, {
        method: "POST",
        body: { reel_id: id, text },
      });
    }

    if (c) comments.value = [c, ...comments.value];
    commentText.value = "";

    // bump count
    activeReel.value.comments_count = (activeReel.value.comments_count ?? 0) + 1;
  } catch (e) {
    commentsErr.value = e?.message || "Comment failed";
  } finally {
    commentsSending.value = false;
  }
}
</script>

<style scoped>
.reels-page{
  min-height: 100%;
  padding: 14px 14px 90px; /* leave space for bottom nav */
}

.topbar{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:12px;
  margin-bottom:12px;
}
.title{ font-size:22px; font-weight:900; letter-spacing:.3px; }
.sub{ opacity:.75; font-size:12px; margin-top:2px; }

.pill{
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(255,255,255,.06);
  padding: 10px 12px;
  border-radius: 999px;
  color: #fff;
}
.pill.primary{
  background: linear-gradient(135deg, #ff3b7a, #ff7a3b);
  border: none;
  font-weight: 800;
}

.notice{
  margin: 10px 0;
  padding: 12px;
  border-radius: 14px;
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.10);
}
.notice.err{
  background: rgba(255,60,60,.12);
  border-color: rgba(255,60,60,.22);
  color: #ffd0d0;
}

.feed{
  height: calc(100vh - 160px);
  overflow: auto;
  scroll-snap-type: y mandatory;
  border-radius: 18px;
}
.reel-card{
  position: relative;
  scroll-snap-align: start;
  padding: 10px;
}

.media{
  position: relative;
  height: calc(100vh - 190px);
  border-radius: 18px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(0,0,0,.22);
}

.video, .image{
  width: 100%;
  height: 100%;
  object-fit: cover;
  display:block;
}

.overlay{
  position:absolute;
  inset: 0;
  display:flex;
  align-items:flex-end;
  justify-content:space-between;
  padding: 14px;
  background: linear-gradient(to top, rgba(0,0,0,.55), rgba(0,0,0,0) 60%);
  pointer-events:none;
}

.meta{
  max-width: 70%;
  pointer-events:none;
}
.name{
  font-weight: 900;
  font-size: 16px;
  text-shadow: 0 6px 14px rgba(0,0,0,.5);
}
.caption{
  margin-top: 6px;
  font-size: 14px;
  opacity: .95;
  line-height: 1.2;
  text-shadow: 0 6px 14px rgba(0,0,0,.5);
}

.actions{
  display:flex;
  flex-direction:column;
  gap: 12px;
  pointer-events:auto;
}
.act{
  width: 64px;
  padding: 10px 8px;
  border-radius: 18px;
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(0,0,0,.25);
  color: #fff;
}
.icon{
  font-size: 22px;
}
.icon.liked{
  filter: drop-shadow(0 6px 12px rgba(255,60,120,.35));
}
.count{
  margin-top: 6px;
  font-size: 12px;
  opacity: .9;
}

.play-hint{
  position:absolute;
  inset:auto 14px 14px 14px;
  padding: 10px 12px;
  border-radius: 14px;
  background: rgba(0,0,0,.35);
  border: 1px solid rgba(255,255,255,.12);
  text-align:center;
  font-weight: 700;
}

.empty{
  padding: 18px;
  text-align:center;
  opacity:.8;
}

/* Modal */
.modal-backdrop{
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.6);
  display:flex;
  align-items:center;
  justify-content:center;
  z-index: 50;
  padding: 16px;
}
.modal{
  width: min(560px, 100%);
  border-radius: 18px;
  background: rgba(20,24,34,.95);
  border: 1px solid rgba(255,255,255,.12);
  overflow:hidden;
}
.modal-head, .drawer-head{
  display:flex;
  align-items:center;
  justify-content:space-between;
  padding: 14px 14px;
  border-bottom: 1px solid rgba(255,255,255,.10);
}
.modal-title, .drawer-title{
  font-weight: 900;
  font-size: 16px;
}
.x{
  width: 40px;
  height: 40px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(255,255,255,.06);
  color: #fff;
}
.modal-body{
  padding: 14px;
}
.row{ margin-bottom: 12px; }
.label{ display:block; font-size: 12px; opacity: .8; margin-bottom: 6px; }
.input{
  width: 100%;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(255,255,255,.06);
  color: #fff;
  padding: 12px;
}
.hint{ margin-top: 6px; font-size: 12px; opacity: .8; }
.modal-foot{
  display:flex;
  gap: 10px;
  justify-content:flex-end;
  padding: 14px;
  border-top: 1px solid rgba(255,255,255,.10);
}
.btn{
  padding: 10px 14px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(255,255,255,.06);
  color: #fff;
}
.btn.primary{
  background: linear-gradient(135deg, #ff3b7a, #ff7a3b);
  border: none;
  font-weight: 900;
}

/* Drawer */
.drawer-backdrop{
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.65);
  z-index: 60;
  display:flex;
  justify-content:flex-end;
}
.drawer{
  width: min(520px, 100%);
  height: 100%;
  background: rgba(20,24,34,.98);
  border-left: 1px solid rgba(255,255,255,.12);
  display:flex;
  flex-direction:column;
}
.drawer-body{
  flex: 1;
  overflow: auto;
  padding: 12px;
}
.comment{
  padding: 10px 12px;
  border-radius: 14px;
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.10);
  margin-bottom: 10px;
}
.c-top{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap: 10px;
}
.c-name{ font-weight: 900; font-size: 13px; }
.c-time{ opacity: .65; font-size: 11px; }
.c-text{ margin-top: 6px; font-size: 14px; }
.drawer-foot{
  padding: 12px;
  border-top: 1px solid rgba(255,255,255,.10);
  display:flex;
  gap: 10px;
}
.c-input{
  flex: 1;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(255,255,255,.06);
  color: #fff;
  padding: 12px;
}

/* Toast */
.toast{
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: 92px;
  z-index: 100;
  padding: 10px 14px;
  border-radius: 999px;
  background: rgba(0,0,0,.55);
  border: 1px solid rgba(255,255,255,.12);
  color: #fff;
  font-weight: 700;
}
</style>