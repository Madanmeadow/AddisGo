<template>
  <Layout>
    <div class="page">
      <!-- LEFT -->
      <aside class="left">
        <div class="brand">
          <div class="brand-icon">🔥</div>
          <div>
            <div class="brand-title">AddisGo</div>
            <div class="brand-sub">Social • Live • Chat</div>
          </div>
        </div>

        <div class="panel">
          <div class="panel-title">🔴 Live Now</div>
          <button class="btn btn-primary w100" @click="startLive">Go Live</button>
          <div v-if="liveStreams.length === 0" class="hint mt12">No one live right now</div>

          <div v-for="stream in liveStreams" :key="stream" class="live-card" @click="joinLive(stream)">
            <span class="dot"></span>
            <span class="live-name">{{ stream }}</span>
          </div>
        </div>

        <!-- CHAT BUTTONS -->
        <div class="panel">
          <div class="panel-title">💬 Chat</div>
          <button class="btn w100" @click="toggleChat">
            {{ chatOpen ? "Close Inbox" : "Open Inbox" }}
          </button>

          <button class="btn w100 mt10" @click="openNewChat">+ New Chat</button>
        </div>

        <!-- ✅ CALL ACTIONS -->
        <div class="panel">
          <div class="panel-title">📞 Calls</div>
          <button class="btn w100" @click="startCall('audio')">📞 Audio Call</button>
          <button class="btn w100 mt10" @click="startCall('video')">🎥 Video Call</button>
          <div class="hint mt12">Tip: enter a userId for now (we’ll replace with real user list)</div>
        </div>

        <div class="panel">
          <div class="panel-title">⚡ Quick Actions</div>
          <button class="btn w100" @click="fetchPosts">Refresh Feed</button>
          <button class="btn w100 mt10" @click="scrollToTop">Scroll Top</button>
        </div>
      </aside>

      <!-- CENTER -->
      <main class="center">
        <!-- CREATE POST -->
        <section class="composer">
          <div class="composer-head">
            <div class="avatar big">{{ myInitial }}</div>
            <div>
              <div class="me">{{ me?.username || "You" }}</div>
              <div class="small muted">Share something with the world</div>
            </div>
          </div>

          <textarea v-model="caption" class="input" placeholder="What's happening?" rows="3"></textarea>

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

          <div v-if="error" class="alert">{{ error }}</div>
        </section>

        <!-- FEED -->
        <section class="feed-head">
          <div class="feed-title">Feed</div>
          <input v-model="search" class="search" placeholder="Search posts..." />
        </section>

        <section class="feed">
          <div v-if="loading" class="state">Loading posts...</div>
          <div v-else-if="filteredPosts.length === 0" class="state">No posts found.</div>

          <article v-else v-for="post in filteredPosts" :key="post.id" class="post">
            <header class="post-head">
              <div class="avatar">{{ getInitial(post.user_id) }}</div>
              <div class="who">
                <div class="name">User #{{ post.user_id }}</div>
                <div class="time">{{ formatDate(post.created_at) }}</div>
              </div>
            </header>

            <div v-if="post.caption" class="text">{{ post.caption }}</div>

            <img v-if="post.image_url" class="media" :src="getMedia(post.image_url)" loading="lazy" />

            <video
              v-if="post.video_url"
              class="media"
              :src="getMedia(post.video_url)"
              controls
              playsinline
              preload="metadata"
            ></video>

            <!-- ✅ ACTION BAR -->
            <div class="actions">
              <button
                class="action-btn"
                :class="{ active: likesByPost[post.id]?.likedByMe }"
                :disabled="likeBusyByPost[post.id]"
                @click="toggleLike(post)"
                title="Like"
              >
                <span class="icon">❤️</span>
                <span class="label">{{ likesByPost[post.id]?.count ?? 0 }}</span>
              </button>

              <button class="action-btn" @click="toggleComments(post)" title="Comments">
                <span class="icon">💬</span>
                <span class="label">{{ commentCount(post.id) }}</span>
              </button>

              <div class="spacer"></div>

              <button class="action-btn ghost" @click="sharePost(post)" title="Share">
                <span class="icon">🔗</span>
                <span class="label">Share</span>
              </button>
            </div>

            <!-- ✅ COMMENTS PANEL -->
            <div v-if="commentsOpenByPost[post.id]" class="comments">
              <div class="comments-head">
                <div class="comments-title">Comments</div>
                <button class="x" @click="commentsOpenByPost[post.id] = false">✕</button>
              </div>

              <div v-if="commentLoadingByPost[post.id]" class="comments-state">Loading comments...</div>

              <div v-else class="comments-list">
                <div v-if="(commentsByPost[post.id] || []).length === 0" class="comments-empty">
                  Be the first to comment.
                </div>

                <div v-for="c in (commentsByPost[post.id] || [])" :key="c.id" class="comment">
                  <div class="comment-top">
                    <div class="comment-who">
                      <span class="badge">{{ c.username || c.name || c.email || `User #${c.user_id}` }}</span>
                      <span class="comment-time">{{ formatDate(c.created_at) }}</span>
                    </div>
                  </div>

                  <div class="comment-text">{{ c.body }}</div>
                </div>
              </div>

              <div class="comment-compose">
                <input
                  v-model="commentDraftByPost[post.id]"
                  class="comment-input"
                  placeholder="Write a comment..."
                  @keydown.enter.prevent="submitComment(post)"
                />
                <button
                  class="btn btn-primary"
                  :disabled="commentBusyByPost[post.id] || !String(commentDraftByPost[post.id] || '').trim()"
                  @click="submitComment(post)"
                >
                  {{ commentBusyByPost[post.id] ? "Sending..." : "Send" }}
                </button>
              </div>

              <div v-if="commentErrorByPost[post.id]" class="comment-error">
                {{ commentErrorByPost[post.id] }}
              </div>
            </div>
          </article>
        </section>
      </main>

      <!-- RIGHT CHAT PANEL (desktop only) -->
      <aside v-if="chatOpen" class="right">
        <div class="panel">
          <div class="panel-title">📥 Inbox</div>

          <div class="chat-hint">(Next step: real user list + conversations/messages)</div>

          <div class="chat-list">
            <button class="chat-item" @click="selectChat('global')">🌍 Global Room</button>
            <button class="chat-item" @click="selectChat('support')">🛠 Support</button>
          </div>

          <div class="chat-box">
            <div class="chat-messages">
              <div v-for="(m, i) in chatMessages" :key="i" class="chat-msg">
                <strong>{{ m.from }}:</strong> {{ m.text }}
              </div>
            </div>

            <div class="chat-input">
              <input v-model="chatText" placeholder="Type message..." />
              <button class="btn btn-primary" @click="sendChat">Send</button>
            </div>
          </div>
        </div>
      </aside>

      <!-- ✅ MOBILE FLOATING ACTION BUTTON -->
      <button class="fab" @click="openCallSheet">📞</button>
      <div v-if="callSheetOpen" class="sheet-backdrop" @click.self="callSheetOpen=false">
        <div class="sheet">
          <div class="sheet-title">Calls</div>
          <button class="btn w100" @click="startCall('audio')">📞 Audio Call</button>
          <button class="btn w100 mt10" @click="startCall('video')">🎥 Video Call</button>
          <button class="btn w100 mt10" @click="callSheetOpen=false">Close</button>
        </div>
      </div>

      <!-- ✅ INCOMING CALL POPUP -->
      <IncomingCallModal
        v-model="incomingOpen"
        :call="incomingCall"
        :socket="socketRef"
      />
    </div>
  </Layout>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import Layout from "../components/Layout.vue";
