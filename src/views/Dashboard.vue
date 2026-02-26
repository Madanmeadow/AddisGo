<template>
  <div class="dash">
    <!-- Top Bar -->
    <header class="topbar">
      <div class="brand">
        <div class="brand-badge">🔥</div>
        <div class="brand-text">
          <div class="brand-title">AddisGo</div>
          <div class="brand-sub">All-in-One • TikTok • IG • X • Discord • Live</div>
        </div>
      </div>

      <div class="top-actions">
        <div class="searchWrap">
          <input
            v-model="search"
            class="search"
            placeholder="Search…"
            @keydown.enter.prevent="noop"
          />
        </div>

        <button class="chip" @click="hardRefresh" :disabled="busy.refresh">
          ↻ Refresh
        </button>

        <button class="chip" @click="togglePeople()" aria-label="People">
          👥 People
        </button>

        <button class="chip" @click="toggleChat()" aria-label="Chat">
          💬 Chat
        </button>

        <button class="chip danger" @click="logout">Logout</button>
      </div>
    </header>

    <!-- Main Layout -->
    <div class="layout">
      <!-- Desktop Left Column (People/Live) -->
      <aside class="leftCol">
        <section class="card liveCard">
          <div class="cardHead">
            <div class="cardTitle">
              <span class="dotLive"></span>
              Live Now
            </div>
            <button class="btnPrimary" @click="goLive">Go Live</button>
          </div>

          <div class="cardBody">
            <div v-if="busy.live" class="hint">Loading live…</div>
            <div v-else-if="liveStreams.length === 0" class="hint">No one live right now</div>

            <div
              v-for="s in liveStreams"
              :key="s"
              class="liveItem"
              @click="joinLive(s)"
            >
              <span class="dotSmall"></span>
              <div class="liveMeta">
                <div class="liveName">{{ s }}</div>
                <div class="liveSub">Tap to watch</div>
              </div>
            </div>
          </div>
        </section>

        <section class="card peopleCard">
          <div class="cardHead">
            <div class="cardTitle">👥 People</div>
            <button class="chip" @click="loadUsers" :disabled="busy.users">Refresh</button>
          </div>

          <div class="cardBody peopleList">
            <div v-if="busy.users" class="skeletonList">
              <div class="skRow" v-for="n in 7" :key="n"></div>
            </div>

            <div v-else-if="usersError" class="errorBox">
              {{ usersError }}
              <div class="mutedText mt6">
                Tip: check DevTools → Network → <b>/users</b> (should be 200).
              </div>
            </div>

            <template v-else>
              <div
                v-for="u in filteredUsers"
                :key="u.id"
                class="person"
              >
                <div class="avatar">
                  <img v-if="u.avatar_url" :src="u.avatar_url" alt="" />
                  <span v-else>{{ (u.display_name || u.username || u.name || 'U')[0] }}</span>
                </div>

                <div class="pMeta">
                  <div class="pName">{{ u.display_name || u.username || u.name || `User ${u.id}` }}</div>
                  <div class="pSub">
                    <span class="statusDot" :class="{ on: isOnline(u.id) }"></span>
                    <span>{{ isOnline(u.id) ? "Online" : "Offline" }}</span>
                    <span class="sep">•</span>
                    <span>ID {{ u.id }}</span>
                  </div>
                </div>

                <div class="pActions">
                  <button
                    class="iconBtn"
                    :disabled="!isOnline(u.id) || callBusy"
                    title="Audio call"
                    @click="startCall(u, 'audio')"
                  >
                    📞
                  </button>
                  <button
                    class="iconBtn"
                    :disabled="!isOnline(u.id) || callBusy"
                    title="Video call"
                    @click="startCall(u, 'video')"
                  >
                    🎥
                  </button>
                </div>
              </div>
            </template>
          </div>
        </section>
      </aside>

      <!-- Center Column (Feed/Composer) -->
      <main class="centerCol">
        <!-- Tabs (TikTok/IG vibe) -->
        <div class="tabs">
          <button class="tab" :class="{ active: mode === 'foryou' }" @click="mode='foryou'">✨ For You</button>
          <button class="tab" :class="{ active: mode === 'following' }" @click="mode='following'">🧭 Following</button>
          <button class="tab" :class="{ active: mode === 'threads' }" @click="mode='threads'">🔥 Threads</button>
          <button class="tab" :class="{ active: mode === 'rooms' }" @click="mode='rooms'">🎧 Rooms</button>
          <button class="tab" :class="{ active: mode === 'live' }" @click="mode='live'">🔴 Live</button>
        </div>

        <!-- Composer -->
        <section class="card composer">
          <div class="composerTop">
            <div class="meAvatar">
              <img v-if="me?.avatar_url" :src="me.avatar_url" alt="" />
              <span v-else>{{ (meName || "U")[0] }}</span>
            </div>

            <div class="composerMeta">
              <div class="meName">{{ meName }}</div>
              <div class="meSub">Post to the world (works everywhere)</div>
            </div>

            <button class="chip" @click="openCreate" aria-label="Create">Create</button>
          </div>

          <textarea
            v-model="caption"
            class="caption"
            rows="3"
            placeholder="What’s happening?"
          ></textarea>

          <div class="composerRow">
            <label class="fileBtn">
              🖼️ Image
              <input type="file" accept="image/*" @change="onPickImage" />
            </label>

            <label class="fileBtn">
              🎬 Video
              <input type="file" accept="video/*" @change="onPickVideo" />
            </label>

            <button class="btnPrimary" @click="createPost" :disabled="busy.post">
              {{ busy.post ? "Posting…" : "Post 🚀" }}
            </button>
          </div>

          <div v-if="previewUrl" class="preview">
            <img v-if="previewKind==='image'" :src="previewUrl" alt="" />
            <video v-else controls :src="previewUrl"></video>
            <button class="chip" @click="clearPreview">Remove</button>
          </div>

          <div v-if="postError" class="errorBox mt10">{{ postError }}</div>
        </section>

        <!-- Feed -->
        <section class="feed">
          <div class="feedHead">
            <div class="feedTitle">Feed</div>
            <input v-model="postSearch" class="feedSearch" placeholder="Search posts…" />
          </div>

          <!-- Loading skeleton -->
          <div v-if="busy.posts" class="feedSkeleton">
            <div class="skPost" v-for="n in 4" :key="n"></div>
          </div>

          <div v-else-if="posts.length === 0" class="empty">
            <div class="emptyIcon">🗂️</div>
            <div class="emptyTitle">No posts found.</div>
            <div class="emptySub">Create a post and it will show here instantly.</div>
          </div>

          <article v-else v-for="p in filteredPosts" :key="p.id" class="post card">
            <div class="postHead">
              <div class="postAvatar">
                <span>{{ (p.author_name || "U")[0] }}</span>
              </div>

              <div class="postMeta">
                <div class="postName">{{ p.author_name || `User #${p.user_id}` }}</div>
                <div class="postTime">{{ formatTime(p.created_at) }}</div>
              </div>

              <button class="iconBtn" title="More" @click="noop">⋯</button>
            </div>

            <div v-if="p.caption" class="postCaption">{{ p.caption }}</div>

            <div v-if="p.image_url" class="media">
              <img :src="absMedia(p.image_url)" alt="" loading="lazy" />
            </div>

            <div v-if="p.video_url" class="media">
              <video controls playsinline :src="absMedia(p.video_url)"></video>
            </div>

            <div class="postActions">
              <button class="actBtn" @click="toggleLike(p)" :disabled="busy.like[p.id]">
                ❤️ {{ p.like_count ?? 0 }}
              </button>

              <button class="actBtn" @click="toggleComments(p)">
                💬 {{ p.comment_count ?? 0 }}
              </button>

              <button class="actBtn" @click="sharePost(p)">↗ Share</button>
            </div>

            <!-- Comments (safe / won’t break if your backend doesn’t support it yet) -->
            <div v-if="p._commentsOpen" class="comments">
              <div v-if="p._commentsError" class="mutedText">{{ p._commentsError }}</div>

              <div v-else class="commentList">
                <div v-for="c in (p._comments || [])" :key="c.id" class="comment">
                  <b>{{ c.author_name || `User #${c.user_id}` }}:</b>
                  <span>{{ c.text }}</span>
                </div>
              </div>

              <div class="commentRow">
                <input
                  v-model="p._newComment"
                  class="commentInput"
                  placeholder="Write a comment…"
                  @keydown.enter.prevent="sendComment(p)"
                />
                <button class="btnPrimary" @click="sendComment(p)" :disabled="busy.comment[p.id]">
                  Send
                </button>
              </div>
            </div>
          </article>
        </section>
      </main>

      <!-- Desktop Right Column (Chat) -->
      <aside class="rightCol">
        <section class="card chatCard">
          <div class="cardHead">
            <div class="cardTitle">💬 Chat</div>
            <button class="chip" @click="toggleChat()">Open</button>
          </div>

          <div class="cardBody">
            <div class="mutedText">Quick room chat. Rooms tab is full Discord-style.</div>

            <div class="roomPills">
              <button class="roomBtn" :class="{ on: chatRoom==='Global' }" @click="setRoom('Global')">🌐 Global</button>
              <button class="roomBtn" :class="{ on: chatRoom==='Support' }" @click="setRoom('Support')">🛟 Support</button>
              <button class="roomBtn" :class="{ on: chatRoom==='Dev' }" @click="setRoom('Dev')">🧠 Dev</button>
              <button class="roomBtn" :class="{ on: chatRoom==='Random' }" @click="setRoom('Random')">🎲 Random</button>
            </div>

            <div class="chatBox" ref="chatBoxRef">
              <div
                v-for="(m, idx) in chatMessages"
                :key="idx"
                class="chatMsg"
              >
                <b>{{ m.from }}:</b> <span>{{ m.text }}</span>
              </div>
            </div>

            <div class="chatRow">
              <input
                v-model="chatText"
                class="chatInput"
                placeholder="Type message…"
                @keydown.enter.prevent="sendChat"
              />
              <button class="btnPrimary" @click="sendChat">Send</button>
            </div>
          </div>
        </section>
      </aside>
    </div>

    <!-- MOBILE BOTTOM NAV -->
    <nav class="mobileNav" aria-label="Mobile Navigation">
      <button class="mBtn" @click="scrollTop">🏠<span>Feed</span></button>
      <button class="mBtn" @click="togglePeople(true)">👥<span>People</span></button>
      <button class="mBtn" @click="toggleChat(true)">💬<span>Chat</span></button>
      <button class="mBtn" @click="goLive">🔴<span>Live</span></button>
    </nav>

    <!-- LEFT MINI PEOPLE DRAWER (MOBILE) -->
    <transition name="fade">
      <div v-if="peopleDrawer" class="overlay" @click.self="peopleDrawer=false">
        <div class="drawer left mini">
          <div class="drawerHead">
            <div class="drawerTitle">👥 People</div>
            <button class="iconBtn" @click="peopleDrawer=false">✕</button>
          </div>

          <div class="drawerBody">
            <button class="chip w100" @click="loadUsers" :disabled="busy.users">Refresh</button>

            <div v-if="busy.users" class="skeletonList mt10">
              <div class="skRow" v-for="n in 7" :key="n"></div>
            </div>

            <div v-else-if="usersError" class="errorBox mt10">{{ usersError }}</div>

            <div v-else class="peopleList">
              <div v-for="u in filteredUsers" :key="u.id" class="person">
                <div class="avatar">
                  <img v-if="u.avatar_url" :src="u.avatar_url" alt="" />
                  <span v-else>{{ (u.display_name || u.username || u.name || 'U')[0] }}</span>
                </div>

                <div class="pMeta">
                  <div class="pName">{{ u.display_name || u.username || u.name || `User ${u.id}` }}</div>
                  <div class="pSub">
                    <span class="statusDot" :class="{ on: isOnline(u.id) }"></span>
                    <span>{{ isOnline(u.id) ? "Online" : "Offline" }}</span>
                    <span class="sep">•</span>
                    <span>ID {{ u.id }}</span>
                  </div>
                </div>

                <div class="pActions">
                  <button class="iconBtn" :disabled="!isOnline(u.id) || callBusy" @click="startCall(u,'audio')">📞</button>
                  <button class="iconBtn" :disabled="!isOnline(u.id) || callBusy" @click="startCall(u,'video')">🎥</button>
                </div>
              </div>
            </div>

            <div class="mutedText mt10">
              Tip: calls require both users online (green).
            </div>
          </div>
        </div>
      </div>
    </transition>

    <!-- RIGHT MINI CHAT DRAWER (MOBILE) -->
    <transition name="fade">
      <div v-if="chatDrawer" class="overlay" @click.self="chatDrawer=false">
        <div class="drawer right mini">
          <div class="drawerHead">
            <div class="drawerTitle">💬 Chat</div>
            <button class="iconBtn" @click="chatDrawer=false">✕</button>
          </div>

          <div class="drawerBody">
            <div class="roomPills">
              <button class="roomBtn" :class="{ on: chatRoom==='Global' }" @click="setRoom('Global')">🌐 Global</button>
              <button class="roomBtn" :class="{ on: chatRoom==='Support' }" @click="setRoom('Support')">🛟 Support</button>
              <button class="roomBtn" :class="{ on: chatRoom==='Dev' }" @click="setRoom('Dev')">🧠 Dev</button>
              <button class="roomBtn" :class="{ on: chatRoom==='Random' }" @click="setRoom('Random')">🎲 Random</button>
            </div>

            <div class="chatBox" ref="chatBoxRef2">
              <div v-for="(m, idx) in chatMessages" :key="idx" class="chatMsg">
                <b>{{ m.from }}:</b> <span>{{ m.text }}</span>
              </div>
            </div>

            <div class="chatRow">
              <input v-model="chatText" class="chatInput" placeholder="Type message…" @keydown.enter.prevent="sendChat" />
              <button class="btnPrimary" @click="sendChat">Send</button>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <!-- INCOMING CALL POPUP -->
    <transition name="pop">
      <div v-if="incomingCall" class="callPop">
        <div class="callPopCard">
          <div class="callPopTitle">Incoming {{ incomingCall.kind }} call</div>
          <div class="callPopSub">From: {{ incomingCall.fromName }}</div>

          <div class="callPopBtns">
            <button class="btnPrimary" @click="acceptIncoming">Accept</button>
            <button class="chip danger" @click="rejectIncoming">Reject</button>
          </div>
        </div>
      </div>
    </transition>

    <!-- CALLING TOAST -->
    <transition name="pop">
      <div v-if="callingToast" class="toast">
        <div class="toastCard">
          <div class="toastTitle">{{ callingToast }}</div>
          <button class="chip danger" @click="cancelCall">Cancel</button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from "vue";
