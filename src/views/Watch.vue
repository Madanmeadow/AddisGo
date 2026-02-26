<template>
  <div class="watch">
    <!-- Top bar -->
    <header class="top">
      <button class="topbtn" @click="goBack">←</button>
      <div class="topmeta">
        <div class="pill">{{ kindLabel }}</div>
        <div class="sub">Swipe up/down • Tap video to mute</div>
      </div>
      <button class="topbtn" @click="toggleGlobalMute">{{ globalMuted ? "🔇" : "🔊" }}</button>
    </header>

    <!-- Slides -->
    <div ref="scroller" class="scroller" @scroll.passive="onScroll">
      <section
        v-for="(p, idx) in posts"
        :key="p.id"
        class="slide"
        :data-id="p.id"
      >
        <!-- Media -->
        <div class="mediaWrap" @click="onTapMedia(p)">
          <img v-if="p.image_url" class="img" :src="media(p.image_url)" />

          <video
            v-if="p.video_url"
            class="vid"
            :data-post-id="p.id"
            :src="media(p.video_url)"
            playsinline
            preload="metadata"
            loop
            muted
          ></video>

          <!-- Overlay -->
          <div class="overlay">
            <div class="leftInfo">
              <div class="user">User #{{ p.user_id }}</div>
              <div class="caption" v-if="p.caption">{{ p.caption }}</div>
              <div class="time">{{ fmt(p.created_at) }}</div>
            </div>

            <div class="rightStack">
              <button class="stackBtn" @click.stop="toggleLike(p)">
                <div class="ico">❤️</div>
                <div class="num">{{ likesByPost[p.id]?.count ?? 0 }}</div>
              </button>

              <button class="stackBtn" @click.stop="openComments(p)">
                <div class="ico">💬</div>
                <div class="num">{{ (commentsByPost[p.id] || []).length }}</div>
              </button>

              <button class="stackBtn" @click.stop="share(p)">
                <div class="ico">🔗</div>
                <div class="num">Share</div>
              </button>

              <button class="stackBtn" @click.stop="jumpTo(idx - 1)" :disabled="idx === 0">
                <div class="ico">⬆️</div>
                <div class="num">Prev</div>
              </button>

              <button class="stackBtn" @click.stop="jumpTo(idx + 1)" :disabled="idx === posts.length - 1">
                <div class="ico">⬇️</div>
                <div class="num">Next</div>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- Comments drawer -->
    <div v-if="commentsOpen" class="drawer" @click.self="commentsOpen=false">
      <div class="drawerCard">
        <div class="drawerHead">
          <div class="drawerTitle">Comments</div>
          <button class="x" @click="commentsOpen=false">✕</button>
        </div>

        <div v-if="commentLoading" class="drawerState">Loading…</div>

        <div v-else class="drawerList">
          <div v-if="(commentsByPost[activePostId] || []).length === 0" class="drawerEmpty">
            Be the first to comment.
          </div>

          <div v-for="c in (commentsByPost[activePostId] || [])" :key="c.id" class="c">
            <div class="cTop">
              <span class="badge">{{ c.username || c.name || c.email || `User #${c.user_id}` }}</span>
              <span class="ctime">{{ fmt(c.created_at) }}</span>
            </div>
            <div class="cBody">{{ c.body }}</div>
          </div>
        </div>

        <div class="drawerCompose">
          <input
            v-model="commentDraft"
            placeholder="Write a comment…"
            @keydown.enter.prevent="sendComment"
          />
          <button class="send" :disabled="commentBusy || !commentDraft.trim()" @click="sendComment">
            {{ commentBusy ? "…" : "Send" }}
          </button>
        </div>

        <div v-if="commentError" class="drawerErr">{{ commentError }}</div>
      </div>
    </div>

    <div v-if="toast" class="toast">{{ toast }}</div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";

const apiUrl = import.meta.env.VITE_API_URL;
const token = localStorage.getItem("token");
const me = (() => { try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; } })();

const route = useRoute();
const router = useRouter();

const startId = Number(route.params.id || 0);
const scroller = ref(null);

const posts = ref([]);
const activePostId = ref(startId || null);
const toast = ref("");

const globalMuted = ref(true);
const localMutedByPost = ref({}); // { [postId]: true }

const kindLabel = computed(() => "WATCH");

function fmt(d) {
  if (!d) return "";
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? "" : dt.toLocaleString();
}
function media(url) {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return `${apiUrl}${url}`;
}

function goBack() {
  // keeps scroll position in Dashboard better than push
  router.back();
}

