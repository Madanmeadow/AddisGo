<!-- src/views/Dashboard.vue -->
<template>
  <Layout>
    <div class="wrap">
      <!-- TOPBAR -->
      <header class="topbar">
        <div class="brand" @click="scrollToTop" role="button" tabindex="0">
          <div class="logo">🔥</div>
          <div class="brand-text">
            <div class="title">AddisGo</div>
            <div class="sub">All-in-One • TikTok • IG • X • Discord • Live</div>
          </div>
        </div>

        <div class="top-actions">
          <button class="chip" @click="fetchPosts" :disabled="loading">
            ↻ {{ loading ? "Loading…" : "Refresh" }}
          </button>
          <button class="chip ghost" @click="togglePeople">
            {{ peopleOpen ? "Hide People" : "People" }}
          </button>
          <button class="chip ghost" @click="toggleChat">
            {{ chatOpen ? "Close Chat" : "Chat" }}
          </button>
          <button class="chip danger" @click="logout">Logout</button>
        </div>
      </header>

      <!-- MODEBAR -->
      <div class="modebar">
        <button class="mode" :class="{ on: feedMode === 'foryou' }" @click="setFeedMode('foryou')">🎬 For You</button>
        <button class="mode" :class="{ on: feedMode === 'following' }" @click="setFeedMode('following')">📸 Following</button>
        <button class="mode" :class="{ on: feedMode === 'threads' }" @click="setFeedMode('threads')">✍️ Threads</button>
        <button class="mode" :class="{ on: feedMode === 'rooms' }" @click="setFeedMode('rooms')">🎧 Rooms</button>
        <button class="mode" :class="{ on: feedMode === 'live' }" @click="setFeedMode('live')">🔴 Live</button>

        <div class="mode-right">
          <input v-model="search" class="search" placeholder="Search…" />
          <button v-if="feedMode === 'foryou'" class="chip ghost" @click="toggleGlobalMute">
            {{ globalMuted ? "🔇 Muted" : "🔊 Sound" }}
          </button>
        </div>
      </div>

      <!-- ONE SCREEN (everything inside main) -->
      <main class="main">
        <!-- TOP PANELS (above feed) -->
        <section class="top-panels">
          <!-- Live Now (always visible at top) -->
          <div class="panel">
            <div class="panel-head">
              <div class="panel-title">🔴 Live Now</div>
              <button class="btn btn-primary" @click="startLive" :disabled="!token">Go Live</button>
            </div>

            <div v-if="liveStreams.length === 0" class="hint mt10">No one live right now</div>

            <div
              v-for="stream in liveStreams"
              :key="'live-top-' + stream"
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
          </div>

          <!-- People (toggle button controls this) -->
          <div class="panel" v-if="peopleOpen">
            <div class="panel-head">
              <div class="panel-title">👥 People</div>
              <button class="btn" @click="fetchPeople" :disabled="peopleLoading || !token">
                {{ peopleLoading ? "Loading…" : "Refresh" }}
              </button>
            </div>

            <div v-if="!token" class="alert soft">
              Login again to see people & call buttons.
            </div>

            <div v-else class="people">
              <div v-if="peopleError" class="alert">{{ peopleError }}</div>
              <div v-else-if="peopleLoading" class="hint">Loading people…</div>
              <div v-else-if="people.length === 0" class="hint">No users found.</div>

              <div v-else v-for="u in people" :key="u.id" class="person">
                <div class="avatar small">{{ (u.display_name || u.username || "U")[0]?.toUpperCase() }}</div>

                <div class="person-meta">
                  <div class="person-name">{{ u.display_name || u.username || ("User #" + u.id) }}</div>
                  <div class="person-sub">
                    <span class="status" :class="{ on: isOnline(u.id) }"></span>
                    <span class="status-text">{{ isOnline(u.id) ? "Online" : "Offline" }}</span>
                    <span class="sep">•</span>
                    <span class="id">ID {{ u.id }}</span>
                  </div>
                </div>

                <div class="person-actions">
                  <button class="iconbtn" title="Audio Call" :disabled="!isOnline(u.id) || callBusy" @click="startCall(u,'audio')">📞</button>
                  <button class="iconbtn" title="Video Call" :disabled="!isOnline(u.id) || callBusy" @click="startCall(u,'video')">🎥</button>
                </div>
              </div>

              <div class="hint mt10">Tip: calls require both users online (green).</div>
            </div>
          </div>

          <!-- Chat (toggle button controls this) -->
          <div class="panel" v-if="chatOpen">
            <div class="panel-head">
              <div class="panel-title">💬 Chat</div>
              <button class="btn" @click="toggleChat">Close</button>
            </div>

            <div class="chat-hint">Quick room chat. Rooms tab is full Discord-style.</div>

            <div class="chat-list">
              <button class="chat-item" :class="{ active: chatRoom === 'global' }" @click="selectChat('global')">🌍 Global</button>
              <button class="chat-item" :class="{ active: chatRoom === 'support' }" @click="selectChat('support')">🛠 Support</button>
              <button class="chat-item" :class="{ active: chatRoom === 'dev' }" @click="selectChat('dev')">💻 Dev</button>
              <button class="chat-item" :class="{ active: chatRoom === 'random' }" @click="selectChat('random')">🎲 Random</button>
            </div>

            <div class="chat-box">
              <div class="chat-messages" ref="chatBoxRef">
                <div v-for="(m, i) in chatMessages" :key="'cm-'+i" class="chat-msg">
                  <strong>{{ m.from }}:</strong> {{ m.text }}
                </div>
              </div>

              <div class="chat-input">
                <input v-model="chatText" placeholder="Type message…" @keydown.enter.prevent="sendChat" />
                <button class="btn btn-primary" @click="sendChat">Send</button>
              </div>
            </div>
          </div>
        </section>

        <!-- Composer always available -->
        <section class="composer">
          <div class="composer-head">
            <div class="avatar big">{{ myInitial }}</div>
            <div class="composer-meta">
              <div class="me">{{ me?.username || "You" }}</div>
              <div class="small muted">Post to the world (works everywhere)</div>
            </div>
            <div class="composer-actions">
              <button class="pill-btn" @click="focusComposer">Create</button>
            </div>
          </div>

          <textarea ref="composerRef" v-model="caption" class="input" placeholder="What's happening?" rows="3"></textarea>

          <div class="upload-row">
            <label class="file-pill">
              <input type="file" accept="image/*" @change="onPickImage" />
              📷 Image <span v-if="imageFile" class="file-dot">•</span>
            </label>

            <label class="file-pill">
              <input type="file" accept="video/*" @change="onPickVideo" />
              🎥 Video <span v-if="videoFile" class="file-dot">•</span>
            </label>

            <button class="btn btn-primary" :disabled="posting || !token" @click="submitPost">
              {{ posting ? "Posting…" : "Post 🚀" }}
            </button>
          </div>

          <div v-if="error" class="alert">{{ error }}</div>
        </section>

        <!-- MODE CONTENT (unchanged, just moved into one main column) -->
        <!-- LIVE MODE -->
        <section v-if="feedMode === 'live'" class="panel">
          <div class="panel-head">
            <div class="panel-title">🔴 Live</div>
            <button class="btn btn-primary" @click="startLive" :disabled="!token">Go Live</button>
          </div>

          <div class="hint">Tap any live session below to watch.</div>

          <div v-if="liveStreams.length === 0" class="state">
            <div class="state-emoji">📡</div>
            <div class="state-title">Nobody is live</div>
            <div class="state-sub">Start the first stream.</div>
          </div>

          <div v-else class="live-grid">
            <div v-for="stream in liveStreams" :key="'live-center-' + stream" class="live-big" @click="joinLive(stream)">
              <div class="live-big-top">
                <span class="dot"></span>
                <span class="live-big-title">{{ stream }}</span>
              </div>
              <div class="live-big-sub">Tap to watch</div>
            </div>
          </div>
        </section>

        <!-- ROOMS MODE -->
        <section v-else-if="feedMode === 'rooms'" class="rooms">
          <aside class="rooms-left">
            <div class="rooms-head">🎧 Rooms</div>

            <button class="room" :class="{ on: chatRoom === 'global' }" @click="selectChat('global')">🌍 global</button>
            <button class="room" :class="{ on: chatRoom === 'support' }" @click="selectChat('support')">🛠 support</button>
            <button class="room" :class="{ on: chatRoom === 'dev' }" @click="selectChat('dev')">💻 dev</button>
            <button class="room" :class="{ on: chatRoom === 'random' }" @click="selectChat('random')">🎲 random</button>

            <div class="rooms-hint">Real-time chat via Socket.io</div>
          </aside>

          <div class="rooms-main">
            <div class="rooms-top">
              <div class="rooms-title"># {{ chatRoom }}</div>
              <button class="chip ghost" @click="toggleChat">Toggle Top Chat</button>
            </div>

            <div class="rooms-messages" ref="chatBoxRef">
              <div v-for="(m, i) in chatMessages" :key="'rm-'+i" class="rm">
                <div class="rm-top">
                  <span class="rm-user">{{ m.from }}</span>
                  <span class="rm-time">{{ m.created_at ? formatDate(m.created_at) : "" }}</span>
                </div>
                <div class="rm-text">{{ m.text }}</div>
              </div>
            </div>

            <div class="rooms-input">
              <input v-model="chatText" placeholder="Message #room…" @keydown.enter.prevent="sendChat" />
              <button class="btn btn-primary" @click="sendChat">Send</button>
            </div>
          </div>
        </section>

        <!-- THREADS MODE -->
        <section v-else-if="feedMode === 'threads'" class="feed threads">
          <div v-if="loading" class="state">Loading…</div>
          <div v-else-if="baseFiltered.length === 0" class="state">
            <div class="state-emoji">✍️</div>
            <div class="state-title">No threads yet</div>
            <div class="state-sub">Write something to start the conversation.</div>
          </div>

          <article v-else v-for="post in threadsPosts" :key="'t-'+post.id" class="post thread">
            <header class="post-head">
              <div class="avatar">{{ getInitial(post.user_id) }}</div>
              <div class="who">
                <div class="name">User #{{ post.user_id }}</div>
                <div class="time">{{ formatDate(post.created_at) }}</div>
              </div>
            </header>

            <div v-if="post.caption" class="text thread-text">{{ post.caption }}</div>

            <button
              v-if="post.image_url || post.video_url"
              class="chip ghost thread-media-toggle"
              @click="toggleThreadMedia(post.id)"
            >
              {{ threadMediaOpen[post.id] ? "Hide media" : "View media" }}
            </button>

            <div v-if="threadMediaOpen[post.id]" class="thread-media">
              <img v-if="post.image_url" class="media" :src="getMedia(post.image_url)" loading="lazy" />
              <video
                v-if="post.video_url"
                class="media"
                :src="getMedia(post.video_url)"
                controls
                playsinline
                preload="metadata"
              ></video>
            </div>

            <div class="actions">
              <button
                class="action-btn"
                :class="{ active: likesByPost[post.id]?.likedByMe }"
                :disabled="likeBusyByPost[post.id]"
                @click="toggleLike(post)"
              >
                ❤️ <span class="label">{{ likesByPost[post.id]?.count ?? 0 }}</span>
              </button>

              <button class="action-btn" @click="toggleComments(post)">
                💬 <span class="label">{{ commentCount(post.id) }}</span>
              </button>

              <div class="spacer"></div>
              <button class="action-btn ghost" @click="sharePost(post)">🔗 <span class="label">Share</span></button>
            </div>

            <!-- comments unchanged -->
            <div v-if="commentsOpenByPost[post.id]" class="comments">
              <div class="comments-head">
                <div class="comments-title">Comments</div>
                <button class="x" @click="commentsOpenByPost[post.id] = false">✕</button>
              </div>

              <div v-if="commentLoadingByPost[post.id]" class="comments-state">Loading comments…</div>

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

        <!-- FOLLOWING MODE -->
        <section v-else-if="feedMode === 'following'" class="feed following">
          <template v-if="loading">
            <div class="state">Loading…</div>
          </template>

          <div v-else-if="baseFiltered.length === 0" class="state">
            <div class="state-emoji">📸</div>
            <div class="state-title">No posts yet</div>
            <div class="state-sub">Be the first to post.</div>
          </div>

          <article v-else v-for="post in followingPosts" :key="'f-'+post.id" class="post">
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

            <div class="actions">
              <button
                class="action-btn"
                :class="{ active: likesByPost[post.id]?.likedByMe }"
                :disabled="likeBusyByPost[post.id]"
                @click="toggleLike(post)"
              >
                ❤️ <span class="label">{{ likesByPost[post.id]?.count ?? 0 }}</span>
              </button>

              <button class="action-btn" @click="toggleComments(post)">
                💬 <span class="label">{{ commentCount(post.id) }}</span>
              </button>

              <div class="spacer"></div>
              <button class="action-btn ghost" @click="sharePost(post)">🔗 <span class="label">Share</span></button>
            </div>

            <!-- comments unchanged -->
            <div v-if="commentsOpenByPost[post.id]" class="comments">
              <div class="comments-head">
                <div class="comments-title">Comments</div>
                <button class="x" @click="commentsOpenByPost[post.id] = false">✕</button>
              </div>

              <div v-if="commentLoadingByPost[post.id]" class="comments-state">Loading comments…</div>

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

        <!-- FOR YOU MODE -->
        <section v-else class="feed tiktok">
          <template v-if="loading">
            <div class="state">Loading…</div>
          </template>

          <div v-else-if="baseFiltered.length === 0" class="state">
            <div class="state-emoji">🎬</div>
            <div class="state-title">No videos yet</div>
            <div class="state-sub">Post a video and it will autoplay here.</div>
          </div>

          <article
            v-else
            v-for="post in visiblePosts"
            :key="'fy-'+post.id"
            class="post tt-card"
            :id="`post-${post.id}`"
          >
            <header class="post-head">
              <div class="avatar">{{ getInitial(post.user_id) }}</div>
              <div class="who">
                <div class="name">User #{{ post.user_id }}</div>
                <div class="time">{{ formatDate(post.created_at) }}</div>
              </div>

              <button class="tt-ic" title="Sound" @click="toggleGlobalMute">
                {{ globalMuted ? "🔇" : "🔊" }}
              </button>
            </header>

            <div v-if="post.caption" class="text">{{ post.caption }}</div>

            <img v-if="post.image_url" class="media" :src="getMedia(post.image_url)" loading="lazy" />

            <div v-if="post.video_url" class="tt-video-wrap">
              <video
                class="media tt-video"
                :data-post-id="post.id"
                :src="getMedia(post.video_url)"
                playsinline
                preload="metadata"
                loop
                muted
                @click="toggleVideoMute(post.id)"
              ></video>

              <div class="tt-overlay">
                <div class="tt-badge">{{ activePostId === post.id ? "FOR YOU" : "NEXT" }}</div>
                <div class="tt-mute">{{ isVideoMuted(post.id) ? "🔇 Muted" : "🔊 Sound" }}</div>
              </div>
            </div>

            <div class="actions">
              <button
                class="action-btn"
                :class="{ active: likesByPost[post.id]?.likedByMe }"
                :disabled="likeBusyByPost[post.id]"
                @click="toggleLike(post)"
              >
                ❤️ <span class="label">{{ likesByPost[post.id]?.count ?? 0 }}</span>
              </button>

              <button class="action-btn" @click="toggleComments(post)">
                💬 <span class="label">{{ commentCount(post.id) }}</span>
              </button>

              <div class="spacer"></div>
              <button class="action-btn ghost" @click="sharePost(post)">
                🔗 <span class="label">Share</span>
              </button>
            </div>

            <!-- comments unchanged -->
            <div v-if="commentsOpenByPost[post.id]" class="comments">
              <div class="comments-head">
                <div class="comments-title">Comments</div>
                <button class="x" @click="commentsOpenByPost[post.id] = false">✕</button>
              </div>

              <div v-if="commentLoadingByPost[post.id]" class="comments-state">Loading comments…</div>

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

          <!-- Infinite scroll sentinel -->
          <div ref="loadMoreRef" class="load-more">
            <span v-if="infiniteLoading">Loading more…</span>
            <span v-else-if="canLoadMore">Scroll for more</span>
            <span v-else>End</span>
          </div>
        </section>
      </main>

      <!-- INCOMING CALL POPUP -->
      <div v-if="incomingCall" class="modal-backdrop" @click.self="rejectIncoming">
        <div class="modal">
          <div class="modal-title">Incoming {{ incomingCall.kind === "video" ? "Video" : "Audio" }} Call</div>
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

      <!-- CALLING TOAST -->
      <div v-if="callingToast" class="toast">
        <span class="toast-dot"></span>
        {{ callingToast }}
        <button class="mini-x" @click="cancelCall">✕</button>
      </div>
    </div>
  </Layout>
