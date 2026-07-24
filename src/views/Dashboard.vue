<template>
  <Layout>
    <div class="wrap">
      <!-- Background Orbs -->
      <div class="bg-orb orb1"></div>
      <div class="bg-orb orb2"></div>
      <div class="bg-orb orb3"></div>

      <!-- ELITE TOPBAR -->
      <header class="topbar eliteTopbar glassy">
        <div class="brand" @click="scrollToTop" role="button" tabindex="0" aria-label="Scroll to top">
          <div class="logo eliteLogo">⚡</div>
          <div class="brand-text">
            <div class="title">Pulse</div>
            <div class="sub">Elite social cockpit</div>
          </div>
        </div>

        <div class="eliteCenterSearch">
          <div class="searchWrap eliteSearchWrap">
            <input
              ref="searchRef"
              v-model="search"
              class="search eliteSearch"
              placeholder="Search people, rooms, live, posts…"
              aria-label="Search"
            />
            <button v-if="search" class="searchClear" @click="search = ''" aria-label="Clear search">✕</button>
          </div>
        </div>

        <div class="top-actions eliteTopActions">
          <span class="netBadge" :class="{ offline: !isNetworkOnline, syncing: isSyncingQueue }">
            <span class="netDot"></span>
            {{ isSyncingQueue ? `Syncing ${offlineQueueCount}` : isNetworkOnline ? "Online" : `Offline ${offlineQueueCount ? "• " + offlineQueueCount + " queued" : ""}` }}
          </span>
          <button class="fab" @click="goCallSFU" aria-label="Start SFU call">📞+</button>
          <button class="chip eliteChip" @click="openQuickCreate('post')">✍️ Post</button>
          <button class="chip ghost eliteChip" @click="openQuickCreate('call')">📞 Call</button>
          <button class="chip ghost eliteChip" @click="openQuickCreate('live')">🔴 Live</button>
          <button class="chip ghost eliteChip" @click="togglePeople">
            {{ peopleOpen ? "Hide People" : "People" }}
          </button>
          <button class="chip ghost eliteChip" @click="toggleChat">
            {{ chatOpen ? "Close Chat" : "Chat" }}
          </button>
          <button class="chip ghost hide-sm" @click="toggleTools">
            {{ toolsOpen ? "Close Tools" : "Tools" }}
          </button>
          <button class="chip ghost hide-sm" @click="toggleStudio">
            {{ studioOpen ? "Close Studio" : "Studio" }}
          </button>
          <button class="chip ghost hide-sm" @click="toggleFocusMode">
            {{ focusMode ? "Exit Focus" : "Focus Mode" }}
          </button>
          <button class="chip danger hide-sm" @click="logout">Logout</button>
        </div>
      </header>

      <!-- ELITE QUICK RAIL -->
      <section class="eliteQuickRail">
        <button class="quickRailBtn" @click="focusComposer">✍️ Create</button>
        <button class="quickRailBtn" @click="togglePeople">👥 People</button>
        <button class="quickRailBtn" @click="goInbox">💬 Inbox</button>
        <button class="quickRailBtn" @click="createFastRoom(meName)">🎧 Room</button>
        <button class="quickRailBtn" @click="startLive">🔴 Live</button>
        <button class="quickRailBtn" @click="goProfile">👤 Profile</button>
      </section>

      <!-- DYNAMIC ISLAND -->
      <section class="dynamicIsland glassy">
        <div class="islandLeft">
          <span class="islandDot" :class="{ on: socketConnected }"></span>
          <span class="islandText">{{ socketConnected ? "Realtime Connected" : "Realtime Offline" }}</span>
        </div>
        <div class="islandCenter">
          <button class="islandBtn" @click="refreshAll">🔄 Refresh</button>
          <button class="islandBtn" @click="focusComposer">✍️ Post</button>
          <button class="islandBtn" @click="startLive">🔴 Live</button>
          <button class="islandBtn" @click="createFastRoom(meName)">📞 Room</button>
        </div>
        <div class="islandRight">
          <span class="islandStat">👥 {{ onlineCount }}</span>
          <span class="islandStat">🔴 {{ liveStreams.length }}</span>
          <span class="islandStat">📞 {{ callRooms.length }}</span>
        </div>
      </section>

      <!-- HERO -->
      <section class="heroStrip">
        <div class="heroCard glassy">
          <div class="heroLeft">
            <div class="heroEyebrow">WELCOME BACK</div>
            <div class="heroTitle">{{ meName }}</div>
            <div class="heroSub">{{ moodGreeting }} Build, post, call, stream, chat, save ideas, and run your whole world from one magical dashboard.</div>
            <div class="heroActions">
              <button class="btn btn-primary" @click="focusComposer">Create Post</button>
              <button class="btn ghostBtn" @click="setFeedMode('rooms')">Open Rooms</button>
              <button class="btn ghostBtn" @click="setFeedMode('live')">Go Live Area</button>
              <button class="btn ghostBtn" @click="toggleStudio">Creator Studio</button>
              <button class="btn ghostBtn" @click="createFastRoom(meName)">Start Room</button>
            </div>
            <div class="trendingRow mt10">
              <span class="badgePill accent">Creator Score {{ creatorScore }}</span>
              <span class="badgePill">Streak {{ todayStreak }} day{{ todayStreak === 1 ? "" : "s" }}</span>
              <span class="badgePill">{{ quickStatusText }}</span>
            </div>
          </div>
          <div class="heroStats">
            <div class="heroStat"><div class="heroStatNum">{{ posts.length }}</div><div class="heroStatLab">Posts</div></div>
            <div class="heroStat"><div class="heroStatNum">{{ videoPosts.length }}</div><div class="heroStatLab">Videos</div></div>
            <div class="heroStat"><div class="heroStatNum">{{ onlineCount }}</div><div class="heroStatLab">Online</div></div>
            <div class="heroStat"><div class="heroStatNum">{{ liveStreams.length }}</div><div class="heroStatLab">Live</div></div>
            <div class="heroStat"><div class="heroStatNum">{{ savedPostIds.length }}</div><div class="heroStatLab">Saved</div></div>
            <div class="heroStat"><div class="heroStatNum">{{ pinnedPostIds.length }}</div><div class="heroStatLab">Pinned</div></div>
          </div>
        </div>
      </section>

      <!-- COMMAND CENTER -->
      <section class="dock">
        <div class="panel dockCard glassy">
          <div class="panel-head">
            <div class="panel-title">✨ Command Center</div>
            <div class="dockActions">
              <button class="btn ghostBtn" @click="copyDiagnostics">Copy Diagnostics</button>
              <button class="btn ghostBtn" @click="surpriseMe">Surprise Me</button>
            </div>
          </div>
          <div class="trendingRow">
            <span class="badgePill accent">Mode: {{ feedModeLabel }}</span>
            <span class="badgePill" :class="{ ok: socketConnected, bad: !socketConnected }">{{ socketConnected ? "Connected" : "Disconnected" }}</span>
            <span class="badgePill">Online {{ onlineCount }}</span>
            <span class="badgePill">Live {{ liveStreams.length }}</span>
            <span class="badgePill">Rooms {{ callRooms.length }}</span>
            <span class="badgePill">Saved {{ savedPostIds.length }}</span>
            <span class="badgePill">Pinned {{ pinnedPostIds.length }}</span>
          </div>
          <div class="hint mt10">Keyboard shortcuts: <strong>/</strong> search, <strong>c</strong> composer, <strong>r</strong> refresh, <strong>g</strong> go live, <strong>m</strong> mute, <strong>f</strong> focus mode.</div>
        </div>
        <div class="panel dockCard glassy">
          <div class="panel-head"><div class="panel-title">🚀 Smart Launch</div></div>
          <div class="toolsGrid">
            <button v-for="item in smartLaunchCards" :key="item.id" class="toolBtn" @click="runSmartLaunch(item.id)">{{ item.label }}</button>
          </div>
        </div>
      </section>

      <!-- SPOTLIGHT -->
      <section class="dock">
        <div class="panel dockCard glassy">
          <div class="panel-head">
            <div class="panel-title">🌟 Spotlight</div>
            <div class="dockActions"><button class="btn ghostBtn" @click="refreshAll">Refresh</button></div>
          </div>
          <div class="toolsGrid">
            <div class="toolBtn">🔥 Trending Tag: {{ spotlightTag || "Nothing yet" }}</div>
            <div class="toolBtn">👥 Most Active: {{ spotlightPerson }}</div>
            <div class="toolBtn">📞 Rooms Ready: {{ callRooms.length }}</div>
            <div class="toolBtn">🎬 Feed Power: {{ videoPosts.length > 0 ? "Video Active" : "Text Active" }}</div>
          </div>
        </div>
        <div class="panel dockCard glassy">
          <div class="panel-head"><div class="panel-title">📈 Creator Pulse</div></div>
          <div class="trendingRow">
            <span class="badgePill accent">Posts {{ posts.length }}</span>
            <span class="badgePill">Comments {{ totalCommentCount }}</span>
            <span class="badgePill">Likes {{ totalLikesCount }}</span>
            <span class="badgePill">Saved {{ savedPostIds.length }}</span>
            <span class="badgePill">Pinned {{ pinnedPostIds.length }}</span>
          </div>
          <div class="hint mt10">{{ creatorInsight }}</div>
        </div>
      </section>

      <!-- MODEBAR -->
      <div class="modebar">
        <button class="mode" :class="{ on: feedMode === 'foryou' }" @click="setFeedMode('foryou')">🎬 For You</button>
        <button class="mode reels" :class="{ on: feedMode === 'reels' }" @click="setFeedMode('reels')">🎞️ Reels</button>
        <button class="mode" :class="{ on: feedMode === 'following' }" @click="setFeedMode('following')">📸 Following</button>
        <button class="mode" :class="{ on: feedMode === 'threads' }" @click="setFeedMode('threads')">✍️ Threads</button>
        <button class="mode" :class="{ on: feedMode === 'rooms' }" @click="setFeedMode('rooms')">🎧 Rooms</button>
        <button class="mode" :class="{ on: feedMode === 'live' }" @click="setFeedMode('live')">🔴 Live</button>
        <button class="mode" :class="{ on: feedMode === 'saved' }" @click="setFeedMode('saved')">💾 Saved</button>
        <button class="mode" :class="{ on: feedMode === 'pinned' }" @click="setFeedMode('pinned')">📌 Pinned</button>
        <button class="chip primary" @click="goCallSFU">🚀 SFU Call</button>
        <div class="mode-right">
          <div class="searchWrap">
            <input ref="searchRef" v-model="search" class="search" placeholder="Search…" aria-label="Search posts" />
            <button v-if="search" class="searchClear" @click="search = ''" aria-label="Clear search">✕</button>
          </div>
          <select v-model="sortMode" class="selectControl" aria-label="Sort posts">
            <option value="latest">Latest</option>
            <option value="popular">Popular</option>
            <option value="media">Media First</option>
            <option value="text">Text First</option>
          </select>
          <button v-if="feedMode === 'foryou' || feedMode === 'reels'" class="chip ghost" @click="toggleGlobalMute">
            {{ globalMuted ? "🔇 Muted" : "🔊 Sound" }}
          </button>
          <button class="chip ghost" @click="surpriseMe">✨ Surprise Me</button>
        </div>
      </div>

      <!-- FILTER BAR -->
      <div class="filterbar">
        <button class="filterChip" :class="{ on: postFilter === 'all' }" @click="postFilter = 'all'">All</button>
        <button class="filterChip" :class="{ on: postFilter === 'video' }" @click="postFilter = 'video'">Videos</button>
        <button class="filterChip" :class="{ on: postFilter === 'image' }" @click="postFilter = 'image'">Images</button>
        <button class="filterChip" :class="{ on: postFilter === 'text' }" @click="postFilter = 'text'">Text</button>
        <div class="filterHint">
          <span class="badgePill accent">{{ feedModeLabel }}</span>
          <span class="badgePill">{{ filteredBaseCount }} shown</span>
        </div>
      </div>

      <main class="main">
        <!-- STATUS -->
        <section v-if="token" class="panel miniPanel glassy">
          <div class="panel-head">
            <div class="panel-title">🛰️ Status</div>
            <div class="row">
              <span class="badgePill" :class="{ ok: socketConnected, bad: !socketConnected }">{{ socketConnected ? "Socket Connected" : "Socket Disconnected" }}</span>
              <span class="badgePill">{{ onlineCount }} online</span>
              <span class="badgePill">{{ liveStreams.length }} live</span>
              <span class="badgePill">{{ callRooms.length }} call rooms</span>
              <span class="badgePill accent">{{ feedModeLabel }}</span>
            </div>
            <div class="row">
              <button class="btn ghostBtn" @click="reconnectSocket">♻️ Reconnect</button>
              <button class="btn ghostBtn" @click="copyMyProfileLink">🔗 Copy Profile</button>
              <button class="btn ghostBtn" @click="copyDiagnostics">🧾 Copy Diagnostics</button>
            </div>
          </div>
          <div v-if="socketStatusNote" class="hint mt10">{{ socketStatusNote }}</div>
        </section>

        <!-- TRENDING -->
        <section v-if="trendingTags.length" class="panel glassy">
          <div class="panel-head">
            <div class="panel-title">🔥 Trending</div>
            <button class="btn ghostBtn" @click="search = ''">Clear Search</button>
          </div>
          <div class="trendingRow">
            <button v-for="tag in trendingTags" :key="tag" class="trendChip" @click="applyTrendTag(tag)">{{ tag }}</button>
          </div>
        </section>

        <!-- CONNECT HUB -->
        <section v-if="token" class="panel glassy commHub">
          <div class="panel-head">
            <div class="panel-title">📡 Connect</div>
            <div class="dockActions">
              <button class="btn ghostBtn" @click="togglePeople">{{ peopleOpen ? "Hide People" : "Show People" }}</button>
              <button class="btn ghostBtn" @click="goInbox">Open Inbox</button>
              <button class="btn ghostBtn" @click="setFeedMode('rooms')">Open Rooms</button>
            </div>
          </div>
          <div class="miniAvatars">
            <div v-for="u in filteredPeople.slice(0, 12)" :key="'hub-' + u.id" class="miniAvatarWrap" :title="displayUserName(u)" @click="startCall(u, 'audio')">
              <div class="miniAvatar">{{ displayUserName(u)[0]?.toUpperCase() }}</div>
              <span class="miniDot" :class="{ on: isOnline(u.id) }"></span>
            </div>
          </div>
          <div class="hint mt10">Tap a person bubble for a quick audio call. Open People for full call buttons and Inbox for messages.</div>
        </section>

        <!-- STUDIO -->
        <section v-if="studioOpen" class="panel toolsPanel glassy">
          <div class="panel-head">
            <div class="panel-title">🪄 Creator Studio</div>
            <div class="dockActions"><button class="btn ghostBtn" @click="toggleStudio">Close</button></div>
          </div>
          <div class="toolsGrid">
            <button class="toolBtn" @click="focusComposer">✍️ New Post</button>
            <button class="toolBtn" @click="setFeedMode('reels')">🎞️ Create Reel</button>
            <button class="toolBtn" @click="startLive">🔴 Start Live</button>
            <button class="toolBtn" @click="createFastRoom(meName)">📞 Start Room</button>
            <button class="toolBtn" @click="setFeedMode('saved')">💾 Open Saved</button>
            <button class="toolBtn" @click="setFeedMode('pinned')">📌 Open Pinned</button>
            <button class="toolBtn" @click="refreshCallRooms">📞 Refresh Rooms</button>
            <button class="toolBtn" @click="requestNotifications">🔔 Notifications</button>
            <button class="toolBtn" @click="testTurn">🧊 Test TURN</button>
            <button class="toolBtn" @click="toggleFocusMode">{{ focusMode ? "🧘 Exit Focus" : "🧘 Enter Focus" }}</button>
          </div>
          <div class="trendingRow">
            <span class="badgePill">Posts {{ posts.length }}</span>
            <span class="badgePill">Videos {{ videoPosts.length }}</span>
            <span class="badgePill">Saved {{ savedPosts.length }}</span>
            <span class="badgePill">Pinned {{ pinnedPosts.length }}</span>
            <span class="badgePill accent">Score {{ creatorScore }}</span>
          </div>
          <div v-if="turnNote" class="hint mt10">{{ turnNote }}</div>
        </section>

        <!-- TOP DOCK: Live + People -->
        <section v-if="!focusMode" class="dock">
          <!-- Live -->
          <div class="panel dockCard glassy">
            <div class="panel-head">
              <div class="panel-title">🔴 Live Now</div>
              <button class="btn btn-primary" @click="startLive" :disabled="!token">Go Live</button>
            </div>
            <div v-if="liveStreams.length === 0" class="hint mt10">No one live right now</div>
            <div v-else class="live-strip">
              <div v-for="stream in liveStreams.slice(0, 6)" :key="'live-mini-' + stream" class="live-pill" @click="joinLive(stream)" title="Tap to watch">
                <span class="dot"></span>
                <span class="live-pill-name">{{ stream }}</span>
                <span class="chev">›</span>
              </div>
              <button v-if="liveStreams.length > 6" class="chip ghost mini" @click="setFeedMode('live')">View all</button>
            </div>
          </div>
          <!-- People -->
          <div class="panel dockCard glassy">
            <div class="panel-head">
              <div class="panel-title">👥 People</div>
              <div class="dockActions">
                <button class="btn" @click="fetchPeople" :disabled="peopleLoading || !token">{{ peopleLoading ? "Loading…" : "Refresh" }}</button>
                <button class="btn ghostBtn" @click="toggleChat">{{ chatOpen ? "Close Chat" : "Open Chat" }}</button>
              </div>
            </div>
            <div v-if="!token" class="alert soft">Login again to see people & call buttons.</div>
            <template v-else>
              <div class="miniAvatars">
                <div v-for="u in people.slice(0, 14)" :key="'pmini-' + u.id" class="miniAvatarWrap" :title="displayUserName(u)" @click="peopleOpen ? null : startCall(u, 'audio')">
                  <div class="miniAvatar">{{ displayUserName(u)[0]?.toUpperCase() }}</div>
                  <span class="miniDot" :class="{ on: isOnline(u.id) }"></span>
                </div>
                <button class="chip ghost mini" @click="togglePeople">{{ peopleOpen ? "Hide list" : "Show list" }}</button>
              </div>
              <div v-if="peopleOpen" class="peopleCompact">
                <div v-if="peopleError" class="alert">{{ peopleError }}</div>
                <div v-else-if="peopleLoading" class="hint">Loading people…</div>
                <div v-else-if="people.length === 0" class="hint">No users found.</div>
                <div v-else class="peopleList">
                  <div v-for="u in filteredPeople" :key="'plist-' + u.id" class="person compact">
                    <div class="avatar small">{{ displayUserName(u)[0]?.toUpperCase() }}</div>
                    <div class="person-meta">
                      <div class="person-name">{{ displayUserName(u) }}</div>
                      <div class="person-sub">
                        <span class="status" :class="{ on: isOnline(u.id) }"></span>
                        <span class="status-text">{{ isOnline(u.id) ? "Online" : "Offline" }}</span>
                        <span class="sep">•</span>
                        <span class="id">ID {{ u.id }}</span>
                      </div>
                    </div>
                    <div class="person-actions">
                      <button class="iconbtn" title="Audio Call" :disabled="!isOnline(u.id) || callBusy" @click="startCall(u, 'audio')" aria-label="Audio call">📞</button>
                      <button class="iconbtn" title="Video Call" :disabled="!isOnline(u.id) || callBusy" @click="startCall(u, 'video')" aria-label="Video call">🎥</button>
                      <button class="iconbtn" title="Open Profile" @click="openUserProfile(u)" aria-label="Open profile">👤</button>
                    </div>
                  </div>
                </div>
                <div class="hint mt10">Calls require both users online (green).</div>
              </div>
            </template>
          </div>
        </section>

        <!-- TOOLS -->
        <section v-if="toolsOpen" class="panel toolsPanel glassy">
          <div class="panel-head">
            <div class="panel-title">🧰 Power Tools</div>
            <div class="dockActions"><button class="btn ghostBtn" @click="toggleTools">Close</button></div>
          </div>
          <div class="toolsGrid">
            <button class="toolBtn" @click="setFeedMode('foryou')">🎬 Go For You</button>
            <button class="toolBtn" @click="setFeedMode('reels')">🎞️ Go Reels</button>
            <button class="toolBtn" @click="setFeedMode('rooms')">🎧 Go Rooms</button>
            <button class="toolBtn" @click="setFeedMode('live')">🔴 Go Live Tab</button>
            <button class="toolBtn" @click="setFeedMode('saved')">💾 Open Saved</button>
            <button class="toolBtn" @click="setFeedMode('pinned')">📌 Open Pinned</button>
            <button class="toolBtn" @click="scrollToTop">⬆️ Scroll Top</button>
            <button class="toolBtn" @click="focusComposer">✍️ Focus Composer</button>
            <button class="toolBtn" @click="clearDraft">🧹 Clear Draft</button>
            <button class="toolBtn" @click="refreshAll" :disabled="loading">🔁 Refresh All</button>
            <button class="toolBtn" @click="testTurn">🧊 Test TURN</button>
            <button class="toolBtn" @click="requestNotifications">🔔 Enable Notifications</button>
            <button class="toolBtn" @click="toggleFocusMode">{{ focusMode ? "🧘 Exit Focus" : "🧘 Focus Mode" }}</button>
            <button class="toolBtn dangerTool" @click="hardResetApp">💣 Hard Reset (Local)</button>
          </div>
          <div v-if="turnNote" class="hint mt10">{{ turnNote }}</div>
        </section>

        <!-- COMPOSER -->
        <section class="composer glassy">
          <div class="composer-head">
            <div class="avatar big">{{ myInitial }}</div>
            <div class="composer-meta">
              <div class="me">{{ meName }}</div>
              <div class="small muted">
                <span v-if="feedMode === 'reels'">Reels mode: upload a VIDEO → posts to Reels + For You</span>
                <span v-else>Post to the world (works everywhere)</span>
              </div>
            </div>
            <div class="composer-actions"><button class="pill-btn" @click="focusComposer">Create</button></div>
          </div>
          <textarea ref="composerRef" v-model="caption" class="input" placeholder="What's happening?" rows="3" aria-label="Post caption"></textarea>
          <div class="composerMetaRow">
            <div class="charCount" :class="{ warn: captionLength > 220 }">{{ captionLength }} chars</div>
            <div class="quickTags">
              <button class="quickTag" @click="appendQuickTag('#Pulse')">#Pulse</button>
              <button class="quickTag" @click="appendQuickTag('#Reels')">#Reels</button>
              <button class="quickTag" @click="appendQuickTag('#Live')">#Live</button>
              <button class="quickTag" @click="appendQuickTag('#Update')">#Update</button>
            </div>
          </div>
          <div class="upload-row">
            <label class="file-pill">
              <input type="file" accept="image/*" @change="onPickImage" aria-label="Upload image" />
              📷 Image <span v-if="imageFile" class="file-dot">•</span>
            </label>
            <label class="file-pill">
              <input type="file" accept="video/*" @change="onPickVideo" aria-label="Upload video" />
              🎥 Video <span v-if="videoFile" class="file-dot">•</span>
            </label>
            <button class="btn btn-primary" :disabled="posting || !token" @click="handleSubmitPost">{{ posting ? "Posting…" : (feedMode === 'reels' ? "Post Reel 🎬" : "Post 🚀") }}</button>
            <button class="btn ghostBtn" :disabled="posting" @click="clearDraft">Clear</button>
          </div>
          <div v-if="draftSavedNote" class="hint mt10">{{ draftSavedNote }}</div>
          <div v-if="postError" class="alert">{{ postError }}</div>
        </section>

        <!-- LIVE MODE -->
        <section v-if="feedMode === 'live'" class="panel glassy">
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
              <div class="live-big-top"><span class="dot"></span><span class="live-big-title">{{ stream }}</span></div>
              <div class="live-big-sub">Tap to watch</div>
            </div>
          </div>
        </section>

        <!-- ROOMS MODE -->
        <section v-else-if="feedMode === 'rooms'" class="rooms">
          <aside class="rooms-left glassy">
            <div class="rooms-head">🎧 Rooms</div>
            <button class="room" :class="{ on: chatRoom === 'global' }" @click="selectChat('global')">🌍 global</button>
            <button class="room" :class="{ on: chatRoom === 'support' }" @click="selectChat('support')">🛠 support</button>
            <button class="room" :class="{ on: chatRoom === 'dev' }" @click="selectChat('dev')">💻 dev</button>
            <button class="room" :class="{ on: chatRoom === 'random' }" @click="selectChat('random')">🎲 random</button>
            <button class="room" :class="{ on: chatRoom === 'callrooms' }" @click="selectChat('callrooms')">📞 Call Rooms</button>
            <div class="rooms-hint">Real-time chat via Socket.io</div>
          </aside>
          <div class="rooms-main glassy" v-if="chatRoom !== 'callrooms'">
            <div class="rooms-top">
              <div class="rooms-title"># {{ chatRoom }}</div>
              <button class="chip ghost" @click="toggleChat">Toggle Chat Drawer</button>
            </div>
            <div class="rooms-messages" ref="roomsChatBoxRef">
              <div v-for="(m, i) in chatMessages" :key="'rm-' + (m.id || m.created_at || i)" class="rm">
                <div class="rm-top">
                  <span class="rm-user">{{ m.from }}</span>
                  <span class="rm-time">{{ m.created_at ? formatDate(m.created_at) : "" }}</span>
                </div>
                <div class="rm-text">{{ m.text }}</div>
              </div>
            </div>
            <div class="rooms-input">
              <input v-model="chatText" placeholder="Message #room…" @keydown.enter.prevent="sendChat" aria-label="Room message" />
              <button class="btn btn-primary" @click="sendChat">Send</button>
            </div>
          </div>
          <div class="rooms-main glassy" v-else>
            <div class="rooms-top">
              <div class="rooms-title">📞 Call Rooms</div>
              <button class="chip ghost" @click="refreshCallRooms">Refresh</button>
            </div>
            <div class="callrooms-create">
              <input v-model="callRoomName" class="roomInput" placeholder="Room name" aria-label="Room name" />
              <select v-model="callRoomKind" class="roomInput roomSelect" aria-label="Room type">
                <option value="audio">Audio Room</option>
                <option value="video">Video Room</option>
              </select>
              <button class="btn btn-primary" @click="createCallRoom" :disabled="creatingCallRoom">{{ creatingCallRoom ? "Creating..." : "Create Room" }}</button>
            </div>
            <div v-if="callRoomsError" class="alert">{{ callRoomsError }}</div>
            <div v-if="callRoomsLoading" class="state miniState">
              <div class="state-emoji">⏳</div>
              <div class="state-title">Loading call rooms</div>
              <div class="state-sub">Fetching active rooms…</div>
            </div>
            <div v-else-if="callRooms.length === 0" class="state miniState">
              <div class="state-emoji">📞</div>
              <div class="state-title">No call rooms yet</div>
              <div class="state-sub">Create one and invite others.</div>
            </div>
            <div v-else class="callrooms-list">
              <div v-for="room in callRooms" :key="room.roomId" class="callroom-card">
                <div class="callroom-main">
                  <div class="callroom-name">{{ room.name }}</div>
                  <div class="callroom-sub">{{ room.kind === "video" ? "🎥 Video Room" : "🎙 Audio Room" }} • {{ room.participantCount }} inside</div>
                </div>
                <button class="btn btn-primary" @click="joinCallRoom(room)">Join</button>
              </div>
            </div>
          </div>
        </section>

        <!-- SAVED MODE -->
        <section v-else-if="feedMode === 'saved'" class="feed following">
          <template v-if="loading"><div class="state">Loading…</div></template>
          <div v-else-if="savedPosts.length === 0" class="state">
            <div class="state-emoji">💾</div>
            <div class="state-title">No saved posts yet</div>
            <div class="state-sub">Tap Save on any post to keep it here.</div>
          </div>
          <article v-else v-for="post in savedPosts" :key="'s-' + post.id" class="post glassy">
            <header class="post-head">
              <div class="avatar">{{ getInitial(post) }}</div>
              <div class="who">
                <div class="name">{{ displayPostUser(post) }}</div>
                <div class="time">{{ formatDate(post.created_at) }}</div>
              </div>
              <div class="postPills"><span class="miniPostPill">SAVED</span></div>
            </header>
            <div v-if="post.caption" class="text">{{ post.caption }}</div>
            <img v-if="post.image_url" class="media" :src="getMedia(post.image_url)" loading="lazy" alt="Post image" />
            <video v-if="post.video_url" class="media" :src="getMedia(post.video_url)" controls playsinline preload="metadata"></video>
            <div class="actions">
              <button class="action-btn" @click="toggleSavePost(post)">💾 <span class="label">{{ isSaved(post.id) ? "Saved" : "Save" }}</span></button>
              <button class="action-btn" @click="togglePinPost(post)">📌 <span class="label">{{ isPinned(post.id) ? "Pinned" : "Pin" }}</span></button>
              <div class="spacer"></div>
              <button class="action-btn ghost" @click="sharePost(post)">🔗 <span class="label">Share</span></button>
            </div>
          </article>
        </section>

        <!-- PINNED MODE -->
        <section v-else-if="feedMode === 'pinned'" class="feed threads">
          <template v-if="loading"><div class="state">Loading…</div></template>
          <div v-else-if="pinnedPosts.length === 0" class="state">
            <div class="state-emoji">📌</div>
            <div class="state-title">No pinned posts yet</div>
            <div class="state-sub">Pin your favorite posts here.</div>
          </div>
          <article v-else v-for="post in pinnedPosts" :key="'pin-' + post.id" class="post thread glassy">
            <header class="post-head">
              <div class="avatar">{{ getInitial(post) }}</div>
              <div class="who">
                <div class="name">{{ displayPostUser(post) }}</div>
                <div class="time">{{ formatDate(post.created_at) }}</div>
              </div>
              <div class="postPills"><span class="miniPostPill">PINNED</span></div>
            </header>
            <div v-if="post.caption" class="text thread-text">{{ post.caption }}</div>
            <img v-if="post.image_url" class="media" :src="getMedia(post.image_url)" loading="lazy" alt="Post image" />
            <video v-if="post.video_url" class="media" :src="getMedia(post.video_url)" controls playsinline preload="metadata"></video>
            <div class="actions">
              <button class="action-btn" @click="togglePinPost(post)">📌 <span class="label">{{ isPinned(post.id) ? "Pinned" : "Pin" }}</span></button>
              <button class="action-btn" @click="toggleSavePost(post)">💾 <span class="label">{{ isSaved(post.id) ? "Saved" : "Save" }}</span></button>
              <div class="spacer"></div>
              <button class="action-btn ghost" @click="sharePost(post)">🔗 <span class="label">Share</span></button>
            </div>
          </article>
        </section>

        <!-- THREADS MODE -->
        <section v-else-if="feedMode === 'threads'" class="feed threads">
          <div v-if="loading" class="state">Loading…</div>
          <div v-else-if="sortedFilteredPosts.length === 0" class="state">
            <div class="state-emoji">✍️</div>
            <div class="state-title">No threads yet</div>
            <div class="state-sub">Write something to start the conversation.</div>
          </div>
          <article v-else v-for="post in threadsPosts" :key="'t-' + post.id" class="post thread glassy">
            <header class="post-head">
              <div class="avatar">{{ getInitial(post) }}</div>
              <div class="who">
                <div class="name">{{ displayPostUser(post) }}</div>
                <div class="time">{{ formatDate(post.created_at) }}</div>
              </div>
              <div class="postPills">
                <span class="miniPostPill" v-if="post.video_url">VIDEO</span>
                <span class="miniPostPill" v-else-if="post.image_url">IMAGE</span>
                <span class="miniPostPill ghostPill" v-else>TEXT</span>
              </div>
            </header>
            <div v-if="post.caption" class="text thread-text">{{ post.caption }}</div>
            <button v-if="post.image_url || post.video_url" class="chip ghost thread-media-toggle" @click="toggleThreadMedia(post.id)">{{ threadMediaOpen[post.id] ? "Hide media" : "View media" }}</button>
            <div v-if="threadMediaOpen[post.id]" class="thread-media">
              <img v-if="post.image_url" class="media" :src="getMedia(post.image_url)" loading="lazy" alt="Post image" />
              <video v-if="post.video_url" class="media" :src="getMedia(post.video_url)" controls playsinline preload="metadata"></video>
            </div>
            <div class="actions">
              <button class="action-btn" :class="{ active: likesByPost[post.id]?.likedByMe }" :disabled="likeBusyByPost[post.id]" @click="toggleLike(post)">❤️ <span class="label">{{ likesByPost[post.id]?.count ?? 0 }}</span></button>
              <button class="action-btn" @click="toggleComments(post.id)">💬 <span class="label">{{ commentCount(post.id) }}</span></button>
              <button class="action-btn" @click="toggleSavePost(post)">💾 <span class="label">{{ isSaved(post.id) ? "Saved" : "Save" }}</span></button>
              <button class="action-btn" @click="togglePinPost(post)">📌 <span class="label">{{ isPinned(post.id) ? "Pinned" : "Pin" }}</span></button>
              <div class="spacer"></div>
              <button class="action-btn ghost" @click="sharePost(post)">🔗 <span class="label">Share</span></button>
              <button class="action-btn ghost" @click="copyPostText(post)">📋 <span class="label">Copy</span></button>
            </div>
            <CommentsPanel v-if="commentsOpenByPost[post.id]" :post-id="post.id" @changed="handleCommentsChanged(post.id)" />
          </article>
        </section>

        <!-- REELS MODE -->
        <section v-else-if="feedMode === 'reels'" class="feed reels">
          <template v-if="loading"><div class="state">Loading…</div></template>
          <div v-else-if="reelsPosts.length === 0" class="state">
            <div class="state-emoji">🎞️</div>
            <div class="state-title">No reels yet</div>
            <div class="state-sub">Post a video and it will show here.</div>
          </div>
          <TikTokFeed v-else :items="reelsVisible" mode="reels" :globalMuted="globalMuted" :canLoadMore="reelsCanLoadMore" :loadingMore="reelsInfiniteLoading" :getMedia="getMedia" :formatDate="formatDate" :getInitial="(p) => getInitial(p)" :likesCount="(p) => (likesByPost[p.id]?.count ?? 0)" :commentCount="(p) => commentCount(p.id)" @toggle-muted="toggleGlobalMute" @load-more="loadMoreReels" @like="toggleLike" @comments="openCommentsFromFeed" @share="sharePost" />
          <div ref="reelsLoadMoreRef" class="load-more" v-if="reelsCanLoadMore && !loading">{{ reelsInfiniteLoading ? "Loading more reels…" : "Scroll for more reels…" }}</div>
          <section v-for="post in reelsVisible.filter((p) => commentsOpenByPost[p.id])" :key="'reel-comments-' + post.id" class="post comments-shell glassy">
            <header class="post-head compactHead">
              <div class="avatar">{{ getInitial(post) }}</div>
              <div class="who">
                <div class="name">{{ displayPostUser(post) }}</div>
                <div class="time">Comments</div>
              </div>
              <button class="x" @click="toggleComments(post.id)" aria-label="Close comments">✕</button>
            </header>
            <CommentsPanel :post-id="post.id" @changed="handleCommentsChanged(post.id)" />
          </section>
        </section>

        <!-- FOLLOWING MODE -->
        <section v-else-if="feedMode === 'following'" class="feed following">
          <template v-if="loading"><div class="state">Loading…</div></template>
          <div v-else-if="sortedFilteredPosts.length === 0" class="state">
            <div class="state-emoji">📸</div>
            <div class="state-title">No posts yet</div>
            <div class="state-sub">Be the first to post.</div>
          </div>
          <article v-else v-for="post in followingPosts" :key="'f-' + post.id" class="post glassy">
            <header class="post-head">
              <div class="avatar">{{ getInitial(post) }}</div>
              <div class="who">
                <div class="name">{{ displayPostUser(post) }}</div>
                <div class="time">{{ formatDate(post.created_at) }}</div>
              </div>
              <div class="postPills">
                <span class="miniPostPill" v-if="post.video_url">VIDEO</span>
                <span class="miniPostPill" v-else-if="post.image_url">IMAGE</span>
                <span class="miniPostPill ghostPill" v-else>TEXT</span>
              </div>
            </header>
            <div v-if="post.caption" class="text">{{ post.caption }}</div>
            <img v-if="post.image_url" class="media" :src="getMedia(post.image_url)" loading="lazy" alt="Post image" />
            <video v-if="post.video_url" class="media" :src="getMedia(post.video_url)" controls playsinline preload="metadata"></video>
            <div class="actions">
              <button class="action-btn" :class="{ active: likesByPost[post.id]?.likedByMe }" :disabled="likeBusyByPost[post.id]" @click="toggleLike(post)">❤️ <span class="label">{{ likesByPost[post.id]?.count ?? 0 }}</span></button>
              <button class="action-btn" @click="toggleComments(post.id)">💬 <span class="label">{{ commentCount(post.id) }}</span></button>
              <button class="action-btn" @click="toggleSavePost(post)">💾 <span class="label">{{ isSaved(post.id) ? "Saved" : "Save" }}</span></button>
              <button class="action-btn" @click="togglePinPost(post)">📌 <span class="label">{{ isPinned(post.id) ? "Pinned" : "Pin" }}</span></button>
              <div class="spacer"></div>
              <button class="action-btn ghost" @click="sharePost(post)">🔗 <span class="label">Share</span></button>
              <button class="action-btn ghost" @click="copyPostText(post)">📋 <span class="label">Copy</span></button>
            </div>
            <CommentsPanel v-if="commentsOpenByPost[post.id]" :post-id="post.id" @changed="handleCommentsChanged(post.id)" />
          </article>
        </section>

        <!-- FOR YOU MODE -->
        <section v-else class="feed tiktok">
          <template v-if="loading"><div class="state">Loading…</div></template>
          <div v-else-if="forYouPosts.length === 0" class="state">
            <div class="state-emoji">🎬</div>
            <div class="state-title">No videos yet</div>
            <div class="state-sub">Post a video and it will autoplay here.</div>
          </div>
          <TikTokFeed v-else :items="visiblePosts" mode="foryou" :globalMuted="globalMuted" :canLoadMore="canLoadMore" :loadingMore="infiniteLoading" :getMedia="getMedia" :formatDate="formatDate" :getInitial="(p) => getInitial(p)" :likesCount="(p) => (likesByPost[p.id]?.count ?? 0)" :commentCount="(p) => commentCount(p.id)" @toggle-muted="toggleGlobalMute" @load-more="loadMore" @like="toggleLike" @comments="openCommentsFromFeed" @share="sharePost" />
          <div ref="loadMoreRef" class="load-more" v-if="canLoadMore && !loading">{{ infiniteLoading ? "Loading more videos…" : "Scroll for more videos…" }}</div>
          <section v-for="post in visiblePosts.filter((p) => commentsOpenByPost[p.id])" :key="'fy-comments-' + post.id" class="post comments-shell glassy">
            <header class="post-head compactHead">
              <div class="avatar">{{ getInitial(post) }}</div>
              <div class="who">
                <div class="name">{{ displayPostUser(post) }}</div>
                <div class="time">Comments</div>
              </div>
              <button class="x" @click="toggleComments(post.id)" aria-label="Close comments">✕</button>
            </header>
            <CommentsPanel :post-id="post.id" @changed="handleCommentsChanged(post.id)" />
          </section>
        </section>

        <!-- ACTIVITY FEED -->
        <section v-if="activityFeed.length" class="panel glassy">
          <div class="panel-head">
            <div class="panel-title">📝 Activity Feed</div>
            <button class="btn ghostBtn" @click="clearActivity">Clear</button>
          </div>
          <div class="rooms-messages">
            <div v-for="(a, i) in activityFeed" :key="'activity-' + (a.created_at || i)" class="rm">
              <div class="rm-top">
                <span class="rm-user">{{ a.title }}</span>
                <span class="rm-time">{{ formatDate(a.created_at) }}</span>
              </div>
              <div class="rm-text">{{ a.text }}</div>
            </div>
          </div>
        </section>
      </main>

      <!-- CHAT DRAWER -->
      <aside class="chatDrawer" :class="{ open: chatOpen }">
        <section class="panel chatPanel glassy">
          <div class="panel-head">
            <div class="panel-title">💬 Chat</div>
            <button class="btn" @click="toggleChat">{{ chatOpen ? "Close" : "Open" }}</button>
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
              <div v-for="(m, i) in chatMessages" :key="'cm-' + (m.id || m.created_at || i)" class="chat-msg">
                <strong>{{ m.from }}:</strong> {{ m.text }}
              </div>
            </div>
            <div class="chat-input">
              <input v-model="chatText" placeholder="Type message…" @keydown.enter.prevent="sendChat" aria-label="Chat message" />
              <button class="btn btn-primary" @click="sendChat">Send</button>
            </div>
          </div>
        </section>
      </aside>

      <!-- INCOMING CALL POPUP -->
      <div v-if="incomingCall" class="modal-backdrop" @click.self="rejectIncoming">
        <div class="modal glassy">
          <div class="modal-title">Incoming {{ incomingCall.kind === "video" ? "Video" : "Audio" }} Call</div>
          <div class="modal-sub">From <span class="pill">{{ incomingCall.from?.username || incomingCall.fromName || ("User #" + incomingCall.fromUserId) }}</span></div>
          <div class="modal-actions">
            <button class="btn danger" @click="rejectIncoming">Reject</button>
            <button class="btn btn-primary" @click="acceptIncoming">Accept</button>
          </div>
          <div class="tiny muted mt10">Tip: keep Dashboard open on both devices for best reliability.</div>
        </div>
      </div>

      <!-- CALLING TOAST -->
      <div v-if="callingToast" class="toast glassy">
        <span class="toast-dot"></span>
        {{ callingToast }}
        <button class="mini-x" @click="cancelCall" aria-label="Cancel call">✕</button>
      </div>

      <!-- QUICK CREATE SHEET -->
      <transition name="fade">
        <div v-if="quickCreateOpen" class="quickCreateBackdrop" @click.self="closeQuickCreate">
          <div class="quickCreateSheet glassy">
            <div class="quickCreateHead">
              <div>
                <div class="panel-title">⚡ Create instantly</div>
                <div class="tiny muted">Post, call, room, live, and sync even when offline.</div>
              </div>
              <button class="mini-x" @click="closeQuickCreate" aria-label="Close">✕</button>
            </div>
            <div class="quickCreateGrid">
              <button class="quickCreateCard" @click="useQuickAction('post')">✍️ Text Post</button>
              <button class="quickCreateCard" @click="useQuickAction('photo')">🖼️ Photo Post</button>
              <button class="quickCreateCard" @click="useQuickAction('reel')">🎞️ Reel</button>
              <button class="quickCreateCard" @click="useQuickAction('call')">📞 Quick Call</button>
              <button class="quickCreateCard" @click="useQuickAction('room')">🎧 Start Room</button>
              <button class="quickCreateCard" @click="useQuickAction('live')">🔴 Go Live</button>
              <button class="quickCreateCard" @click="useQuickAction('saved')">💾 Saved</button>
              <button class="quickCreateCard" @click="useQuickAction('offline')">{{ isNetworkOnline ? "☁️ Force Queue Draft" : "📦 Queue Offline Post" }}</button>
            </div>
            <div v-if="offlineQueueCount" class="quickQueueBar">
              <span>Queued posts: {{ offlineQueueCount }}</span>
              <button class="btn ghostBtn" @click="flushOfflineQueue">Sync now</button>
            </div>
          </div>
        </div>
      </transition>

      <!-- BOTTOM NAV -->
      <nav class="bottomNav eliteBottomNav">
        <button class="bn" :class="{ on: isHomeActive }" @click="goHome">
          <span class="bnI">🏠</span><span class="bnT">Home</span>
        </button>
        <button class="bn" @click="goInbox">
          <span class="bnI">💬</span><span class="bnT">Inbox</span>
        </button>
        <button class="bn createBn" @click="openQuickCreate()">
          <span class="createCore">＋</span>
        </button>
        <button class="bn" :class="{ on: feedMode === 'live' }" @click="goLiveTab">
          <span class="bnI">🔴</span><span class="bnT">Live</span>
        </button>
        <button class="bn" @click="goProfile">
          <span class="bnI">👤</span><span class="bnT">Profile</span>
        </button>
      </nav>
    </div>
  </Layout>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from "vue"