import { useRouter } from "vue-router";
import { io } from "socket.io-client";

const router = useRouter();
const apiUrl = import.meta.env.VITE_API_URL;

// --- auth ---
function safeJsonParse(str) { try { return JSON.parse(str); } catch { return null; } }
const token = localStorage.getItem("token") || "";
const me = safeJsonParse(localStorage.getItem("user") || "null");
const meName = computed(() => me?.display_name || me?.username || me?.name || me?.email || `User #${me?.id || ""}`);

// --- ui state ---
const mode = ref("foryou");
const search = ref("");
const postSearch = ref("");

const peopleDrawer = ref(false);
const chatDrawer = ref(false);

// --- data ---
const users = ref([]);
const usersError = ref("");
const posts = ref([]);
const liveStreams = ref([]);

const caption = ref("");
const previewUrl = ref("");
const previewKind = ref(""); // image | video
let pickedFile = null;

const chatRoom = ref("Global");
const chatText = ref("");
const chatMessages = ref([]);
const chatBoxRef = ref(null);
const chatBoxRef2 = ref(null);

// --- busy flags ---
const busy = ref({
  refresh: false,
  users: false,
  posts: false,
  live: false,
  post: false,
  like: {},
  comment: {},
});

// --- socket ---
let socket = null;

// presence set
const onlineUserIds = ref([]); // strings
function isOnline(id) {
  return onlineUserIds.value.includes(String(id));
}