</template>

<script setup>
/* ✅ SCRIPT UNCHANGED (your original, 그대로) */
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from "vue";
import { useRouter } from "vue-router";
import Layout from "../components/Layout.vue";
import { io } from "socket.io-client";

const router = useRouter();
const apiUrl = import.meta.env.VITE_API_URL;
const token = localStorage.getItem("token");

const me = (() => {
  try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; }
})();

/* ================= MODEBAR ================= */
const feedMode = ref("foryou"); // foryou | following | threads | rooms | live

function setFeedMode(mode) {
  feedMode.value = mode;

  nextTick(() => {
    if (feedMode.value === "foryou") {
      setupLoadMoreObserver();
      setupVideoObserver();
      applyMuteToAllVideos();
    } else {
      try { loadMoreObserver?.disconnect(); } catch {}
      try { videoObserver?.disconnect(); } catch {}
    }
  });
}

/* ================= SOCKET ================= */
let socket = null;
const onlinePairs = ref([]);
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

function togglePeople() { peopleOpen.value = !peopleOpen.value; }

async function fetchPeople() {
  if (!token) return;
  peopleLoading.value = true;
  peopleError.value = "";

  try {
    const res = await fetch(`${apiUrl}/users`, { headers: { Authorization: `Bearer ${token}` } });
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
  if (pendingRoomId.value) socket?.emit("call:cancel", { roomId: pendingRoomId.value });
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
    pageSize.value = 8;

    await preloadLikesForPosts(data.slice(0, 20));
    await nextTick();

    if (feedMode.value === "foryou") {
      setupLoadMoreObserver();
      setupVideoObserver();
      applyMuteToAllVideos();
    }
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

    await nextTick();
    if (feedMode.value === "foryou") {
      setupVideoObserver();
      applyMuteToAllVideos();
    }
  } catch {
    error.value = "Post failed";
  } finally {
    posting.value = false;
  }
}