import { useRouter } from "vue-router"
import Layout from "../components/Layout.vue"
import TikTokFeed from "../components/TikTokFeed.vue"
import CommentsPanel from "../components/Comments.vue"

// =========================
// SOCKET (singleton from your project)
// =========================
import socket from "../services/socket.js"

// =========================
// CONFIG
// =========================
const router = useRouter()
const apiUrl = (import.meta.env.VITE_API_URL || "").trim()

// =========================
// AUTH & USER (reactive, from localStorage)
// =========================
const me = ref(null)
const token = ref("")

function refreshAuth() {
  try {
    me.value = JSON.parse(localStorage.getItem("user") || "null")
  } catch {
    me.value = null
  }
  token.value = localStorage.getItem("token") || ""
}

refreshAuth() // initial load

const meName = computed(() => me.value?.display_name || me.value?.username || "You")
const myInitial = computed(() => String(meName.value || "Y").trim().charAt(0).toUpperCase() || "Y")
const myUserId = computed(() => String(me.value?.id || "").trim())
const isLoggedIn = computed(() => !!token.value && !!me.value?.id)

function getAuthHeaders() {
  return {
    "Content-Type": "application/json",
    ...(token.value ? { Authorization: `Bearer ${token.value}` } : {}),
  }
}

function logout() {
  localStorage.removeItem("token")
  localStorage.removeItem("user")
  me.value = null
  token.value = ""
  router.push("/login")
}