import IncomingCallModal from "../components/IncomingCallModal.vue";
import { io } from "socket.io-client";

const router = useRouter();

const apiUrl = import.meta.env.VITE_API_URL;
const token = localStorage.getItem("token");
const me = (() => {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
})();

/* ================= POSTS ================= */
const posts = ref([]);
const loading = ref(true);
const posting = ref(false);
const error = ref("");
const caption = ref("");
const imageFile = ref(null);
const videoFile = ref(null);
const search = ref("");

const myInitial = computed(() => (me?.username ? me.username[0].toUpperCase() : "A"));

function formatDate(d) {
  if (!d) return "";
  const date = new Date(d);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
}

function getMedia(url) {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return `${apiUrl}${url}`;
}

function getInitial(userId) {
  return String(userId || "?").slice(-1);
}

async function fetchPosts() {
  try {
    loading.value = true;
    error.value = "";

    const res = await fetch(`${apiUrl}/posts`);
    const data = await res.json();

    if (!Array.isArray(data)) {
      posts.value = [];
      error.value = data?.error || "Failed to load posts";
      return;
    }

    posts.value = data;
    await preloadLikesForPosts(data.slice(0, 20));
  } catch {
    posts.value = [];
    error.value = "Failed to fetch posts";
  } finally {
    loading.value = false;
  }
}

