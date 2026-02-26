<!-- src/views/Dashboard.vue -->
<template>
  <Layout>
    <div class="wrap">
      <!-- TOP BAR (mobile-first) -->
      <header class="topbar">
        <div class="brand">
          <div class="logo">🔥</div>
          <div class="brand-text">
            <div class="title">AddisGo</div>
            <div class="sub">Social • Live • Calls • Chat</div>
          </div>
        </div>

        <div class="top-actions">
          <button class="chip" @click="fetchPosts" :disabled="loading">↻ Refresh</button>
          <button class="chip ghost" @click="togglePeople">
            {{ peopleOpen ? "Hide People" : "People" }}
          </button>
          <button class="chip ghost" @click="toggleChat">
            {{ chatOpen ? "Close Chat" : "Chat" }}
          </button>
          <button class="chip danger" @click="logout">Logout</button>
        </div>
      </header>

      <!-- GRID -->
      <div class="page">
        <!-- LEFT: LIVE + PEOPLE -->
        <aside class="left" :class="{ open: peopleOpen }">
          <section class="panel">
            <div class="panel-head">
              <div class="panel-title">🔴 Live Now</div>
              <button class="btn btn-primary" @click="startLive">Go Live</button>
            </div>

            <div v-if="liveStreams.length === 0" class="hint mt10">No one live right now</div>

            <div
              v-for="stream in liveStreams"
              :key="stream"
              class="live-card"
              @click="joinLive(stream)"
              title="Tap to watch"
            >
              <span class="dot"></span>
              <div class="live-meta">
                <div class="live-name">{{ stream }}</div>
                <div class="live-sub">Tap to watch</div>
              </div>
              <span class="chev">›</span>
            </div>
          </section>

          <section class="panel">
            <div class="panel-head">
              <div class="panel-title">👥 People</div>
              <button class="btn" @click="fetchPeople" :disabled="peopleLoading">
                {{ peopleLoading ? "Loading…" : "Refresh" }}
              </button>
            </div>

            <div v-if="!token" class="alert soft">
              Login again to see people and call buttons.
            </div>

            <div v-else class="people">
              <div v-if="peopleError" class="alert">{{ peopleError }}</div>
              <div v-else-if="people.length === 0" class="hint">No users found.</div>

              <div v-else v-for="u in people" :key="u.id" class="person">
                <div class="avatar small">{{ (u.display_name || "U")[0]?.toUpperCase() }}</div>

                <div class="person-meta">
                  <div class="person-name">{{ u.display_name || ("User #" + u.id) }}</div>
                  <div class="person-sub">
                    <span class="status" :class="{ on: isOnline(u.id) }"></span>
                    <span class="status-text">{{ isOnline(u.id) ? "Online" : "Offline" }}</span>
                    <span class="sep">•</span>
                    <span class="id">ID {{ u.id }}</span>
                  </div>
                </div>

                <div class="person-actions">
                  <button
                    class="iconbtn"
                    title="Audio Call"
                    :disabled="!isOnline(u.id) || callBusy"
                    @click="startCall(u, 'audio')"
                  >
                    📞
                  </button>
                  <button
                    class="iconbtn"
                    title="Video Call"
                    :disabled="!isOnline(u.id) || callBusy"
                    @click="startCall(u, 'video')"
                  >
                    🎥
                  </button>
                </div>
              </div>

              <div class="hint mt10">
                Tip: calls require both users to be online (green).
              </div>
            </div>
          </section>

          <section class="panel">
            <div class="panel-title">⚡ Quick Actions</div>
            <div class="stack">
              <button class="btn w100" @click="scrollToTop">Scroll Top</button>
              <button class="btn w100" @click="togglePeople">
                {{ peopleOpen ? "Collapse Sidebar" : "Open Sidebar" }}
              </button>
            </div>
          </section>
        </aside>

        <!-- CENTER: FEED -->
        <main class="center">
          <!-- COMPOSER -->
          <section class="composer">
            <div class="composer-head">
              <div class="avatar big">{{ myInitial }}</div>
              <div>
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
                {{ posting ? "Posting…" : "Post 🚀" }}
              </button>
            </div>

            <div v-if="error" class="alert">{{ error }}</div>
          </section>

          <!-- FEED HEAD -->
          <section class="feed-head">
            <div class="feed-title">Feed</div>
            <input v-model="search" class="search" placeholder="Search posts…" />
          </section>

          <!-- FEED -->
          <section class="feed">
            <div v-if="loading" class="state">Loading posts…</div>
            <div v-else-if="filteredPosts.length === 0" class="state">No posts found.</div>

            <article v-else v-for="post in filteredPosts" :key="post.id" class="post" :id="`post-${post.id}`">
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

              <!-- ACTIONS -->
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

                <div v-if="commentLoadingByPost[post.id]" class="comments-state">
                  Loading comments…
                </div>

                <div v-else class="comments-list">
                  <div v-if="(commentsByPost[post.id] || []).length === 0" class="comments-empty">
                    Be the first to comment.
                  </div>

                  <div v-for="c in (commentsByPost[post.id] || [])" :key="c.id" class="comment">
                    <div class="comment-top">
                      <div class="comment-who">
                        <span class="badge">
                          {{ c.username || c.name || c.email || `User #${c.user_id}` }}
                        </span>
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
                    placeholder="Write a comment…"
                    @keydown.enter.prevent="submitComment(post)"
                  />
                  <button
                    class="btn btn-primary"
                    :disabled="commentBusyByPost[post.id] || !String(commentDraftByPost[post.id] || '').trim()"
                    @click="submitComment(post)"
                  >
                    {{ commentBusyByPost[post.id] ? "Sending…" : "Send" }}
                  </button>
                </div>

                <div v-if="commentErrorByPost[post.id]" class="comment-error">
                  {{ commentErrorByPost[post.id] }}
                </div>
              </div>
            </article>
          </section>
        </main>

        <!-- RIGHT: CHAT (drawer) -->
        <aside class="right" :class="{ open: chatOpen }">
          <section class="panel">
            <div class="panel-head">
              <div class="panel-title">💬 Chat</div>
              <button class="btn" @click="toggleChat">{{ chatOpen ? "Close" : "Open" }}</button>
            </div>

            <div class="chat-hint">
              Global room chat (simple). Calls use the People panel 📞.
            </div>

            <div class="chat-list">
              <button class="chat-item" :class="{ active: chatRoom === 'global' }" @click="selectChat('global')">
                🌍 Global
              </button>
              <button class="chat-item" :class="{ active: chatRoom === 'support' }" @click="selectChat('support')">
                🛠 Support
              </button>
            </div>

            <div class="chat-box">
              <div class="chat-messages" ref="chatBoxRef">
                <div v-for="(m, i) in chatMessages" :key="i" class="chat-msg">
                  <strong>{{ m.from }}:</strong> {{ m.text }}
                </div>
              </div>

              <div class="chat-input">
                <input v-model="chatText" placeholder="Type message…" @keydown.enter.prevent="sendChat" />
                <button class="btn btn-primary" @click="sendChat">Send</button>
              </div>
            </div>
          </section>
        </aside>
      </div>

      <!-- INCOMING CALL POPUP (ALWAYS ON TOP) -->
      <div v-if="incomingCall" class="modal-backdrop" @click.self="rejectIncoming">
        <div class="modal">
          <div class="modal-title">Incoming {{ incomingCall.kind === "video" ? "Video" : "Audio" }} Call</div>
          <div class="modal-sub">
            From <span class="pill">{{ incomingCall.fromName || ("User #" + incomingCall.fromUserId) }}</span>
          </div>

          <div class="modal-actions">
            <button class="btn danger" @click="rejectIncoming">Reject</button>
            <button class="btn btn-primary" @click="acceptIncoming">Accept</button>
          </div>

          <div class="tiny muted mt10">
            Tip: keep Dashboard open on both devices for best call reliability.
          </div>
        </div>
      </div>

      <!-- CALLING TOAST -->
      <div v-if="callingToast" class="toast">
        {{ callingToast }}
        <button class="mini-x" @click="cancelCall">✕</button>
      </div>
    </div>
  </Layout>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from "vue";
