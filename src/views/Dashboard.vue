<!-- src/views/Dashboard.vue -->
<template>
  <Layout>
    <div class="wrap">
      <!-- Topbar -->
      <header class="topbar">
        <div class="brand" @click="scrollToTop" role="button" tabindex="0" title="Scroll to top">
          <div class="logo">🔥</div>
          <div class="brand-text">
            <div class="title">AddisGo</div>
            <div class="sub">Social • Live • Calls • Chat</div>
          </div>
        </div>

        <div class="top-actions">
          <button class="chip" @click="fetchPosts" :disabled="loading">
            <span class="chip-ic">↻</span>
            <span>{{ loading ? "Loading…" : "Refresh" }}</span>
          </button>

          <button class="chip ghost" @click="togglePeople">
            <span class="chip-ic">👥</span>
            <span>{{ peopleOpen ? "Hide People" : "People" }}</span>
          </button>

          <button class="chip ghost" @click="toggleChat">
            <span class="chip-ic">💬</span>
            <span>{{ chatOpen ? "Close Chat" : "Chat" }}</span>
          </button>

          <button class="chip danger" @click="logout">
            <span class="chip-ic">⎋</span>
            <span>Logout</span>
          </button>
        </div>
      </header>

      <!-- Global status banner -->
      <transition name="fade">
        <div v-if="globalError" class="banner error">
          <strong>Something went wrong:</strong> {{ globalError }}
          <button class="banner-x" @click="globalError = ''">✕</button>
        </div>
      </transition>

      <transition name="fade">
        <div v-if="globalInfo" class="banner info">
          {{ globalInfo }}
          <button class="banner-x" @click="globalInfo = ''">✕</button>
        </div>
      </transition>

      <!-- Layout grid -->
      <div class="page">
        <!-- LEFT -->
        <aside class="left" :class="{ open: peopleOpen }">
          <!-- Live -->
          <section class="panel">
            <div class="panel-head">
              <div class="panel-title">🔴 Live Now</div>
              <button class="btn btn-primary" @click="startLive" :disabled="!token">
                Go Live
              </button>
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

          <!-- People -->
          <section class="panel">
            <div class="panel-head">
              <div class="panel-title">👥 People</div>
              <button class="btn" @click="fetchPeople" :disabled="peopleLoading || !token">
                {{ peopleLoading ? "Loading…" : "Refresh" }}
              </button>
            </div>

            <div v-if="!token" class="alert soft">
              Login again to see people & calling buttons.
            </div>

            <div v-else class="people">
              <div v-if="peopleError" class="alert">{{ peopleError }}</div>

              <!-- Skeleton people while loading -->
              <template v-else-if="peopleLoading">
                <div v-for="n in 6" :key="'p-skel-'+n" class="person skeleton">
                  <div class="avatar small skel-box"></div>
                  <div class="person-meta">
                    <div class="skel-line w70"></div>
                    <div class="skel-line w45 mt6"></div>
                  </div>
                  <div class="person-actions">
                    <div class="iconbtn skel-btn"></div>
                    <div class="iconbtn skel-btn"></div>
                  </div>
                </div>
              </template>

              <div v-else-if="people.length === 0" class="hint">No users found.</div>

              <div v-else v-for="u in people" :key="u.id" class="person">
                <div class="avatar small">
                  {{ (u.display_name || u.username || "U")[0]?.toUpperCase() }}
                </div>

                <div class="person-meta">
                  <div class="person-name">
                    {{ u.display_name || u.username || ("User #" + u.id) }}
                  </div>
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

              <div class="hint mt10">Tip: calls require both users online (green).</div>
            </div>
          </section>

          <!-- Quick actions -->
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

        <!-- CENTER -->
        <main class="center">
          <!-- Composer -->
          <section class="composer">
            <div class="composer-head">
              <div class="avatar big">{{ myInitial }}</div>

              <div class="composer-meta">
                <div class="me">{{ me?.username || "You" }}</div>
                <div class="small muted">Share something with the world</div>
              </div>

              <div class="composer-actions">
                <button class="pill-btn" @click="focusComposer">Create</button>
              </div>
            </div>

            <textarea
              ref="composerRef"
              v-model="caption"
              class="input"
              placeholder="What's happening?"
              rows="3"
            ></textarea>

            <div class="upload-row">
              <label class="file-pill">
                <input type="file" accept="image/*" @change="onPickImage" />
                📷 Image
                <span v-if="imageFile" class="file-dot">•</span>
              </label>

              <label class="file-pill">
                <input type="file" accept="video/*" @change="onPickVideo" />
                🎥 Video
                <span v-if="videoFile" class="file-dot">•</span>
              </label>

              <button class="btn btn-primary" :disabled="posting || !token" @click="submitPost">
                {{ posting ? "Posting…" : "Post 🚀" }}
              </button>
            </div>

            <div v-if="error" class="alert">{{ error }}</div>
          </section>

          <!-- Feed header -->
          <section class="feed-head">
            <div class="feed-title">Feed</div>
            <div class="feed-tools">
              <input v-model="search" class="search" placeholder="Search posts…" />
            </div>
          </section>

          <!-- Feed -->
          <section class="feed">
            <!-- Skeleton feed while loading -->
            <template v-if="loading">
              <article v-for="n in 4" :key="'f-skel-'+n" class="post skeleton">
                <header class="post-head">
                  <div class="avatar skel-box"></div>
                  <div class="who">
                    <div class="skel-line w40"></div>
                    <div class="skel-line w25 mt6"></div>
                  </div>
                </header>
                <div class="skel-line w90 mt10"></div>
                <div class="skel-line w65 mt8"></div>
                <div class="skel-media mt12"></div>
                <div class="actions">
                  <div class="skel-pill"></div>
                  <div class="skel-pill"></div>
                  <div class="spacer"></div>
                  <div class="skel-pill w20"></div>
                </div>
              </article>
            </template>

            <div v-else-if="filteredPosts.length === 0" class="state">
              <div class="state-emoji">🪩</div>
              <div class="state-title">No posts yet</div>
              <div class="state-sub">Be the first to post something.</div>
            </div>

            <article
              v-else
              v-for="post in filteredPosts"
              :key="post.id"
              class="post"
              :id="`post-${post.id}`"
            >
              <header class="post-head">
                <div class="avatar">{{ getInitial(post.user_id) }}</div>
                <div class="who">
                  <div class="name">User #{{ post.user_id }}</div>
                  <div class="time">{{ formatDate(post.created_at) }}</div>
                </div>
              </header>

              <div v-if="post.caption" class="text">{{ post.caption }}</div>

              <img
                v-if="post.image_url"
                class="media"
                :src="getMedia(post.image_url)"
                loading="lazy"
              />

              <video
                v-if="post.video_url"
                class="media"
                :src="getMedia(post.video_url)"
                controls
                playsinline
                preload="metadata"
              ></video>

              <!-- actions -->
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

              <!-- Comments -->
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

        <!-- RIGHT -->
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

      <!-- Incoming call -->
      <div v-if="incomingCall" class="modal-backdrop" @click.self="rejectIncoming">
        <div class="modal">
          <div class="modal-title">
            Incoming {{ incomingCall.kind === "video" ? "Video" : "Audio" }} Call
          </div>
          <div class="modal-sub">
            From
            <span class="pill">
              {{ incomingCall.from?.username || incomingCall.fromName || ("User #" + incomingCall.fromUserId) }}
            </span>
          </div>

          <div class="modal-actions">
            <button class="btn danger" @click="rejectIncoming">Reject</button>
            <button class="btn btn-primary" @click="acceptIncoming">Accept</button>
          </div>

          <div class="tiny muted mt10">Tip: keep Dashboard open on both devices for best reliability.</div>
        </div>
      </div>

      <!-- Calling toast -->
      <div v-if="callingToast" class="toast">
        <span class="toast-dot"></span>
        <span>{{ callingToast }}</span>
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