// --- calls ---
const incomingCall = ref(null); // { roomId, kind, fromUserId, fromName }
const callBusy = ref(false);
const callingToast = ref("");
const pendingRoomId = ref("");
const pendingKind = ref("audio");

function togglePeople(forceMobile = false) {
  // on mobile always use drawer
  if (window.matchMedia("(max-width: 900px)").matches || forceMobile) {
    peopleDrawer.value = !peopleDrawer.value;
    return;
  }
  // on desktop, just scroll People section into view (keep layout stable)
  document.querySelector(".peopleCard")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function toggleChat(forceMobile = false) {
  if (window.matchMedia("(max-width: 900px)").matches || forceMobile) {
    chatDrawer.value = !chatDrawer.value;
    nextTick(() => {
      const el = chatBoxRef2.value;
      if (el) el.scrollTop = el.scrollHeight;
    });
    return;
  }
  // desktop chat is already visible
  document.querySelector(".chatCard")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function noop(){}

function absMedia(url) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  // backend serves /uploads
  return `${apiUrl}${url.startsWith("/") ? "" : "/"}${url}`;
}

function formatTime(ts) {
  try {
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString();
  } catch {
    return "—";
  }
}

async function apiFetch(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (!(options.body instanceof FormData)) headers["Content-Type"] = headers["Content-Type"] || "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${apiUrl}${path}`, { ...options, headers });
  return res;
}

/* =======================
   LOAD USERS / POSTS / LIVE
======================= */
const filteredUsers = computed(() => {
  const q = search.value.trim().toLowerCase();
  const meId = String(me?.id || "");
  return users.value
    .filter(u => String(u.id) !== meId)
    .filter(u => {
      if (!q) return true;
      const name = (u.display_name || u.username || u.name || u.email || "").toLowerCase();
      return name.includes(q) || String(u.id).includes(q);
    });
});

const filteredPosts = computed(() => {
  const q = postSearch.value.trim().toLowerCase();
  if (!q) return posts.value;
  return posts.value.filter(p => {
    const cap = (p.caption || "").toLowerCase();
    const who = (p.author_name || "").toLowerCase();
    return cap.includes(q) || who.includes(q) || String(p.user_id || "").includes(q);
  });
});

async function loadUsers() {
  usersError.value = "";
  busy.value.users = true;
  try {
    const res = await apiFetch("/users", { method: "GET" });
    if (!res.ok) throw new Error(`Users failed: ${res.status}`);
    const data = await res.json();

    // accept either array or {users:[]}
    const arr = Array.isArray(data) ? data : (data.users || []);
    users.value = arr.map(u => ({
      id: u.id,
      email: u.email,
      username: u.username,
      name: u.name,
      display_name: u.display_name,
      bio: u.bio,
      avatar_url: u.avatar_url,
    }));
  } catch (e) {
    usersError.value = "Failed to load users";
    console.error(e);
  } finally {
    busy.value.users = false;
  }
}

async function loadPosts() {
  busy.value.posts = true;
  try {
    const res = await apiFetch("/posts", { method: "GET" });
    if (!res.ok) throw new Error(`Posts failed: ${res.status}`);
    const data = await res.json();
    const arr = Array.isArray(data) ? data : (data.posts || []);
    posts.value = arr.map(p => ({
      ...p,
      author_name: p.author_name || p.display_name || p.username || p.name || null,
      _commentsOpen: false,
      _comments: [],
      _newComment: "",
      _commentsError: "",
    }));
  } catch (e) {
    console.error(e);
  } finally {
    busy.value.posts = false;
  }
}

async function loadLiveList() {
  // socket also updates live-list; this is just a safe helper
  busy.value.live = true;
  try {
    socket?.emit("get-live-list");
  } finally {
    busy.value.live = false;
  }
}

async function hardRefresh() {
  busy.value.refresh = true;
  await Promise.allSettled([loadUsers(), loadPosts()]);
  busy.value.refresh = false;
}

function scrollTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* =======================
   POSTS: upload + create
======================= */
function clearPreview() {
  previewUrl.value = "";
  previewKind.value = "";
  pickedFile = null;
}

function onPickImage(e) {
  const f = e.target.files?.[0];
  if (!f) return;
  pickedFile = f;
  previewKind.value = "image";
  previewUrl.value = URL.createObjectURL(f);
}

function onPickVideo(e) {
  const f = e.target.files?.[0];
  if (!f) return;
  pickedFile = f;
  previewKind.value = "video";
  previewUrl.value = URL.createObjectURL(f);
}

const postError = ref("");

async function uploadFile(file) {
  const fd = new FormData();
  fd.append("file", file);

  const res = await apiFetch("/upload", {
    method: "POST",
    body: fd,
    headers: {}, // let browser set boundary
  });

  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  const j = await res.json();

  // support multiple backend shapes
  return j.url || j.path || j.fileUrl || j.secure_url || j.location;
}

async function createPost() {
  postError.value = "";
  busy.value.post = true;

  try {
    let image_url = null;
    let video_url = null;

    if (pickedFile) {
      const url = await uploadFile(pickedFile);
      if (previewKind.value === "image") image_url = url;
      if (previewKind.value === "video") video_url = url;
    }

    const payload = {
      caption: caption.value?.trim() || null,
      image_url,
      video_url,
    };

    const res = await apiFetch("/posts", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`Post failed: ${res.status} ${t}`);
    }

    caption.value = "";
    clearPreview();

    // refresh feed
    await loadPosts();
    scrollTop();
  } catch (e) {
    console.error(e);
    postError.value = "Failed to post. Check backend logs.";
  } finally {
    busy.value.post = false;
  }
}