async function submitPost() {
  if (!caption.value.trim() && !imageFile.value && !videoFile.value) return;

  try {
    posting.value = true;
    error.value = "";

    const form = new FormData();
    form.append("caption", caption.value || "");
    if (imageFile.value) form.append("image", imageFile.value);
    if (videoFile.value) form.append("video", videoFile.value);

    const res = await fetch(`${apiUrl}/posts`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });

    const newPost = await res.json();
    if (!res.ok) {
      error.value = newPost?.error || "Post failed";
      return;
    }

    posts.value.unshift(newPost);
    await ensureLikeState(newPost.id);

    caption.value = "";
    imageFile.value = null;
    videoFile.value = null;
  } catch {
    error.value = "Post failed";
  } finally {
    posting.value = false;
  }
}

function onPickImage(e) {
  imageFile.value = e.target.files?.[0] || null;
}
function onPickVideo(e) {
  videoFile.value = e.target.files?.[0] || null;
}
function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ================= LIKES ================= */
const likesByPost = ref({});
const likeBusyByPost = ref({});

async function preloadLikesForPosts(list) {
  if (!token) return;
  await Promise.allSettled(list.map((p) => ensureLikeState(p.id)));
}

async function ensureLikeState(postId) {
  if (!token) return;
  if (likesByPost.value[postId]) return;

  try {
    const res = await fetch(`${apiUrl}/likes/${postId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) return;

    likesByPost.value = {
      ...likesByPost.value,
      [postId]: { count: data?.count ?? 0, likedByMe: !!data?.likedByMe },
    };
  } catch {}
}

async function toggleLike(post) {
  const postId = post.id;
  if (!token) return alert("Please login again.");

  await ensureLikeState(postId);

  const prev = likesByPost.value[postId] || { count: 0, likedByMe: false };
  const optimisticLiked = !prev.likedByMe;
  const optimisticCount = Math.max(0, prev.count + (optimisticLiked ? 1 : -1));

  likesByPost.value = {
    ...likesByPost.value,
    [postId]: { count: optimisticCount, likedByMe: optimisticLiked },
  };

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

    likesByPost.value = {
      ...likesByPost.value,
      [postId]: { count: data?.count ?? optimisticCount, likedByMe: !!data?.likedByMe },
    };
  } catch {
    likesByPost.value = { ...likesByPost.value, [postId]: prev };
  } finally {
    likeBusyByPost.value = { ...likeBusyByPost.value, [postId]: false };
  }
}

/* ================= COMMENTS ================= */
const commentsOpenByPost = ref({});
const commentsByPost = ref({});
const commentDraftByPost = ref({});
const commentLoadingByPost = ref({});
const commentBusyByPost = ref({});
const commentErrorByPost = ref({});

function commentCount(postId) {
  return (commentsByPost.value[postId] || []).length;
}

async function toggleComments(post) {
  const postId = post.id;
  commentsOpenByPost.value = { ...commentsOpenByPost.value, [postId]: !commentsOpenByPost.value[postId] };
  if (commentsOpenByPost.value[postId]) await loadComments(postId, { force: true });
}

async function loadComments(postId, { force = false } = {}) {
  if (!force && Array.isArray(commentsByPost.value[postId])) return;

  commentLoadingByPost.value = { ...commentLoadingByPost.value, [postId]: true };
  commentErrorByPost.value = { ...commentErrorByPost.value, [postId]: "" };

  try {
    const res = await fetch(`${apiUrl}/posts/${postId}/comments`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const data = await res.json();

    if (!res.ok) {
      commentErrorByPost.value = { ...commentErrorByPost.value, [postId]: data?.error || "Failed to load comments" };
      commentsByPost.value = { ...commentsByPost.value, [postId]: [] };
      return;
    }

    const items = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
    commentsByPost.value = { ...commentsByPost.value, [postId]: items };
  } catch {
    commentErrorByPost.value = { ...commentErrorByPost.value, [postId]: "Failed to load comments" };
    commentsByPost.value = { ...commentsByPost.value, [postId]: [] };
  } finally {
    commentLoadingByPost.value = { ...commentLoadingByPost.value, [postId]: false };
  }
}

async function submitComment(post) {
  const postId = post.id;
  if (!token) return alert("Please login again to comment.");

  const text = String(commentDraftByPost.value[postId] || "").trim();
  if (!text) return;

  commentBusyByPost.value = { ...commentBusyByPost.value, [postId]: true };
  commentErrorByPost.value = { ...commentErrorByPost.value, [postId]: "" };

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

  const existing = commentsByPost.value[postId] || [];
  commentsByPost.value = { ...commentsByPost.value, [postId]: [optimistic, ...existing] };
  commentDraftByPost.value = { ...commentDraftByPost.value, [postId]: "" };

  try {
    const res = await fetch(`${apiUrl}/posts/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ body: text }),
    });
    const data = await res.json();

    if (!res.ok) {
      commentsByPost.value = { ...commentsByPost.value, [postId]: (commentsByPost.value[postId] || []).filter((c) => c.id !== tempId) };
      commentErrorByPost.value = { ...commentErrorByPost.value, [postId]: data?.error || "Failed to send comment" };
      return;
    }

    commentsByPost.value = {
      ...commentsByPost.value,
      [postId]: (commentsByPost.value[postId] || []).map((c) => (c.id === tempId ? data : c)),
    };
  } catch {
    commentsByPost.value = { ...commentsByPost.value, [postId]: (commentsByPost.value[postId] || []).filter((c) => c.id !== tempId) };
    commentErrorByPost.value = { ...commentErrorByPost.value, [postId]: "Failed to send comment" };
  } finally {
    commentBusyByPost.value = { ...commentBusyByPost.value, [postId]: false };
  }
}