// =========================
// SOCKET STATE
// =========================
const socketConnected = ref(false)
const socketStatusNote = ref("")

// Store handler references for proper cleanup
const socketHandlers = {}

function onSocket(event, handler) {
  socketHandlers[event] = socketHandlers[event] || []
  socketHandlers[event].push(handler)
  socket.on(event, handler)
}

function offSocket(event, handler) {
  socket.off(event, handler)
  const handlers = socketHandlers[event] || []
  socketHandlers[event] = handlers.filter((h) => h !== handler)
}

function emitSocket(event, payload, callback) {
  if (callback) {
    socket.emit(event, payload, callback)
  } else {
    socket.emit(event, payload)
  }
}

function connectSocket() {
  if (socket.connected) {
    socketConnected.value = true
    return
  }
  socket.connect()
}

function reconnectSocket() {
  socketStatusNote.value = "Reconnecting socket…"
  socket.disconnect()
  socket.connect()
}

function cleanupSocket() {
  // Remove all tracked listeners
  for (const [event, handlers] of Object.entries(socketHandlers)) {
    for (const handler of handlers) {
      try { socket.off(event, handler) } catch (e) {
        if (import.meta.env.DEV) console.error(`[Socket] Failed to remove listener for "${event}":`, e)
      }
    }
  }
  Object.keys(socketHandlers).forEach((k) => delete socketHandlers[k])
}