function openCreate() {
  // small UX: focus composer on mobile
  document.querySelector(".caption")?.focus?.();
}

/* =======================
   LIKES (safe)
======================= */
async function toggleLike(p) {
  busy.value.like[p.id] = true;
  try {
    // common patterns:
    // POST /likes/:postId
    // or POST /likes with {postId}
    let res = await apiFetch(`/likes/${p.id}`, { method: "POST" });
    if (!res.ok) {
      res = await apiFetch(`/likes`, { method: "POST", body: JSON.stringify({ postId: p.id }) });
    }
    if (!res.ok) throw new Error(`Like failed: ${res.status}`);

    const j = await res.json().catch(() => ({}));
    if (typeof j.like_count === "number") p.like_count = j.like_count;
    else if (typeof j.count === "number") p.like_count = j.count;
    else {
      // fallback optimistic
      p.like_count = (p.like_count ?? 0) + 1;
    }
  } catch (e) {
    console.warn("Like endpoint mismatch (ok to ignore if not implemented yet).", e);
  } finally {
    busy.value.like[p.id] = false;
  }
}

/* =======================
   COMMENTS (safe / won’t break)
======================= */
function toggleComments(p) {
  p._commentsOpen = !p._commentsOpen;
  if (p._commentsOpen && (!p._comments || p._comments.length === 0) && !p._commentsError) {
    loadComments(p);
  }
}