function onPickImage(e) { imageFile.value = e.target.files?.[0] || null; }
function onPickVideo(e) { videoFile.value = e.target.files?.[0] || null; }
function scrollToTop() { window.scrollTo({ top: 0, behavior: "smooth" }); }

/* ================= FILTERED BASE ================= */
const baseFiltered = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return posts.value;
  return posts.value.filter((p) => (p.caption || "").toLowerCase().includes(q));
});

/* ================= FOLLOWING / THREADS LISTS ================= */
const followingPosts = computed(() => baseFiltered.value.slice(0, 40));
const threadsPosts = computed(() => baseFiltered.value.slice(0, 60));

/* ================= THREADS MEDIA TOGGLE ================= */
const threadMediaOpen = ref({});
function toggleThreadMedia(postId) {
  threadMediaOpen.value = { ...threadMediaOpen.value, [postId]: !threadMediaOpen.value[postId] };
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
    const res = await fetch(`${apiUrl}/likes/${postId}`, { headers: { Authorization: `Bearer ${token}` } });
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

function commentCount(postId) { return (commentsByPost.value[postId] || []).length; }

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

/* ================= SHARE ================= */
async function sharePost(post) {
  const url = `${window.location.origin}/#post-${post.id}`;
  try {
    if (navigator.share) {
      await navigator.share({ title: "AddisGo Post", text: post.caption || "Post", url });
      return;
    }
  } catch {}
  try { await navigator.clipboard.writeText(url); alert("Link copied!"); }
  catch { alert(url); }
}

/* ================= CHAT ================= */
const chatOpen = ref(false);
const chatRoom = ref("global");
const chatText = ref("");
const chatMessages = ref([]);
const chatBoxRef = ref(null);

function toggleChat() { chatOpen.value = !chatOpen.value; }

function selectChat(room) {
  chatRoom.value = room;
  socket?.emit("join-room", room);
  chatMessages.value.push({ from: "system", text: `Joined room: ${room}`, created_at: new Date().toISOString() });
  nextTick(scrollChatToBottom);
}

function scrollChatToBottom() {
  const el = chatBoxRef.value;
  if (el) el.scrollTop = el.scrollHeight;
}

function sendChat() {
  if (!chatText.value.trim()) return;
  socket?.emit("send-room-message", { room: chatRoom.value, from: me?.username || "me", text: chatText.value });
  chatText.value = "";
}

/* ================= LIVE ================= */
function startLive() {
  if (!token) return alert("Login again to go live.");
  const liveId = `live-${me?.id || Math.random().toString(36).slice(2, 8)}-${Date.now().toString().slice(-4)}`;
  socket?.emit("live:create", { liveId });
  router.push(`/live?mode=host&liveId=${encodeURIComponent(liveId)}`);
}
function joinLive(liveId) { router.push(`/live?mode=watch&liveId=${encodeURIComponent(liveId)}`); }

/* ================= AUTH ================= */
function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  router.push("/login");
}

