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

        <!-- LIVE -->
        <div class="panel">
          <div class="panel-title">🔴 Live Now</div>
          <button class="btn btn-primary w100" @click="startLive">Go Live</button>
          <div v-if="liveStreams.length === 0" class="hint mt12">No one live right now</div>

          <div v-for="stream in liveStreams" :key="stream" class="live-card" @click="joinLive(stream)">
            <span class="dot"></span>
            <span class="live-name">{{ stream }}</span>
          </div>
        </div>

        <!-- ✅ PEOPLE / CALLS -->
        <div class="panel">
          <div class="panel-title">📞 People</div>

          <div class="row">
            <input v-model="userSearch" class="searchMini" placeholder="Search users..." />
            <button class="btn mini" @click="fetchUsers" :disabled="usersLoading">
              {{ usersLoading ? "…" : "↻" }}
            </button>
          </div>

          <div v-if="usersError" class="hint red mt10">{{ usersError }}</div>

          <div class="people">
            <div v-for="u in filteredUsers" :key="u.id" class="person">
              <div class="person-left">
                <div class="avatarSm">{{ String(u.display_name || 'U').slice(0,1).toUpperCase() }}</div>
                <div class="person-meta">
                  <div class="person-name">{{ u.display_name }}</div>
                  <div class="person-sub">
                    <span class="statusDot" :class="{ on: isOnline(u.id) }"></span>
                    <span>{{ isOnline(u.id) ? "Online" : "Offline" }}</span>
                  </div>
                </div>
              </div>

              <div class="person-actions">
                <button class="iconBtn" title="Audio Call" @click="startCall(u.id, 'audio')">📞</button>
                <button class="iconBtn" title="Video Call" @click="startCall(u.id, 'video')">🎥</button>
              </div>
            </div>

            <div v-if="filteredUsers.length === 0" class="hint mt10">
              No users found.
            </div>
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
            <video v-if="post.video_url" class="media" :src="getMedia(post.video_url)" controls playsinline preload="metadata"></video>

            <!-- ACTION BAR -->
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

            <!-- COMMENTS PANEL -->
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

      <!-- RIGHT CHAT PANEL -->
      <aside v-if="chatOpen" class="right">
        <div class="panel">
          <div class="panel-title">📥 Inbox</div>

          <div class="chat-hint">(Next step: connect to your conversations/messages tables)</div>

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

      <!-- ✅ INCOMING CALL POPUP -->
      <div v-if="incoming.open" class="modal-backdrop">
        <div class="modal">
          <div class="modalTop">
            <div class="modalTitle">Incoming {{ incoming.kind === 'video' ? "Video" : "Audio" }} Call</div>
            <div class="modalSub">{{ incoming.fromUsername || "Someone" }} is calling…</div>
          </div>

          <div class="modalActions">
            <button class="btn danger" @click="rejectIncoming">Reject</button>
            <button class="btn btn-primary" @click="acceptIncoming">Accept</button>
          </div>
        </div>
      </div>

      <!-- ✅ OUTGOING CALL STATUS -->
      <div v-if="outgoing.open" class="toast">
        <div class="toastTitle">Calling…</div>
        <div class="toastSub">
          {{ outgoing.kind === 'video' ? "Video" : "Audio" }} call
          <span v-if="outgoing.toUserId">→ User #{{ outgoing.toUserId }}</span>
        </div>
        <button class="toastX" @click="cancelOutgoing">✕</button>
      </div>
    </div>
  </Layout>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import Layout from "../components/Layout.vue";
import { io } from "socket.io-client";

const router = useRouter();

const apiUrl = import.meta.env.VITE_API_URL;
const token = localStorage.getItem("token");

const me = (() => {
  try { return JSON.parse(localStorage.getItem("user") || "null"); }
  catch { return null; }
})();

/* ================= SOCKET ================= */
let socket = null;

/* ================= ONLINE USERS ================= */
const onlineMap = ref(new Map()); // userId -> socketId

function isOnline(userId) {
  return onlineMap.value.has(String(userId));
}

/* ================= USERS LIST (People) ================= */
const users = ref([]);
const usersLoading = ref(false);
const usersError = ref("");
const userSearch = ref("");

const filteredUsers = computed(() => {
  const q = userSearch.value.trim().toLowerCase();
  if (!q) return users.value;
  return users.value.filter((u) => String(u.display_name || "").toLowerCase().includes(q));
});

async function fetchUsers() {
  if (!token) {
    usersError.value = "Login again to load users.";
    return;
  }
  try {
    usersLoading.value = true;
    usersError.value = "";
    const res = await fetch(`${apiUrl}/users`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) {
      usersError.value = data?.error || "Failed to load users";
      users.value = [];
      return;
    }
    users.value = Array.isArray(data) ? data : [];
  } catch {
    usersError.value = "Failed to load users";
    users.value = [];
  } finally {
    usersLoading.value = false;
  }
}