async function loadComments(p) {
  try {
    p._commentsError = "";
    // try a few common endpoints safely
    let res = await apiFetch(`/comments?postId=${encodeURIComponent(p.id)}`, { method: "GET" });
    if (!res.ok) res = await apiFetch(`/posts/${p.id}/comments`, { method: "GET" });
    if (!res.ok) throw new Error(`Comments not available: ${res.status}`);

    const data = await res.json();
    const arr = Array.isArray(data) ? data : (data.comments || []);
    p._comments = arr;
  } catch (e) {
    p._commentsError = "Comments not available yet (backend route not found).";
  }
}

async function sendComment(p) {
  const text = (p._newComment || "").trim();
  if (!text) return;

  busy.value.comment[p.id] = true;
  try {
    let res = await apiFetch(`/comments`, { method: "POST", body: JSON.stringify({ postId: p.id, text }) });
    if (!res.ok) res = await apiFetch(`/posts/${p.id}/comments`, { method: "POST", body: JSON.stringify({ text }) });
    if (!res.ok) throw new Error(`Comment failed: ${res.status}`);

    p._newComment = "";
    await loadComments(p);
  } catch (e) {
    p._commentsError = "Failed to send comment (route mismatch).";
  } finally {
    busy.value.comment[p.id] = false;
  }
}

function sharePost(p) {
  const url = `${window.location.origin}/dashboard`;
  navigator.clipboard?.writeText?.(url).catch(() => {});
  // keep simple: no popups
}

/* =======================
   LIVE
======================= */
function goLive() {
  // your project already has Live.vue routes
  router.push("/live");
}
function joinLive(liveId) {
  router.push(`/live?watch=${encodeURIComponent(liveId)}`);
}

/* =======================
   CHAT (room)
======================= */
function setRoom(r) {
  chatRoom.value = r;
  try {
    socket?.emit("join-room", r);
  } catch {}
}

/* =======================
   CALLS (your working flow)
======================= */
function makeRoomId() {
  return `call-${Math.random().toString(36).slice(2, 10)}-${Date.now()}`;
}

function startCall(user, kind = "audio") {
  if (!socket) return;
  if (!me?.id) return alert("Login again to call.");
  if (!isOnline(user.id)) return alert("User is offline.");

  callBusy.value = true;
  pendingKind.value = kind;
  callingToast.value = `Calling ${user.display_name || user.username || user.name || "user"}…`;
  const roomId = makeRoomId();
  pendingRoomId.value = roomId;

  socket.emit("call:invite", { toUserId: user.id, kind, roomId });
}

function cancelCall() {
  callingToast.value = "";
  callBusy.value = false;
  if (pendingRoomId.value) socket?.emit("call:end", { roomId: pendingRoomId.value });
  pendingRoomId.value = "";
}

function acceptIncoming() {
  if (!incomingCall.value) return;
  socket.emit("call:accept", { roomId: incomingCall.value.roomId });

  const roomId = incomingCall.value.roomId;
  const kind = incomingCall.value.kind || "audio";
  incomingCall.value = null;

  router.push(`/call?roomId=${encodeURIComponent(roomId)}&role=callee&kind=${encodeURIComponent(kind)}`);
}

function rejectIncoming() {
  if (!incomingCall.value) return;
  socket.emit("call:reject", { roomId: incomingCall.value.roomId });
  incomingCall.value = null;
}

/* =======================
   AUTH
======================= */
function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  try { socket?.disconnect(); } catch {}
  router.push("/login");
}

/* =======================
   SOCKET CONNECT + PRESENCE
======================= */
function applyOnlineFromPairs(pairs) {
  // online-users emits array of [userId, socketId]
  const ids = (pairs || []).map(([userId]) => String(userId));
  onlineUserIds.value = Array.from(new Set(ids));
}