/* ================= FOR YOU Infinite + Autoplay ================= */
const pageSize = ref(8);
const infiniteLoading = ref(false);
const loadMoreRef = ref(null);

const visiblePosts = computed(() => baseFiltered.value.slice(0, pageSize.value));
const canLoadMore = computed(() => baseFiltered.value.length > visiblePosts.value.length);

let loadMoreObserver = null;
function setupLoadMoreObserver() {
  try { loadMoreObserver?.disconnect(); } catch {}
  if (!loadMoreRef.value) return;

  loadMoreObserver = new IntersectionObserver(async (entries) => {
    const hit = entries.some((e) => e.isIntersecting);
    if (!hit || !canLoadMore.value || infiniteLoading.value) return;

    infiniteLoading.value = true;
    await new Promise((r) => setTimeout(r, 160));
    pageSize.value += 6;
    infiniteLoading.value = false;

    await preloadLikesForPosts(visiblePosts.value.slice(-10));
    await nextTick();
    setupVideoObserver();
    applyMuteToAllVideos();
  }, { threshold: 0.15 });

  loadMoreObserver.observe(loadMoreRef.value);
}

/* Video autoplay */
const activePostId = ref(null);
const globalMuted = ref(true);
const videoMutedByPost = ref({});

function isVideoMuted(postId) {
  return globalMuted.value || !!videoMutedByPost.value[postId];
}