import { useRouter } from "vue-router";
import Layout from "../components/Layout.vue";
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

/* ================= SOCKET ================= */
let socket = null;

// ✅ NEW: list of online user IDs (strings)
const onlineUserIds = ref([]);
const liveStreams = ref([]);

function isOnline(userId) {
  return onlineUserIds.value.includes(String(userId));
}

/* ================= PEOPLE ================= */
const peopleOpen = ref(true);
const people = ref([]);
const peopleLoading = ref(false);
const peopleError = ref("");

function togglePeople() {
  peopleOpen.value = !peopleOpen.value;
}

async function fetchPeople() {
  if (!token) return;
  peopleLoading.value = true;
  peopleError.value = "";

  try {
    const res = await fetch(`${apiUrl}/users`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();

    if (!res.ok) {
      peopleError.value = data?.error || "Failed to load users";
      people.value = [];
      return;
    }
    people.value = Array.isArray(data) ? data : [];
  } catch {
    peopleError.value = "Failed to load users";
    people.value = [];
  } finally {
    peopleLoading.value = false;
  }
}

/* ================= CALLS ================= */
const incomingCall = ref(null);
const callBusy = ref(false);

const callingToast = ref("");
const pendingRoomId = ref("");
const pendingKind = ref("audio");

function startCall(user, kind = "audio") {
  if (!socket) return;
  if (!token) return alert("Login again to call.");
  if (!isOnline(user.id)) return alert("User is offline.");

  callBusy.value = true;
  pendingKind.value = kind;
  callingToast.value = `Calling ${user.display_name || "user"}…`;
  pendingRoomId.value = "";

  // ✅ backend handles routing
  socket.emit("call:request", { toUserId: user.id, kind });
}

function cancelCall() {
  const roomId = pendingRoomId.value;

  callingToast.value = "";
  callBusy.value = false;
  pendingRoomId.value = "";

  if (roomId) socket?.emit("call:cancel", { roomId });
}

function acceptIncoming() {
  if (!incomingCall.value || !socket) return;

  const roomId = incomingCall.value.roomId;
  const kind = incomingCall.value.kind || "audio";

  socket.emit("call:accept", { roomId });

  // ✅ Callee navigates immediately
  router.push(`/call?roomId=${encodeURIComponent(roomId)}&role=callee&kind=${encodeURIComponent(kind)}`);

  incomingCall.value = null;
}

function rejectIncoming() {
  if (!incomingCall.value || !socket) return;
  socket.emit("call:reject", { roomId: incomingCall.value.roomId });
  incomingCall.value = null;
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
  if (!token) return alert("Please login again to like posts.");

  await ensureLikeState(postId);

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
  if (commentsOpenByPost.value[postId]) {
    await loadComments(postId, { force: true });
  }
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
const chatBoxRef = ref(null);

function toggleChat() {
  chatOpen.value = !chatOpen.value;
}
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
function startLive() {
  const liveId = `live-${me?.id || Math.random().toString(36).slice(2, 8)}-${Date.now().toString().slice(-4)}`;
  socket?.emit("live:create", { liveId });
  router.push(`/live?mode=host&liveId=${encodeURIComponent(liveId)}`);
}
function joinLive(liveId) {
  router.push(`/live?mode=watch&liveId=${encodeURIComponent(liveId)}`);
}

/* ================= AUTH ================= */
function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  router.push("/login");
}

/* ================= FILTER ================= */
const filteredPosts = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return posts.value;
  return posts.value.filter((p) => (p.caption || "").toLowerCase().includes(q));
});