onMounted(async () => {
  // initial load
  await Promise.allSettled([loadUsers(), loadPosts()]);

  // socket
  socket = io(apiUrl, { transports: ["websocket", "polling"] });

  socket.on("connect", () => {
    // compatible with your server/index.js
    if (me?.id) socket.emit("register-user", { id: me.id, username: meName.value });

    // compatible with older presence approach (if you still had it)
    if (me?.id) socket.emit("user:online", { userId: me.id });
    socket.emit("presence:get");

    // join default chat + ask live list
    socket.emit("join-room", chatRoom.value);
    socket.emit("get-live-list");
  });

  // Presence (new server)
  socket.on("online-users", (pairs) => {
    applyOnlineFromPairs(pairs);
  });

  // Presence (older pattern)
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

  // Live
  socket.on("live-list", (streams) => {
    liveStreams.value = Array.isArray(streams) ? streams : [];
  });

  // Chat
  socket.on("receive-message", (msg) => {
    chatMessages.value.push(msg);
    nextTick(() => {
      const el = chatBoxRef.value;
      const el2 = chatBoxRef2.value;
      if (el) el.scrollTop = el.scrollHeight;
      if (el2) el2.scrollTop = el2.scrollHeight;
    });
  });

  // Calls
  socket.on("call:ringing", ({ roomId, kind }) => {
    pendingRoomId.value = roomId;
    callingToast.value = `Calling… (${kind || pendingKind.value})`;

    // Caller navigates immediately (Call.vue creates offer after ready)
    router.push(
      `/call?roomId=${encodeURIComponent(roomId)}&role=caller&kind=${encodeURIComponent(kind || pendingKind.value)}`
    );
  });

  socket.on("call:incoming", (p) => {
    // server sends: { roomId, kind, fromUser: {id, username} }
    incomingCall.value = {
      roomId: p.roomId,
      kind: p.kind || "audio",
      fromUserId: p.fromUser?.id || p.fromUserId,
      fromName: p.fromUser?.username || p.fromName || `User #${p.fromUser?.id || p.fromUserId}`,
    };
  });

  socket.on("call:accepted", () => {
    callingToast.value = "";
    callBusy.value = false;
  });

  socket.on("call:ended", () => {
    callingToast.value = "";
    callBusy.value = false;
    incomingCall.value = null;
    pendingRoomId.value = "";
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
  try { socket?.disconnect(); } catch {}
  socket = null;
});
</script>

<style scoped>
/* ====== PREMIUM DARK GLASS THEME ====== */
.dash{
  min-height: 100vh;
  background:
    radial-gradient(1200px 700px at 15% 0%, rgba(255, 75, 43, .22), transparent 55%),
    radial-gradient(900px 600px at 85% 15%, rgba(255, 65, 108, .18), transparent 55%),
    radial-gradient(700px 500px at 70% 90%, rgba(140, 82, 255, .14), transparent 55%),
    #0b1220;
  color: rgba(255,255,255,.92);
}

/* ====== TOPBAR ====== */
.topbar{
  position: sticky;
  top: 0;
  z-index: 80;
  display:flex;
  align-items:center;
  justify-content: space-between;
  gap: 14px;
  padding: 14px 16px;
  background: rgba(10, 14, 24, .55);
  backdrop-filter: blur(14px);
  border-bottom: 1px solid rgba(255,255,255,.08);
}

.brand{display:flex; align-items:center; gap: 10px;}
.brand-badge{
  width: 42px; height: 42px;
  border-radius: 14px;
  display:grid; place-items:center;
  background: rgba(255,255,255,.08);
  border: 1px solid rgba(255,255,255,.12);
  box-shadow: 0 10px 28px rgba(0,0,0,.35);
  font-size: 18px;
}
.brand-title{font-weight: 950; font-size: 18px; letter-spacing: .2px;}
.brand-sub{opacity: .7; font-size: 12px; margin-top: 1px;}

.top-actions{display:flex; align-items:center; gap: 10px; flex-wrap: wrap;}
.searchWrap{min-width: 220px;}
.search{
  width: 100%;
  height: 40px;
  border-radius: 999px;
  padding: 0 14px;
  background: rgba(255,255,255,.08);
  border: 1px solid rgba(255,255,255,.10);
  color: rgba(255,255,255,.92);
  outline: none;
}
.search::placeholder{color: rgba(255,255,255,.55);}

.chip{
  height: 40px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(255,255,255,.08);
  color: rgba(255,255,255,.92);
  cursor: pointer;
}
.chip:hover{background: rgba(255,255,255,.10);}
.chip:disabled{opacity:.55; cursor:not-allowed;}
.chip.danger{
  border-color: rgba(255,80,80,.35);
  background: rgba(255,80,80,.16);
}

.btnPrimary{
  height: 40px;
  padding: 0 16px;
  border: none;
  border-radius: 999px;
  cursor:pointer;
  font-weight: 900;
  color: white;
  background: linear-gradient(135deg, #ff4b2b, #ff416c);
  box-shadow: 0 12px 30px rgba(255,65,108,.22);
}
.btnPrimary:disabled{opacity:.6; cursor:not-allowed;}

/* ====== LAYOUT ====== */
.layout{
  display:grid;
  grid-template-columns: 320px 1fr 360px;
  gap: 14px;
  padding: 14px 14px 90px; /* bottom space for mobile nav */
  max-width: 1280px;
  margin: 0 auto;
}

.leftCol, .rightCol{display:flex; flex-direction: column; gap: 14px;}
.centerCol{display:flex; flex-direction: column; gap: 14px; min-width: 0;}

.card{
  border-radius: 18px;
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.10);
  box-shadow: 0 22px 60px rgba(0,0,0,.35);
  overflow:hidden;
}
.cardHead{
  display:flex;
  align-items:center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 12px;
  border-bottom: 1px solid rgba(255,255,255,.08);
}
.cardTitle{font-weight: 950;}
.cardBody{padding: 12px;}

/* ====== LIVE ====== */
.dotLive{
  width: 10px; height:10px; border-radius:999px;
  background: #ff3b3b;
  box-shadow: 0 0 0 6px rgba(255,59,59,.12);
  display:inline-block;
  margin-right: 10px;
}
.dotSmall{
  width: 9px; height:9px; border-radius:999px;
  background: #ff3b3b;
  box-shadow: 0 0 0 5px rgba(255,59,59,.10);
  display:inline-block;
}
.liveItem{
  display:flex; align-items:center; gap: 10px;
  padding: 10px 10px;
  border-radius: 14px;
  background: rgba(255,255,255,.05);
  border: 1px solid rgba(255,255,255,.08);
  cursor:pointer;
  margin-top: 10px;
}
.liveItem:hover{background: rgba(255,255,255,.07);}
.liveName{font-weight: 900;}
.liveSub{opacity:.7; font-size: 12px;}

/* ====== PEOPLE ====== */
.peopleList{display:flex; flex-direction: column; gap: 10px;}
.person{
  display:flex; align-items:center; gap: 10px;
  padding: 10px;
  border-radius: 16px;
  background: rgba(255,255,255,.05);
  border: 1px solid rgba(255,255,255,.08);
}
.avatar{
  width: 42px; height:42px; border-radius: 14px;
  display:grid; place-items:center;
  background: rgba(255,255,255,.07);
  border: 1px solid rgba(255,255,255,.10);
  overflow:hidden;
  font-weight: 950;
}
.avatar img{width:100%; height:100%; object-fit: cover;}
.pMeta{min-width:0; flex: 1;}
.pName{font-weight: 950; white-space: nowrap; overflow:hidden; text-overflow: ellipsis;}
.pSub{opacity:.75; font-size: 12px; display:flex; gap: 8px; align-items:center; flex-wrap: wrap;}
.sep{opacity:.55;}
.statusDot{
  width: 9px; height:9px; border-radius:999px;
  background: rgba(255,255,255,.25);
}
.statusDot.on{
  background: #2dff83;
  box-shadow: 0 0 0 6px rgba(45,255,131,.12);
}
.pActions{display:flex; gap: 8px;}
.iconBtn{
  width: 40px; height: 40px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.06);
  color: rgba(255,255,255,.92);
  cursor:pointer;
}
.iconBtn:hover{background: rgba(255,255,255,.08);}
.iconBtn:disabled{opacity:.35; cursor:not-allowed;}

/* ====== TABS ====== */
.tabs{
  display:flex; gap: 10px; flex-wrap: wrap;
  padding: 2px 2px 0;
}
.tab{
  height: 40px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.06);
  color: rgba(255,255,255,.88);
  cursor:pointer;
}
.tab.active{
  background: linear-gradient(135deg, rgba(255,75,43,.22), rgba(255,65,108,.18));
  border-color: rgba(255,75,43,.35);
  font-weight: 950;
}