// =========================
// POSTS
// =========================
const posts = ref([])
const loading = ref(true)
const posting = ref(false)
const postError = ref("")

function normalizePost(p) {
  const obj = p?.post && p?.reel ? p.post : p
  if (!obj || typeof obj !== "object") return null
  const id = Number(obj.id)
  if (!id || Number.isNaN(id)) return null
  return {
    id,
    user_id: obj.user_id ?? obj.userId ?? obj.user?.id ?? 0,
    caption: obj.caption ?? "",
    image_url: obj.image_url ?? obj.imageUrl ?? null,
    video_url: obj.video_url ?? obj.videoUrl ?? null,
    created_at: obj.created_at ?? obj.createdAt ?? new Date().toISOString(),
    display_name: obj.display_name ?? obj.displayName ?? "",
    username: obj.username ?? "",
    avatar_url: obj.avatar_url ?? obj.avatarUrl ?? "",
    comment_count: parseInt(obj.comment_count ?? obj.commentCount ?? 0, 10) || 0,
  }
}

function getMedia(url) {
  if (!url) return ""
  if (url.startsWith("http")) return url
  return `${apiUrl}${url}`
}

function displayPostUser(post) {
  return post?.display_name || post?.username || `User #${post?.user_id || "?"}`
}

function getInitial(postOrUser) {
  if (typeof postOrUser === "object" && postOrUser) {
    const name = postOrUser.display_name || postOrUser.username || postOrUser.name || postOrUser.email || String(postOrUser.user_id || postOrUser.id || "U")
    return String(name).trim().charAt(0).toUpperCase() || "U"
  }
  return String(postOrUser || "U").trim().charAt(0).toUpperCase() || "U"
}

async function fetchPosts() {
  loading.value = true
  postError.value = ""
  try {
    const res = await fetch(`${apiUrl}/posts`)
    const data = await res.json()
    if (!Array.isArray(data)) {
      posts.value = []
      postError.value = data?.error || "Failed to load posts"
      return
    }
    posts.value = data.map(normalizePost).filter(Boolean)
  } catch (e) {
    if (import.meta.env.DEV) console.error("[Posts] Fetch failed:", e)
    posts.value = []
    postError.value = "Failed to fetch posts"
  } finally {
    loading.value = false
  }
}

async function submitPost(formData) {
  if (!token.value) {
    alert("Login again to post.")
    return null
  }
  posting.value = true
  postError.value = ""
  try {
    const res = await fetch(`${apiUrl}/posts`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token.value}` },
      body: formData,
    })
    const data = await res.json()
    if (!res.ok) {
      postError.value = data?.error || "Post failed"
      return null
    }
    const clean = normalizePost(data)
    if (clean) posts.value.unshift(clean)
    return clean
  } catch (e) {
    if (import.meta.env.DEV) console.error("[Posts] Submit failed:", e)
    postError.value = "Post failed"
    return null
  } finally {
    posting.value = false
  }
}

async function submitReel(formData) {
  if (!token.value) {
    alert("Login again to post a reel.")
    return null
  }
  posting.value = true
  postError.value = ""
  try {
    const res = await fetch(`${apiUrl}/reels`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token.value}` },
      body: formData,
    })
    const data = await res.json()
    if (!res.ok) {
      postError.value = data?.error || "Reel failed"
      return null
    }
    const clean = normalizePost(data?.post || data)
    if (clean) posts.value.unshift(clean)
    return clean
  } catch (e) {
    if (import.meta.env.DEV) console.error("[Reels] Submit failed:", e)
    postError.value = "Reel failed"
    return null
  } finally {
    posting.value = false
  }
}

// =========================
// FEED
// =========================
const feedMode = ref("foryou")
const sortMode = ref("latest")
const postFilter = ref("all")
const search = ref("")
const globalMuted = ref(true)
const pageSize = ref(8)
const infiniteLoading = ref(false)
const reelsPageSize = ref(8)
const reelsInfiniteLoading = ref(false)

const feedModeLabel = computed(() => {
  const labels = { foryou: "For You", reels: "Reels", following: "Following", threads: "Threads", rooms: "Rooms", live: "Live", saved: "Saved", pinned: "Pinned" }
  return labels[feedMode.value] || "Feed"
})

const baseFiltered = computed(() => {
  const q = search.value.trim().toLowerCase()
  let list = [...(posts.value || [])]
  if (postFilter.value === "video") list = list.filter((p) => !!p.video_url)
  else if (postFilter.value === "image") list = list.filter((p) => !!p.image_url && !p.video_url)
  else if (postFilter.value === "text") list = list.filter((p) => !p.image_url && !p.video_url)
  if (q) list = list.filter((p) => {
    const text = `${p.caption || ""} ${displayPostUser(p)}`.toLowerCase()
    return text.includes(q)
  })
  return list
})

const sortedFilteredPosts = computed(() => {
  const list = [...baseFiltered.value]
  if (sortMode.value === "popular") return list.sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0))
  if (sortMode.value === "media") return list.sort((a, b) => {
    const am = a.video_url || a.image_url ? 1 : 0
    const bm = b.video_url || b.image_url ? 1 : 0
    if (bm !== am) return bm - am
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
  if (sortMode.value === "text") return list.sort((a, b) => {
    const at = !a.video_url && !a.image_url ? 1 : 0
    const bt = !b.video_url && !b.image_url ? 1 : 0
    if (bt !== at) return bt - at
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
  return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
})

const videoPosts = computed(() => sortedFilteredPosts.value.filter((p) => !!p.video_url))
const forYouPosts = computed(() => videoPosts.value)
const followingPosts = computed(() => sortedFilteredPosts.value.slice(0, 40))
const threadsPosts = computed(() => sortedFilteredPosts.value.slice(0, 60))
const reelsPosts = computed(() => videoPosts.value)
const visiblePosts = computed(() => forYouPosts.value.slice(0, pageSize.value))
const canLoadMore = computed(() => forYouPosts.value.length > visiblePosts.value.length)
const reelsVisible = computed(() => reelsPosts.value.slice(0, reelsPageSize.value))
const reelsCanLoadMore = computed(() => reelsPosts.value.length > reelsVisible.value.length)
const filteredBaseCount = computed(() => sortedFilteredPosts.value.length)

const trendingTags = computed(() => {
  const counts = new Map()
  ;(posts.value || []).forEach((p) => {
    const text = String(p.caption || "")
    const tags = text.match(/#[a-zA-Z0-9_]+/g) || []
    tags.forEach((tag) => { counts.set(tag, (counts.get(tag) || 0) + 1) })
  })
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([tag]) => tag)
})

function setFeedMode(mode) {
  feedMode.value = mode
}

function toggleGlobalMute() {
  globalMuted.value = !globalMuted.value
}

function loadMore() {
  if (!canLoadMore.value || infiniteLoading.value) return
  infiniteLoading.value = true
  pageSize.value += 6
  setTimeout(() => { infiniteLoading.value = false }, 160)
}

function loadMoreReels() {
  if (!reelsCanLoadMore.value || reelsInfiniteLoading.value) return
  reelsInfiniteLoading.value = true
  reelsPageSize.value += 6
  setTimeout(() => { reelsInfiniteLoading.value = false }, 160)
}

function applyTrendTag(tag) {
  search.value = tag
}

watch([feedMode, sortMode, postFilter], () => {
  pageSize.value = 8
  reelsPageSize.value = 8
})

// =========================
// LIKES
// =========================
const likesByPost = ref({})
const likeBusyByPost = ref({})

async function ensureLikeState(postId) {
  if (!token.value) return
  if (likesByPost.value[postId]) return
  try {
    const res = await fetch(`${apiUrl}/likes/${postId}`, { headers: getAuthHeaders() })
    const data = await res.json()
    if (!res.ok) return
    likesByPost.value = { ...likesByPost.value, [postId]: { count: data?.count ?? 0, likedByMe: !!data?.likedByMe } }
  } catch (e) {
    if (import.meta.env.DEV) console.error("[Likes] Failed to fetch state:", e)
  }
}

async function toggleLike(post) {
  const postId = post?.id
  if (!postId) return
  if (!token.value) { alert("Please login again to like posts."); return }
  await ensureLikeState(postId)
  const prev = likesByPost.value[postId] || { count: 0, likedByMe: false }
  const optimisticLiked = !prev.likedByMe
  const optimisticCount = Math.max(0, prev.count + (optimisticLiked ? 1 : -1))
  likesByPost.value = { ...likesByPost.value, [postId]: { count: optimisticCount, likedByMe: optimisticLiked } }
  likeBusyByPost.value = { ...likeBusyByPost.value, [postId]: true }
  try {
    const res = await fetch(`${apiUrl}/likes/${postId}/toggle`, { method: "POST", headers: getAuthHeaders() })
    const data = await res.json()
    if (!res.ok) { likesByPost.value = { ...likesByPost.value, [postId]: prev }; return }
    likesByPost.value = { ...likesByPost.value, [postId]: { count: data?.count ?? optimisticCount, likedByMe: !!data?.likedByMe } }
  } catch (e) {
    if (import.meta.env.DEV) console.error("[Likes] Toggle failed:", e)
    likesByPost.value = { ...likesByPost.value, [postId]: prev }
  } finally {
    likeBusyByPost.value = { ...likeBusyByPost.value, [postId]: false }
  }
}

// =========================
// COMMENTS
// =========================
const commentsOpenByPost = ref({})
const commentCountsByPost = ref({})

function commentCount(postId) {
  const liveCount = commentCountsByPost.value[postId]
  if (typeof liveCount === "number") return liveCount
  const post = posts.value?.find((p) => Number(p.id) === Number(postId))
  return Number(post?.comment_count || 0)
}

function toggleComments(postId) {
  const next = { ...commentsOpenByPost.value }
  if (next[postId]) delete next[postId]
  else next[postId] = true
  commentsOpenByPost.value = next
}

function openCommentsFromFeed(postId) {
  commentsOpenByPost.value = { ...commentsOpenByPost.value, [postId]: true }
}

async function handleCommentsChanged(postId) {
  try {
    const res = await fetch(`${apiUrl}/posts/${postId}/comments`, { headers: getAuthHeaders() })
    const data = await res.json()
    if (!res.ok) return
    const items = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : []
    commentCountsByPost.value = { ...commentCountsByPost.value, [postId]: items.length }
    const idx = posts.value.findIndex((p) => Number(p.id) === Number(postId))
    if (idx >= 0) posts.value[idx] = { ...posts.value[idx], comment_count: items.length }
  } catch (e) {
    if (import.meta.env.DEV) console.error("[Comments] Reload failed:", e)
  }
}

// =========================
// CALLS (with handler references for proper cleanup)
// =========================
const incomingCall = ref(null)
const callBusy = ref(false)
const callingToast = ref("")
const pendingRoomId = ref("")
const pendingKind = ref("audio")
const pendingUserId = ref("")
const pendingUserName = ref("")

const callHandlers = {
  onCallRinging: ({ roomId, kind } = {}) => {
    pendingRoomId.value = String(roomId || "")
    pendingKind.value = kind === "video" ? "video" : (kind || pendingKind.value || "audio")
    callingToast.value = `Calling ${pendingUserName.value || "user"}…`
    if (pendingRoomId.value) {
      router.push({ path: "/call", query: { roomId: pendingRoomId.value, role: "caller", mode: "caller", kind: pendingKind.value, toUserId: pendingUserId.value, name: pendingUserName.value || "User" } })
    }
  },
  onCallIncoming: (p) => { incomingCall.value = p || null },
  onCallAccepted: ({ roomId, kind } = {}) => {
    callingToast.value = ""
    callBusy.value = false
    if (roomId) pendingRoomId.value = String(roomId)
    if (pendingRoomId.value) {
      router.push({ path: "/call", query: { roomId: pendingRoomId.value, role: "caller", mode: "caller", kind: kind === "video" ? "video" : (kind || pendingKind.value || "audio"), toUserId: pendingUserId.value, name: pendingUserName.value || "User" } })
    }
  },
  onCallEnded: () => { resetCallState() },
  onCallBusy: ({ message } = {}) => { resetCallState(); alert(message || "User is busy.") },
  onCallError: ({ message } = {}) => { resetCallState(); incomingCall.value = null; alert(message || "Call error") },
}

function resetCallState() {
  callingToast.value = ""
  callBusy.value = false
  incomingCall.value = null
  pendingRoomId.value = ""
  pendingUserId.value = ""
  pendingUserName.value = ""
}

function registerCallListeners() {
  onSocket("call:ringing", callHandlers.onCallRinging)
  onSocket("call:incoming", callHandlers.onCallIncoming)
  onSocket("call:accepted", callHandlers.onCallAccepted)
  onSocket("call:ended", callHandlers.onCallEnded)
  onSocket("call:busy", callHandlers.onCallBusy)
  onSocket("call:error", callHandlers.onCallError)
}

function unregisterCallListeners() {
  offSocket("call:ringing", callHandlers.onCallRinging)
  offSocket("call:incoming", callHandlers.onCallIncoming)
  offSocket("call:accepted", callHandlers.onCallAccepted)
  offSocket("call:ended", callHandlers.onCallEnded)
  offSocket("call:busy", callHandlers.onCallBusy)
  offSocket("call:error", callHandlers.onCallError)
}

function startCall(user, kind = "audio") {
  if (!socket) { alert("Connection not ready."); return }
  if (!me.value?.id) { alert("Login again to call."); return }
  if (!user?.id) { alert("User not found."); return }
  if (!isOnline(user.id)) { alert("User is offline."); return }
  if (callBusy.value) { alert("You already have a call in progress."); return }
  const displayName = user?.display_name || user?.username || `User #${user.id}`
  callBusy.value = true
  pendingKind.value = kind === "video" ? "video" : "audio"
  pendingUserId.value = String(user.id)
  pendingUserName.value = displayName
  callingToast.value = `Calling ${displayName}…`
  pendingRoomId.value = ""
  emitSocket("call:request", { toUserId: String(user.id), kind: pendingKind.value })
}

function cancelCall() {
  if (pendingRoomId.value) emitSocket("call:cancel", { roomId: pendingRoomId.value })
  resetCallState()
}

function acceptIncoming() {
  if (!incomingCall.value) return
  const roomId = String(incomingCall.value.roomId || "")
  const kind = incomingCall.value.kind === "video" ? "video" : "audio"
  const callerName = incomingCall.value.fromName || "User"
  emitSocket("call:accept", { roomId })
  router.push({ path: "/call", query: { roomId, role: "receiver", mode: "receiver", kind, name: callerName } })
  incomingCall.value = null
}

function rejectIncoming() {
  if (!incomingCall.value) return
  emitSocket("call:reject", { roomId: incomingCall.value.roomId })
  incomingCall.value = null
}

// =========================
// CHAT
// =========================
const chatOpen = ref(false)
const chatRoom = ref("global")
const chatText = ref("")
const chatMessages = ref([])

const chatHandlers = {
  onReceiveMessage: (msg) => {
    chatMessages.value.push(msg)
    nextTick(() => scrollChatToBottom())
  },
}

function registerChatListeners() {
  onSocket("receive-message", chatHandlers.onReceiveMessage)
}

function unregisterChatListeners() {
  offSocket("receive-message", chatHandlers.onReceiveMessage)
}

function toggleChat() {
  chatOpen.value = !chatOpen.value
}

function selectChat(room) {
  chatRoom.value = room
  if (room === "callrooms") return
  emitSocket("join-room", room)
  chatMessages.value.push({ from: "system", text: `Joined room: ${room}`, created_at: new Date().toISOString() })
  nextTick(() => scrollChatToBottom())
}

function sendChat() {
  if (chatRoom.value === "callrooms") return
  if (!chatText.value.trim()) return
  emitSocket("send-room-message", { room: chatRoom.value, from: meName.value || "me", text: chatText.value })
  chatText.value = ""
}

function scrollChatToBottom() {
  if (chatBoxRef.value) chatBoxRef.value.scrollTop = chatBoxRef.value.scrollHeight
  if (roomsChatBoxRef.value) roomsChatBoxRef.value.scrollTop = roomsChatBoxRef.value.scrollHeight
}

// =========================
// PRESENCE
// =========================
const onlinePairs = ref([])
const liveStreams = ref([])

const onlineCount = computed(() => Array.isArray(onlinePairs.value) ? onlinePairs.value.length : 0)

function isOnline(userId) {
  const id = String(userId)
  return onlinePairs.value.some(([uid]) => String(uid) === id)
}

const presenceHandlers = {
  onLiveList: (streams) => { liveStreams.value = Array.isArray(streams) ? streams : [] },
  onPresenceList: ({ onlineUserIds } = {}) => {
    if (!Array.isArray(onlineUserIds)) return
    onlinePairs.value = onlineUserIds.map((id) => [String(id), ""])
  },
  onOnlineUsers: (pairs) => { onlinePairs.value = Array.isArray(pairs) ? pairs : [] },
}

function registerPresenceListeners() {
  onSocket("live-list", presenceHandlers.onLiveList)
  onSocket("presence:list", presenceHandlers.onPresenceList)
  onSocket("online-users", presenceHandlers.onOnlineUsers)
}

function unregisterPresenceListeners() {
  offSocket("live-list", presenceHandlers.onLiveList)
  offSocket("presence:list", presenceHandlers.onPresenceList)
  offSocket("online-users", presenceHandlers.onOnlineUsers)
}

function safeRegisterOnline() {
  if (!myUserId.value) return
  const username = meName.value || "User"
  emitSocket("user:online", { userId: myUserId.value, username })
  emitSocket("register-user", { id: myUserId.value, username })
  emitSocket("get-live-list")
  emitSocket("presence:get")
  emitSocket("callroom:list:get")
}

function requestPresenceUpdate() {
  emitSocket("presence:get")
}

function requestLiveList() {
  emitSocket("get-live-list")
}

// =========================
// PEOPLE
// =========================
const people = ref([])
const peopleLoading = ref(false)
const peopleError = ref("")
const peopleOpen = ref(true)

const filteredPeople = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return people.value
  return people.value.filter((u) => {
    const text = `${u.display_name || ""} ${u.username || ""} ${u.email || ""}`.toLowerCase()
    return text.includes(q)
  })
})