/* ================= INIT ================= */
onMounted(async () => {
  await fetchPosts();
  if (token) await fetchPeople();

  socket = io(apiUrl, { transports: ["websocket", "polling"] });

  socket.on("connect", () => {
    // ✅ REQUIRED for presence + calls routing
    if (me?.id) socket.emit("user:online", { userId: me.id });

    // keep your chat + live
    socket.emit("join-room", chatRoom.value);
    socket.emit("get-live-list");

    // ✅ ask for presence list
    socket.emit("presence:get");
  });

  /* Chat */
  socket.on("receive-message", (msg) => {
    chatMessages.value.push(msg);
    nextTick(() => {
      const el = chatBoxRef.value;
      if (el) el.scrollTop = el.scrollHeight;
    });
  });

  /* Live list */
  socket.on("live-list", (streams) => {
    liveStreams.value = Array.isArray(streams) ? streams : [];
  });

  /* ✅ Presence list + updates */
  socket.on("presence:list", ({ onlineUserIds: list }) => {
    onlineUserIds.value = (list || []).map(String);
  });

  socket.on("presence:update", ({ userId, online }) => {
    const id = String(userId);
    const set = new Set(onlineUserIds.value);
    if (online) set.add(id);
    else set.delete(id);
    onlineUserIds.value = Array.from(set);
  });

  /* ✅ Calls */
  socket.on("call:ringing", ({ roomId, kind }) => {
    pendingRoomId.value = roomId;
    callingToast.value = `Calling… (${kind || pendingKind.value})`;

    // ✅ Caller navigates immediately (caller will create offer in Call.vue)
    router.push(
      `/call?roomId=${encodeURIComponent(roomId)}&role=caller&kind=${encodeURIComponent(kind || pendingKind.value)}`
    );
  });

  socket.on("call:incoming", (p) => {
    // show popup on callee device
    incomingCall.value = {
      roomId: p.roomId,
      kind: p.kind || "audio",
      fromUserId: p.fromUserId,
      fromName: p.fromName || `User #${p.fromUserId}`,
    };
  });

  socket.on("call:accepted", () => {
    callingToast.value = "";
    callBusy.value = false;
  });

  socket.on("call:ended", ({ reason } = {}) => {
    callingToast.value = "";
    callBusy.value = false;
    incomingCall.value = null;
    pendingRoomId.value = "";
    if (reason) console.log("Call ended:", reason);
  });

  socket.on("call:error", ({ message } = {}) => {
    callingToast.value = "";
    callBusy.value = false;
    incomingCall.value = null;
    pendingRoomId.value = "";
    alert(message || "Call error");
  });
});