/* ====== COMPOSER ====== */
.composer{padding-bottom: 8px;}
.composerTop{
  display:flex; align-items:center; gap: 10px;
  padding: 12px 12px 0;
}
.meAvatar{
  width: 44px; height:44px; border-radius: 16px;
  display:grid; place-items:center;
  background: rgba(255,255,255,.07);
  border: 1px solid rgba(255,255,255,.10);
  overflow:hidden;
  font-weight: 950;
}
.meAvatar img{width:100%; height:100%; object-fit: cover;}
.composerMeta{flex:1; min-width:0;}
.meName{font-weight: 950; white-space: nowrap; overflow:hidden; text-overflow: ellipsis;}
.meSub{opacity:.7; font-size: 12px;}

.caption{
  width: calc(100% - 24px);
  margin: 10px 12px 0;
  border-radius: 16px;
  padding: 12px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(0,0,0,.22);
  color: rgba(255,255,255,.92);
  outline:none;
  resize: vertical;
}
.caption::placeholder{color: rgba(255,255,255,.55);}

.composerRow{
  display:flex;
  gap: 10px;
  padding: 10px 12px 12px;
  flex-wrap: wrap;
  align-items:center;
}
.fileBtn{
  height: 40px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.06);
  display:flex; align-items:center; gap: 8px;
  cursor:pointer;
}
.fileBtn input{display:none;}

.preview{
  margin: 0 12px 12px;
  border-radius: 16px;
  overflow:hidden;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(0,0,0,.22);
  display:flex; flex-direction: column; gap: 8px;
  padding: 10px;
}
.preview img, .preview video{
  width:100%;
  border-radius: 14px;
}

/* ====== FEED ====== */
.feed{display:flex; flex-direction: column; gap: 10px;}
.feedHead{
  display:flex; align-items:center; justify-content: space-between; gap: 10px;
  padding: 6px 4px;
}
.feedTitle{font-weight: 950; font-size: 16px;}
.feedSearch{
  height: 40px;
  width: 220px;
  border-radius: 999px;
  padding: 0 14px;
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.10);
  color: rgba(255,255,255,.92);
  outline: none;
}
.feedSearch::placeholder{color: rgba(255,255,255,.55);}

.post{padding: 12px;}
.postHead{display:flex; align-items:center; gap: 10px;}
.postAvatar{
  width: 44px; height:44px; border-radius: 16px;
  display:grid; place-items:center;
  background: rgba(255,255,255,.07);
  border: 1px solid rgba(255,255,255,.10);
  font-weight: 950;
}
.postMeta{flex:1;}
.postName{font-weight: 950;}
.postTime{opacity:.65; font-size: 12px;}
.postCaption{margin-top: 10px; white-space: pre-wrap;}

.media{
  margin-top: 10px;
  border-radius: 16px;
  overflow:hidden;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(0,0,0,.22);
}
.media img{width:100%; display:block;}
.media video{width:100%; display:block;}

.postActions{
  display:flex; gap: 10px; flex-wrap: wrap;
  margin-top: 10px;
}
.actBtn{
  height: 40px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.06);
  color: rgba(255,255,255,.9);
  cursor:pointer;
}
.actBtn:disabled{opacity:.55; cursor:not-allowed;}

.comments{
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid rgba(255,255,255,.08);
}
.commentList{display:flex; flex-direction: column; gap: 8px; margin-bottom: 10px;}
.comment{
  padding: 8px 10px;
  border-radius: 14px;
  background: rgba(255,255,255,.05);
  border: 1px solid rgba(255,255,255,.08);
  font-size: 13px;
}
.commentRow{display:flex; gap: 10px; align-items:center;}
.commentInput{
  flex:1;
  height: 40px;
  border-radius: 999px;
  padding: 0 14px;
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.10);
  color: rgba(255,255,255,.92);
  outline:none;
}

/* ====== CHAT ====== */
.roomPills{display:flex; gap: 10px; flex-wrap: wrap; margin-top: 10px;}
.roomBtn{
  height: 38px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.06);
  color: rgba(255,255,255,.9);
  cursor:pointer;
}
.roomBtn.on{
  border-color: rgba(255,75,43,.35);
  background: linear-gradient(135deg, rgba(255,75,43,.22), rgba(255,65,108,.18));
  font-weight: 950;
}
.chatBox{
  margin-top: 10px;
  height: 340px;
  overflow:auto;
  padding: 10px;
  border-radius: 16px;
  background: rgba(0,0,0,.18);
  border: 1px solid rgba(255,255,255,.10);
}
.chatMsg{font-size: 13px; padding: 6px 0;}
.chatRow{display:flex; gap: 10px; margin-top: 10px;}
.chatInput{
  flex:1;
  height: 40px;
  border-radius: 999px;
  padding: 0 14px;
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.10);
  color: rgba(255,255,255,.92);
  outline:none;
}