function toggleGlobalMute() {
  globalMuted.value = !globalMuted.value;
  applyMuteToAllVideos();
}

function toggleVideoMute(postId) {
  const prev = !!videoMutedByPost.value[postId];
  videoMutedByPost.value = { ...videoMutedByPost.value, [postId]: !prev };
  applyMuteToVideo(postId);
}

function applyMuteToVideo(postId) {
  const v = document.querySelector(`video.tt-video[data-post-id="${postId}"]`);
  if (!v) return;
  v.muted = isVideoMuted(postId);
  v.volume = v.muted ? 0 : 1;
}

function applyMuteToAllVideos() {
  const vids = document.querySelectorAll("video.tt-video");
  vids.forEach((v) => {
    const pid = v.getAttribute("data-post-id");
    v.muted = globalMuted.value || !!videoMutedByPost.value[pid];
    v.volume = v.muted ? 0 : 1;
  });
}

let videoObserver = null;
function setupVideoObserver() {
  try { videoObserver?.disconnect(); } catch {}

  videoObserver = new IntersectionObserver(async (entries) => {
    const visible = entries.filter((e) => e.isIntersecting)
      .sort((a, b) => (b.intersectionRatio || 0) - (a.intersectionRatio || 0));

    if (visible.length) {
      const top = visible[0].target;
      const id = Number(top.getAttribute("data-post-id") || 0) || null;
      activePostId.value = id;
    }

    for (const entry of entries) {
      const video = entry.target;
      const postId = Number(video.getAttribute("data-post-id") || 0);
      applyMuteToVideo(postId);

      if (feedMode.value !== "foryou") {
        try { video.pause(); } catch {}
        continue;
      }

      if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
        try { await video.play(); } catch {}
      } else {
        try { video.pause(); } catch {}
      }
    }
  }, { threshold: [0.25, 0.6, 0.85] });

  nextTick(() => {
    if (feedMode.value !== "foryou") return;
    document.querySelectorAll("video.tt-video").forEach((v) => videoObserver.observe(v));
  });
}

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
    nextTick(scrollChatToBottom);
  });

  socket.on("live-list", (streams) => { liveStreams.value = Array.isArray(streams) ? streams : []; });
  socket.on("online-users", (pairs) => { onlinePairs.value = Array.isArray(pairs) ? pairs : []; });

  socket.on("call:ringing", ({ roomId, kind }) => {
    pendingRoomId.value = roomId;
    callingToast.value = `Calling… (${kind || pendingKind.value})`;
    router.push(`/call?roomId=${encodeURIComponent(roomId)}&role=caller&kind=${encodeURIComponent(kind || pendingKind.value)}`);
  });

  socket.on("call:incoming", (p) => { incomingCall.value = p; });
  socket.on("call:accepted", () => { callingToast.value = ""; callBusy.value = false; });

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

  await nextTick();
  if (feedMode.value === "foryou") {
    setupLoadMoreObserver();
    setupVideoObserver();
    applyMuteToAllVideos();
  }
});