async function sharePost(post) {
  const url = `${window.location.origin}/#post-${post.id}`;
  try {
    if (navigator.share) {
      await navigator.share({ title: "AddisGo Post", text: post.caption || "Post", url });
      return;
    }
  } catch {}

  try {
    await navigator.clipboard.writeText(url);
    alert("Link copied!");
  } catch {
    alert(url);
  }
}

/* ================= CHAT (UI + socket room) ================= */
const chatOpen = ref(false);
const chatRoom = ref("global");
const chatText = ref("");
const chatMessages = ref([]);

const socketRef = ref(null);
const liveStreams = ref([]);

function toggleChat() {
  chatOpen.value = !chatOpen.value;
}
function openNewChat() {
  chatOpen.value = true;
  alert("Next step: real user list + conversations");
}
function selectChat(room) {
  chatRoom.value = room;
  socketRef.value?.emit("join-room", room);
  chatMessages.value.push({ from: "system", text: `Joined room: ${room}` });
}
function sendChat() {
  if (!chatText.value.trim()) return;

  socketRef.value?.emit("send-message", {
    room: chatRoom.value,
    from: me?.username || "me",
    text: chatText.value,
  });

  chatText.value = "";
}

/* ================= LIVE ================= */
function startLive() {
  const liveId = `live-${me?.id || Math.random().toString(36).slice(2, 8)}-${Date.now().toString().slice(-4)}`;
  socketRef.value?.emit("live:create", { liveId });
  router.push(`/live?mode=host&liveId=${encodeURIComponent(liveId)}`);
}
function joinLive(liveId) {
  router.push(`/live?mode=watch&liveId=${encodeURIComponent(liveId)}`);
}

/* ================= CALLS (NEW) ================= */
const incomingOpen = ref(false);
const incomingCall = ref({});
const callSheetOpen = ref(false);

function openCallSheet() {
  callSheetOpen.value = true;
}