onBeforeUnmount(() => {
  try {
    socket?.disconnect();
  } catch {}
  socket = null;
});
</script>

<style scoped>
/* YOUR SAME STYLES (UNCHANGED) */
/* =========================
   AddisGo Dashboard Polish (3-column)
   - Keep layout A
   - Cleaner spacing, consistent panels
   - Better mobile/iPad drawers
========================= */

/* Page background */
.wrap {
  min-height: 100vh;
  padding-bottom: env(safe-area-inset-bottom);
  background:
    radial-gradient(1200px 700px at 20% 0%, rgba(255,75,43,0.18), transparent),
    radial-gradient(900px 600px at 80% 20%, rgba(255,65,108,0.16), transparent),
    #0b1220;
  color: #fff;
}

/* Topbar */
.topbar {
  position: sticky;
  top: 0;
  z-index: 60;
  padding: 14px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;

  background: rgba(8, 12, 20, 0.80);
  backdrop-filter: blur(14px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.10);
}

.brand { display: flex; align-items: center; gap: 10px; }
.logo {
  width: 42px; height: 42px;
  border-radius: 14px;
  display: grid; place-items: center;
  background: rgba(255,255,255,0.10);
  border: 1px solid rgba(255,255,255,0.14);
  font-size: 20px;
}
.brand-text { line-height: 1.05; }
.title { font-weight: 900; font-size: 18px; letter-spacing: .2px; }
.sub { opacity: .72; font-size: 12px; margin-top: 2px; }

.top-actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }

/* Grid container (centered, not too wide) */
.page {
  width: min(1280px, 100%);
  margin: 0 auto;
  padding: 18px 16px;

  display: grid;
  grid-template-columns: 320px 1fr 360px;
  gap: 16px;
}

/* Sticky columns on desktop */
.left, .right {
  height: fit-content;
  position: sticky;
  top: 78px;
}
.center { min-width: 0; }

/* Panels */
.panel, .composer, .post {
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 18px;
  padding: 14px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.22);
  backdrop-filter: blur(10px);
  margin-bottom: 14px;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}
.panel-title { font-weight: 900; letter-spacing: .2px; }