/* ================= CALLS ================= */
const incoming = ref({
  open: false,
  callId: "",
  kind: "audio",
  fromUserId: "",
  fromUsername: "",
  fromSocketId: "",
});

const outgoing = ref({
  open: false,
  callId: "",
  kind: "audio",
  toUserId: "",
});

function startCall(toUserId, kind = "audio") {
  if (!socket) return alert("Socket not connected yet.");
  if (!me?.id) return alert("Login again first.");

  outgoing.value = { open: true, callId: "", kind, toUserId: String(toUserId) };
  socket.emit("call:start", { toUserId: String(toUserId), kind });
}

function cancelOutgoing() {
  // just close the toast; real cancel can be added later
  outgoing.value.open = false;
}

function acceptIncoming() {
  if (!socket) return;

  // tell caller we accept
  socket.emit("call:accept", {
    roomId: incoming.value.callId,       // backend names it roomId
    fromSocketId: incoming.value.fromSocketId,
    kind: incoming.value.kind,
  });

  // go to Call page as callee
  router.push({
    path: "/call",
    query: {
      callId: incoming.value.callId,
      role: "callee",
      kind: incoming.value.kind,
      otherSocketId: incoming.value.fromSocketId,
    },
  });

  incoming.value.open = false;
}

function rejectIncoming() {
  if (!socket) return;

  socket.emit("call:reject", {
    roomId: incoming.value.callId,
    fromSocketId: incoming.value.fromSocketId,
  });

  incoming.value.open = false;
}

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

function onPickImage(e) { imageFile.value = e.target.files?.[0] || null; }
function onPickVideo(e) { videoFile.value = e.target.files?.[0] || null; }
function scrollToTop() { window.scrollTo({ top: 0, behavior: "smooth" }); }

/* ================= LIKES (unchanged) ================= */
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
  if (!token) return alert("Please login again to like posts.");

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

/* ================= COMMENTS (Option A) ================= */
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
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ body: text }),
    });
    const data = await res.json();

    if (!res.ok) {
      commentsByPost.value = {
        ...commentsByPost.value,
        [postId]: (commentsByPost.value[postId] || []).filter((c) => c.id !== tempId),
      };
      commentErrorByPost.value = { ...commentErrorByPost.value, [postId]: data?.error || "Failed to send comment" };
      return;
    }

    commentsByPost.value = {
      ...commentsByPost.value,
      [postId]: (commentsByPost.value[postId] || []).map((c) => (c.id === tempId ? data : c)),
    };
  } catch {
    commentsByPost.value = {
      ...commentsByPost.value,
      [postId]: (commentsByPost.value[postId] || []).filter((c) => c.id !== tempId),
    };
    commentErrorByPost.value = { ...commentErrorByPost.value, [postId]: "Failed to send comment" };
  } finally {
    commentBusyByPost.value = { ...commentBusyByPost.value, [postId]: false };
  }
}

/* ================= SHARE ================= */
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

/* ================= CHAT ================= */
const chatOpen = ref(false);
const chatRoom = ref("global");
const chatText = ref("");
const chatMessages = ref([]);

function toggleChat() { chatOpen.value = !chatOpen.value; }
function openNewChat() { chatOpen.value = true; alert("Next step: real user list + conversations"); }
function selectChat(room) {
  chatRoom.value = room;
  socket?.emit("join-room", room);
  chatMessages.value.push({ from: "system", text: `Joined room: ${room}` });
}
function sendChat() {
  if (!chatText.value.trim()) return;
  socket?.emit("send-message", { room: chatRoom.value, from: me?.username || "me", text: chatText.value });
  chatText.value = "";
}

/* ================= LIVE ================= */
const liveStreams = ref([]);

function startLive() {
  const liveId = `live-${me?.id || Math.random().toString(36).slice(2, 8)}-${Date.now().toString().slice(-4)}`;
  socket?.emit("live:create", { liveId });
  window.location.href = `/live?mode=host&liveId=${encodeURIComponent(liveId)}`;
}

function joinLive(liveId) {
  window.location.href = `/live?mode=watch&liveId=${encodeURIComponent(liveId)}`;
}

/* ================= INIT ================= */
const filteredPosts = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return posts.value;
  return posts.value.filter((p) => (p.caption || "").toLowerCase().includes(q));
});