function setToast(msg) {
  toast.value = msg;
  setTimeout(() => (toast.value = ""), 1200);
}

/* ===== Fetch posts (same endpoint you already use) ===== */
async function fetchPosts() {
  const res = await fetch(`${apiUrl}/posts`);
  const data = await res.json();
  posts.value = Array.isArray(data) ? data : [];

  // ensure activePostId exists
  if (!activePostId.value && posts.value.length) activePostId.value = posts.value[0].id;

  await nextTick();
  scrollToId(activePostId.value);
  applyMuteToAllVideos();
  autoplayActive();
}

/* ===== Scroll helpers ===== */
function scrollToId(id) {
  const el = scroller.value?.querySelector?.(`.slide[data-id="${id}"]`);
  el?.scrollIntoView?.({ block: "start" });
}

function jumpTo(index) {
  if (index < 0 || index >= posts.value.length) return;
  const id = posts.value[index].id;
  activePostId.value = id;
  scrollToId(id);
  nextTick(() => {
    applyMuteToAllVideos();
    autoplayActive();
  });
}

/* ===== Active slide detection ===== */
let scrollTimer = null;
function onScroll() {
  clearTimeout(scrollTimer);
  scrollTimer = setTimeout(() => {
    // find slide closest to top
    const slides = Array.from(scroller.value?.querySelectorAll?.(".slide") || []);
    if (!slides.length) return;

    const top = scroller.value.getBoundingClientRect().top;
    let best = null;
    let bestDist = Infinity;

    for (const s of slides) {
      const r = s.getBoundingClientRect();
      const dist = Math.abs(r.top - top);
      if (dist < bestDist) { bestDist = dist; best = s; }
    }

    const id = Number(best?.getAttribute("data-id") || 0) || null;
    if (id && id !== activePostId.value) {
      activePostId.value = id;
      applyMuteToAllVideos();
      autoplayActive();
      preloadLikes(id);
    }
  }, 80);
}

/* ===== Video autoplay / mute ===== */
function isMuted(postId) {
  return globalMuted.value || !!localMutedByPost.value[postId];
}

function toggleGlobalMute() {
  globalMuted.value = !globalMuted.value;
  applyMuteToAllVideos();
  setToast(globalMuted.value ? "Muted" : "Sound on");
}

function onTapMedia(post) {
  // tap video toggles local mute (TikTok behavior)
  if (post?.video_url) {
    const prev = !!localMutedByPost.value[post.id];
    localMutedByPost.value = { ...localMutedByPost.value, [post.id]: !prev };
    applyMuteToAllVideos();
    setToast(isMuted(post.id) ? "🔇" : "🔊");
  }
}

function applyMuteToAllVideos() {
  const vids = document.querySelectorAll("video.vid");
  vids.forEach((v) => {
    const pid = Number(v.getAttribute("data-post-id") || 0);
    v.muted = isMuted(pid);
    v.volume = v.muted ? 0 : 1;
  });
}

async function autoplayActive() {
  const vids = Array.from(document.querySelectorAll("video.vid"));
  for (const v of vids) {
    const pid = Number(v.getAttribute("data-post-id") || 0);
    if (pid === activePostId.value) {
      try { await v.play(); } catch {}
    } else {
      try { v.pause(); } catch {}
    }
  }
}

/* ===== Likes ===== */
const likesByPost = ref({});
const likeBusyByPost = ref({});