async function fetchPeople() {
  if (!token.value) return
  peopleLoading.value = true
  peopleError.value = ""
  try {
    const res = await fetch(`${apiUrl}/users`, { headers: getAuthHeaders() })
    const data = await res.json()
    if (!res.ok) {
      peopleError.value = data?.error || "Failed to load users"
      people.value = []
      return
    }
    people.value = Array.isArray(data) ? data : []
  } catch (e) {
    if (import.meta.env.DEV) console.error("[People] Fetch failed:", e)
    peopleError.value = "Failed to load users"
    people.value = []
  } finally {
    peopleLoading.value = false
  }
}

function displayUserName(u) {
  return u?.display_name || u?.username || u?.name || u?.email || `User #${u?.id || "?"}`
}

function togglePeople() {
  peopleOpen.value = !peopleOpen.value
}

// =========================
// CALL ROOMS
// =========================
const callRooms = ref([])
const callRoomName = ref("")
const callRoomKind = ref("audio")
const creatingCallRoom = ref(false)
const callRoomsError = ref("")
const callRoomsLoading = ref(false)

function normalizeCallRoom(room) {
  if (!room || typeof room !== "object") return null
  return {
    roomId: String(room.roomId || room.id || ""),
    name: String(room.name || room.roomId || room.id || "Untitled Room"),
    kind: room.kind === "video" ? "video" : "audio",
    participantCount: Number(room.participantCount ?? room.count ?? room.users?.length ?? 0),
    users: Array.isArray(room.users) ? room.users : [],
  }
}

const callRoomHandlers = {
  onCallRoomList: (list) => {
    callRoomsLoading.value = false
    callRooms.value = Array.isArray(list) ? list.map(normalizeCallRoom).filter(Boolean) : []
  },
  onCallRoomCreated: (payload = {}) => {
    creatingCallRoom.value = false
    callRoomName.value = ""
    const roomId = payload?.roomId || payload?.room?.roomId
    if (roomId) {
      router.push(`/room-call?roomId=${encodeURIComponent(roomId)}`)
    } else {
      refreshCallRooms()
    }
  },
  onCallRoomState: (payload = {}) => {
    const roomId = String(payload?.roomId || "")
    if (!roomId) { refreshCallRooms(); return }
    callRooms.value = callRooms.value.map((room) => {
      if (room.roomId !== roomId) return room
      return normalizeCallRoom({ ...room, users: payload.users || room.users || [], participantCount: Array.isArray(payload.users) ? payload.users.length : room.participantCount })
    })
  },
  onCallRoomError: ({ message } = {}) => {
    creatingCallRoom.value = false
    callRoomsLoading.value = false
    callRoomsError.value = message || "Call room error"
  },
}

function registerCallRoomListeners() {
  onSocket("callroom:list", callRoomHandlers.onCallRoomList)
  onSocket("callroom:created", callRoomHandlers.onCallRoomCreated)
  onSocket("callroom:state", callRoomHandlers.onCallRoomState)
  onSocket("callroom:user-joined", refreshCallRooms)
  onSocket("callroom:user-left", refreshCallRooms)
  onSocket("callroom:error", callRoomHandlers.onCallRoomError)
}

function unregisterCallRoomListeners() {
  offSocket("callroom:list", callRoomHandlers.onCallRoomList)
  offSocket("callroom:created", callRoomHandlers.onCallRoomCreated)
  offSocket("callroom:state", callRoomHandlers.onCallRoomState)
  offSocket("callroom:user-joined", refreshCallRooms)
  offSocket("callroom:user-left", refreshCallRooms)
  offSocket("callroom:error", callRoomHandlers.onCallRoomError)
}

function refreshCallRooms() {
  callRoomsLoading.value = true
  callRoomsError.value = ""
  emitSocket("callroom:list:get", {}, (res) => {
    callRoomsLoading.value = false
    if (res?.error) { callRoomsError.value = res.error; return }
    if (Array.isArray(res?.rooms)) callRooms.value = res.rooms.map(normalizeCallRoom).filter(Boolean)
  })
  setTimeout(() => { callRoomsLoading.value = false }, 1200)
}

function createCallRoom() {
  const payload = { name: (callRoomName.value || "").trim() || `Room ${Date.now().toString().slice(-4)}`, kind: callRoomKind.value === "video" ? "video" : "audio" }
  creatingCallRoom.value = true
  callRoomsError.value = ""
  emitSocket("callroom:create", payload)
}

function createFastRoom(username) {
  callRoomKind.value = "video"
  callRoomName.value = `${username || "User"}'s Elite Room`
  createCallRoom()
}

function joinCallRoom(room) {
  const roomId = String(room?.roomId || "")
  if (!roomId) return
  router.push(`/room-call?roomId=${encodeURIComponent(roomId)}`)
}

// =========================
// STORAGE / LOCAL STATE
// =========================
const DASH_PREFS_KEY = "pulse_dashboard_prefs_v3"
const DASH_DRAFT_KEY = "pulse_dashboard_draft_v3"
const DASH_SAVED_POSTS_KEY = "pulse_dashboard_saved_posts_v1"
const DASH_PINNED_POSTS_KEY = "pulse_dashboard_pinned_posts_v1"
const DASH_ACTIVITY_KEY = "pulse_dashboard_activity_v2"
const DASH_OFFLINE_QUEUE_KEY = "pulse_dashboard_offline_queue_v1"
const DASH_STREAK_KEY = "pulse_dashboard_streak_v1"
const DASH_FOCUS_KEY = "pulse_dashboard_focus_v1"

function readJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) }
  catch { return fallback }
}

function persist(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) }
  catch (e) { if (import.meta.env.DEV) console.error(`[Storage] Failed to persist ${key}:`, e) }
}

const savedPrefs = readJson(DASH_PREFS_KEY, {})
const savedPostIds = ref(Array.isArray(readJson(DASH_SAVED_POSTS_KEY, [])) ? readJson(DASH_SAVED_POSTS_KEY, []).map(Number) : [])
const pinnedPostIds = ref(Array.isArray(readJson(DASH_PINNED_POSTS_KEY, [])) ? readJson(DASH_PINNED_POSTS_KEY, []).map(Number) : [])
const activityFeed = ref(Array.isArray(readJson(DASH_ACTIVITY_KEY, [])) ? readJson(DASH_ACTIVITY_KEY, []) : [])
const offlineQueue = ref(Array.isArray(readJson(DASH_OFFLINE_QUEUE_KEY, [])) ? readJson(DASH_OFFLINE_QUEUE_KEY, []) : [])
const draftSavedNote = ref("")

function persistPrefs() {
  persist(DASH_PREFS_KEY, { feedMode: feedMode.value, search: search.value, globalMuted: globalMuted.value, sortMode: sortMode.value, postFilter: postFilter.value })
}

function persistSaved() { persist(DASH_SAVED_POSTS_KEY, savedPostIds.value) }
function persistPinned() { persist(DASH_PINNED_POSTS_KEY, pinnedPostIds.value) }
function persistActivity() { persist(DASH_ACTIVITY_KEY, activityFeed.value.slice(0, 40)) }
function persistOfflineQueue() { persist(DASH_OFFLINE_QUEUE_KEY, offlineQueue.value.slice(0, 30)) }

function addActivity(title, text) {
  activityFeed.value = [{ title, text, created_at: new Date().toISOString() }, ...activityFeed.value].slice(0, 40)
  persistActivity()
}

function clearActivity() {
  activityFeed.value = []
  persistActivity()
}

function isSaved(postId) { return savedPostIds.value.includes(Number(postId)) }
function isPinned(postId) { return pinnedPostIds.value.includes(Number(postId)) }

function toggleSavePost(post) {
  const id = Number(post?.id)
  if (!id) return
  if (isSaved(id)) {
    savedPostIds.value = savedPostIds.value.filter((x) => x !== id)
    addActivity("Saved", `Removed post #${id} from saved`)
  } else {
    savedPostIds.value = [id, ...savedPostIds.value].slice(0, 300)
    addActivity("Saved", `Saved post #${id}`)
  }
  persistSaved()
}

function togglePinPost(post) {
  const id = Number(post?.id)
  if (!id) return
  if (isPinned(id)) {
    pinnedPostIds.value = pinnedPostIds.value.filter((x) => x !== id)
    addActivity("Pinned", `Unpinned post #${id}`)
  } else {
    pinnedPostIds.value = [id, ...pinnedPostIds.value].slice(0, 100)
    addActivity("Pinned", `Pinned post #${id}`)
  }
  persistPinned()
}

function queuePostDraft(captionText, imgFile, vidFile, reason = "offline") {
  const item = { id: `draft_${Date.now()}`, caption: String(captionText || ""), created_at: new Date().toISOString(), image_name: imgFile?.name || "", video_name: vidFile?.name || "", reason }
  offlineQueue.value = [item, ...offlineQueue.value].slice(0, 30)
  persistOfflineQueue()
  draftSavedNote.value = reason === "offline" ? "Offline: your post was queued and will sync when internet returns" : "Draft queued for sync"
  addActivity("Offline Queue", "Saved a queued post draft")
}

function clearDraft() {
  caption.value = ""
  imageFile.value = null
  videoFile.value = null
  draftSavedNote.value = "Draft cleared"
  try { localStorage.removeItem(DASH_DRAFT_KEY) } catch (e) { if (import.meta.env.DEV) console.error("[Storage] Failed to clear draft:", e) }
}