onMounted(async () => {
  await fetchPosts();
  await fetchUsers();

  socket = io(apiUrl, { transports: ["websocket", "polling"] });

  socket.on("connect", () => {
    if (me?.id) socket.emit("register-user", { id: me.id, username: me.username });
    socket.emit("join-room", chatRoom.value);
    socket.emit("get-live-list");
  });

  socket.on("receive-message", (msg) => chatMessages.value.push(msg));

  socket.on("live-list", (streams) => {
    liveStreams.value = Array.isArray(streams) ? streams : [];
  });

  // ✅ online users list from server
  socket.on("online-users", (pairs) => {
    // pairs = [[userId, socketId], ...]
    const m = new Map();
    if (Array.isArray(pairs)) {
      for (const [uid, sid] of pairs) m.set(String(uid), String(sid));
    }
    onlineMap.value = m;
  });

  // ✅ incoming call
  socket.on("call:incoming", (payload) => {
    incoming.value = {
      open: true,
      callId: String(payload.roomId || payload.callId || ""),
      kind: String(payload.kind || "audio"),
      fromUserId: String(payload.fromUserId || ""),
      fromUsername: String(payload.fromUsername || ""),
      fromSocketId: String(payload.fromSocketId || ""),
    };
  });

  // ✅ caller gets ringing/offline/accepted
  socket.on("call:ringing", ({ roomId, toUserId, kind }) => {
    outgoing.value = { open: true, callId: String(roomId), kind: String(kind || "audio"), toUserId: String(toUserId || "") };
  });

  socket.on("call:offline", () => {
    outgoing.value.open = false;
    alert("User is offline. (Next: save missed call + leave message)");
  });

  socket.on("call:accepted", ({ roomId, calleeSocketId, kind }) => {
    const cId = String(roomId || "");
    outgoing.value.open = false;

    router.push({
      path: "/call",
      query: {
        callId: cId,
        role: "caller",
        kind: String(kind || "audio"),
        otherSocketId: String(calleeSocketId || ""),
      },
    });
  });

  socket.on("call:rejected", () => {
    outgoing.value.open = false;
    alert("Call rejected");
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
  .page { grid-template-columns: 1fr; }
  .right { display: none; }
  .left { position: relative; top: 0; }
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

.brand { display: flex; gap: 10px; align-items: center; margin-bottom: 14px; }
.brand-icon { font-size: 24px; }
.brand-title { font-weight: 900; font-size: 22px; }
.brand-sub { opacity: 0.7; font-size: 12px; }
.panel-title { font-weight: 900; margin-bottom: 10px; }

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

.upload-row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-top: 10px; }
.file-pill { background: rgba(255, 255, 255, 0.12); border-radius: 999px; padding: 10px 12px; cursor: pointer; }
.file-pill input { display: none; }

.btn {
  border: none;
  border-radius: 999px;
  padding: 10px 14px;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.12);
  color: white;
}
.btn-primary { background: linear-gradient(45deg, #ff416c, #ff4b2b); }
.w100 { width: 100%; }
.mt10 { margin-top: 10px; }
.mt12 { margin-top: 12px; }
.hint { opacity: 0.75; font-size: 13px; }
.hint.red { color: #ff9aa2; }
.alert {
  margin-top: 10px;
  padding: 10px;
  border-radius: 14px;
  background: rgba(255, 80, 80, 0.18);
  border: 1px solid rgba(255, 80, 80, 0.35);
}

.feed-head { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 10px; }
.feed-title { font-weight: 900; font-size: 18px; }
.search {
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: white;
  padding: 10px 12px;
  border-radius: 999px;
  outline: none;
}

.post { background: rgba(0, 0, 0, 0.55); }
.post-head { display: flex; gap: 10px; align-items: center; margin-bottom: 10px; }
.avatar {
  width: 44px; height: 44px; border-radius: 50%;
  background: linear-gradient(45deg, #ff416c, #ff4b2b);
  display: grid; place-items: center; font-weight: 900;
}
.avatar.big { width: 52px; height: 52px; }
.name { font-weight: 900; }
.time { opacity: 0.75; font-size: 12px; }
.text { margin: 6px 0 10px; line-height: 1.5; }
.media { width: 100%; border-radius: 16px; background: #000; margin-top: 10px; max-height: 700px; object-fit: cover; }

.state { text-align: center; padding: 26px; opacity: 0.8; border-radius: 18px; background: rgba(255, 255, 255, 0.06); }

.live-card {
  display: flex; align-items: center; gap: 10px;
  background: rgba(255, 0, 0, 0.12);
  border: 1px solid rgba(255, 0, 0, 0.18);
  padding: 10px 12px; border-radius: 14px; margin-top: 10px; cursor: pointer;
}
.dot { width: 10px; height: 10px; border-radius: 50%; background: red; }

/* ✅ People panel */
.row { display:flex; gap:10px; align-items:center; }
.searchMini {
  flex: 1;
  background: rgba(0,0,0,0.35);
  border: 1px solid rgba(255,255,255,0.12);
  color: white;
  padding: 10px 12px;
  border-radius: 999px;
  outline: none;
}
.btn.mini { padding: 10px 12px; min-width: 44px; }
.people { display:grid; gap:10px; margin-top:12px; }
.person {
  display:flex; align-items:center; justify-content:space-between; gap:10px;
  padding: 10px 12px;
  border-radius: 14px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.10);
}
.person-left { display:flex; gap:10px; align-items:center; min-width:0; }
.avatarSm {
  width: 38px; height: 38px; border-radius: 50%;
  display:grid; place-items:center; font-weight:900;
  background: rgba(255,255,255,0.10);
  border: 1px solid rgba(255,255,255,0.12);
}
.person-meta { min-width:0; }
.person-name { font-weight:900; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width: 150px; }
.person-sub { display:flex; gap:8px; align-items:center; opacity:.8; font-size:12px; }
.statusDot { width:10px; height:10px; border-radius:50%; background: rgba(255,255,255,0.25); }
.statusDot.on { background: #4cff7a; }
.person-actions { display:flex; gap:8px; }
.iconBtn{
  border:none; cursor:pointer;
  border-radius: 12px;
  padding: 10px 10px;
  background: rgba(255,255,255,0.10);
  border: 1px solid rgba(255,255,255,0.14);
  color:white;
}

/* ✅ action bar */
.actions {
  display:flex; align-items:center; gap:10px;
  margin-top:12px; padding-top:10px;
  border-top: 1px solid rgba(255,255,255,0.10);
}
.action-btn {
  display:inline-flex; align-items:center; gap:10px;
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(255,255,255,0.08);
  color:white;
  padding: 10px 12px;
  border-radius: 999px;
  cursor:pointer;
}
.action-btn.active { border-color: rgba(255,75,43,0.6); background: rgba(255,75,43,0.18); }
.spacer { flex:1; }

.comments {
  margin-top: 12px;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  padding: 12px;
}
.comments-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
.comments-title { font-weight:900; }
.x { border:none; cursor:pointer; background: rgba(255,255,255,0.10); color:white; border-radius:10px; padding:6px 10px; }

.comments-list { display:grid; gap:10px; max-height: 280px; overflow:auto; padding-right:4px; }
.comment { padding:10px; border-radius:14px; background: rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.10); }
.badge { font-weight:900; font-size:12px; padding:6px 10px; border-radius:999px; background: rgba(255,255,255,0.10); }
.comment-time { opacity:0.75; font-size:12px; }
.comment-text { line-height: 1.5; font-size:14px; }

.comment-compose { display:flex; gap:8px; margin-top:10px; }
.comment-input {
  flex:1;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255,255,255,0.12);
  color:white;
  padding:10px 12px;
  border-radius:12px;
  outline:none;
}
.comment-error {
  margin-top:10px; padding:10px;
  border-radius:14px;
  background: rgba(255,80,80,0.18);
  border:1px solid rgba(255,80,80,0.35);
}

/* ✅ incoming modal */
.modal-backdrop{
  position:fixed; inset:0;
  background: rgba(0,0,0,0.55);
  display:grid; place-items:center;
  z-index: 9999;
}
.modal{
  width:min(420px, 92vw);
  border-radius: 18px;
  background: rgba(20, 28, 44, 0.92);
  border: 1px solid rgba(255,255,255,0.14);
  padding: 16px;
  backdrop-filter: blur(12px);
}
.modalTop{ margin-bottom: 12px; }
.modalTitle{ font-weight:900; font-size: 18px; }
.modalSub{ opacity:.8; margin-top: 6px; }
.modalActions{ display:flex; gap:10px; justify-content:flex-end; }

/* ✅ outgoing toast */
.toast{
  position: fixed;
  left: 12px;
  right: 12px;
  bottom: 12px;
  z-index: 9998;
  padding: 12px 14px;
  border-radius: 16px;
  background: rgba(0,0,0,0.55);
  border: 1px solid rgba(255,255,255,0.12);
  backdrop-filter: blur(10px);
}
.toastTitle{ font-weight:900; }
.toastSub{ opacity:.8; font-size: 13px; margin-top: 4px; }
.toastX{
  position:absolute;
  right: 10px;
  top: 10px;
  border:none;
  background: rgba(255,255,255,0.10);
  color:white;
  border-radius: 10px;
  padding: 6px 10px;
  cursor:pointer;
}
</style>