/* ====== SKELETON ====== */
.skeletonList .skRow{
  height: 64px;
  border-radius: 16px;
  background: linear-gradient(90deg, rgba(255,255,255,.05), rgba(255,255,255,.09), rgba(255,255,255,.05));
  background-size: 200% 100%;
  animation: shimmer 1.2s infinite linear;
  margin-top: 10px;
}
.feedSkeleton .skPost{
  height: 220px;
  border-radius: 18px;
  background: linear-gradient(90deg, rgba(255,255,255,.05), rgba(255,255,255,.09), rgba(255,255,255,.05));
  background-size: 200% 100%;
  animation: shimmer 1.2s infinite linear;
  margin-top: 12px;
}
@keyframes shimmer{
  0%{background-position: 200% 0;}
  100%{background-position: -200% 0;}
}

/* ====== EMPTY / ERRORS ====== */
.hint{opacity:.7;}
.mutedText{opacity:.7; font-size: 12px;}
.mt6{margin-top: 6px;}
.mt10{margin-top: 10px;}
.w100{width:100%;}
.errorBox{
  padding: 12px;
  border-radius: 16px;
  border: 1px solid rgba(255,80,80,.28);
  background: rgba(255,80,80,.12);
}
.empty{
  padding: 28px;
  border-radius: 18px;
  text-align:center;
  background: rgba(255,255,255,.05);
  border: 1px solid rgba(255,255,255,.08);
}
.emptyIcon{font-size: 24px; margin-bottom: 6px;}
.emptyTitle{font-weight: 950;}
.emptySub{opacity:.75; margin-top: 6px; font-size: 13px;}

/* ====== MOBILE NAV ====== */
.mobileNav{
  position: fixed;
  left: 12px;
  right: 12px;
  bottom: 12px;
  z-index: 90;
  display:none;
  gap: 10px;
  padding: 10px;
  border-radius: 18px;
  background: rgba(10, 14, 24, .55);
  backdrop-filter: blur(14px);
  border: 1px solid rgba(255,255,255,.10);
}
.mBtn{
  flex:1;
  height: 52px;
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.06);
  color: rgba(255,255,255,.92);
  cursor:pointer;
  display:flex; flex-direction: column; align-items:center; justify-content:center;
  gap: 2px;
  font-weight: 900;
}
.mBtn span{font-size: 11px; opacity:.75; font-weight: 800;}

/* ====== DRAWERS ====== */
.overlay{
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0,0,0,.35);
  backdrop-filter: blur(4px);
}

.drawer{
  position: fixed;
  top: 50%;
  transform: translateY(-50%);
  width: min(360px, 88vw);
  max-height: 76vh;           /* ✅ smaller drawer */
  border-radius: 20px;
  overflow:hidden;
  background: rgba(10, 14, 24, .72);
  border: 1px solid rgba(255,255,255,.12);
  box-shadow: 0 26px 80px rgba(0,0,0,.55);
  display:flex;
  flex-direction: column;
}
.drawer.left{left: 12px;}     /* ✅ opens from left */
.drawer.right{right: 12px;}
.drawer.mini{ /* already smaller by max-height */ }

.drawerHead{
  display:flex;
  align-items:center;
  justify-content: space-between;
  padding: 12px 12px;
  border-bottom: 1px solid rgba(255,255,255,.08);
}
.drawerTitle{font-weight: 950;}
.drawerBody{padding: 12px; overflow:auto;}

/* ====== CALL POP + TOAST ====== */
.callPop{
  position: fixed;
  left: 12px; right: 12px;
  top: 16px;
  z-index: 120;
  display:flex;
  justify-content: center;
}
.callPopCard{
  width: min(520px, 92vw);
  border-radius: 18px;
  padding: 14px;
  background: rgba(10, 14, 24, .78);
  border: 1px solid rgba(255,255,255,.12);
  box-shadow: 0 26px 80px rgba(0,0,0,.55);
}
.callPopTitle{font-weight: 950;}
.callPopSub{opacity:.75; margin-top: 4px;}
.callPopBtns{display:flex; gap: 10px; margin-top: 12px; justify-content:flex-end;}

.toast{
  position: fixed;
  left: 12px; right: 12px;
  bottom: 84px;
  z-index: 120;
  display:flex;
  justify-content: center;
}
.toastCard{
  width: min(520px, 92vw);
  border-radius: 18px;
  padding: 12px;
  background: rgba(10, 14, 24, .78);
  border: 1px solid rgba(255,255,255,.12);
  box-shadow: 0 26px 80px rgba(0,0,0,.55);
  display:flex;
  align-items:center;
  justify-content: space-between;
  gap: 10px;
}
.toastTitle{font-weight: 900;}

/* ====== TRANSITIONS ====== */
.fade-enter-active, .fade-leave-active{transition: opacity .18s ease;}
.fade-enter-from, .fade-leave-to{opacity: 0;}
.pop-enter-active{transition: transform .18s ease, opacity .18s ease;}
.pop-enter-from{opacity:0; transform: translateY(-6px);}
.pop-leave-active{transition: opacity .12s ease;}
.pop-leave-to{opacity:0;}

/* ====== RESPONSIVE ====== */
@media (max-width: 1100px){
  .layout{grid-template-columns: 300px 1fr 320px;}
}
@media (max-width: 900px){
  .layout{
    grid-template-columns: 1fr;
  }
  .leftCol, .rightCol{
    display:none; /* ✅ main page is feed on phone */
  }
  .searchWrap{display:none;}
  .mobileNav{display:flex;}
  .feedSearch{width: 160px;}
}
</style>