/* Buttons */
.btn, .chip {
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.10);
  color: #fff;
  border-radius: 999px;
  padding: 10px 14px;
  cursor: pointer;
  transition: transform .06s ease, filter .15s ease, border-color .15s ease;
  user-select: none;
}
.btn:hover, .chip:hover { filter: brightness(1.06); border-color: rgba(255,255,255,0.18); }
.btn:active, .chip:active { transform: scale(0.98); }
.btn-primary {
  border: none;
  background: linear-gradient(45deg, #ff416c, #ff4b2b);
}
.danger {
  background: rgba(255,80,80,0.18);
  border: 1px solid rgba(255,80,80,0.35);
}
.ghost { opacity: .92; }
.w100 { width: 100%; }
.stack { display: grid; gap: 10px; }

/* Live cards */
.live-card {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255, 0, 0, 0.10);
  border: 1px solid rgba(255, 0, 0, 0.18);
  padding: 10px 12px;
  border-radius: 14px;
  margin-top: 10px;
  cursor: pointer;
}
.live-card:hover { filter: brightness(1.06); }
.dot { width: 10px; height: 10px; border-radius: 50%; background: #ff3b30; }
.live-meta { display: grid; }
.live-name { font-weight: 900; }
.live-sub { opacity: .75; font-size: 12px; }
.chev { margin-left: auto; opacity: .7; font-size: 22px; }

/* People */
.people { display: grid; gap: 10px; }
.person {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 10px 12px;
  border-radius: 16px;
  background: rgba(0,0,0,0.26);
  border: 1px solid rgba(255,255,255,0.10);
}
.person:hover {
  border-color: rgba(255,75,43,0.22);
  background: rgba(0,0,0,0.30);
}
.person-meta { flex: 1; min-width: 0; }
.person-name {
  font-weight: 900;
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.person-sub {
  display: flex;
  align-items: center;
  gap: 8px;
  opacity: .75;
  font-size: 12px;
  margin-top: 3px;
}
.status { width: 10px; height: 10px; border-radius: 50%; background: rgba(255,255,255,0.28); }
.status.on { background: #00e676; box-shadow: 0 0 0 3px rgba(0,230,118,0.12); }
.sep { opacity: .5; }

.person-actions { display: flex; gap: 8px; }
.iconbtn {
  width: 40px; height: 40px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(255,255,255,0.08);
  cursor: pointer;
  transition: filter .15s ease, transform .06s ease;
}
.iconbtn:hover { filter: brightness(1.08); }
.iconbtn:active { transform: scale(0.98); }
.iconbtn:disabled { opacity: .40; cursor: not-allowed; }

/* Composer */
.composer-head { display: flex; gap: 10px; align-items: center; margin-bottom: 10px; }
.me { font-weight: 900; }
.small { font-size: 12px; }
.muted { opacity: .75; }

.input {
  width: 100%;
  border: 1px solid rgba(255,255,255,0.10);
  outline: none;
  background: rgba(0, 0, 0, 0.35);
  color: #fff;
  border-radius: 14px;
  padding: 12px;
  resize: none;
}
.input:focus { border-color: rgba(255,75,43,0.35); }

.upload-row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-top: 10px; }
.file-pill {
  background: rgba(255, 255, 255, 0.10);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 999px;
  padding: 10px 12px;
  cursor: pointer;
}
.file-pill:hover { filter: brightness(1.06); }
.file-pill input { display: none; }

/* Feed head */
.feed-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}
.feed-title { font-weight: 900; font-size: 18px; }

.search {
  width: min(360px, 100%);
  background: rgba(0,0,0,0.35);
  border: 1px solid rgba(255,255,255,0.12);
  color: #fff;
  padding: 10px 12px;
  border-radius: 999px;
  outline: none;
}
.search:focus { border-color: rgba(255,75,43,0.35); }

.post { background: rgba(0,0,0,0.52); }
.post-head { display: flex; gap: 10px; align-items: center; margin-bottom: 10px; }

.text { margin: 6px 0 10px; line-height: 1.5; opacity: .98; }

/* Media */
.media {
  width: 100%;
  border-radius: 16px;
  background: #000;
  margin-top: 10px;
  max-height: 700px;
  object-fit: cover;
}

/* State blocks */
.state {
  text-align: center;
  padding: 26px;
  opacity: 0.85;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255,255,255,0.10);
}
.hint { opacity: .75; font-size: 13px; }
.mt10 { margin-top: 10px; }
.mt12 { margin-top: 12px; }