onBeforeUnmount(() => {
  try { socket?.disconnect(); } catch {}
  socket = null;

  try { loadMoreObserver?.disconnect(); } catch {}
  try { videoObserver?.disconnect(); } catch {}
  loadMoreObserver = null;
  videoObserver = null;
});
</script>

<style scoped>
/* Background */
.wrap {
  min-height: 100vh;
  background:
    radial-gradient(1200px 700px at 20% 0%, rgba(255,75,43,0.18), transparent),
    radial-gradient(900px 600px at 80% 20%, rgba(255,65,108,0.16), transparent),
    #0b1220;
  color: white;
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
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.10);
}
.brand { display: flex; align-items: center; gap: 10px; cursor: pointer; }
.logo {
  width: 42px; height: 42px; border-radius: 14px;
  display: grid; place-items: center;
  background: rgba(255, 255, 255, 0.10);
  border: 1px solid rgba(255,255,255,0.14);
  font-size: 20px;
}
.title { font-weight: 950; font-size: 18px; }
.sub { opacity: .72; font-size: 12px; }
.top-actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }

/* Modebar */
.modebar{
  max-width: 1100px;
  margin: 10px auto 0;
  padding: 0 16px;
  display:flex;
  gap:10px;
  flex-wrap:wrap;
  align-items:center;
}
.mode{
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(255,255,255,0.10);
  color:white;
  padding:10px 12px;
  border-radius:999px;
  cursor:pointer;
  font-weight:950;
  opacity:.92;
}
.mode.on{
  background: linear-gradient(45deg, #ff416c, #ff4b2b);
  border-color: rgba(255,75,43,0.6);
  opacity:1;
}
.mode-right{
  margin-left:auto;
  display:flex;
  gap:10px;
  align-items:center;
  flex-wrap:wrap;
}
.search{
  background: rgba(0,0,0,0.35);
  border: 1px solid rgba(255,255,255,0.12);
  color: white;
  padding: 10px 12px;
  border-radius: 999px;
  outline: none;
}

/* ONE main column */
.main{
  max-width: 1100px;
  margin: 0 auto;
  padding: 16px;
}

/* Top panels section */
.top-panels{
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px;
  margin-bottom: 14px;
}

/* Panels */
.panel, .composer, .post {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 18px;
  padding: 14px;
  backdrop-filter: blur(10px);
  margin-bottom: 14px;
}
.panel-head { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:10px; }
.panel-title { font-weight: 950; }

/* Buttons */
.btn, .chip {
  border: none;
  border-radius: 999px;
  padding: 10px 14px;
  cursor: pointer;
  background: rgba(255,255,255,0.12);
  color: white;
}
.btn-primary { background: linear-gradient(45deg, #ff416c, #ff4b2b); }
.danger { background: rgba(255,80,80,0.22); border: 1px solid rgba(255,80,80,0.35); }
.ghost { opacity: .92; }

/* Live cards */
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
.dot { width: 10px; height: 10px; border-radius: 50%; background: red; }
.live-meta { display: grid; }
.live-name { font-weight: 950; }
.live-sub { opacity: .75; font-size: 12px; }
.chev { margin-left: auto; opacity: .7; font-size: 22px; }
.live-grid { display:grid; gap:12px; margin-top:12px; }
.live-big{
  background: rgba(0,0,0,0.35);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 16px;
  padding: 14px;
  cursor: pointer;
}
.live-big-top{ display:flex; align-items:center; gap:10px; }
.live-big-title{ font-weight:950; }
.live-big-sub{ opacity:.75; margin-top:8px; font-size:12px; }

/* People */
.people { display: grid; gap: 10px; }
.person {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 10px;
  border-radius: 16px;
  background: rgba(0,0,0,0.28);
  border: 1px solid rgba(255,255,255,0.10);
}
.person-meta { flex: 1; min-width: 0; }
.person-name { font-weight: 950; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.person-sub { display:flex; align-items:center; gap:8px; opacity:.75; font-size:12px; margin-top:2px; }
.status { width: 10px; height: 10px; border-radius: 50%; background: rgba(255,255,255,0.35); }
.status.on { background: #00e676; }
.sep { opacity: .5; }
.person-actions { display: flex; gap: 8px; }
.iconbtn {
  width: 40px; height: 40px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(255,255,255,0.10);
  cursor: pointer;
}
.iconbtn:disabled { opacity: .45; cursor: not-allowed; }

/* Composer */
.composer-head { display:flex; gap:10px; align-items:center; margin-bottom:10px; }
.composer-meta { flex: 1; }
.composer-actions { display:flex; justify-content:flex-end; }
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
  border: none;
  outline: none;
  background: rgba(0, 0, 0, 0.35);
  color: white;
  border-radius: 14px;
  padding: 12px;
  resize: none;
}
.upload-row { display:flex; gap:10px; align-items:center; flex-wrap:wrap; margin-top:10px; }
.file-pill {
  background: rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  padding: 10px 12px;
  cursor: pointer;
}
.file-pill input { display:none; }
.file-dot { margin-left: 6px; opacity: .9; }

/* Feed + Posts */
.feed { display: grid; gap: 14px; }
.post { background: rgba(0, 0, 0, 0.55); }
.post-head { display:flex; gap:10px; align-items:center; margin-bottom:10px; }
.who .name { font-weight: 950; }
.time { opacity: .75; font-size: 12px; }
.text { margin: 6px 0 10px; line-height: 1.55; }
.media {
  width: 100%;
  border-radius: 16px;
  background: #000;
  margin-top: 10px;
  max-height: 720px;
  object-fit: cover;
}

/* Avatars */
.avatar {
  width: 44px; height: 44px; border-radius: 50%;
  background: linear-gradient(45deg, #ff416c, #ff4b2b);
  display: grid; place-items: center;
  font-weight: 950;
}
.avatar.big { width: 52px; height: 52px; }
.avatar.small {
  width: 40px; height: 40px;
  border-radius: 14px;
  background: rgba(255,255,255,0.10);
  border: 1px solid rgba(255,255,255,0.14);
}

/* Actions */
.actions {
  display:flex;
  align-items:center;
  gap:10px;
  margin-top:12px;
  padding-top:10px;
  border-top: 1px solid rgba(255, 255, 255, 0.10);
}
.action-btn {
  display:inline-flex;
  align-items:center;
  gap:10px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.08);
  color: white;
  padding: 10px 12px;
  border-radius: 999px;
  cursor: pointer;
}
.action-btn.active { border-color: rgba(255, 75, 43, 0.6); background: rgba(255, 75, 43, 0.18); }
.spacer { flex: 1; }

/* Comments */
.comments {
  margin-top: 12px;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  padding: 12px;
}
.comments-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
.comments-title { font-weight: 950; }
.x {
  border: none; cursor: pointer;
  background: rgba(255, 255, 255, 0.10);
  color: white;
  border-radius: 10px;
  padding: 6px 10px;
}
.comments-list { display:grid; gap:10px; max-height: 280px; overflow:auto; padding-right:4px; }
.comment { padding: 10px; border-radius: 14px; background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.10); }
.badge { font-weight: 950; font-size: 12px; padding: 6px 10px; border-radius: 999px; background: rgba(255, 255, 255, 0.10); }
.comment-time { opacity: .75; font-size: 12px; }
.comment-compose { display:flex; gap:8px; margin-top:10px; }
.comment-input { flex:1; background: rgba(0,0,0,0.35); border: 1px solid rgba(255,255,255,0.12); color:white; padding:10px 12px; border-radius:12px; outline:none; }
.comment-error { margin-top:10px; padding:10px; border-radius:14px; background: rgba(255, 80, 80, 0.18); border: 1px solid rgba(255, 80, 80, 0.35); }

/* Rooms */
.rooms { display:grid; grid-template-columns: 220px 1fr; gap: 12px; }
@media (max-width: 900px) { .rooms { grid-template-columns: 1fr; } }

/* TikTok mode */
.feed.tiktok { scroll-snap-type: y mandatory; }
.tt-card { scroll-snap-align: start; scroll-margin-top: 140px; }
.tt-video-wrap { position: relative; }
.tt-overlay {
  pointer-events: none;
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 12px;
}
.tt-badge, .tt-mute {
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(0,0,0,0.45);
  border: 1px solid rgba(255,255,255,0.14);
  font-weight: 950;
  font-size: 12px;
  width: fit-content;
}
.tt-mute { align-self: flex-end; }
.tt-ic{
  margin-left: auto;
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(255,255,255,0.10);
  color: white;
  border-radius: 12px;
  padding: 8px 10px;
  cursor: pointer;
}

/* Chat */
.chat-hint { opacity:.7; font-size: 12px; margin-bottom: 10px; }
.chat-list { display:grid; gap:8px; margin-bottom: 12px; }
.chat-item{
  background: rgba(255, 255, 255, 0.10);
  border: 1px solid rgba(255, 255, 255, 0.12);
  padding: 10px 12px;
  border-radius: 14px;
  color: white;
  cursor: pointer;
  text-align: left;
}
.chat-item.active{ border-color: rgba(255,75,43,.5); background: rgba(255,75,43,.14); }
.chat-box { background: rgba(0,0,0,0.35); border-radius: 16px; padding: 10px; border: 1px solid rgba(255,255,255,0.10); }
.chat-messages{ max-height: 320px; overflow:auto; display:grid; gap:8px; padding: 6px; }
.chat-msg{ font-size: 13px; opacity: .95; }
.chat-input{ display:flex; gap: 8px; margin-top: 10px; }
.chat-input input{
  flex:1;
  background: rgba(0,0,0,0.35);
  border: 1px solid rgba(255,255,255,0.12);
  color:white;
  padding: 10px 12px;
  border-radius: 12px;
  outline:none;
}

/* Alerts + state */
.alert { margin-top: 10px; padding: 10px; border-radius: 14px; background: rgba(255,80,80,0.18); border: 1px solid rgba(255,80,80,0.35); }
.alert.soft { background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12); }
.state {
  text-align: center;
  padding: 26px;
  opacity: 0.9;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.06);
}
.state-emoji{ font-size: 28px; margin-bottom: 8px; }
.state-title{ font-weight: 950; font-size: 18px; }
.state-sub{ opacity:.75; margin-top: 4px; }
.hint { opacity: .75; font-size: 13px; }
.mt10 { margin-top: 10px; }

/* Incoming modal */
.modal-backdrop { position: fixed; inset: 0; z-index: 80; background: rgba(0,0,0,0.58); display: grid; place-items: center; padding: 16px; }
.modal { width: min(520px, 100%); background: rgba(12, 18, 32, 0.95); border: 1px solid rgba(255,255,255,0.14); border-radius: 18px; padding: 16px; box-shadow: 0 12px 40px rgba(0,0,0,0.45); }
.modal-title { font-weight: 950; font-size: 18px; }
.modal-sub { margin-top: 8px; opacity: .9; }
.pill { display: inline-block; margin-left: 6px; padding: 6px 10px; border-radius: 999px; background: rgba(255,255,255,0.10); border: 1px solid rgba(255,255,255,0.14); font-weight: 950; font-size: 12px; }
.modal-actions { display:flex; gap:10px; justify-content:flex-end; margin-top: 14px; }
.tiny { font-size: 12px; }

/* Calling toast */
.toast { position: fixed; left: 50%; bottom: 18px; transform: translateX(-50%); z-index: 90; background: rgba(12, 18, 32, 0.95); border: 1px solid rgba(255,255,255,0.14); padding: 10px 12px; border-radius: 999px; display:flex; align-items:center; gap:10px; }
.toast-dot { width: 10px; height: 10px; border-radius: 50%; background: #00e676; }
.mini-x { border:none; cursor:pointer; background: rgba(255,255,255,0.10); color:white; border-radius: 10px; padding: 4px 8px; }

/* Infinite sentinel */
.load-more{ text-align:center; padding: 18px 10px; opacity: .75; }
</style>