/* ---------- premium banners ---------- */
const globalError = ref("");
const globalInfo = ref("");

/* ================= SOCKET ================= */
let socket = null;
const onlinePairs = ref([]); // server emits online-users: [ [userId, socketId], ... ]
const liveStreams = ref([]);

function isOnline(userId) {
  const id = String(userId);
  return onlinePairs.value.some(([uid]) => String(uid) === id);
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
  callingToast.value = `Calling ${user.display_name || user.username || "user"}…`;
  pendingRoomId.value = "";

  socket.emit("call:request", { toUserId: user.id, kind });
}

function cancelCall() {
  callingToast.value = "";
  callBusy.value = false;

  if (pendingRoomId.value) {
    socket?.emit("call:cancel", { roomId: pendingRoomId.value });
  }
  pendingRoomId.value = "";
}

function acceptIncoming() {
  if (!incomingCall.value || !socket) return;
  const roomId = incomingCall.value.roomId;
  const kind = incomingCall.value.kind || "audio";

  socket.emit("call:accept", { roomId });

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

const composerRef = ref(null);

const myInitial = computed(() => (me?.username ? me.username[0].toUpperCase() : "A"));

function focusComposer() {
  try { composerRef.value?.focus?.(); } catch {}
}

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
  if (!token) return alert("Login again to post.");
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

    globalInfo.value = "Posted ✅";
    setTimeout(() => (globalInfo.value = ""), 1200);
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
  commentsOpenByPost.value = {
    ...commentsOpenByPost.value,
    [postId]: !commentsOpenByPost.value[postId],
  };

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
      commentErrorByPost.value = {
        ...commentErrorByPost.value,
        [postId]: data?.error || "Failed to load comments",
      };
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
      commentErrorByPost.value = {
        ...commentErrorByPost.value,
        [postId]: data?.error || "Failed to send comment",
      };
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
    globalInfo.value = "Link copied ✅";
    setTimeout(() => (globalInfo.value = ""), 1200);
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

  // ✅ matches backend listener: "send-room-message"
  socket?.emit("send-room-message", {
    room: chatRoom.value,
    from: me?.username || "me",
    text: chatText.value,
  });

  chatText.value = "";
}