function restoreDraft() {
  try {
    const saved = JSON.parse(localStorage.getItem(DASH_DRAFT_KEY) || "{}")
    if (saved?.caption) { caption.value = saved.caption; draftSavedNote.value = "Recovered saved draft" }
  } catch (e) { if (import.meta.env.DEV) console.error("[Storage] Failed to restore draft:", e) }
}

function saveDraft(text) {
  try { localStorage.setItem(DASH_DRAFT_KEY, JSON.stringify({ caption: text || "" })) }
  catch (e) { if (import.meta.env.DEV) console.error("[Storage] Failed to save draft:", e) }
}

// =========================
// CREATOR
// =========================
const initialStreak = readJson(DASH_STREAK_KEY, { days: 1, lastOpenDate: "" })
const initialFocus = readJson(DASH_FOCUS_KEY, { focusMode: false })

const focusMode = ref(!!initialFocus.focusMode)
const streak = ref({ days: Math.max(1, Number(initialStreak?.days || 1)), lastOpenDate: initialStreak?.lastOpenDate || "" })

const todayStreak = computed(() => Math.max(1, Number(streak.value.days || 1)))

const moodGreeting = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return "Good morning."
  if (h < 18) return "Good afternoon."
  return "Good evening."
})

const totalLikesCount = computed(() => Object.values(likesByPost.value).reduce((sum, item) => sum + Number(item?.count || 0), 0))
const totalCommentCount = computed(() => posts.value.reduce((sum, p) => sum + Number(commentCount(p.id) || 0), 0))

const creatorScore = computed(() =>
  (posts.value?.length || 0) * 10 +
  (videoPosts.value?.length || 0) * 12 +
  (savedPostIds.value?.length || 0) * 4 +
  (pinnedPostIds.value?.length || 0) * 5 +
  (totalLikesCount.value || 0) * 2 +
  (totalCommentCount.value || 0) * 3 +
  (onlineCount.value || 0) * 2
)

const creatorInsight = computed(() => {
  const vCount = videoPosts.value?.length || 0
  const sCount = savedPostIds.value?.length || 0
  const pCount = posts.value?.length || 0
  if (vCount >= 3) return "Your video engine is warming up. Keep feeding Reels and live rooms."
  if (sCount >= 5) return "You are curating your own content library like a creator operating system."
  if (pCount >= 5) return "Momentum is building. Add more reels and room activity for a stronger growth loop."
  return "Post more consistently, create one room, and go live once to unlock the next level of engagement."
})

const quickStatusText = computed(() => {
  if (onlineCount.value > 0) return "Live world active"
  if ((posts.value?.length || 0) > 0) return "Creator mode online"
  return "Ready to build"
})

function updateDailyStreak() {
  const today = `${new Date().getFullYear()}-${new Date().getMonth() + 1}-${new Date().getDate()}`
  const prev = streak.value.lastOpenDate || ""
  if (!prev) { streak.value = { days: 1, lastOpenDate: today } }
  else if (prev !== today) {
    const prevDate = new Date(prev)
    const now = new Date(today)
    const diff = Math.round((now - prevDate) / 86400000)
    if (diff === 1) streak.value = { days: Math.max(1, Number(streak.value.days || 1) + 1), lastOpenDate: today }
    else if (diff > 1) streak.value = { days: 1, lastOpenDate: today }
  }
  persist(DASH_STREAK_KEY, streak.value)
}

function toggleFocusMode() {
  focusMode.value = !focusMode.value
  persist(DASH_FOCUS_KEY, { focusMode: focusMode.value })
}

// =========================
// LOCAL STATE
// =========================
const toolsOpen = ref(false)
const studioOpen = ref(false)
const turnNote = ref("")
const isNetworkOnline = ref(typeof navigator !== "undefined" ? navigator.onLine : true)
const isSyncingQueue = ref(false)
const offlineQueueCount = computed(() => Array.isArray(offlineQueue.value) ? offlineQueue.value.length : 0)

// =========================
// DOM REFS
// =========================
const composerRef = ref(null)
const searchRef = ref(null)
const chatBoxRef = ref(null)
const roomsChatBoxRef = ref(null)
const loadMoreRef = ref(null)
const reelsLoadMoreRef = ref(null)

// =========================
// FILE INPUTS
// =========================
const imageFile = ref(null)
const videoFile = ref(null)

// =========================
// OBSERVERS
// =========================
let videoObserver = null
let loadMoreObserver = null
let reelsLoadMoreObserver = null

// =========================
// COMPUTED DERIVED
// =========================
const savedPosts = computed(() => {
  const ids = new Set(savedPostIds.value)
  return posts.value.filter((p) => ids.has(Number(p.id)))
})

const pinnedPosts = computed(() => {
  const ids = new Set(pinnedPostIds.value)
  return posts.value.filter((p) => ids.has(Number(p.id)))
})

const spotlightTag = computed(() => trendingTags.value[0] || "")
const spotlightPerson = computed(() => {
  const onlineUser = people.value.find((u) => isOnline(u.id))
  return onlineUser ? displayUserName(onlineUser) : meName.value
})

const smartLaunchCards = computed(() => [
  { id: "post", label: "✍️ Create a post" },
  { id: "room", label: callRooms.value.length ? "📞 Join a room" : "📞 Start a room" },
  { id: "live", label: liveStreams.value.length ? "🔴 Watch live" : "🔴 Start live" },
  { id: "saved", label: savedPostIds.value.length ? "💾 Open saved" : "💾 Build saved list" },
  { id: "reels", label: videoPosts.value.length ? "🎞️ Open reels" : "🎞️ Create first reel" },
  { id: "focus", label: focusMode.value ? "🧘 Exit focus mode" : "🧘 Enter focus mode" },
])

// =========================
// THREAD MEDIA
// =========================
const threadMediaOpen = ref({})

function toggleThreadMedia(postId) {
  const next = { ...threadMediaOpen.value }
  if (next[postId]) delete next[postId]
  else next[postId] = true
  threadMediaOpen.value = next
}

// =========================
// COMPOSER
// =========================
const caption = ref("")
const captionLength = computed(() => String(caption.value || "").length)

function focusComposer() {
  composerRef.value?.focus?.()
}

function onPickImage(e) {
  imageFile.value = e.target.files?.[0] || null
}

function onPickVideo(e) {
  videoFile.value = e.target.files?.[0] || null
}

async function handleSubmitPost() {
  if (!isLoggedIn.value) { alert("Login again to post."); return }
  if (!caption.value.trim() && !imageFile.value && !videoFile.value) return
  if (!isNetworkOnline.value) {
    queuePostDraft(caption.value, imageFile.value, videoFile.value, "offline")
    clearDraft()
    return
  }
  const form = new FormData()
  form.append("caption", caption.value || "")
  if (imageFile.value) form.append("image", imageFile.value)
  if (videoFile.value) form.append("video", videoFile.value)
  let result
  if (feedMode.value === "reels") {
    if (!videoFile.value) { alert("Reels require a VIDEO. Pick a video file."); return }
    result = await submitReel(form)
  } else {
    result = await submitPost(form)
  }
  if (result) {
    clearDraft()
    draftSavedNote.value = feedMode.value === "reels" ? "Reel posted successfully" : "Posted successfully"
    addActivity(feedMode.value === "reels" ? "Reel" : "Post", "Created new content")
    await nextTick()
    setupVideoObserver()
  }
}

// =========================
// OFFLINE QUEUE
// =========================
async function flushOfflineQueue() {
  if (!isNetworkOnline.value || !isLoggedIn.value || !offlineQueue.value?.length || posting.value || isSyncingQueue.value) return
  isSyncingQueue.value = true
  try {
    const queue = [...offlineQueue.value]
    const stillPending = []
    for (const item of queue) {
      const form = new FormData()
      form.append("caption", item.caption || "")
      try {
        const res = await fetch(`${apiUrl}/posts`, { method: "POST", headers: { Authorization: `Bearer ${token.value}` }, body: form })
        const data = await res.json()
        if (!res.ok) { stillPending.push(item); continue }
        const clean = normalizePost(data)
        if (clean) posts.value.unshift(clean)
      } catch { stillPending.push(item) }
    }
    offlineQueue.value = stillPending
    persistOfflineQueue()
    if (!stillPending.length) draftSavedNote.value = "Queued posts synced"
  } finally {
    isSyncingQueue.value = false
  }
}

// =========================
// QUICK CREATE
// =========================
const quickCreateOpen = ref(false)
const quickCreateIntent = ref("post")

function openQuickCreate(intent = "post") {
  quickCreateIntent.value = intent
  quickCreateOpen.value = true
}

function closeQuickCreate() {
  quickCreateOpen.value = false
}

function useQuickAction(action) {
  closeQuickCreate()
  switch (action) {
    case "post": setFeedMode("foryou"); focusComposer(); break
    case "photo": setFeedMode("foryou"); focusComposer(); draftSavedNote.value = "Tap the image picker in composer to attach a photo"; break
    case "reel": setFeedMode("reels"); focusComposer(); draftSavedNote.value = "Tap the video picker in composer to attach a reel"; break
    case "call": callRooms.value.length ? joinCallRoom(callRooms.value[0]) : createFastRoom(meName.value); break
    case "room": createFastRoom(meName.value); break
    case "live": startLive(); break
    case "saved": setFeedMode("saved"); break
    case "offline": queuePostDraft(caption.value, imageFile.value, videoFile.value, isNetworkOnline.value ? "manual" : "offline"); break
  }
}

// =========================
// LIVE
// =========================
function startLive() {
  if (!isLoggedIn.value) { alert("Login again to go live."); return }
  const liveId = `live-${me.value?.id || Math.random().toString(36).slice(2, 8)}-${Date.now().toString().slice(-4)}`
  addActivity("Live", `Started live setup: ${liveId}`)
  router.push(`/live?mode=host&liveId=${encodeURIComponent(liveId)}`)
}

function joinLive(liveId) {
  addActivity("Live", `Joined live: ${liveId}`)
  router.push(`/live?mode=watch&liveId=${encodeURIComponent(liveId)}`)
}

// =========================
// TOOLS
// =========================
function toggleTools() { toolsOpen.value = !toolsOpen.value }
function toggleStudio() { studioOpen.value = !studioOpen.value }
function scrollToTop() { window.scrollTo({ top: 0, behavior: "smooth" }) }

function appendQuickTag(tag) {
  const current = String(caption.value || "")
  if (current.includes(tag)) return
  caption.value = current.trim() ? `${current.trim()} ${tag}` : `${tag} `
}

// =========================
// NETWORK
// =========================
function handleNetworkOnline() {
  isNetworkOnline.value = true
  draftSavedNote.value = offlineQueue.value?.length ? "Back online. Syncing queued posts…" : "Back online"
  flushOfflineQueue()
}

function handleNetworkOffline() {
  isNetworkOnline.value = false
  draftSavedNote.value = "Offline mode enabled"
}

// =========================
// VIDEO OBSERVERS (with null checks)
// =========================
const activePostId = ref(null)
const videoMutedByPost = ref({})

function setupVideoObserver() {
  try { videoObserver?.disconnect() } catch (e) { if (import.meta.env.DEV) console.error("[VideoObserver] Disconnect failed:", e) }
  videoObserver = new IntersectionObserver(async (entries) => {
    const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => (b.intersectionRatio || 0) - (a.intersectionRatio || 0))
    if (visible.length) activePostId.value = Number(visible[0].target.getAttribute("data-post-id") || 0) || null
    for (const entry of entries) {
      const video = entry.target
      const postId = Number(video.getAttribute("data-post-id") || 0)
      const muted = globalMuted.value || !!videoMutedByPost.value[postId]
      video.muted = muted
      video.volume = muted ? 0 : 1
      if (feedMode.value !== "foryou" && feedMode.value !== "reels") { try { video.pause() } catch {}; continue }
      if (entry.isIntersecting && entry.intersectionRatio >= 0.6) { try { await video.play() } catch {} }
      else { try { video.pause() } catch {} }
    }
  }, { threshold: [0.25, 0.6, 0.85] })
  nextTick(() => {
    if (feedMode.value !== "foryou" && feedMode.value !== "reels") return
    const videos = document.querySelectorAll("video.tt-video")
    if (!videos.length) return
    videos.forEach((v) => videoObserver.observe(v))
  })
}

function setupLoadMoreObserver() {
  try { loadMoreObserver?.disconnect() } catch {}
  if (!loadMoreRef.value) return
  loadMoreObserver = new IntersectionObserver(async (entries) => {
    const hit = entries.some((e) => e.isIntersecting)
    if (!hit || !canLoadMore.value || infiniteLoading.value) return
    loadMore()
  }, { threshold: 0.15 })
  loadMoreObserver.observe(loadMoreRef.value)
}

function setupReelsLoadMoreObserver() {
  try { reelsLoadMoreObserver?.disconnect() } catch {}
  if (!reelsLoadMoreRef.value) return
  reelsLoadMoreObserver = new IntersectionObserver(async (entries) => {
    const hit = entries.some((e) => e.isIntersecting)
    if (!hit || !reelsCanLoadMore.value || reelsInfiniteLoading.value) return
    loadMoreReels()
  }, { threshold: 0.15 })
  reelsLoadMoreObserver.observe(reelsLoadMoreRef.value)
}

// =========================
// DIAGNOSTICS
// =========================
async function copyDiagnostics() {
  const diag = {
    at: new Date().toISOString(),
    apiUrl,
    socketConnected: socketConnected.value,
    me: me.value ? { id: me.value.id, username: me.value.username || me.value.display_name || me.value.name } : null,
    onlineCount: onlineCount.value,
    liveCount: liveStreams.value.length,
    feedMode: feedMode.value,
    currentRoom: chatRoom.value,
    sortMode: sortMode.value,
    postFilter: postFilter.value,
    savedCount: savedPostIds.value.length,
    pinnedCount: pinnedPostIds.value.length,
    creatorScore: creatorScore.value,
    streak: todayStreak.value,
    focusMode: focusMode.value,
  }
  try {
    await navigator.clipboard.writeText(JSON.stringify(diag, null, 2))
    alert("Diagnostics copied!")
  } catch { alert(JSON.stringify(diag, null, 2)) }
}

async function testTurn() {
  turnNote.value = "Testing TURN…"
  try {
    const res = await fetch(`${apiUrl}/api/turn`)
    const data = await res.json()
    if (data?.ok && Array.isArray(data.iceServers)) {
      turnNote.value = `TURN OK: ${data.note || "iceServers received"} • servers=${data.iceServers.length}`
      addActivity("TURN", "TURN credentials fetched successfully")
    } else {
      turnNote.value = "TURN failed (fallback STUN will still work)."
    }
  } catch (e) {
    if (import.meta.env.DEV) console.error("[TURN] Test failed:", e)
    turnNote.value = "TURN test failed (network)."
  }
}

async function requestNotifications() {
  try {
    if (!("Notification" in window)) { alert("Notifications not supported here."); return }
    const perm = await Notification.requestPermission()
    alert(`Notifications: ${perm}`)
  } catch (e) {
    if (import.meta.env.DEV) console.error("[Notifications] Request failed:", e)
    alert("Notification permission failed.")
  }
}