async function preloadLikes(postId) {
  if (!token || likesByPost.value[postId]) return;
  try {
    const res = await fetch(`${apiUrl}/likes/${postId}`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (!res.ok) return;
    likesByPost.value = { ...likesByPost.value, [postId]: { count: data?.count ?? 0, likedByMe: !!data?.likedByMe } };
  } catch {}
}

async function toggleLike(post) {
  const postId = post.id;
  if (!token) return alert("Login again to like.");

  await preloadLikes(postId);

  const prev = likesByPost.value[postId] || { count: 0, likedByMe: false };
  const optimisticLiked = !prev.likedByMe;
  const optimisticCount = Math.max(0, prev.count + (optimisticLiked ? 1 : -1));

  likesByPost.value = { ...likesByPost.value, [postId]: { count: optimisticCount, likedByMe: optimisticLiked } };
  likeBusyByPost.value = { ...likeBusyByPost.value, [postId]: true };

  try {
    const res = await fetch(`${apiUrl}/likes/${postId}/toggle`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) {
      likesByPost.value = { ...likesByPost.value, [postId]: prev };
      return;
    }
    likesByPost.value = { ...likesByPost.value, [postId]: { count: data?.count ?? optimisticCount, likedByMe: !!data?.likedByMe } };
  } catch {
    likesByPost.value = { ...likesByPost.value, [postId]: prev };
  } finally {
    likeBusyByPost.value = { ...likeBusyByPost.value, [postId]: false };
  }
}

/* ===== Comments ===== */
const commentsOpen = ref(false);
const commentsByPost = ref({});
const commentDraft = ref("");
const commentLoading = ref(false);
const commentBusy = ref(false);
const commentError = ref("");

async function openComments(post) {
  activePostId.value = post.id;
  commentsOpen.value = true;
  await loadComments(post.id, true);
}

async function loadComments(postId, force = false) {
  if (!force && Array.isArray(commentsByPost.value[postId])) return;
  commentLoading.value = true;
  commentError.value = "";

  try {
    const res = await fetch(`${apiUrl}/posts/${postId}/comments`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const data = await res.json();
    if (!res.ok) {
      commentError.value = data?.error || "Failed to load comments";
      commentsByPost.value = { ...commentsByPost.value, [postId]: [] };
      return;
    }
    const items = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
    commentsByPost.value = { ...commentsByPost.value, [postId]: items };
  } catch {
    commentError.value = "Failed to load comments";
    commentsByPost.value = { ...commentsByPost.value, [postId]: [] };
  } finally {
    commentLoading.value = false;
  }
}

async function sendComment() {
  const postId = activePostId.value;
  if (!token) return alert("Login again to comment.");
  const text = commentDraft.value.trim();
  if (!text) return;

  commentBusy.value = true;
  commentError.value = "";

  const tempId = `tmp-${Date.now()}`;
  const optimistic = {
    id: tempId,
    post_id: postId,
    user_id: me?.id || 0,
    username: me?.username || "me",
    body: text,
    created_at: new Date().toISOString(),
    _optimistic: true,
  };

  commentsByPost.value = { ...commentsByPost.value, [postId]: [optimistic, ...(commentsByPost.value[postId] || [])] };
  commentDraft.value = "";

  try {
    const res = await fetch(`${apiUrl}/posts/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ body: text }),
    });
    const data = await res.json();
    if (!res.ok) {
      // rollback optimistic
      commentsByPost.value = { ...commentsByPost.value, [postId]: (commentsByPost.value[postId] || []).filter((c) => c.id !== tempId) };
      commentError.value = data?.error || "Failed to send comment";
      return;
    }

    commentsByPost.value = {
      ...commentsByPost.value,
      [postId]: (commentsByPost.value[postId] || []).map((c) => (c.id === tempId ? data : c)),
    };
  } catch {
    commentsByPost.value = { ...commentsByPost.value, [postId]: (commentsByPost.value[postId] || []).filter((c) => c.id !== tempId) };
    commentError.value = "Failed to send comment";
  } finally {
    commentBusy.value = false;
  }
}

/* ===== Share ===== */
async function share(post) {
  const url = `${window.location.origin}/watch/${post.id}`;
  try {
    if (navigator.share) {
      await navigator.share({ title: "AddisGo", text: post.caption || "Post", url });
      return;
    }
  } catch {}
  try { await navigator.clipboard.writeText(url); setToast("Link copied"); }
  catch { alert(url); }
}

onMounted(async () => {
  await fetchPosts();
  if (activePostId.value) preloadLikes(activePostId.value);

  // keyboard support
  const onKey = (e) => {
    if (e.key === "ArrowDown") jumpTo(posts.value.findIndex(p => p.id === activePostId.value) + 1);
    if (e.key === "ArrowUp") jumpTo(posts.value.findIndex(p => p.id === activePostId.value) - 1);
    if (e.key === "Escape") goBack();
  };
  window.addEventListener("keydown", onKey);
  cleanupKey = () => window.removeEventListener("keydown", onKey);
});

let cleanupKey = null;

onBeforeUnmount(() => {
  try { cleanupKey?.(); } catch {}
  clearTimeout(scrollTimer);
});
</script>

<style scoped>
.watch{
  min-height: 100vh;
  background: #0b1220;
  color: white;
}
.top{
  position: fixed;
  inset: 0 0 auto 0;
  height: 64px;
  z-index: 50;
  display:flex;
  align-items:center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  background: rgba(8, 12, 20, 0.75);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255,255,255,0.10);
}
.topbtn{
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(255,255,255,0.10);
  color:white;
  border-radius: 14px;
  padding: 10px 12px;
  cursor:pointer;
}
.topmeta{ display:grid; gap: 2px; text-align:center; }
.pill{
  display:inline-block;
  margin: 0 auto;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(255,255,255,0.10);
  border: 1px solid rgba(255,255,255,0.14);
  font-weight: 950;
  font-size: 12px;
}
.sub{ opacity: .75; font-size: 12px; }

.scroller{
  height: 100vh;
  overflow-y: auto;
  scroll-snap-type: y mandatory;
  padding-top: 64px;
}
.slide{
  scroll-snap-align: start;
  height: calc(100vh - 64px);
  padding: 0;
}

.mediaWrap{
  position: relative;
  height: 100%;
  background: #000;
  overflow: hidden;
}
.img, .vid{
  width: 100%;
  height: 100%;
  object-fit: cover;
  display:block;
}

.overlay{
  position:absolute;
  inset: 0;
  display:flex;
  justify-content: space-between;
  padding: 14px;
  pointer-events: none;
  background: linear-gradient(to top, rgba(0,0,0,0.60), transparent 55%);
}
.leftInfo{
  align-self: flex-end;
  max-width: 70%;
  display:grid;
  gap: 8px;
}
.user{ font-weight: 950; }
.caption{ opacity: .95; line-height: 1.45; }
.time{ opacity:.7; font-size: 12px; }

.rightStack{
  pointer-events: auto;
  align-self: flex-end;
  display:flex;
  flex-direction: column;
  gap: 10px;
}
.stackBtn{
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(0,0,0,0.35);
  color: white;
  border-radius: 16px;
  padding: 10px 10px;
  cursor: pointer;
  width: 72px;
}
.stackBtn:disabled{ opacity:.5; cursor:not-allowed; }
.ico{ font-size: 18px; }
.num{ margin-top: 6px; font-weight: 950; font-size: 12px; }

.drawer{
  position: fixed;
  inset: 0;
  z-index: 80;
  background: rgba(0,0,0,0.55);
  display:grid;
  place-items: end center;
}
.drawerCard{
  width: min(720px, 100%);
  background: rgba(12, 18, 32, 0.97);
  border: 1px solid rgba(255,255,255,0.14);
  border-radius: 18px 18px 0 0;
  padding: 12px;
  max-height: 72vh;
  overflow: hidden;
  display:flex;
  flex-direction: column;
}
.drawerHead{ display:flex; justify-content: space-between; align-items:center; }
.drawerTitle{ font-weight: 950; }
.x{
  border:none;
  background: rgba(255,255,255,0.10);
  color:white;
  border-radius: 10px;
  padding: 6px 10px;
  cursor:pointer;
}
.drawerList{
  margin-top: 10px;
  overflow:auto;
  display:grid;
  gap: 10px;
  padding-right: 4px;
}
.drawerState, .drawerEmpty{ opacity: .8; padding: 14px; text-align:center; }
.c{
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.10);
  border-radius: 14px;
  padding: 10px;
}
.cTop{ display:flex; justify-content: space-between; gap: 10px; }
.badge{
  font-weight: 950;
  font-size: 12px;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(255,255,255,0.10);
  border: 1px solid rgba(255,255,255,0.12);
}
.ctime{ opacity:.7; font-size: 12px; }
.cBody{ margin-top: 8px; line-height: 1.45; }

.drawerCompose{
  margin-top: 10px;
  display:flex;
  gap: 8px;
}
.drawerCompose input{
  flex: 1;
  background: rgba(0,0,0,0.35);
  border: 1px solid rgba(255,255,255,0.12);
  color: white;
  padding: 10px 12px;
  border-radius: 12px;
  outline: none;
}
.send{
  border:none;
  border-radius: 12px;
  padding: 10px 12px;
  cursor:pointer;
  background: linear-gradient(45deg, #ff416c, #ff4b2b);
  color:white;
  font-weight: 950;
}
.send:disabled{ opacity:.6; cursor:not-allowed; }
.drawerErr{
  margin-top: 10px;
  padding: 10px;
  border-radius: 12px;
  background: rgba(255,80,80,0.18);
  border: 1px solid rgba(255,80,80,0.35);
}

.toast{
  position: fixed;
  left: 50%;
  bottom: 18px;
  transform: translateX(-50%);
  z-index: 90;
  background: rgba(12, 18, 32, 0.95);
  border: 1px solid rgba(255,255,255,0.14);
  padding: 10px 12px;
  border-radius: 999px;
  opacity: .95;
}
</style>