/* ================= LIVE ================= */
function startLive() {
  if (!token) return alert("Login again to go live.");
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
    if (me?.id) socket.emit("register-user", { id: me.id, username: me.username });

    socket.emit("join-room", chatRoom.value);
    socket.emit("get-live-list");
  });

  socket.on("receive-message", (msg) => {
    chatMessages.value.push(msg);
    nextTick(() => {
      const el = chatBoxRef.value;
      if (el) el.scrollTop = el.scrollHeight;
    });
  });

  socket.on("live-list", (streams) => {
    liveStreams.value = Array.isArray(streams) ? streams : [];
  });

  socket.on("online-users", (pairs) => {
    onlinePairs.value = Array.isArray(pairs) ? pairs : [];
  });

  // Calls: keep your working flow
  socket.on("call:ringing", ({ roomId, kind }) => {
    pendingRoomId.value = roomId;
    callingToast.value = `Calling… (${kind || pendingKind.value})`;

    router.push(
      `/call?roomId=${encodeURIComponent(roomId)}&role=caller&kind=${encodeURIComponent(kind || pendingKind.value)}`
    );
  });

  socket.on("call:incoming", (p) => {
    incomingCall.value = p;
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
/* ============== Premium Theme ============== */
.wrap {
  min-height: 100vh;
  background:
    radial-gradient(1200px 700px at 15% 0%, rgba(255, 75, 43, 0.18), transparent),
    radial-gradient(900px 600px at 85% 15%, rgba(255, 65, 108, 0.16), transparent),
    radial-gradient(800px 500px at 50% 90%, rgba(120, 75, 255, 0.10), transparent),
    #0b1220;
  color: #fff;
}

/* Topbar */
.topbar {
  position: sticky;
  top: 0;
  z-index: 60;
  padding: 14px 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  background: rgba(8, 12, 20, 0.72);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.10);
}
.brand { display: flex; align-items: center; gap: 10px; user-select: none; }
.brand:active { transform: scale(0.99); }
.logo {
  width: 44px; height: 44px; border-radius: 14px;
  display: grid; place-items: center;
  background: rgba(255, 255, 255, 0.10);
  border: 1px solid rgba(255,255,255,0.14);
  box-shadow: 0 8px 28px rgba(0,0,0,0.22);
  font-size: 20px;
}
.title { font-weight: 950; font-size: 18px; letter-spacing: .2px; }
.sub { opacity: .72; font-size: 12px; }

.top-actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }

/* Banners */
.banner {
  position: sticky;
  top: 70px;
  z-index: 55;
  margin: 10px auto 0;
  max-width: 1200px;
  border-radius: 14px;
  padding: 10px 12px;
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
  border: 1px solid rgba(255,255,255,0.12);
  backdrop-filter: blur(10px);
}
.banner.error { background: rgba(255, 80, 80, 0.16); border-color: rgba(255,80,80,0.28); }
.banner.info  { background: rgba(80, 200, 255, 0.12); border-color: rgba(80,200,255,0.22); }
.banner-x {
  border: none;
  cursor: pointer;
  background: rgba(255,255,255,0.10);
  color: white;
  border-radius: 10px;
  padding: 6px 10px;
}

/* Layout grid */
.page {
  display: grid;
  grid-template-columns: 340px 1fr 360px;
  gap: 16px;
  max-width: 1500px;
  margin: 0 auto;
  padding: 16px;
}
.left, .right { height: fit-content; position: sticky; top: 74px; }
.center { min-width: 0; }

/* Panels */
.panel, .composer, .post {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 18px;
  padding: 14px;
  backdrop-filter: blur(12px);
  margin-bottom: 14px;
  box-shadow: 0 18px 60px rgba(0,0,0,0.18);
}
.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}
.panel-title { font-weight: 950; }