function hardResetApp() {
  const ok = confirm("Hard reset local app data? (token + user + drafts) You will be logged out.")
  if (!ok) return
  localStorage.clear()
  router.push("/login")
}

async function copyMyProfileLink() {
  const id = me.value?.id ? String(me.value.id) : ""
  const url = `${window.location.origin}/#/profile/${id}`
  try { await navigator.clipboard.writeText(url); alert("Profile link copied!") }
  catch { alert(url) }
}

// =========================
// SHARING
// =========================
async function sharePost(post) {
  const url = `${window.location.origin}/#post-${post.id}`
  try {
    if (navigator.share) { await navigator.share({ title: "Pulse Post", text: post.caption || "Post", url }); return }
  } catch {}
  try { await navigator.clipboard.writeText(url); alert("Link copied!") }
  catch { alert(url) }
}

async function copyPostText(post) {
  const text = (post?.caption || "").trim() || "(no caption)"
  try { await navigator.clipboard.writeText(text); alert("Copied!") }
  catch { alert(text) }
}

// =========================
// SURPRISE ME
// =========================
function surpriseMe() {
  const modes = ["foryou", "reels", "following", "threads", "rooms", "live", "saved", "pinned"]
  const next = modes[Math.floor(Math.random() * modes.length)]
  setFeedMode(next)
  if (next === "rooms") {
    const roomChoices = ["global", "support", "dev", "random"]
    chatRoom.value = roomChoices[Math.floor(Math.random() * roomChoices.length)]
    selectChat(chatRoom.value)
  }
  addActivity("Magic", `Surprise mode opened: ${next}`)
  scrollToTop()
}

// =========================
// SMART LAUNCH
// =========================
function runSmartLaunch(id) {
  switch (id) {
    case "post": focusComposer(); scrollToTop(); break
    case "room": callRooms.value.length ? joinCallRoom(callRooms.value[0]) : createFastRoom(meName.value); break
    case "live": liveStreams.value.length ? joinLive(liveStreams.value[0]) : startLive(); break
    case "saved": setFeedMode("saved"); break
    case "reels": setFeedMode("reels"); break
    case "focus": toggleFocusMode(); break
  }
}

// =========================
// NAVIGATION
// =========================
const isHomeActive = computed(() => ["foryou", "reels", "following", "threads", "rooms", "saved", "pinned"].includes(feedMode.value))

function goHome() { setFeedMode("foryou"); scrollToTop() }
function goInbox() { router.push("/messages") }
function goLiveTab() { setFeedMode("live"); scrollToTop() }
function goProfile() { const id = me.value?.id ? String(me.value.id) : ""; router.push(id ? `/profile/${id}` : "/profile") }
function goCallSFU() { router.push("/live-sfu") }
function openUserProfile(u) { const id = u?.id ? String(u.id) : ""; if (!id) return; router.push(`/profile/${id}`) }

// =========================
// REFRESH
// =========================
async function refreshAll() {
  await fetchPosts()
  if (isLoggedIn.value) await fetchPeople()
  requestLiveList()
  requestPresenceUpdate()
  refreshCallRooms()
  addActivity("Dashboard", "Refreshed all sections")
}

// =========================
// KEYBOARD SHORTCUTS
// =========================
function handleKeydown(e) {
  const tag = (e.target?.tagName || "").toLowerCase()
  const typing = tag === "input" || tag === "textarea"
  if (e.key === "/" && !typing) { e.preventDefault(); searchRef.value?.focus?.(); return }
  if (typing) return
  switch (e.key) {
    case "c": e.preventDefault(); focusComposer(); break
    case "r": e.preventDefault(); refreshAll(); break
    case "g": e.preventDefault(); setFeedMode("live"); break
    case "m": e.preventDefault(); toggleGlobalMute(); break
    case "f": e.preventDefault(); toggleFocusMode(); break
  }
}

// =========================
// WATCHERS
// =========================
watch([feedMode, sortMode, postFilter, globalMuted], () => { persistPrefs() })
watch(caption, (v) => { saveDraft(v); draftSavedNote.value = v ? "Draft saved locally" : "" })

// =========================
// LIFECYCLE
// =========================
onMounted(async () => {
  updateDailyStreak()
  restoreDraft()

  // CRITICAL FIX: Fetch data BEFORE connecting socket (prevents race condition)
  await fetchPosts()
  if (isLoggedIn.value) await fetchPeople()

  // Now setup socket after data is ready
  connectSocket()

  // Register all socket listeners with proper handler references
  registerCallListeners()
  registerChatListeners()
  registerPresenceListeners()
  registerCallRoomListeners()

  // Setup socket state listeners
  socket.on("connect", () => { socketConnected.value = true; socketStatusNote.value = "" })
  socket.on("disconnect", () => { socketConnected.value = false })
  socket.io?.on?.("reconnect", () => { socketConnected.value = true })

  // Emit presence after connection
  if (socket.connected) {
    safeRegisterOnline()
  } else {
    socket.on("connect", safeRegisterOnline)
  }

  // Setup DOM observers
  await nextTick()
  if (feedMode.value === "foryou") { setupLoadMoreObserver(); setupVideoObserver() }
  if (feedMode.value === "reels") { setupReelsLoadMoreObserver(); setupVideoObserver() }

  // Window events
  window.addEventListener("keydown", handleKeydown)
  window.addEventListener("online", handleNetworkOnline)
  window.addEventListener("offline", handleNetworkOffline)
  window.addEventListener("beforeunload", handleBeforeUnload)

  // Flush offline queue if online
  if (offlineQueue.value?.length && isNetworkOnline.value) flushOfflineQueue()
})

function handleBeforeUnload() {
  if (myUserId.value) emitSocket("user:offline", { userId: myUserId.value })
  cleanupSocket()
}

onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleKeydown)
  window.removeEventListener("online", handleNetworkOnline)
  window.removeEventListener("offline", handleNetworkOffline)
  window.removeEventListener("beforeunload", handleBeforeUnload)
  unregisterCallListeners()
  unregisterChatListeners()
  unregisterPresenceListeners()
  unregisterCallRoomListeners()
  cleanupSocket()
  try { loadMoreObserver?.disconnect() } catch {}
  try { reelsLoadMoreObserver?.disconnect() } catch {}
  try { videoObserver?.disconnect() } catch {}
  loadMoreObserver = null
  reelsLoadMoreObserver = null
  videoObserver = null
})
</script>
<style scoped>
.wrap {
  position: relative;
  min-height: 100vh;
  padding-bottom: 88px;
  color: white;
  overflow: hidden;
  background:
    radial-gradient(1200px 700px at 20% 0%, rgba(255,75,43,0.16), transparent),
    radial-gradient(1000px 700px at 80% 20%, rgba(255,65,108,0.16), transparent),
    radial-gradient(800px 600px at 50% 100%, rgba(124,58,237,0.12), transparent),
    linear-gradient(180deg, #09111f 0%, #0b1220 45%, #07101d 100%);
}

.bg-orb {
  position: fixed;
  border-radius: 999px;
  filter: blur(80px);
  pointer-events: none;
  opacity: 0.35;
  z-index: 0;
}

.orb1 {
  width: 280px;
  height: 280px;
  left: -40px;
  top: 60px;
  background: rgba(255, 90, 120, 0.42);
  animation: floatOrb 10s ease-in-out infinite;
}

.orb2 {
  width: 300px;
  height: 300px;
  right: -40px;
  top: 200px;
  background: rgba(91, 140, 255, 0.34);
  animation: floatOrb 13s ease-in-out infinite reverse;
}

.orb3 {
  width: 220px;
  height: 220px;
  left: 30%;
  bottom: 80px;
  background: rgba(56, 189, 248, 0.20);
  animation: floatOrb 14s ease-in-out infinite;
}

@keyframes floatOrb {
  0% { transform: translateY(0px) translateX(0px); }
  50% { transform: translateY(-18px) translateX(8px); }
  100% { transform: translateY(0px) translateX(0px); }
}

.glassy {
  background: rgba(255, 255, 255, 0.075);
  border: 1px solid rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(14px);
  box-shadow:
    0 12px 40px rgba(0, 0, 0, 0.26),
    inset 0 1px 0 rgba(255,255,255,0.04);
}

/* TOPBAR */
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
  backdrop-filter: blur(14px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.10);
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.logo {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, rgba(255,65,108,0.9), rgba(91,140,255,0.9));
  border: 1px solid rgba(255,255,255,0.18);
  font-size: 20px;
  box-shadow: 0 10px 26px rgba(255,65,108,0.22);
  animation: floatLogo 4s ease-in-out infinite;
}

@keyframes floatLogo {
  0% { transform: translateY(0) }
  50% { transform: translateY(-3px) }
  100% { transform: translateY(0) }
}

.title { font-weight: 950; font-size: 18px; }
.sub { opacity: .72; font-size: 12px; }

.top-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

/* HERO */
.heroStrip {
  position: relative;
  z-index: 2;
  max-width: 1100px;
  margin: 12px auto 0;
  padding: 0 16px;
}

.heroCard {
  padding: 18px;
  border-radius: 24px;
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 16px;
  align-items: center;
}

.heroEyebrow { font-size: 11px; opacity: .72; letter-spacing: .18em; font-weight: 900; }
.heroTitle { font-size: 28px; font-weight: 950; margin-top: 4px; }
.heroSub { margin-top: 8px; opacity: .8; max-width: 540px; line-height: 1.5; }

.heroActions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 14px;
}

.heroStats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.heroStat {
  padding: 14px;
  border-radius: 18px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.10);
  text-align: center;
}

.heroStatNum { font-size: 24px; font-weight: 950; }
.heroStatLab { margin-top: 4px; font-size: 12px; opacity: .72; }

