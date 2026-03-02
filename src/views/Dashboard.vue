<!-- src/views/Dashboard.vue -->
<template>
  <Layout>
    <div class="wrap">
      <!-- 🌌 Animated background layer -->
      <div class="bg-animated" aria-hidden="true"></div>

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
          <!-- core -->
          <button class="chip" @click="fetchPosts" :disabled="loading">↻ {{ loading ? "Loading…" : "Refresh" }}</button>
          <button class="chip ghost" @click="togglePeople">{{ peopleOpen ? "Hide People" : "People" }}</button>
          <button class="chip ghost" @click="toggleChat">{{ chatOpen ? "Close Chat" : "Chat" }}</button>

          <!-- extra universal buttons (safe: no backend needed) -->
          <button class="chip ghost" @click="setFeedMode('foryou')">🏠 Home</button>
          <button class="chip ghost" @click="setFeedMode('reels')">🎞️ Reels</button>
          <button class="chip ghost" @click="setFeedMode('threads')">✍️ Threads</button>
          <button class="chip ghost" @click="setFeedMode('rooms')">🎧 Rooms</button>
          <button class="chip ghost" @click="setFeedMode('live')">🔴 Live</button>
          <button class="chip ghost" @click="openQuickCreate">➕ Create</button>
          <button class="chip ghost" @click="copyAppLink">🔗 Share App</button>

          <button class="chip danger" @click="logout">Logout</button>
        </div>
      </header>

      <!-- MODEBAR -->
      <div class="modebar">
        <button class="mode" :class="{ on: feedMode === 'foryou' }" @click="setFeedMode('foryou')">🎬 For You</button>
        <button class="mode reels" :class="{ on: feedMode === 'reels' }" @click="setFeedMode('reels')">🎞️ Reels</button>
        <button class="mode" :class="{ on: feedMode === 'following' }" @click="setFeedMode('following')">📸 Following</button>
        <button class="mode" :class="{ on: feedMode === 'threads' }" @click="setFeedMode('threads')">✍️ Threads</button>
        <button class="mode" :class="{ on: feedMode === 'rooms' }" @click="setFeedMode('rooms')">🎧 Rooms</button>
        <button class="mode" :class="{ on: feedMode === 'live' }" @click="setFeedMode('live')">🔴 Live</button>

        <div class="mode-right">
          <input v-model="search" class="search" placeholder="Search…" />
          <button v-if="feedMode === 'foryou' || feedMode === 'reels'" class="chip ghost" @click="toggleGlobalMute">
            {{ globalMuted ? "🔇 Muted" : "🔊 Sound" }}
          </button>

          <!-- live refresh -->
          <button class="chip ghost" @click="refreshLiveList" :disabled="!socketConnected">🔁 Live List</button>
        </div>
      </div>

      <!-- MAIN -->
      <main class="main">
        <!-- TOP DOCK -->
        <section class="dock">
          <!-- Live compact -->
          <div class="panel dockCard">
            <div class="panel-head">
              <div class="panel-title">🔴 Live Now</div>
              <div style="display:flex; gap:8px; align-items:center;">
                <button class="btn" @click="refreshLiveList" :disabled="!socketConnected">Refresh</button>
                <button class="btn btn-primary" @click="startLive" :disabled="!token">Go Live</button>
              </div>
            </div>

            <div v-if="!socketConnected" class="hint mt10">Socket not connected yet…</div>
            <div v-else-if="liveStreams.length === 0" class="hint mt10">No one live right now</div>

            <div v-else class="live-strip">
              <div
                v-for="stream in liveStreams.slice(0, 6)"
                :key="'live-mini-' + stream"
                class="live-pill"
                @click="joinLive(stream)"
                title="Tap to watch"
              >
                <span class="dot"></span>
                <span class="live-pill-name">{{ stream }}</span>
                <span class="chev">›</span>
              </div>

              <button v-if="liveStreams.length > 6" class="chip ghost mini" @click="setFeedMode('live')">View all</button>
            </div>

            <div class="hint mt10">
              ✅ Fix: Dashboard now requests live list on connect + every 1.5s after connect + on interval.
            </div>
          </div>

          <!-- People + Chat -->
          <div class="panel dockCard">
            <div class="panel-head">
              <div class="panel-title">👥 People</div>
              <div class="dockActions">
                <button class="btn" @click="fetchPeople" :disabled="peopleLoading || !token">
                  {{ peopleLoading ? "Loading…" : "Refresh" }}
                </button>
                <button class="btn ghostBtn" @click="toggleChat">{{ chatOpen ? "Close Chat" : "Open Chat" }}</button>
              </div>
            </div>

            <div v-if="!token" class="alert soft">Login again to see people & call buttons.</div>

            <template v-else>
              <div class="miniAvatars">
                <div
                  v-for="u in people.slice(0, 14)"
                  :key="'pmini-' + u.id"
                  class="miniAvatarWrap"
                  :title="u.display_name || u.username || ('User #' + u.id)"
                  @click="peopleOpen ? null : startCall(u, 'audio')"
                >
                  <div class="miniAvatar">{{ (u.display_name || u.username || "U")[0]?.toUpperCase() }}</div>
                  <span class="miniDot" :class="{ on: isOnline(u.id) }"></span>
                </div>

                <button class="chip ghost mini" @click="togglePeople">{{ peopleOpen ? "Hide list" : "Show list" }}</button>
              </div>

              <div v-if="peopleOpen" class="peopleCompact">
                <div v-if="peopleError" class="alert">{{ peopleError }}</div>
                <div v-else-if="peopleLoading" class="hint">Loading people…</div>
                <div v-else-if="people.length === 0" class="hint">No users found.</div>

                <div v-else class="peopleList">
                  <div v-for="u in people" :key="'plist-' + u.id" class="person compact">
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
                      <button class="iconbtn" title="Audio Call" :disabled="callBusy" @click="startCall(u, 'audio')">📞</button>
                      <button class="iconbtn" title="Video Call" :disabled="callBusy" @click="startCall(u, 'video')">🎥</button>
                      <button class="iconbtn" title="Message" @click="goDM(u)">💬</button>
                    </div>
                  </div>
                </div>

                <div class="hint mt10">Green dot = online. Calls work best when both are online.</div>
              </div>
            </template>
          </div>
        </section>

        <!-- COMPOSER -->
        <section class="composer">
          <div class="composer-head">
            <div class="avatar big">{{ myInitial }}</div>
            <div class="composer-meta">
              <div class="me">{{ me?.username || "You" }}</div>
              <div class="small muted">
                <span v-if="feedMode === 'reels'">Reels mode: upload a VIDEO → posts to Reels + For You</span>
                <span v-else>Post to the world (works everywhere)</span>
              </div>
            </div>
            <div class="composer-actions">
              <button class="pill-btn" @click="focusComposer">Create</button>
              <button class="pill-btn" @click="clearComposer">Clear</button>
              <button class="pill-btn" @click="setFeedMode('threads')">Write Thread</button>
              <button class="pill-btn" @click="setFeedMode('reels')">New Reel</button>
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
              {{ posting ? "Posting…" : feedMode === "reels" ? "Post Reel 🎬" : "Post 🚀" }}
            </button>

            <button class="btn" :disabled="!token" @click="fetchPosts">🔄 Reload Feed</button>
          </div>

          <div v-if="error" class="alert">{{ error }}</div>
        </section>

        <!-- LIVE MODE -->
        <section v-if="feedMode === 'live'" class="panel">
          <div class="panel-head">
            <div class="panel-title">🔴 Live</div>
            <div style="display:flex; gap:8px;">
              <button class="btn" @click="refreshLiveList" :disabled="!socketConnected">Refresh</button>
              <button class="btn btn-primary" @click="startLive" :disabled="!token">Go Live</button>
            </div>
          </div>

          <div class="hint">Tap any live session below to watch.</div>

          <div v-if="liveStreams.length === 0" class="state">
            <div class="state-emoji">📡</div>
            <div class="state-title">Nobody is live</div>
            <div class="state-sub">Start the first stream.</div>
          </div>

          <div v-else class="live-grid">
            <div v-for="stream in liveStreams" :key="'live-center-' + stream" class="live-big" @click="joinLive(stream)">
              <div class="live-big-top"><span class="dot"></span><span class="live-big-title">{{ stream }}</span></div>
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
              <button class="chip ghost" @click="toggleChat">Toggle Chat Drawer</button>
            </div>

            <div class="rooms-messages" ref="roomsChatBoxRef">
              <div v-for="(m, i) in chatMessages" :key="'rm-' + i" class="rm">
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

          <article v-else v-for="post in threadsPosts" :key="'t-' + post.id" class="post thread">
            <header class="post-head">
              <div class="avatar">{{ getInitial(post.user_id) }}</div>
              <div class="who">
                <div class="name">{{ post.display_name || post.username || ("User #" + post.user_id) }}</div>
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

            <div v-if="threadMediaOpen[post.id]" class="mediaWrap">
              <img v-if="post.image_url" class="media" :src="mediaUrl(post.image_url)" loading="lazy" />
              <video v-if="post.video_url" class="media" :src="mediaUrl(post.video_url)" controls playsinline preload="metadata"></video>
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
              <button class="action-btn" @click="toggleComments(post)">💬 <span class="label">{{ commentCount(post.id) }}</span></button>
              <div class="spacer"></div>
              <button class="action-btn ghost" @click="sharePost(post)">🔗 <span class="label">Share</span></button>
              <button class="action-btn ghost" @click="savePost(post)">⭐ <span class="label">Save</span></button>
            </div>

            <CommentsBlock :post="post" />
          </article>
        </section>

        <!-- REELS MODE -->
        <section v-else-if="feedMode === 'reels'" class="feed reels">
          <template v-if="loading">
            <div class="state">Loading…</div>
          </template>

          <div v-else-if="reelsPosts.length === 0" class="state">
            <div class="state-emoji">🎞️</div>
            <div class="state-title">No reels yet</div>
            <div class="state-sub">Post a video and it will show here.</div>
          </div>

          <article v-else v-for="post in reelsVisible" :key="'r-' + post.id" class="post tt-card">
            <header class="post-head">
              <div class="avatar">{{ getInitial(post.user_id) }}</div>
              <div class="who">
                <div class="name">User #{{ post.user_id }}</div>
                <div class="time">{{ formatDate(post.created_at) }}</div>
              </div>

              <button class="tt-ic" title="Sound" @click="toggleGlobalMute">{{ globalMuted ? "🔇" : "🔊" }}</button>
            </header>

            <div v-if="post.caption" class="text">{{ post.caption }}</div>

            <div class="tt-video-wrap mediaWrap">
              <video
                class="media tt-video"
                :data-post-id="post.id"
                :src="mediaUrl(post.video_url)"
                playsinline
                preload="metadata"
                loop
                muted
                @click="toggleVideoMute(post.id)"
              ></video>

              <div class="tt-overlay">
                <div class="tt-badge">REELS</div>
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
                          <button class="action-btn" @click="toggleComments(post)">💬 <span class="label">{{ commentCount(post.id) }}</span></button>
                          <div class="spacer"></div>
                          <button class="action-btn ghost" @click="sharePost(post)">🔗 <span class="label">Share</span></button>
                          <button class="action-btn ghost" @click="savePost(post)">⭐ <span class="label">Save</span></button>
                        </div>
            
                        <CommentsBlock :post="post" />
                      </article>
                    </section>
                  </main>
                </div>
              </Layout>
            </template>