/* Buttons */
.btn, .chip {
  border: none;
  border-radius: 999px;
  padding: 10px 14px;
  cursor: pointer;
  background: rgba(255,255,255,0.12);
  color: white;
  transition: transform .08s ease, filter .15s ease, opacity .15s ease;
}
.btn:hover, .chip:hover { filter: brightness(1.08); }
.btn:active, .chip:active { transform: scale(0.99); }
.btn-primary {
  background: linear-gradient(45deg, #ff416c, #ff4b2b);
  box-shadow: 0 14px 40px rgba(255, 65, 108, 0.16);
}
.danger {
  background: rgba(255,80,80,0.22);
  border: 1px solid rgba(255,80,80,0.35);
}
.ghost { opacity: .92; }
.w100 { width: 100%; }
.stack { display: grid; gap: 10px; }
.chip-ic { margin-right: 6px; opacity: .9; }

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
  transition: transform .10s ease, filter .15s ease;
}
.live-card:hover { filter: brightness(1.05); }
.live-card:active { transform: scale(0.99); }
.dot { width: 10px; height: 10px; border-radius: 50%; background: #ff3b30; box-shadow: 0 0 0 6px rgba(255,59,48,0.14); }
.live-meta { display: grid; }
.live-name { font-weight: 950; }
.live-sub { opacity: .75; font-size: 12px; }
.chev { margin-left: auto; opacity: .7; font-size: 22px; }

/* People */
.people { display: grid; gap: 10px; }
.person {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 10px;
  border-radius: 16px;
  background: rgba(0,0,0,0.26);
  border: 1px solid rgba(255,255,255,0.10);
}
.person-meta { flex: 1; min-width: 0; }
.person-name { font-weight: 950; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.person-sub { display: flex; align-items: center; gap: 8px; opacity: .75; font-size: 12px; margin-top: 2px; }
.status { width: 10px; height: 10px; border-radius: 50%; background: rgba(255,255,255,0.35); }
.status.on { background: #00e676; box-shadow: 0 0 0 6px rgba(0,230,118,0.12); }
.sep { opacity: .5; }
.person-actions { display: flex; gap: 8px; }

.iconbtn {
  width: 40px; height: 40px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(255,255,255,0.10);
  cursor: pointer;
  transition: transform .08s ease, filter .15s ease;
}
.iconbtn:hover { filter: brightness(1.08); }
.iconbtn:active { transform: scale(0.98); }
.iconbtn:disabled { opacity: .45; cursor: not-allowed; }

/* Composer */
.composer-head { display: flex; gap: 10px; align-items: center; margin-bottom: 10px; }
.composer-meta { flex: 1; }
.composer-actions { display: flex; justify-content: flex-end; }
.pill-btn {
  border: 1px solid rgba(255,255,255,0.16);
  background: rgba(255,255,255,0.10);
  color: white;
  padding: 10px 12px;
  border-radius: 999px;
  cursor: pointer;
}
.me { font-weight: 950; }
.small { font-size: 12px; }
.muted { opacity: .75; }

.input {
  width: 100%;
  border: 1px solid rgba(255,255,255,0.10);
  outline: none;
  background: rgba(0, 0, 0, 0.32);
  color: white;
  border-radius: 16px;
  padding: 12px 12px;
  resize: none;
  transition: border-color .15s ease, background .15s ease;
}
.input:focus {
  border-color: rgba(255,75,43,0.45);
  background: rgba(0,0,0,0.38);
}
.upload-row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-top: 10px; }
.file-pill {
  background: rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  padding: 10px 12px;
  cursor: pointer;
  border: 1px solid rgba(255,255,255,0.12);
}
.file-pill input { display: none; }
.file-dot { margin-left: 6px; opacity: .9; }

/* Feed header */
.feed-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}
.feed-title { font-weight: 950; font-size: 18px; }
.search {
  background: rgba(0, 0, 0, 0.32);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: white;
  padding: 10px 12px;
  border-radius: 999px;
  outline: none;
}
.post { background: rgba(0, 0, 0, 0.52); }
.post-head { display: flex; gap: 10px; align-items: center; margin-bottom: 10px; }
.who .name { font-weight: 950; }
.time { opacity: .75; font-size: 12px; }
.text { margin: 6px 0 10px; line-height: 1.55; font-size: 15px; }

.media {
  width: 100%;
  border-radius: 16px;
  background: #000;
  margin-top: 10px;
  max-height: 720px;
  object-fit: cover;
}
.state {
  text-align: center;
  padding: 34px 18px;
  opacity: 0.95;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255,255,255,0.10);
}
.state-emoji { font-size: 28px; margin-bottom: 8px; }
.state-title { font-weight: 950; font-size: 18px; }
.state-sub { opacity: .75; margin-top: 4px; }
.hint { opacity: .75; font-size: 13px; }
.mt10 { margin-top: 10px; }
.mt6 { margin-top: 6px; }
.mt12 { margin-top: 12px; }

/* Avatars */
.avatar {
  width: 44px; height: 44px; border-radius: 50%;
  background: linear-gradient(45deg, #ff416c, #ff4b2b);
  display: grid; place-items: center;
  font-weight: 950;
  box-shadow: 0 12px 40px rgba(255,65,108,0.14);
}
.avatar.big { width: 52px; height: 52px; }
.avatar.small {
  width: 40px; height: 40px;
  border-radius: 14px;
  background: rgba(255,255,255,0.10);
  border: 1px solid rgba(255,255,255,0.14);
  box-shadow: none;
}

/* Actions */
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
  transition: transform .08s ease, filter .15s ease;
}
.action-btn:hover { filter: brightness(1.06); }
.action-btn:active { transform: scale(0.99); }
.action-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.action-btn .label { font-weight: 950; font-size: 13px; }
.action-btn.active {
  border-color: rgba(255, 75, 43, 0.60);
  background: rgba(255, 75, 43, 0.18);
}
.spacer { flex: 1; }