function startCall(kind = "audio") {
  callSheetOpen.value = false;

  if (!socketRef.value) return alert("Socket not connected yet.");
  if (!me?.id) return alert("Login again please.");

  const toUserId = prompt("Call which userId? (example: 4)");
  if (!toUserId) return;

  socketRef.value.emit("call:start", { toUserId: Number(toUserId), kind });
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ================= INIT ================= */
const filteredPosts = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return posts.value;
  return posts.value.filter((p) => (p.caption || "").toLowerCase().includes(q));
});

onMounted(async () => {
  await fetchPosts();

  socketRef.value = io(apiUrl, { transports: ["websocket", "polling"] });

  socketRef.value.on("connect", () => {
    if (me?.id) socketRef.value.emit("register-user", { id: me.id, username: me.username });
    socketRef.value.emit("join-room", chatRoom.value);
    socketRef.value.emit("get-live-list");
  });

  socketRef.value.on("receive-message", (msg) => {
    chatMessages.value.push(msg);
  });

  socketRef.value.on("live-list", (streams) => {
    liveStreams.value = Array.isArray(streams) ? streams : [];
  });

  // ✅ incoming call popup
  socketRef.value.on("call:incoming", (payload) => {
    incomingCall.value = payload;
    incomingOpen.value = true;
  });

  // caller side results
  socketRef.value.on("call:offline", () => alert("User is offline — missed call ✅"));
  socketRef.value.on("call:rejected", () => alert("Call rejected"));
  socketRef.value.on("call:accepted", ({ roomId, kind, calleeSocketId }) => {
    // caller goes to Call page and creates offer
    router.push({
      path: "/call",
      query: { roomId, role: "caller", kind, otherSocketId: calleeSocketId },
    });
  });
});
</script>

<style scoped>
.page {
  display: grid;
  grid-template-columns: 280px 1fr 360px;
  gap: 20px;
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;
}
@media (max-width: 1100px) {
  .page {
    grid-template-columns: 260px 1fr;
  }
  .right {
    display: none;
  }
}
@media (max-width: 820px) {
  .page {
    grid-template-columns: 1fr;
    padding-bottom: 120px; /* space for FAB */
  }
}

.panel,
.composer,
.post {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 18px;
  padding: 16px;
  backdrop-filter: blur(10px);
  margin-bottom: 16px;
}
.left,
.right {
  height: fit-content;
  position: sticky;
  top: 12px;
}

.brand {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 14px;
}
.brand-icon {
  font-size: 24px;
}
.brand-title {
  font-weight: 900;
  font-size: 22px;
}
.brand-sub {
  opacity: 0.7;
  font-size: 12px;
}

.panel-title {
  font-weight: 900;
  margin-bottom: 10px;
}

.input {
  width: 100%;
  border: none;
  outline: none;
  background: rgba(0, 0, 0, 0.35);
  color: white;
  border-radius: 14px;
  padding: 12px;
  resize: none;
}

.upload-row {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
  margin-top: 10px;
}
.file-pill {
  background: rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  padding: 10px 12px;
  cursor: pointer;
}
.file-pill input {
  display: none;
}

.btn {
  border: none;
  border-radius: 999px;
  padding: 10px 14px;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.12);
  color: white;
}
.btn-primary {
  background: linear-gradient(45deg, #ff416c, #ff4b2b);
}
.w100 {
  width: 100%;
}
.mt10 {
  margin-top: 10px;
}
.mt12 {
  margin-top: 12px;
}

.feed-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}
.feed-title {
  font-weight: 900;
  font-size: 18px;
}
.search {
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: white;
  padding: 10px 12px;
  border-radius: 999px;
  outline: none;
}

.post {
  background: rgba(0, 0, 0, 0.55);
}
.post-head {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 10px;
}
.avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: linear-gradient(45deg, #ff416c, #ff4b2b);
  display: grid;
  place-items: center;
  font-weight: 900;
}
.avatar.big {
  width: 52px;
  height: 52px;
}
.name {
  font-weight: 900;
}
.time {
  opacity: 0.75;
  font-size: 12px;
}
.text {
  margin: 6px 0 10px;
  line-height: 1.5;
}

.media {
  width: 100%;
  border-radius: 16px;
  background: #000;
  margin-top: 10px;
  max-height: 700px;
  object-fit: cover;
}