/* Avatars */
.avatar {
  width: 44px; height: 44px;
  border-radius: 50%;
  background: linear-gradient(45deg, #ff416c, #ff4b2b);
  display: grid; place-items: center;
  font-weight: 900;
}
.avatar.big { width: 52px; height: 52px; }
.avatar.small {
  width: 40px; height: 40px;
  border-radius: 14px;
  background: rgba(255,255,255,0.10);
  border: 1px solid rgba(255,255,255,0.14);
}

/* Actions row */
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
.action-btn:hover { filter: brightness(1.06); }
.action-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.action-btn .label { font-weight: 900; font-size: 13px; }
.action-btn.active {
  border-color: rgba(255, 75, 43, 0.6);
  background: rgba(255, 75, 43, 0.18);
}
.spacer { flex: 1; }

/* Comments box */
.comments {
  margin-top: 12px;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  padding: 12px;
}
.comments-head { display:flex; align-items:center; justify-content:space-between; margin-bottom: 8px; }
.comments-title { font-weight: 900; }
.x {
  border: none; cursor: pointer;
  background: rgba(255, 255, 255, 0.10);
  color: white;
  border-radius: 10px;
  padding: 6px 10px;
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
.badge {
  font-weight: 900;
  font-size: 12px;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.10);
}
.comment-time { opacity: .75; font-size: 12px; }
.comment-text { line-height: 1.5; font-size: 14px; }
.comment-compose { display: flex; gap: 8px; margin-top: 10px; }
.comment-input {
  flex: 1;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: white;
  padding: 10px 12px;
  border-radius: 12px;
  outline: none;
}
.comment-input:focus { border-color: rgba(255,75,43,0.35); }
.comment-error {
  margin-top: 10px;
  padding: 10px;
  border-radius: 14px;
  background: rgba(255, 80, 80, 0.18);
  border: 1px solid rgba(255, 80, 80, 0.35);
}

/* Chat */
.chat-hint { opacity: .7; font-size: 12px; margin-bottom: 10px; }
.chat-list { display: grid; gap: 8px; margin-bottom: 12px; }
.chat-item {
  background: rgba(255, 255, 255, 0.10);
  border: 1px solid rgba(255, 255, 255, 0.12);
  padding: 10px 12px;
  border-radius: 14px;
  color: white;
  cursor: pointer;
  text-align: left;
}
.chat-item:hover { filter: brightness(1.06); }
.chat-item.active { border-color: rgba(255,75,43,.5); background: rgba(255,75,43,.14); }
.chat-box { background: rgba(0, 0, 0, 0.35); border-radius: 16px; padding: 10px; border: 1px solid rgba(255,255,255,0.10); }
.chat-messages { max-height: 320px; overflow: auto; display: grid; gap: 8px; padding: 6px; }
.chat-msg { font-size: 13px; opacity: 0.95; }
.chat-input { display:flex; gap: 8px; margin-top: 10px; }
.chat-input input {
  flex: 1;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: white;
  padding: 10px 12px;
  border-radius: 12px;
  outline: none;
}
.chat-input input:focus { border-color: rgba(255,75,43,0.35); }

/* Alerts */
.alert {
  margin-top: 10px;
  padding: 10px;
  border-radius: 14px;
  background: rgba(255, 80, 80, 0.18);
  border: 1px solid rgba(255, 80, 80, 0.35);
}
.alert.soft {
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.12);
}

/* Incoming modal */
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 90;
  background: rgba(0,0,0,0.58);
  display: grid;
  place-items: center;
  padding: 16px;
}
.modal {
  width: min(520px, 100%);
  background: rgba(12, 18, 32, 0.96);
  border: 1px solid rgba(255,255,255,0.14);
  border-radius: 18px;
  padding: 16px;
  box-shadow: 0 12px 40px rgba(0,0,0,0.45);
}
.modal-title { font-weight: 900; font-size: 18px; }
.modal-sub { margin-top: 8px; opacity: .9; }
.pill {
  display: inline-block;
  margin-left: 6px;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(255,255,255,0.10);
  border: 1px solid rgba(255,255,255,0.14);
  font-weight: 900;
  font-size: 12px;
}
.modal-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 14px; }
.tiny { font-size: 12px; }

/* Calling toast */
.toast {
  position: fixed;
  left: 50%;
  bottom: 18px;
  transform: translateX(-50%);
  z-index: 95;
  background: rgba(12, 18, 32, 0.96);
  border: 1px solid rgba(255,255,255,0.14);
  padding: 10px 12px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  gap: 10px;
  box-shadow: 0 12px 40px rgba(0,0,0,0.35);
}
.mini-x {
  border: none;
  cursor: pointer;
  background: rgba(255,255,255,0.10);
  color: white;
  border-radius: 10px;
  padding: 4px 8px;
}

/* Mobile/iPad drawers */
@media (max-width: 1100px) {
  .page { grid-template-columns: 1fr; width: 100%; }

  .left, .right {
    position: fixed;
    top: 74px;
    bottom: 0;
    width: min(420px, 92vw);
    z-index: 70;
    overflow: auto;
    padding-bottom: 18px;
  }
  .left { left: 0; transform: translateX(-105%); transition: transform .25s ease; }
  .left.open { transform: translateX(0); }
  .right { right: 0; transform: translateX(105%); transition: transform .25s ease; }
  .right.open { transform: translateX(0); }
}
</style>