/* Comments */
.comments {
  margin-top: 12px;
  background: rgba(0, 0, 0, 0.32);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  padding: 12px;
}
.comments-head { display:flex; align-items:center; justify-content:space-between; margin-bottom: 8px; }
.comments-title { font-weight: 950; }
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
  font-weight: 950;
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
  background: rgba(0, 0, 0, 0.32);
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
.chat-item.active { border-color: rgba(255,75,43,.5); background: rgba(255,75,43,.14); }
.chat-box { background: rgba(0, 0, 0, 0.32); border-radius: 16px; padding: 10px; border: 1px solid rgba(255,255,255,0.10); }
.chat-messages { max-height: 320px; overflow: auto; display: grid; gap: 8px; padding: 6px; }
.chat-msg { font-size: 13px; opacity: 0.95; }
.chat-input { display:flex; gap: 8px; margin-top: 10px; }
.chat-input input {
  flex: 1;
  background: rgba(0, 0, 0, 0.32);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: white;
  padding: 10px 12px;
  border-radius: 12px;
  outline: none;
}

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
  z-index: 80;
  background: rgba(0,0,0,0.58);
  display: grid;
  place-items: center;
  padding: 16px;
}
.modal {
  width: min(520px, 100%);
  background: rgba(12, 18, 32, 0.95);
  border: 1px solid rgba(255,255,255,0.14);
  border-radius: 18px;
  padding: 16px;
  box-shadow: 0 12px 40px rgba(0,0,0,0.45);
}
.modal-title { font-weight: 950; font-size: 18px; }
.modal-sub { margin-top: 8px; opacity: .9; }
.pill {
  display: inline-block;
  margin-left: 6px;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(255,255,255,0.10);
  border: 1px solid rgba(255,255,255,0.14);
  font-weight: 950;
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
  z-index: 90;
  background: rgba(12, 18, 32, 0.95);
  border: 1px solid rgba(255,255,255,0.14);
  padding: 10px 12px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  gap: 10px;
  box-shadow: 0 18px 50px rgba(0,0,0,0.35);
}
.toast-dot {
  width: 10px; height: 10px; border-radius: 50%;
  background: #00e676;
  box-shadow: 0 0 0 6px rgba(0,230,118,0.12);
}
.mini-x {
  border: none;
  cursor: pointer;
  background: rgba(255,255,255,0.10);
  color: white;
  border-radius: 10px;
  padding: 4px 8px;
}

/* ===== Skeletons ===== */
.skeleton { position: relative; overflow: hidden; }
.skeleton::after{
  content:"";
  position:absolute;
  inset:-40%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent);
  transform: translateX(-40%);
  animation: shimmer 1.25s infinite;
}
@keyframes shimmer {
  0% { transform: translateX(-60%); }
  100% { transform: translateX(60%); }
}
.skel-box { background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.10); }
.skel-line {
  height: 12px;
  border-radius: 999px;
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.10);
}
.skel-media {
  height: 300px;
  border-radius: 16px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.10);
}
.skel-pill {
  height: 38px;
  width: 110px;
  border-radius: 999px;
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.10);
}
.skel-btn { background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.10); }
.w90 { width: 90%; }
.w70 { width: 70%; }
.w65 { width: 65%; }
.w45 { width: 45%; }
.w40 { width: 40%; }
.w25 { width: 25%; }
.w20 { width: 20%; }

/* Transitions */
.fade-enter-active, .fade-leave-active { transition: opacity .15s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* Responsive drawers */
@media (max-width: 1100px) {
  .page { grid-template-columns: 1fr; }
  .left, .right {
    position: fixed; top: 74px; bottom: 0;
    width: min(420px, 92vw);
    z-index: 65;
    overflow: auto;
  }
  .left { left: 0; transform: translateX(-105%); transition: transform .25s ease; }
  .left.open { transform: translateX(0); }
  .right { right: 0; transform: translateX(105%); transition: transform .25s ease; }
  .right.open { transform: translateX(0); }
}
</style>