.state {
  text-align: center;
  padding: 26px;
  opacity: 0.8;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.06);
}
.hint {
  opacity: 0.75;
  font-size: 13px;
}
.alert {
  margin-top: 10px;
  padding: 10px;
  border-radius: 14px;
  background: rgba(255, 80, 80, 0.18);
  border: 1px solid rgba(255, 80, 80, 0.35);
}

.live-card {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255, 0, 0, 0.12);
  border: 1px solid rgba(255, 0, 0, 0.18);
  padding: 10px 12px;
  border-radius: 14px;
  margin-top: 10px;
  cursor: pointer;
}
.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: red;
}

.chat-hint {
  opacity: 0.7;
  font-size: 12px;
  margin-bottom: 10px;
}
.chat-list {
  display: grid;
  gap: 8px;
  margin-bottom: 12px;
}
.chat-item {
  background: rgba(255, 255, 255, 0.10);
  border: 1px solid rgba(255, 255, 255, 0.12);
  padding: 10px 12px;
  border-radius: 14px;
  color: white;
  cursor: pointer;
  text-align: left;
}
.chat-box {
  background: rgba(0, 0, 0, 0.35);
  border-radius: 16px;
  padding: 10px;
}
.chat-messages {
  max-height: 280px;
  overflow: auto;
  display: grid;
  gap: 8px;
  padding: 6px;
}
.chat-msg {
  font-size: 13px;
  opacity: 0.95;
}
.chat-input {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}
.chat-input input {
  flex: 1;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: white;
  padding: 10px 12px;
  border-radius: 12px;
  outline: none;
}

/* ACTION BAR */
.actions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.10);
}
.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.08);
  color: white;
  padding: 10px 12px;
  border-radius: 999px;
  cursor: pointer;
}
.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.action-btn .icon {
  font-size: 16px;
}
.action-btn .label {
  font-weight: 900;
  font-size: 13px;
}
.action-btn.active {
  border-color: rgba(255, 75, 43, 0.6);
  background: rgba(255, 75, 43, 0.18);
}
.action-btn.ghost {
  opacity: 0.95;
}
.spacer {
  flex: 1;
}

/* COMMENTS */
.comments {
  margin-top: 12px;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  padding: 12px;
}
.comments-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.comments-title {
  font-weight: 900;
}
.x {
  border: none;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.10);
  color: white;
  border-radius: 10px;
  padding: 6px 10px;
}
.comments-state,
.comments-empty {
  opacity: 0.8;
  padding: 10px 6px;
}
.comments-list {
  display: grid;
  gap: 10px;
  max-height: 280px;
  overflow: auto;
  padding-right: 4px;
}
.comment {
  padding: 10px 10px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.10);
}
.comment-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}
.comment-who {
  display: inline-flex;
  gap: 10px;
  align-items: center;
}
.badge {
  font-weight: 900;
  font-size: 12px;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.10);
}
.comment-time {
  opacity: 0.75;
  font-size: 12px;
}
.comment-text {
  line-height: 1.5;
  font-size: 14px;
}

.comment-compose {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}
.comment-input {
  flex: 1;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: white;
  padding: 10px 12px;
  border-radius: 12px;
  outline: none;
}
.comment-error {
  margin-top: 10px;
  padding: 10px;
  border-radius: 14px;
  background: rgba(255, 80, 80, 0.18);
  border: 1px solid rgba(255, 80, 80, 0.35);
}

/* ✅ Mobile FAB + Sheet */
.fab {
  position: fixed;
  right: 18px;
  bottom: 18px;
  width: 62px;
  height: 62px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: linear-gradient(45deg, #ff416c, #ff4b2b);
  color: white;
  font-size: 22px;
  font-weight: 900;
  cursor: pointer;
  z-index: 9998;
  box-shadow: 0 18px 40px rgba(0,0,0,0.35);
}
@media (min-width: 821px) {
  .fab { display: none; }
}

.sheet-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.55);
  z-index: 9997;
  display: grid;
  place-items: end center;
}
.sheet {
  width: min(520px, 100%);
  background: rgba(20, 26, 40, 0.96);
  border: 1px solid rgba(255,255,255,0.14);
  border-radius: 22px 22px 0 0;
  padding: 16px;
}
.sheet-title {
  font-weight: 900;
  font-size: 16px;
  margin-bottom: 10px;
}
</style>