/* DYNAMIC ISLAND */
.dynamicIsland {
  position: sticky;
  top: 64px;
  z-index: 55;
  max-width: 1100px;
  margin: 10px auto;
  padding: 10px 16px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  backdrop-filter: blur(18px);
  background: rgba(255, 255, 255, 0.075);
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.islandLeft { display: flex; align-items: center; gap: 8px; }
.islandDot { width: 10px; height: 10px; border-radius: 50%; background: #ff4444; }
.islandDot.on { background: #00e676; }
.islandText { font-size: 12px; opacity: .8; }
.islandCenter { display: flex; gap: 8px; }
.islandBtn {
  border: none;
  background: rgba(255,255,255,0.1);
  padding: 8px 10px;
  border-radius: 999px;
  cursor: pointer;
  font-size: 12px;
  color: white;
}
.islandRight { display: flex; gap: 10px; font-weight: 900; }
.islandStat { font-size: 12px; opacity: .9; }

/* MODEBAR */
.modebar {
  position: relative;
  z-index: 2;
  max-width: 1100px;
  margin: 10px auto 0;
  padding: 0 16px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}

.mode {
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(255,255,255,0.10);
  color: white;
  padding: 10px 12px;
  border-radius: 999px;
  cursor: pointer;
  font-weight: 950;
  opacity: .92;
  transition: all .18s ease;
}

.mode:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgba(255,75,43,0.18);
}

.mode.on {
  background: linear-gradient(45deg, #ff416c, #ff4b2b);
  border-color: rgba(255,75,43,0.6);
  opacity: 1;
  box-shadow: 0 0 25px rgba(255,75,43,0.35);
}

.mode.reels.on {
  background: linear-gradient(45deg, #7c3aed, #22c55e);
  box-shadow: 0 0 30px rgba(124,58,237,0.45);
}

.mode-right {
  margin-left: auto;
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.searchWrap { position: relative; }
.search {
  background: rgba(0,0,0,0.35);
  border: 1px solid rgba(255,255,255,0.12);
  color: white;
  padding: 10px 40px 10px 12px;
  border-radius: 999px;
  outline: none;
}
.search:focus {
  border-color: rgba(255,75,43,0.35);
  box-shadow: 0 0 0 3px rgba(255,75,43,0.12);
}
.searchClear {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  border: none;
  background: rgba(255,255,255,0.12);
  color: white;
  width: 26px;
  height: 26px;
  border-radius: 999px;
  cursor: pointer;
}
.selectControl {
  background: rgba(0,0,0,0.35);
  border: 1px solid rgba(255,255,255,0.12);
  color: white;
  padding: 10px 12px;
  border-radius: 999px;
  outline: none;
}

/* FILTER BAR */
.filterbar {
  position: relative;
  z-index: 2;
  max-width: 1100px;
  margin: 10px auto 0;
  padding: 0 16px;
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.filterChip {
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(255,255,255,0.08);
  color: white;
  padding: 8px 12px;
  border-radius: 999px;
  cursor: pointer;
  font-weight: 800;
}
.filterChip.on {
  background: rgba(255,75,43,0.18);
  border-color: rgba(255,75,43,0.35);
}
.filterHint {
  margin-left: auto;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* MAIN */
.main {
  position: relative;
  z-index: 2;
  max-width: 1100px;
  margin: 0 auto;
  padding: 16px;
}

.dock {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-bottom: 14px;
}

.panel, .composer, .post {
  border-radius: 20px;
  padding: 14px;
  margin-bottom: 14px;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

.panel-title { font-weight: 950; }
.dockActions { display: flex; gap: 8px; align-items: center; }

/* BUTTONS */
.btn, .chip {
  border: none;
  border-radius: 999px;
  padding: 10px 14px;
  cursor: pointer;
  background: rgba(255,255,255,0.12);
  color: white;
  transition: transform .16s ease, opacity .16s ease, box-shadow .16s ease;
}
.btn:hover, .chip:hover { transform: translateY(-1px); }
.btn-primary {
  background: linear-gradient(45deg, #ff416c, #ff4b2b);
  box-shadow: 0 10px 22px rgba(255,65,108,0.24);
}
.danger {
  background: rgba(255,80,80,0.22);
  border: 1px solid rgba(255,80,80,0.35);
}
.ghost { opacity: .92; }
.ghostBtn { opacity: .92; background: rgba(255,255,255,0.10); }
.chip.mini { padding: 8px 10px; font-size: 12px; }

/* TRENDING */
.trendingRow { display: flex; flex-wrap: wrap; gap: 10px; }
.trendChip {
  border: 1px solid rgba(255,255,255,0.14);
  background: linear-gradient(135deg, rgba(124,58,237,0.25), rgba(255,75,43,0.20));
  color: white;
  padding: 10px 14px;
  border-radius: 999px;
  cursor: pointer;
  font-weight: 900;
}

/* LIVE */
.live-strip { display: grid; gap: 10px; }
.live-pill {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 14px;
  background: rgba(255, 0, 0, 0.10);
  border: 1px solid rgba(255, 0, 0, 0.18);
  cursor: pointer;
  transition: transform .16s ease, box-shadow .16s ease;
}
.live-pill:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 24px rgba(255, 40, 40, 0.14);
}
.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: red;
  box-shadow: 0 0 12px rgba(255,0,0,0.7);
}
.live-pill-name { font-weight: 950; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.chev { margin-left: auto; opacity: .7; font-size: 22px; }

/* PEOPLE */
.miniAvatars {
  display: flex;
  gap: 10px;
  align-items: center;
  overflow-x: auto;
  padding-bottom: 6px;
}
.miniAvatarWrap { position: relative; flex: 0 0 auto; cursor: pointer; }
.miniAvatar {
  width: 48px;
  height: 48px;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(255,65,108,0.24), rgba(91,140,255,0.24));
  border: 1px solid rgba(255,255,255,0.14);
  display: grid;
  place-items: center;
  font-weight: 950;
}
.miniDot {
  position: absolute;
  right: 4px;
  bottom: 4px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: rgba(255,255,255,0.35);
  border: 2px solid #0b1220;
}
.miniDot.on { background: #00e676; }

.peopleCompact { margin-top: 12px; display: grid; gap: 10px; }
.peopleList { display: grid; gap: 10px; max-height: 240px; overflow: auto; padding-right: 4px; }
.person.compact {
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
.person-sub { display: flex; align-items: center; gap: 8px; opacity: .75; font-size: 12px; margin-top: 2px; }
.status { width: 10px; height: 10px; border-radius: 50%; background: rgba(255,255,255,0.35); }
.status.on { background: #00e676; }
.sep { opacity: .5; }
.person-actions { display: flex; gap: 8px; }
.iconbtn {
  width: 40px;
  height: 40px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(255,255,255,0.10);
  cursor: pointer;
  color: white;
}
.iconbtn:disabled { opacity: .45; cursor: not-allowed; }

/* COMPOSER */
.composer { transition: all .25s ease; }
.composer:focus-within {
  border: 1px solid rgba(255,75,43,0.42);
  box-shadow: 0 0 30px rgba(255,75,43,0.20), 0 12px 40px rgba(0,0,0,0.26);
  transform: translateY(-2px);
}
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
  border: none;
  outline: none;
  background: rgba(0, 0, 0, 0.35);
  color: white;
  border-radius: 14px;
  padding: 12px;
  resize: none;
}
.composerMetaRow {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 10px;
}
.charCount { font-size: 12px; opacity: .75; }
.charCount.warn { color: #ffd166; opacity: 1; }
.quickTags { display: flex; gap: 8px; flex-wrap: wrap; }
.quickTag {
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.08);
  color: white;
  padding: 6px 10px;
  border-radius: 999px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 800;
}
.upload-row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-top: 10px; }
.file-pill {
  background: rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  padding: 10px 12px;
  cursor: pointer;
}
.file-pill input { display: none; }
.file-dot { margin-left: 6px; opacity: .9; }

/* FEED */
.feed { display: grid; gap: 14px; }
.post { background: rgba(0, 0, 0, 0.42); }
.post-head { display: flex; gap: 10px; align-items: center; margin-bottom: 10px; }
.compactHead { align-items: center; }
.who .name { font-weight: 950; }
.time { opacity: .75; font-size: 12px; }
.text { margin: 6px 0 10px; line-height: 1.55; }
.thread-text { font-size: 15px; }
.media {
  width: 100%;
  border-radius: 16px;
  background: #000;
  margin-top: 10px;
  max-height: 720px;
  object-fit: cover;
}
.avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: linear-gradient(45deg, #ff416c, #ff4b2b);
  display: grid;
  place-items: center;
  font-weight: 950;
  box-shadow: 0 10px 24px rgba(255,65,108,0.20);
}
.avatar.big { width: 52px; height: 52px; }
.avatar.small {
  width: 40px;
  height: 40px;
  border-radius: 14px;
  background: rgba(255,255,255,0.10);
  border: 1px solid rgba(255,255,255,0.14);
}
.postPills { margin-left: auto; display: flex; gap: 8px; flex-wrap: wrap; }
.miniPostPill {
  font-size: 11px;
  font-weight: 900;
  padding: 6px 8px;
  border-radius: 999px;
  background: rgba(255,75,43,0.16);
  border: 1px solid rgba(255,75,43,0.28);
}
.ghostPill { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.12); }
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
.action-btn.active { border-color: rgba(255, 75, 43, 0.6); background: rgba(255, 75, 43, 0.18); }
.spacer { flex: 1; }
.comments-shell { margin-top: -4px; }

/* ROOMS */
.rooms { display: grid; grid-template-columns: 220px 1fr; gap: 12px; }
.rooms-left { border-radius: 18px; padding: 12px; }
.rooms-head { font-weight: 950; margin-bottom: 10px; }
.room {
  width: 100%;
  text-align: left;
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(0,0,0,0.30);
  color: white;
  padding: 10px 12px;
  border-radius: 14px;
  cursor: pointer;
  margin-bottom: 8px;
}
.room.on { background: rgba(255,75,43,0.16); border-color: rgba(255,75,43,0.30); }
.rooms-hint { opacity: .75; font-size: 12px; margin-top: 10px; }
.rooms-main { border-radius: 18px; padding: 12px; display: flex; flex-direction: column; min-height: 520px; }
.rooms-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 10px; }
.rooms-title { font-weight: 950; }
.rooms-messages {
  flex: 1;
  overflow: auto;
  display: grid;
  gap: 10px;
  padding: 8px;
  background: rgba(0,0,0,0.25);
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.10);
}
.rm { padding: 10px; border-radius: 14px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.10); }
.rm-top { display: flex; justify-content: space-between; gap: 10px; }
.rm-user { font-weight: 950; }
.rm-time { opacity: .7; font-size: 12px; }
.rm-text { margin-top: 6px; line-height: 1.45; }
.rooms-input { display: flex; gap: 8px; margin-top: 10px; }
.rooms-input input, .chat-input input, .roomInput {
  flex: 1;
  background: rgba(0,0,0,0.35);
  border: 1px solid rgba(255,255,255,0.12);
  color: white;
  padding: 10px 12px;
  border-radius: 12px;
  outline: none;
}
.callrooms-create { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 14px; }
.roomSelect { flex: 0 0 160px; }
.callrooms-list { display: grid; gap: 12px; }
.callroom-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border-radius: 16px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.10);
}
.callroom-main { min-width: 0; }
.callroom-name { font-weight: 950; font-size: 16px; }
.callroom-sub { margin-top: 4px; font-size: 13px; opacity: .72; }
.miniState { padding: 18px; }

/* CHAT DRAWER */
.chatDrawer {
  position: fixed;
  right: 16px;
  top: 120px;
  width: min(420px, 92vw);
  z-index: 70;
  transform: translateX(110%);
  transition: transform .25s ease;
}
.chatDrawer.open { transform: translateX(0); }
.chatPanel { margin-bottom: 0; }
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
.chat-box {
  background: rgba(0,0,0,0.35);
  border-radius: 16px;
  padding: 10px;
  border: 1px solid rgba(255,255,255,0.10);
}
.chat-messages { max-height: 320px; overflow: auto; display: grid; gap: 8px; padding: 6px; }
.chat-msg { font-size: 13px; opacity: .95; }
.chat-input { display: flex; gap: 8px; margin-top: 10px; }

/* MESSAGES */
.alert {
  margin-top: 10px;
  padding: 10px;
  border-radius: 14px;
  background: rgba(255,80,80,0.18);
  border: 1px solid rgba(255,80,80,0.35);
}
.alert.soft { background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12); }
.state { text-align: center; padding: 26px; opacity: 0.92; border-radius: 18px; background: rgba(255, 255, 255, 0.06); }
.state-emoji { font-size: 28px; margin-bottom: 8px; }
.state-title { font-weight: 950; font-size: 18px; }
.state-sub { opacity: .75; margin-top: 4px; }
.hint { opacity: .75; font-size: 13px; }
.mt10 { margin-top: 10px; }

/* MODAL */
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
  border-radius: 18px;
  padding: 16px;
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

/* TOAST */
.toast {
  position: fixed;
  left: 50%;
  bottom: 92px;
  transform: translateX(-50%);
  z-index: 90;
  border: 1px solid rgba(255,255,255,0.14);
  padding: 10px 12px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.toast-dot { width: 10px; height: 10px; border-radius: 50%; background: #00e676; }
.mini-x, .x {
  border: none;
  cursor: pointer;
  background: rgba(255,255,255,0.10);
  color: white;
  border-radius: 10px;
  padding: 6px 10px;
}
.load-more { text-align: center; padding: 18px 10px; opacity: .75; }

/* BOTTOM NAV */
.bottomNav {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 95;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0;
  padding: 10px 10px calc(14px + env(safe-area-inset-bottom));
  background: rgba(8, 12, 20, 0.82);
  backdrop-filter: blur(12px);
  border-top: 1px solid rgba(255,255,255,0.10);
}
.bn {
  border: none;
  background: transparent;
  color: rgba(255,255,255,0.80);
  display: grid;
  place-items: center;
  gap: 4px;
  padding: 8px 6px;
  cursor: pointer;
}
.bn.on { color: #fff; text-shadow: 0 0 18px rgba(255,75,43,0.55); }
.bn.on .bnI { filter: drop-shadow(0 0 12px rgba(255,75,43,0.55)); }
.bnI { font-size: 18px; }
.bnT { font-size: 12px; font-weight: 850; }

/* LIVE GRID */
.live-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 12px;
  margin-top: 14px;
}
.live-big {
  padding: 16px;
  border-radius: 18px;
  background: rgba(255, 0, 0, 0.08);
  border: 1px solid rgba(255, 0, 0, 0.16);
  cursor: pointer;
  transition: transform .16s ease, box-shadow .16s ease;
}
.live-big:hover { transform: translateY(-2px); box-shadow: 0 14px 28px rgba(255,0,0,0.14); }
.live-big-top { display: flex; align-items: center; gap: 10px; }
.live-big-title { font-weight: 950; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.live-big-sub { margin-top: 8px; opacity: .74; font-size: 13px; }

/* STATUS */
.miniPanel { padding: 12px; }
.row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.badgePill {
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(255,255,255,0.10);
  border: 1px solid rgba(255,255,255,0.14);
  font-weight: 950;
  font-size: 12px;
}
.badgePill.ok { border-color: rgba(34,197,94,0.35); background: rgba(34,197,94,0.12); }
.badgePill.bad { border-color: rgba(255,80,80,0.35); background: rgba(255,80,80,0.12); }
.badgePill.accent { border-color: rgba(255,75,43,0.35); background: rgba(255,75,43,0.14); }

/* TOOLS */
.toolsPanel { margin-top: -4px; }
.toolsGrid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 10px; }
.toolBtn {
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(0,0,0,0.28);
  color: #fff;
  padding: 10px 12px;
  border-radius: 14px;
  cursor: pointer;
  font-weight: 950;
}
.dangerTool { border-color: rgba(255,80,80,0.30); background: rgba(255,80,80,0.10); }
.thread-media-toggle { margin-top: 6px; }
.thread-media { margin-top: 10px; }

/* ELITE UPGRADES */
.eliteTopbar {
  position: sticky;
  top: 0;
  z-index: 60;
  backdrop-filter: blur(18px);
  background: rgba(7, 10, 22, 0.72);
  border: 1px solid rgba(255,255,255,0.08);
}
.eliteLogo { box-shadow: 0 0 30px rgba(109, 91, 255, 0.38); }
.eliteCenterSearch { flex: 1; max-width: 520px; margin: 0 14px; }
.eliteSearchWrap { width: 100%; }
.eliteSearch { min-height: 46px; }
.eliteTopActions { gap: 10px; flex-wrap: wrap; justify-content: flex-end; }
.eliteChip { min-height: 42px; }
.hide-sm { display: inline-flex; }

.netBadge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 999px;
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.1);
  font-size: 13px;
  font-weight: 700;
  color: #eaf2ff;
}
.netDot {
  width: 9px;
  height: 9px;
  border-radius: 999px;
  background: #48d597;
  box-shadow: 0 0 12px rgba(72, 213, 151, 0.9);
}
.netBadge.offline .netDot { background: #ff8d5c; box-shadow: 0 0 12px rgba(255, 141, 92, 0.9); }
.netBadge.syncing .netDot { background: #8ab4ff; box-shadow: 0 0 12px rgba(138, 180, 255, 0.9); }

.eliteQuickRail {
  position: fixed;
  left: 16px;
  top: 132px;
  z-index: 40;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.quickRailBtn {
  border: 1px solid rgba(255,255,255,0.1);
  background: rgba(8, 12, 28, 0.68);
  color: #fff;
  padding: 12px 14px;
  border-radius: 16px;
  backdrop-filter: blur(16px);
  cursor: pointer;
  font-weight: 700;
}

.quickCreateBackdrop {
  position: fixed;
  inset: 0;
  z-index: 80;
  background: rgba(1, 4, 14, 0.55);
  display: grid;
  place-items: end center;
  padding: 20px;
}
.quickCreateSheet {
  width: min(760px, 100%);
  border-radius: 28px;
  padding: 20px;
  border: 1px solid rgba(255,255,255,0.1);
  background: rgba(10, 15, 34, 0.88);
}
.quickCreateHead {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}
.quickCreateGrid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.quickCreateCard {
  min-height: 84px;
  border-radius: 20px;
  border: 1px solid rgba(255,255,255,0.1);
  background: linear-gradient(180deg, rgba(255,255,255,0.09), rgba(255,255,255,0.04));
  color: #fff;
  font-weight: 800;
  cursor: pointer;
  padding: 12px;
}
.quickQueueBar {
  margin-top: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 18px;
  background: rgba(255,255,255,0.06);
}

.eliteBottomNav { grid-template-columns: repeat(5, 1fr); align-items: end; }
.createBn { transform: translateY(-20px); }
.createCore {
  width: 62px;
  height: 62px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  font-size: 34px;
  font-weight: 900;
  background: radial-gradient(circle at 30% 30%, #a78bfa, #6d5cff 55%, #2b2f77);
  box-shadow: 0 18px 40px rgba(109, 92, 255, 0.45);
}

.fade-enter-active, .fade-leave-active { transition: opacity .22s ease, transform .22s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* RESPONSIVE */
@media (max-width: 1024px) {
  .heroCard { grid-template-columns: 1fr; }
  .dock { grid-template-columns: 1fr; }
  .chatDrawer {
    right: 0;
    left: 0;
    top: auto;
    bottom: 0;
    width: 100%;
    transform: translateY(110%);
    border-radius: 18px 18px 0 0;
  }
  .chatDrawer.open { transform: translateY(0); }
  .rooms { grid-template-columns: 1fr; }
}

@media (max-width: 768px) {
  .eliteQuickRail { display: none; }
  .modebar, .filterbar { overflow-x: auto; scrollbar-width: none; }
  .modebar::-webkit-scrollbar, .filterbar::-webkit-scrollbar { display: none; }
  .toolsGrid { grid-template-columns: 1fr; }
  .callroom-card { flex-direction: column; align-items: stretch; }
  .heroActions { flex-direction: column; }
  .heroStats { grid-template-columns: repeat(2, 1fr); }
  .eliteCenterSearch { display: none; }
  .hide-sm { display: none; }
  .quickCreateGrid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 500px) {
  .heroCard { padding: 12px; }
  .dynamicIsland { flex-wrap: wrap; padding: 8px 12px; }
  .islandCenter { width: 100%; justify-content: center; }
}

.commHub { position: relative; overflow: hidden; }
</style>