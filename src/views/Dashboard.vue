<!-- src/views/Dashboard.vue -->

<template>
  <Layout>
    <div class="wrap">
      <div class="bg-orb orb1"></div>
      <div class="bg-orb orb2"></div>
      <div class="bg-orb orb3"></div>

  <!-- ELITE TOPBAR -->
  <header class="topbar eliteTopbar glassy">
    <div class="brand" @click="scrollToTop" role="button" tabindex="0">
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
        />
        <button v-if="search" class="searchClear" @click="search = ''">✕</button>
      </div>
    </div>

    <div class="top-actions eliteTopActions">
      <span class="netBadge" :class="{ offline: !isNetworkOnline, syncing: isSyncingQueue }">
        <span class="netDot"></span>
        {{
          isSyncingQueue
            ? `Syncing ${offlineQueueCount}`
            : isNetworkOnline
              ? "Online"
              : `Offline ${offlineQueueCount ? "• " + offlineQueueCount + " queued" : ""}`
        }}
      </span>
      
      <button class="chip eliteChip" @click="openQuickCreate('post')">✍️ Post</button>

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
  <section v-if="!token" class="eliteQuickRail">
    <button class="quickRailBtn" @click="focusComposer">✍️ Create</button>
    <button class="quickRailBtn" @click="togglePeople">👥 People</button>
    <button class="quickRailBtn" @click="goInbox">💬 Inbox</button>
    <button class="quickRailBtn" @click="createFastRoom">🎧 Room</button>
    <button class="quickRailBtn" @click="startLive">🔴 Live</button>
    <button class="quickRailBtn" @click="goProfile">👤 Profile</button>
  </section>
        <!-- DYNAMIC ISLAND -->
  <section class="dynamicIsland glassy">

    <div class="islandLeft">

      <span class="islandDot" :class="{ on: socketConnected }"></span>

      <span class="islandText">
        {{ socketConnected ? "Realtime Connected" : "Realtime Offline" }}
      </span>

    </div>

    <div class="islandCenter">

      <button class="islandBtn" @click="refreshAll">
        🔄 Refresh
      </button>

      <button class="islandBtn" @click="focusComposer">
        ✍️ Post
      </button>

      <button class="islandBtn" @click="startLive">
        🔴 Live
      </button>

      <button class="islandBtn" @click="createFastRoom">
        📞 Room
      </button>

    </div>

    <div class="islandRight">

      <span class="islandStat">
        👥 {{ onlineCount }}
      </span>

      <span class="islandStat">
        🔴 {{ liveStreams.length }}
      </span>

      <span class="islandStat">
        📞 {{ callRooms.length }}
      </span>

    </div>

  </section>
  <!-- HERO -->
  <section class="heroStrip">
    <div class="heroCard glassy" :class="{ 'heroCard--solo': token }">
      <div class="heroLeft">
        <div class="heroEyebrow">WELCOME BACK</div>
        <div class="heroTitle">{{ meName }}</div>
        <div class="heroSub">
          {{ moodGreeting }} Build, post, call, stream, chat, save ideas, and run your whole world from one magical dashboard.
        </div>

        <div class="heroActions">
          <button class="btn btn-primary" @click="focusComposer">Create Post</button>
          <button class="btn ghostBtn" @click="setFeedMode('rooms')">Open Rooms</button>
          <button class="btn ghostBtn" @click="setFeedMode('live')">Go Live Area</button>
          <button class="btn ghostBtn" @click="toggleStudio">Creator Studio</button>
          <button class="btn ghostBtn" @click="createFastRoom">Start Room</button>
        </div>

        <div class="trendingRow mt10">
          <span class="badgePill accent">Creator Score {{ creatorScore }}</span>
          <span class="badgePill">Streak {{ todayStreak }} day{{ todayStreak === 1 ? "" : "s" }}</span>
          <span class="badgePill">{{ quickStatusText }}</span>
        </div>
      </div>

      <div v-if="!token" class="heroStats">
        <div class="heroStat">
          <div class="heroStatNum">{{ posts.length }}</div>
          <div class="heroStatLab">Posts</div>
        </div>
        <div class="heroStat">
          <div class="heroStatNum">{{ videoPosts.length }}</div>
          <div class="heroStatLab">Videos</div>
        </div>
        <div class="heroStat">
          <div class="heroStatNum">{{ onlineCount }}</div>
          <div class="heroStatLab">Online</div>
        </div>
        <div class="heroStat">
          <div class="heroStatNum">{{ liveStreams.length }}</div>
          <div class="heroStatLab">Live</div>
        </div>
        <div class="heroStat">
          <div class="heroStatNum">{{ savedPostIds.length }}</div>
          <div class="heroStatLab">Saved</div>
        </div>
        <div class="heroStat">
          <div class="heroStatNum">{{ pinnedPostIds.length }}</div>
          <div class="heroStatLab">Pinned</div>
        </div>
      </div>
    </div>
  </section>

  <!-- COMMAND CENTER -->
  <section v-if="!token" class="dock">
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
        <span class="badgePill" :class="{ ok: socketConnected, bad: !socketConnected }">
          {{ socketConnected ? "Connected" : "Disconnected" }}
        </span>
        <span class="badgePill">Online {{ onlineCount }}</span>
        <span class="badgePill">Live {{ liveStreams.length }}</span>
        <span class="badgePill">Rooms {{ callRooms.length }}</span>
        <span class="badgePill">Saved {{ savedPostIds.length }}</span>
        <span class="badgePill">Pinned {{ pinnedPostIds.length }}</span>
      </div>

      <div class="hint mt10">
        Keyboard shortcuts: <strong>/</strong> search, <strong>c</strong> composer, <strong>r</strong> refresh, <strong>g</strong> go live, <strong>m</strong> mute, <strong>f</strong> focus mode.
      </div>
    </div>

    <div class="panel dockCard glassy">
      <div class="panel-head">
        <div class="panel-title">🚀 Smart Launch</div>
      </div>

      <div class="toolsGrid">
        <button
          v-for="item in smartLaunchCards"
          :key="item.id"
          class="toolBtn"
          @click="runSmartLaunch(item.id)"
        >
          {{ item.label }}
        </button>
      </div>
    </div>
  </section>

  <!-- SPOTLIGHT -->
  <section v-if="!token" class="dock">
    <div class="panel dockCard glassy">
      <div class="panel-head">
        <div class="panel-title">🌟 Spotlight</div>
        <div class="dockActions">
          <button class="btn ghostBtn" @click="refreshAll">Refresh</button>
        </div>
      </div>

      <div class="toolsGrid">
        <div class="toolBtn">
          🔥 Trending Tag: {{ spotlightTag || "Nothing yet" }}
        </div>
        <div class="toolBtn">
          👥 Most Active: {{ spotlightPerson }}
        </div>
        <div class="toolBtn">
          📞 Rooms Ready: {{ callRooms.length }}
        </div>
        <div class="toolBtn">
          🎬 Feed Power: {{ videoPosts.length > 0 ? "Video Active" : "Text Active" }}
        </div>
      </div>
    </div>

    <div class="panel dockCard glassy">
      <div class="panel-head">
        <div class="panel-title">📈 Creator Pulse</div>
      </div>

      <div class="trendingRow">
        <span class="badgePill accent">Posts {{ posts.length }}</span>
        <span class="badgePill">Comments {{ totalCommentCount }}</span>
        <span class="badgePill">Likes {{ totalLikesCount }}</span>
        <span class="badgePill">Saved {{ savedPostIds.length }}</span>
        <span class="badgePill">Pinned {{ pinnedPostIds.length }}</span>
      </div>

      <div class="hint mt10">
        {{ creatorInsight }}
      </div>
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
    <button class="chip primary" @click="goCallSFU">
      🚀 SFU Call
    </button>
    <div class="mode-right">
      <div class="searchWrap">
        <input ref="searchRef" v-model="search" class="search" placeholder="Search…" />
        <button v-if="search" class="searchClear" @click="search = ''">✕</button>
      </div>

      <select v-model="sortMode" class="selectControl">
        <option value="latest">Latest</option>
        <option value="popular">Popular</option>
        <option value="media">Media First</option>
        <option value="text">Text First</option>
      </select>

      <button
        v-if="feedMode === 'foryou' || feedMode === 'reels'"
        class="chip ghost"
        @click="toggleGlobalMute"
      >
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
    <section v-if="false" class="panel miniPanel glassy">
      <div class="panel-head">
        <div class="panel-title">🛰️ Status</div>

        <div class="row">
          <span class="badgePill" :class="{ ok: socketConnected, bad: !socketConnected }">
            {{ socketConnected ? "Socket Connected" : "Socket Disconnected" }}
          </span>
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

      <div v-if="statusNote" class="hint mt10">{{ statusNote }}</div>
    </section>

    <!-- TRENDING -->
    <section v-if="trendingTags.length" class="panel glassy">
      <div class="panel-head">
        <div class="panel-title">🔥 Trending</div>
        <button class="btn ghostBtn" @click="search = ''">Clear Search</button>
      </div>

      <div class="trendingRow">
        <button
          v-for="tag in trendingTags"
          :key="tag"
          class="trendChip"
          @click="applyTrendTag(tag)"
        >
          {{ tag }}
        </button>
      </div>
    </section>

    

    <!-- STUDIO -->
    <section v-if="studioOpen" class="panel toolsPanel glassy">
      <div class="panel-head">
        <div class="panel-title">🪄 Creator Studio</div>
        <div class="dockActions">
          <button class="btn ghostBtn" @click="toggleStudio">Close</button>
        </div>
      </div>

      <div class="toolsGrid">
        <button class="toolBtn" @click="focusComposer">✍️ New Post</button>
        <button class="toolBtn" @click="setFeedMode('reels')">🎞️ Create Reel</button>
        <button class="toolBtn" @click="startLive">🔴 Start Live</button>
        <button class="toolBtn" @click="createFastRoom">📞 Start Room</button>
        <button class="toolBtn" @click="openSavedMode">💾 Open Saved</button>
        <button class="toolBtn" @click="openPinnedMode">📌 Open Pinned</button>
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

    <!-- TOP DOCK -->
    <section v-if="!focusMode" class="dock">
      <!-- Live -->
      <div class="panel dockCard glassy">
        <div class="panel-head">
          <div class="panel-title">🔴 Live Now</div>
          <button class="btn btn-primary" @click="startLive" :disabled="!token">Go Live</button>
        </div>

        <div v-if="liveStreams.length === 0" class="hint mt10">No one live right now</div>

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

          <button
            v-if="liveStreams.length > 6"
            class="chip ghost mini"
            @click="setFeedMode('live')"
          >
            View all
          </button>
        </div>
      </div>

      <!-- People -->
      <div class="panel dockCard glassy">
        <div class="panel-head">
          <div class="panel-title">👥 People</div>

          <div class="dockActions">
            <button class="btn" @click="fetchPeople" :disabled="peopleLoading || !token">
              {{ peopleLoading ? "Loading…" : "Refresh" }}
            </button>
            <button class="btn ghostBtn" @click="toggleChat">
              {{ chatOpen ? "Close Chat" : "Open Chat" }}
            </button>
          </div>
        </div>

        <div v-if="!token" class="alert soft">
          Login again to see people & call buttons.
        </div>

        <template v-else>
          <div class="miniAvatars">
            <div
              v-for="u in people.slice(0, 14)"
              :key="'pmini-' + u.id"
              class="miniAvatarWrap"
              :title="displayUserName(u)"
              @click="peopleOpen ? null : startCall(u, 'audio')"
            >
              <div class="miniAvatar">
                {{ displayUserName(u)[0]?.toUpperCase() }}
              </div>
              <span class="miniDot" :class="{ on: isOnline(u.id) }"></span>
            </div>

            <button class="chip ghost mini" @click="togglePeople">
              {{ peopleOpen ? "Hide list" : "Show list" }}
            </button>
          </div>

          <div v-if="peopleOpen" class="peopleCompact">
            <div v-if="peopleError" class="alert">{{ peopleError }}</div>
            <div v-else-if="peopleLoading" class="hint">Loading people…</div>
            <div v-else-if="people.length === 0" class="hint">No users found.</div>

            <div v-else class="peopleList">
              <div
                v-for="u in filteredPeople"
                :key="'plist-' + u.id"
                class="person compact"
              >
                <div class="avatar small">
                  {{ displayUserName(u)[0]?.toUpperCase() }}
                </div>

                <div class="person-meta">
                  <div class="person-name">
                    {{ displayUserName(u) }}
                  </div>

                  <div class="person-sub">
                    <span class="status" :class="{ on: isOnline(u.id) }"></span>

                    <span class="status-text">
                      {{ isOnline(u.id) ? "Online" : "Offline" }}
                    </span>

                    <span class="sep">•</span>

                    <span class="id">ID {{ u.id }}</span>

                    <span v-if="u.distance !== null" class="distance">
                      • 📍 {{ u.distance }} mi away
                    </span>
                  </div>
                </div>

                <div class="person-actions">
                  <button
                    class="iconbtn msg-btn"
                    title="Message"
                    @click="openChat(u)"
                  >
                    💬
                  </button>
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

                  <button
                    class="iconbtn"
                    title="Open Profile"
                    @click="openUserProfile(u)"
                  >
                    👤
                  </button>
                </div>
              </div>
            </div>

            <div class="hint mt10">
              Calls require both users online (green).
            </div>
          </div>
        </template>
      </div>
    </section>

    <!-- TOOLS -->
    <section v-if="toolsOpen" class="panel toolsPanel glassy">
      <div class="panel-head">
        <div class="panel-title">🧰 Power Tools</div>
        <div class="dockActions">
          <button class="btn ghostBtn" @click="toggleTools">Close</button>
        </div>
      </div>

      <div class="toolsGrid">
        <button class="toolBtn" @click="setFeedMode('foryou')">🎬 Go For You</button>
        <button class="toolBtn" @click="setFeedMode('reels')">🎞️ Go Reels</button>
        <button class="toolBtn" @click="setFeedMode('rooms')">🎧 Go Rooms</button>
        <button class="toolBtn" @click="setFeedMode('live')">🔴 Go Live Tab</button>
        <button class="toolBtn" @click="openSavedMode">💾 Open Saved</button>
        <button class="toolBtn" @click="openPinnedMode">📌 Open Pinned</button>
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

      <div class="composerMetaRow">
        <div class="charCount" :class="{ warn: captionLength > 220 }">
          {{ captionLength }} chars
        </div>

        <div class="quickTags">
          <button class="quickTag" @click="appendQuickTag('#Pulse')">#Pulse</button>
          <button class="quickTag" @click="appendQuickTag('#Reels')">#Reels</button>
          <button class="quickTag" @click="appendQuickTag('#Live')">#Live</button>
          <button class="quickTag" @click="appendQuickTag('#Update')">#Update</button>
        </div>
      </div>

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
          {{ posting ? "Posting…" : (feedMode === 'reels' ? "Post Reel 🎬" : "Post 🚀") }}
        </button>

        <button class="btn ghostBtn" :disabled="posting" @click="clearDraft">Clear</button>
      </div>

      <div v-if="draftSavedNote" class="hint mt10">{{ draftSavedNote }}</div>
      <div v-if="error" class="alert">{{ error }}</div>
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

      <div class="rooms-main glassy" v-else>
        <div class="rooms-top">
          <div class="rooms-title">📞 Call Rooms</div>
          <button class="chip ghost" @click="refreshCallRooms">Refresh</button>
        </div>

        <div class="callrooms-create">
          <input v-model="callRoomName" class="roomInput" placeholder="Room name" />
          <select v-model="callRoomKind" class="roomInput roomSelect">
            <option value="audio">Audio Room</option>
            <option value="video">Video Room</option>
          </select>
          <button class="btn btn-primary" @click="createCallRoom" :disabled="creatingCallRoom">
            {{ creatingCallRoom ? "Creating..." : "Create Room" }}
          </button>
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
              <div class="callroom-sub">
                {{ room.kind === "video" ? "🎥 Video Room" : "🎙 Audio Room" }}
                • {{ room.participantCount }} inside
              </div>
            </div>

            <button class="btn btn-primary" @click="joinCallRoom(room)">
              Join
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- SAVED MODE -->
    <section v-else-if="feedMode === 'saved'" class="feed following">
      <template v-if="loading">
        <div class="state">Loading…</div>
      </template>

      <div v-else-if="savedPosts.length === 0" class="state">
        <div class="state-emoji">💾</div>
        <div class="state-title">No saved posts yet</div>
        <div class="state-sub">Tap Save on any post to keep it here.</div>
      </div>

      <article v-else v-for="post in savedPosts" :key="'s-'+post.id" class="post glassy">
        <header class="post-head">
          <div class="avatar">{{ getInitial(post) }}</div>
          <div class="who">
            <div class="name">{{ displayPostUser(post) }}</div>
            <div class="time">{{ formatDate(post.created_at) }}</div>
          </div>

          <div class="postPills">
            <span class="miniPostPill">SAVED</span>
          </div>
        </header>

        <div v-if="post.caption" class="text">{{ post.caption }}</div>

        <img v-if="post.image_url" class="media" :src="getMedia(post.image_url)" loading="lazy" />
        <video v-if="post.video_url" class="media" :src="getMedia(post.video_url)" controls playsinline preload="metadata"></video>

        <div class="actions">
          <button class="action-btn" @click="toggleSavePost(post)">
            💾 <span class="label">{{ isSaved(post.id) ? "Saved" : "Save" }}</span>
          </button>
          <button class="action-btn" @click="togglePinPost(post)">
            📌 <span class="label">{{ isPinned(post.id) ? "Pinned" : "Pin" }}</span>
          </button>
          <div class="spacer"></div>
          <button class="action-btn ghost" @click="sharePost(post)">🔗 <span class="label">Share</span></button>
        </div>
      </article>
    </section>

    <!-- PINNED MODE -->
    <section v-else-if="feedMode === 'pinned'" class="feed threads">
      <template v-if="loading">
        <div class="state">Loading…</div>
      </template>

      <div v-else-if="pinnedPosts.length === 0" class="state">
        <div class="state-emoji">📌</div>
        <div class="state-title">No pinned posts yet</div>
        <div class="state-sub">Pin your favorite posts here.</div>
      </div>

      <article v-else v-for="post in pinnedPosts" :key="'pin-'+post.id" class="post thread glassy">
        <header class="post-head">
          <div class="avatar">{{ getInitial(post) }}</div>
          <div class="who">
            <div class="name">{{ displayPostUser(post) }}</div>
            <div class="time">{{ formatDate(post.created_at) }}</div>
          </div>

          <div class="postPills">
            <span class="miniPostPill">PINNED</span>
          </div>
        </header>

        <div v-if="post.caption" class="text thread-text">{{ post.caption }}</div>

        <img v-if="post.image_url" class="media" :src="getMedia(post.image_url)" loading="lazy" />
        <video v-if="post.video_url" class="media" :src="getMedia(post.video_url)" controls playsinline preload="metadata"></video>

        <div class="actions">
          <button class="action-btn" @click="togglePinPost(post)">
            📌 <span class="label">{{ isPinned(post.id) ? "Pinned" : "Pin" }}</span>
          </button>
          <button class="action-btn" @click="toggleSavePost(post)">
            💾 <span class="label">{{ isSaved(post.id) ? "Saved" : "Save" }}</span>
          </button>
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

      <article v-else v-for="post in threadsPosts" :key="'t-'+post.id" class="post thread glassy">
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

        <button
          v-if="post.image_url || post.video_url"
          class="chip ghost thread-media-toggle"
          @click="toggleThreadMedia(post.id)"
        >
          {{ threadMediaOpen[post.id] ? "Hide media" : "View media" }}
        </button>

        <div v-if="threadMediaOpen[post.id]" class="thread-media">
          <img v-if="post.image_url" class="media" :src="getMedia(post.image_url)" loading="lazy" />
          <video v-if="post.video_url" class="media" :src="getMedia(post.video_url)" controls playsinline preload="metadata"></video>
        </div>

        <div class="actions">
          <button class="action-btn" :class="{ active: likesByPost[post.id]?.likedByMe }" :disabled="likeBusyByPost[post.id]" @click="toggleLike(post)">
            ❤️ <span class="label">{{ likesByPost[post.id]?.count ?? 0 }}</span>
          </button>

          <button class="action-btn" @click="toggleComments(post.id)">
            💬 <span class="label">{{ commentCount(post.id) }}</span>
          </button>

          <button class="action-btn" @click="toggleSavePost(post)">
            💾 <span class="label">{{ isSaved(post.id) ? "Saved" : "Save" }}</span>
          </button>

          <button class="action-btn" @click="togglePinPost(post)">
            📌 <span class="label">{{ isPinned(post.id) ? "Pinned" : "Pin" }}</span>
          </button>

          <div class="spacer"></div>

          <button class="action-btn ghost" @click="sharePost(post)">🔗 <span class="label">Share</span></button>
          <button class="action-btn ghost" @click="copyPostText(post)">📋 <span class="label">Copy</span></button>
        </div>

        <CommentsPanel
          v-if="commentsOpenByPost[post.id]"
          :post-id="post.id"
          @changed="handleCommentsChanged(post.id)"
        />
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

      <TikTokFeed
        v-else
        :items="reelsVisible"
        mode="reels"
        :globalMuted="globalMuted"
        :canLoadMore="reelsCanLoadMore"
        :loadingMore="reelsInfiniteLoading"
        :getMedia="getMedia"
        :formatDate="formatDate"
        :getInitial="(p) => getInitial(p)"
        :likesCount="(p) => (likesByPost[p.id]?.count ?? 0)"
        :commentCount="(p) => commentCount(p.id)"
        @toggle-muted="toggleGlobalMute"
        @load-more="loadMoreReels"
        @like="toggleLike"
        @comments="openCommentsFromFeed"
        @share="sharePost"
      />

      <div ref="reelsLoadMoreRef" class="load-more" v-if="reelsCanLoadMore && !loading">
        {{ reelsInfiniteLoading ? "Loading more reels…" : "Scroll for more reels…" }}
      </div>

      <section
        v-for="post in reelsVisible.filter((p) => commentsOpenByPost[p.id])"
        :key="'reel-comments-' + post.id"
        class="post comments-shell glassy"
      >
        <header class="post-head compactHead">
          <div class="avatar">{{ getInitial(post) }}</div>
          <div class="who">
            <div class="name">{{ displayPostUser(post) }}</div>
            <div class="time">Comments</div>
          </div>
          <button class="x" @click="toggleComments(post.id)">✕</button>
        </header>

        <CommentsPanel :post-id="post.id" @changed="handleCommentsChanged(post.id)" />
      </section>
    </section>

    <!-- FOLLOWING MODE -->
    <section v-else-if="feedMode === 'following'" class="feed following">
      <template v-if="loading">
        <div class="state">Loading…</div>
      </template>

      <div v-else-if="sortedFilteredPosts.length === 0" class="state">
        <div class="state-emoji">📸</div>
        <div class="state-title">No posts yet</div>
        <div class="state-sub">Be the first to post.</div>
      </div>

      <article v-else v-for="post in followingPosts" :key="'f-'+post.id" class="post glassy">
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

        <img v-if="post.image_url" class="media" :src="getMedia(post.image_url)" loading="lazy" />
        <video v-if="post.video_url" class="media" :src="getMedia(post.video_url)" controls playsinline preload="metadata"></video>

        <div class="actions">
          <button class="action-btn" :class="{ active: likesByPost[post.id]?.likedByMe }" :disabled="likeBusyByPost[post.id]" @click="toggleLike(post)">
            ❤️ <span class="label">{{ likesByPost[post.id]?.count ?? 0 }}</span>
          </button>

          <button class="action-btn" @click="toggleComments(post.id)">
            💬 <span class="label">{{ commentCount(post.id) }}</span>
          </button>

          <button class="action-btn" @click="toggleSavePost(post)">
            💾 <span class="label">{{ isSaved(post.id) ? "Saved" : "Save" }}</span>
          </button>

          <button class="action-btn" @click="togglePinPost(post)">
            📌 <span class="label">{{ isPinned(post.id) ? "Pinned" : "Pin" }}</span>
          </button>

          <div class="spacer"></div>

          <button class="action-btn ghost" @click="sharePost(post)">🔗 <span class="label">Share</span></button>
          <button class="action-btn ghost" @click="copyPostText(post)">📋 <span class="label">Copy</span></button>
        </div>

        <CommentsPanel
          v-if="commentsOpenByPost[post.id]"
          :post-id="post.id"
          @changed="handleCommentsChanged(post.id)"
        />
      </article>
    </section>

    <!-- FOR YOU MODE -->
    <section v-else class="feed tiktok">
      <template v-if="loading">
        <div class="state">Loading…</div>
      </template>

      <div v-else-if="forYouPosts.length === 0" class="state">
        <div class="state-emoji">🎬</div>
        <div class="state-title">No videos yet</div>
        <div class="state-sub">Post a video and it will autoplay here.</div>
      </div>

      <TikTokFeed
        v-else
        :items="visiblePosts"
        mode="foryou"
        :globalMuted="globalMuted"
        :canLoadMore="canLoadMore"
        :loadingMore="infiniteLoading"
        :getMedia="getMedia"
        :formatDate="formatDate"
        :getInitial="(p) => getInitial(p)"
        :likesCount="(p) => (likesByPost[p.id]?.count ?? 0)"
        :commentCount="(p) => commentCount(p.id)"
        @toggle-muted="toggleGlobalMute"
        @load-more="loadMore"
        @like="toggleLike"
        @comments="openCommentsFromFeed"
        @share="sharePost"
      />

      <div ref="loadMoreRef" class="load-more" v-if="canLoadMore && !loading">
        {{ infiniteLoading ? "Loading more videos…" : "Scroll for more videos…" }}
      </div>

      <section
        v-for="post in visiblePosts.filter((p) => commentsOpenByPost[p.id])"
        :key="'fy-comments-' + post.id"
        class="post comments-shell glassy"
      >
        <header class="post-head compactHead">
          <div class="avatar">{{ getInitial(post) }}</div>
          <div class="who">
            <div class="name">{{ displayPostUser(post) }}</div>
            <div class="time">Comments</div>
          </div>
          <button class="x" @click="toggleComments(post.id)">✕</button>
        </header>

        <CommentsPanel :post-id="post.id" @changed="handleCommentsChanged(post.id)" />
      </section>
    </section>

    <!-- ACTIVITY FEED -->
    <section v-if="false" class="panel glassy">
      <div class="panel-head">
        <div class="panel-title">📝 Activity Feed</div>
        <button class="btn ghostBtn" @click="clearActivity">Clear</button>
      </div>

      <div class="rooms-messages">
        <div v-for="(a, i) in activityFeed" :key="'activity-'+i" class="rm">
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
          <div v-for="(m, i) in chatMessages" :key="'cm-'+i" class="chat-msg">
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

  <!-- INCOMING CALL POPUP -->
  <div v-if="incomingCall" class="modal-backdrop" @click.self="rejectIncoming">
    <div class="modal glassy">
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

  <!-- CALLING TOAST -->
  <div v-if="callingToast" class="toast glassy">
    <span class="toast-dot"></span>
    {{ callingToast }}
    <button class="mini-x" @click="cancelCall">✕</button>
  </div>

  <!-- ELITE QUICK CREATE SHEET -->
  <transition name="fade">
    <div v-if="quickCreateOpen" class="quickCreateBackdrop" @click.self="closeQuickCreate">
      <div class="quickCreateSheet glassy">
        <div class="quickCreateHead">
          <div>
            <div class="panel-title">⚡ Create instantly</div>
            <div class="tiny muted">Post, call, room, live, and sync even when offline.</div>
          </div>
          <button class="mini-x" @click="closeQuickCreate">✕</button>
        </div>

        <div class="quickCreateGrid">
          <button class="quickCreateCard" @click="useQuickAction('post')">✍️ Text Post</button>
          <button class="quickCreateCard" @click="useQuickAction('photo')">🖼️ Photo Post</button>
          <button class="quickCreateCard" @click="useQuickAction('reel')">🎞️ Reel</button>
          <button class="quickCreateCard" @click="useQuickAction('call')">📞 Quick Call</button>
          <button class="quickCreateCard" @click="useQuickAction('room')">🎧 Start Room</button>
          <button class="quickCreateCard" @click="useQuickAction('live')">🔴 Go Live</button>
          <button class="quickCreateCard" @click="useQuickAction('saved')">💾 Saved</button>
          <button class="quickCreateCard" @click="useQuickAction('offline')">
            {{ isNetworkOnline ? "☁️ Force Queue Draft" : "📦 Queue Offline Post" }}
          </button>
        </div>

        <div v-if="offlineQueueCount" class="quickQueueBar">
          <span>Queued posts: {{ offlineQueueCount }}</span>
          <button class="btn ghostBtn" @click="flushOfflineQueue">Sync now</button>
        </div>
      </div>
    </div>
  </transition>

  <!-- ELITE BOTTOM NAV -->
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
import { createSocket } from "../api/socket"
import { startLocation, useLocation, sendLocationNow } from "../composables/useLocation"

const router = useRouter()
const apiUrl = (import.meta.env.VITE_API_URL || "").trim()
const token = localStorage.getItem("token") || ""

const me = (() => {
  try { return JSON.parse(localStorage.getItem("user") || "null") } catch { return null }
})()
const { coords, status: locStatus, hasLocation, isApproximate, locationLabel, computeDistances, sortByDistance } = useLocation()
/* =========================
   STORAGE KEYS
========================= */
const DASH_PREFS_KEY = "pulse_dashboard_prefs_v3"
const DASH_DRAFT_KEY = "pulse_dashboard_draft_v3"
const DASH_SAVED_POSTS_KEY = "pulse_dashboard_saved_posts_v1"
const DASH_PINNED_POSTS_KEY = "pulse_dashboard_pinned_posts_v1"
const DASH_ACTIVITY_KEY = "pulse_dashboard_activity_v2"
const DASH_STREAK_KEY = "pulse_dashboard_streak_v1"
const DASH_FOCUS_KEY = "pulse_dashboard_focus_v1"
const DASH_OFFLINE_QUEUE_KEY = "pulse_dashboard_offline_queue_v1"
const DASH_CHAT_KEY = "pulse_dashboard_chat_v1"
const DASH_CHAT_QUEUE_KEY = "pulse_dashboard_chat_queue_v1"

/* =========================
   READ HELPERS
========================= */
function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback))
  } catch {
    return fallback
  }
}

const savedPrefs = readJson(DASH_PREFS_KEY, {})
const initialSavedIds = readJson(DASH_SAVED_POSTS_KEY, [])
const initialPinnedIds = readJson(DASH_PINNED_POSTS_KEY, [])
const initialActivity = readJson(DASH_ACTIVITY_KEY, [])
const initialStreak = readJson(DASH_STREAK_KEY, { days: 1, lastOpenDate: "" })
const initialFocus = readJson(DASH_FOCUS_KEY, { focusMode: false })

/* =========================
   HELPERS
========================= */
function displayUserName(u) {
  return u?.display_name || u?.username || u?.name || u?.email || `User #${u?.id || "?"}`
}

function normalizePost(p) {
  const obj = p?.post && p?.reel ? p.post : p
  if (!obj || typeof obj !== "object") return null

  const id = Number(obj.id)
  if (!id) return null

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
    comment_count: Number(obj.comment_count ?? 0),
  }
}

function displayPostUser(post) {
  return post?.display_name || post?.username || `User #${post?.user_id || "?"}`
}

function getInitial(postOrUser) {
  if (typeof postOrUser === "object" && postOrUser) {
    const name =
      postOrUser.display_name ||
      postOrUser.username ||
      postOrUser.name ||
      postOrUser.email ||
      String(postOrUser.user_id || postOrUser.id || "U")
    return String(name).trim().charAt(0).toUpperCase() || "U"
  }
  return String(postOrUser || "U").trim().charAt(0).toUpperCase() || "U"
}

function formatDate(d) {
  if (!d) return ""
  const date = new Date(d)
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString()
}

function getMedia(url) {
  if (!url) return ""
  if (url.startsWith("http")) return url
  return `${apiUrl}${url}`
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" })
}

function appendQuickTag(tag) {
  const current = String(caption.value || "")
  if (current.includes(tag)) return
  caption.value = current.trim() ? `${current.trim()} ${tag}` : `${tag} `
}

function persistPrefs() {
  try {
    localStorage.setItem(
      DASH_PREFS_KEY,
      JSON.stringify({
        feedMode: feedMode.value,
        search: search.value,
        globalMuted: globalMuted.value,
        sortMode: sortMode.value,
        postFilter: postFilter.value,
      })
    )
  } catch {}
}

function persistActivity() {
  try {
    localStorage.setItem(DASH_ACTIVITY_KEY, JSON.stringify(activityFeed.value.slice(0, 40)))
  } catch {}
}

function addActivity(title, text) {
  activityFeed.value = [
    { title, text, created_at: new Date().toISOString() },
    ...activityFeed.value,
  ].slice(0, 40)
  persistActivity()
}

function persistFocusMode() {
  try {
    localStorage.setItem(DASH_FOCUS_KEY, JSON.stringify({ focusMode: focusMode.value }))
  } catch {}
}

function todayDateKey() {
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

function updateDailyStreak() {
  const today = todayDateKey()
  const prev = initialStreak?.lastOpenDate || ""
  if (!prev) {
    streak.value = { days: 1, lastOpenDate: today }
  } else if (prev !== today) {
    const prevDate = new Date(prev)
    const now = new Date(today)
    const diff = Math.round((now - prevDate) / 86400000)
    if (diff === 1) {
      streak.value = { days: Math.max(1, Number(streak.value.days || 1) + 1), lastOpenDate: today }
    } else if (diff > 1) {
      streak.value = { days: 1, lastOpenDate: today }
    }
  }

  try {
    localStorage.setItem(DASH_STREAK_KEY, JSON.stringify(streak.value))
  } catch {}
}

/* =========================
   MODEBAR
========================= */
const isNetworkOnline = ref(typeof navigator !== "undefined" ? navigator.onLine : true)
const isSyncingQueue = ref(false)
const quickCreateOpen = ref(false)
const quickCreateIntent = ref("post")
const offlineQueue = ref(readJson(DASH_OFFLINE_QUEUE_KEY, []))
const offlineQueueCount = computed(() => Array.isArray(offlineQueue.value) ? offlineQueue.value.length : 0)

function persistOfflineQueue() {
  try {
    localStorage.setItem(DASH_OFFLINE_QUEUE_KEY, JSON.stringify(offlineQueue.value.slice(0, 30)))
  } catch {}
}
function persistChatMessages() {
  try {
    localStorage.setItem(DASH_CHAT_KEY, JSON.stringify(chatMessages.value.slice(-300)))
  } catch {}
}

function loadChatMessages() {
  try {
    const saved = JSON.parse(localStorage.getItem(DASH_CHAT_KEY) || "[]")
    chatMessages.value = Array.isArray(saved) ? saved : []
  } catch {
    chatMessages.value = []
  }
}
function openQuickCreate(intent = "post") {
  quickCreateIntent.value = intent
  quickCreateOpen.value = true
}

function closeQuickCreate() {
  quickCreateOpen.value = false
}

function queuePostDraft(reason = "offline") {
  const item = {
    id: `draft_${Date.now()}`,
    caption: String(caption.value || ""),
    created_at: new Date().toISOString(),
    image_name: imageFile.value?.name || "",
    video_name: videoFile.value?.name || "",
    reason,
  }
  offlineQueue.value = [item, ...offlineQueue.value].slice(0, 30)
  persistOfflineQueue()
  draftSavedNote.value = reason === "offline"
    ? "Offline: your post was queued and will sync when internet returns"
    : "Draft queued for sync"
  addActivity("Offline Queue", "Saved a queued post draft")
}

async function flushOfflineQueue() {
  if (!isNetworkOnline.value || !token || !offlineQueue.value.length || posting.value || isSyncingQueue.value) return
  isSyncingQueue.value = true

  try {
    const queue = [...offlineQueue.value]
    const stillPending = []

    for (const item of queue) {
      const form = new FormData()
      form.append("caption", item.caption || "")

      const res = await fetch(`${apiUrl}/posts`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        stillPending.push(item)
        continue
      }

      const clean = normalizePost(data)
      if (clean) {
        posts.value.unshift(clean)
        await ensureLikeState(clean.id)
      }
    }

    offlineQueue.value = stillPending
    persistOfflineQueue()

    if (!stillPending.length) {
      draftSavedNote.value = "Queued posts synced"
    }
  } finally {
    isSyncingQueue.value = false
  }
}

function handleNetworkOnline() {
  isNetworkOnline.value = true
  draftSavedNote.value = offlineQueueCount.value ? "Back online. Syncing queued posts…" : "Back online"
  flushOfflineQueue()
}

function handleNetworkOffline() {
  isNetworkOnline.value = false
  draftSavedNote.value = "Offline mode enabled"
}

function useQuickAction(action) {
  closeQuickCreate()

  if (action === "post") {
    setFeedMode("foryou")
    focusComposer()
  } else if (action === "photo") {
    setFeedMode("foryou")
    focusComposer()
    draftSavedNote.value = "Tap the image picker in composer to attach a photo"
  } else if (action === "reel") {
    setFeedMode("reels")
    focusComposer()
    draftSavedNote.value = "Tap the video picker in composer to attach a reel"
  } else if (action === "call") {
    if (callRooms.value.length) joinCallRoom(callRooms.value[0])
    else createFastRoom()
  } else if (action === "room") {
    createFastRoom()
  } else if (action === "live") {
    startLive()
  } else if (action === "saved") {
    openSavedMode()
  } else if (action === "offline") {
    queuePostDraft(isNetworkOnline.value ? "manual" : "offline")
  }
}
const feedMode = ref(savedPrefs.feedMode || "foryou")
const sortMode = ref(savedPrefs.sortMode || "latest")
const postFilter = ref(savedPrefs.postFilter || "all")

function setFeedMode(mode) {
  feedMode.value = mode

  nextTick(() => {
    if (feedMode.value === "foryou" || feedMode.value === "reels") {
      setupVideoObserver()
      applyMuteToAllVideos()
    } else {
      try { videoObserver?.disconnect() } catch {}
    }

    if (feedMode.value === "foryou") setupLoadMoreObserver()
    else { try { loadMoreObserver?.disconnect() } catch {} }

    if (feedMode.value === "reels") setupReelsLoadMoreObserver()
    else { try { reelsLoadMoreObserver?.disconnect() } catch {} }
  })
}

function openSavedMode() {
  setFeedMode("saved")
  scrollToTop()
}

function openPinnedMode() {
  setFeedMode("pinned")
  scrollToTop()
}

const feedModeLabel = computed(() => {
  if (feedMode.value === "foryou") return "For You"
  if (feedMode.value === "reels") return "Reels"
  if (feedMode.value === "following") return "Following"
  if (feedMode.value === "threads") return "Threads"
  if (feedMode.value === "rooms") return "Rooms"
  if (feedMode.value === "live") return "Live"
  if (feedMode.value === "saved") return "Saved"
  if (feedMode.value === "pinned") return "Pinned"
  return "Feed"
})

/* =========================
   SOCKET
========================= */
let socket = null
const socketConnected = ref(false)
const onlinePairs = ref([])
const liveStreams = ref([])
const statusNote = ref("")

const onlineCount = computed(() => Array.isArray(onlinePairs.value) ? onlinePairs.value.length : 0)

function isOnline(userId) {
  const id = String(userId)
  return onlinePairs.value.some(([uid]) => String(uid) === id)
}

function safeRegisterOnline() {
  if (!socket) return
  if (!me?.id) return

  const username = me?.username || me?.display_name || me?.name || me?.email || `User${me.id}`

  socket.emit("user:online", { userId: String(me.id), username })
  socket.emit("register-user", { id: String(me.id), username })

  if (chatRoom.value && chatRoom.value !== "callrooms") {
    socket.emit("join-room", chatRoom.value)
  }

  socket.emit("get-live-list")
  socket.emit("presence:get")
  socket.emit("callroom:list:get")
}

function reconnectSocket() {
  statusNote.value = "Reconnecting socket…"
  try { socket?.cleanupPulseSocket?.() } catch {}
  socket = null
  connectSocket()
}

function connectSocket() {
  socket = createSocket()

  socket.on("connect", () => {
    socketConnected.value = true
    statusNote.value = ""
    safeRegisterOnline()
    startLocation({ socket, userId: me?.id, autoWatch: true })
    refreshCallRooms()
    addActivity("Socket", "Connected to Pulse realtime service")
  })

  socket.on("disconnect", () => {
    socketConnected.value = false
    if (token) statusNote.value = "Socket disconnected. Tap Reconnect."
    addActivity("Socket", "Disconnected from realtime service")
  })

  socket.io?.on?.("reconnect", () => {
    socketConnected.value = true
    safeRegisterOnline()
    refreshCallRooms()
    addActivity("Socket", "Reconnected successfully")
  })
}

/* =========================
   PEOPLE
========================= */
const peopleOpen = ref(true)
const people = ref([])
const peopleLoading = ref(false)
const peopleError = ref("")
const search = ref(savedPrefs.search || "")
const searchRef = ref(null)

function togglePeople() {
  peopleOpen.value = !peopleOpen.value
}

const filteredPeople = computed(() => {
  const q = (search.value || "").trim().toLowerCase()
  if (!q) return people.value
  return people.value.filter((u) => {
    const n = String(displayUserName(u)).toLowerCase()
    return n.includes(q) || String(u.id || "").includes(q)
  })
})

async function fetchPeople() {
  if (!token) return

  peopleLoading.value = true
  peopleError.value = ""

  try {
    const res = await fetch(`${apiUrl}/users`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()

    if (!res.ok) {
      peopleError.value = data?.error || "Failed to load users"
      people.value = []
      return
    }

    people.value = Array.isArray(data) ? data : []
  } catch {
    peopleError.value = "Failed to load users"
    people.value = []
  } finally {
    peopleLoading.value = false
  }
}

function openUserProfile(u) {
  const id = u?.id ? String(u.id) : ""
  if (!id) return
  router.push(`/profile/${id}`)
}

/* =========================
   DIRECT CALLS
========================= */
const incomingCall = ref(null)
const callBusy = ref(false)
const callingToast = ref("")
const pendingRoomId = ref("")
const pendingKind = ref("audio")
const pendingUserId = ref("")
const pendingUserName = ref("")

function startCall(user, kind = "audio") {
  if (!socket) return
  if (!token) return alert("Login again to call.")
  if (!user?.id) return alert("User not found.")
  if (!isOnline(user.id)) return alert("User is offline.")
  if (callBusy.value) return alert("You already have a call in progress.")

  const displayName = displayUserName(user)

  callBusy.value = true
  pendingKind.value = kind === "video" ? "video" : "audio"
  pendingUserId.value = String(user.id)
  pendingUserName.value = displayName
  callingToast.value = `Calling ${displayName}…`
  pendingRoomId.value = ""

  addActivity("Call", `Calling ${displayName}`)
  socket.emit("call:request", {
    toUserId: String(user.id),
    kind: pendingKind.value,
  })
}

function cancelCall() {
  callingToast.value = ""
  callBusy.value = false

  if (pendingRoomId.value) {
    socket?.emit("call:cancel", { roomId: pendingRoomId.value })
  }

  pendingRoomId.value = ""
  pendingUserId.value = ""
  pendingUserName.value = ""
}

function acceptIncoming() {
  if (!incomingCall.value || !socket) return

  const roomId = String(incomingCall.value.roomId || "")
  const kind = incomingCall.value.kind === "video" ? "video" : "audio"
  const callerName = incomingCall.value.fromName || "User"

  socket.emit("call:accept", { roomId })

  router.push({
    path: "/call",
    query: {
      roomId,
      role: "receiver",
      mode: "receiver",
      kind,
      name: callerName,
    },
  })

  addActivity("Call", `Accepted ${kind} call from ${callerName}`)
  incomingCall.value = null
}

function rejectIncoming() {
  if (!incomingCall.value || !socket) return

  socket.emit("call:reject", {
    roomId: incomingCall.value.roomId,
  })

  addActivity("Call", "Rejected incoming call")
  incomingCall.value = null
}

/* =========================
   CALL ROOMS
========================= */
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

function refreshCallRooms() {
  if (!socket) return
  callRoomsLoading.value = true
  callRoomsError.value = ""

  socket.emit("callroom:list:get", {}, (res) => {
    if (res?.error) {
      callRoomsLoading.value = false
      callRoomsError.value = res.error
      return
    }

    if (Array.isArray(res?.rooms)) {
      callRooms.value = res.rooms.map(normalizeCallRoom).filter(Boolean)
      callRoomsLoading.value = false
    }
  })

  setTimeout(() => {
    callRoomsLoading.value = false
  }, 1200)
}

function createCallRoom() {
  if (!socket) return
  if (!token) return alert("Login again first.")

  creatingCallRoom.value = true
  callRoomsError.value = ""

  const payload = {
    name: (callRoomName.value || "").trim() || `Room ${Date.now().toString().slice(-4)}`,
    kind: callRoomKind.value === "video" ? "video" : "audio",
  }

  addActivity("Call Room", `Creating ${payload.kind} room: ${payload.name}`)

  socket.emit("callroom:create", payload, (res) => {
    if (res?.error) {
      creatingCallRoom.value = false
      callRoomsError.value = res.error
      return
    }

    const roomId = res?.room?.roomId || res?.roomId
    if (roomId) {
      creatingCallRoom.value = false
      callRoomName.value = ""
      router.push(`/room-call?roomId=${encodeURIComponent(roomId)}`)
    }
  })
}

function createFastRoom() {
  callRoomKind.value = "video"
  callRoomName.value = `${meName.value}'s Elite Room`
  createCallRoom()
}

function joinCallRoom(room) {
  const roomId = String(room?.roomId || "")
  if (!roomId) return
  addActivity("Call Room", `Joining room ${room.name || roomId}`)
  router.push(`/room-call?roomId=${encodeURIComponent(roomId)}`)
}

/* =========================
   POSTS
========================= */
const posts = ref([])
const loading = ref(true)
const posting = ref(false)
const error = ref("")

const composerRef = ref(null)
const caption = ref("")
const imageFile = ref(null)
const videoFile = ref(null)
const draftSavedNote = ref("")

const meName = computed(() => me?.display_name || me?.username || "You")
const myInitial = computed(() => String(meName.value || "Y").trim().charAt(0).toUpperCase() || "Y")
const captionLength = computed(() => String(caption.value || "").length)

function focusComposer() {
  try { composerRef.value?.focus?.() } catch {}
}

function clearDraft() {
  caption.value = ""
  imageFile.value = null
  videoFile.value = null
  draftSavedNote.value = "Draft cleared"
  try { localStorage.removeItem(DASH_DRAFT_KEY) } catch {}
}

async function fetchPosts() {
  try {
    loading.value = true
    error.value = ""

    const res = await fetch(`${apiUrl}/posts`)
    const data = await res.json()

    if (!Array.isArray(data)) {
      posts.value = []
      error.value = data?.error || "Failed to load posts"
      return
    }

    posts.value = data.map(normalizePost).filter(Boolean)

    pageSize.value = 8
    reelsPageSize.value = 8

    await preloadLikesForPosts(posts.value.slice(0, 24))
    await nextTick()

    if (feedMode.value === "foryou") {
      setupLoadMoreObserver()
      setupVideoObserver()
      applyMuteToAllVideos()
    }

    if (feedMode.value === "reels") {
      setupReelsLoadMoreObserver()
      setupVideoObserver()
      applyMuteToAllVideos()
    }
  } catch {
    posts.value = []
    error.value = "Failed to fetch posts"
  } finally {
    loading.value = false
  }
}

async function submitPost() {
  if (!token) return alert("Login again to post.")
  if (!caption.value.trim() && !imageFile.value && !videoFile.value) return

  if (!isNetworkOnline.value) {
    queuePostDraft("offline")
    clearDraft()
    return
  }

  if (feedMode.value === "reels") return await submitReel()

  try {
    posting.value = true
    error.value = ""

    const form = new FormData()
    form.append("caption", caption.value || "")
    if (imageFile.value) form.append("image", imageFile.value)
    if (videoFile.value) form.append("video", videoFile.value)

    const res = await fetch(`${apiUrl}/posts`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    })

    const data = await res.json()
    if (!res.ok) {
      error.value = data?.error || "Post failed"
      return
    }

    const clean = normalizePost(data)
    if (clean) {
      posts.value.unshift(clean)
      await ensureLikeState(clean.id)
      addActivity("Post", "Created a new post")
    }

    clearDraft()
    draftSavedNote.value = "Posted successfully"

    await nextTick()
    if (feedMode.value === "foryou" || feedMode.value === "reels") {
      setupVideoObserver()
      applyMuteToAllVideos()
    }
  } catch {
    if (!isNetworkOnline.value) {
      queuePostDraft("offline")
      clearDraft()
    } else {
      error.value = "Post failed"
    }
  } finally {
    posting.value = false
  }
}

async function submitReel() {
  if (!token) return alert("Login again to post a reel.")
  if (!videoFile.value) return alert("Reels require a VIDEO. Pick a video file.")

  try {
    posting.value = true
    error.value = ""

    const form = new FormData()
    form.append("caption", caption.value || "")
    form.append("video", videoFile.value)

    const res = await fetch(`${apiUrl}/reels`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    })

    const data = await res.json()
    if (!res.ok) {
      error.value = data?.error || "Reel failed"
      return
    }

    const clean = normalizePost(data?.post || data)
    if (clean) {
      posts.value.unshift(clean)
      await ensureLikeState(clean.id)
      addActivity("Reel", "Created a new reel")
    }

    clearDraft()
    draftSavedNote.value = "Reel posted successfully"

    await nextTick()
    setupVideoObserver()
    applyMuteToAllVideos()
  } catch {
    error.value = "Reel failed"
  } finally {
    posting.value = false
  }
}

function onPickImage(e) {
  imageFile.value = e.target.files?.[0] || null
}

function onPickVideo(e) {
  videoFile.value = e.target.files?.[0] || null
}

async function refreshAll() {
  await fetchPosts()
  if (token) await fetchPeople()

  try { socket?.emit("get-live-list") } catch {}
  try { socket?.emit("presence:get") } catch {}
  try { refreshCallRooms() } catch {}

  addActivity("Dashboard", "Refreshed all sections")
}

/* =========================
   FILTERS / SORT / TRENDING
========================= */
const filteredBaseCount = computed(() => sortedFilteredPosts.value.length)
const likesByPost = ref({})
const likeBusyByPost = ref({})

const baseFiltered = computed(() => {
  const q = search.value.trim().toLowerCase()

  let list = posts.value

  if (postFilter.value === "video") {
    list = list.filter((p) => !!p.video_url)
  } else if (postFilter.value === "image") {
    list = list.filter((p) => !!p.image_url && !p.video_url)
  } else if (postFilter.value === "text") {
    list = list.filter((p) => !p.image_url && !p.video_url)
  }

  if (q) {
    list = list.filter((p) => {
      const text = `${p.caption || ""} ${displayPostUser(p)}`.toLowerCase()
      return text.includes(q)
    })
  }

  return list
})

const sortedFilteredPosts = computed(() => {
  const list = [...baseFiltered.value]

  if (sortMode.value === "popular") {
    return list.sort((a, b) => (likesByPost.value[b.id]?.count ?? 0) - (likesByPost.value[a.id]?.count ?? 0))
  }

  if (sortMode.value === "media") {
    return list.sort((a, b) => {
      const am = a.video_url || a.image_url ? 1 : 0
      const bm = b.video_url || b.image_url ? 1 : 0
      if (bm !== am) return bm - am
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }

  if (sortMode.value === "text") {
    return list.sort((a, b) => {
      const at = !a.video_url && !a.image_url ? 1 : 0
      const bt = !b.video_url && !b.image_url ? 1 : 0
      if (bt !== at) return bt - at
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }

  return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
})

const videoPosts = computed(() => sortedFilteredPosts.value.filter((p) => !!p.video_url))
const forYouPosts = computed(() => videoPosts.value)
const followingPosts = computed(() => sortedFilteredPosts.value.slice(0, 40))
const threadsPosts = computed(() => sortedFilteredPosts.value.slice(0, 60))
const reelsPosts = computed(() => videoPosts.value)

const trendingTags = computed(() => {
  const counts = new Map()

  posts.value.forEach((p) => {
    const text = String(p.caption || "")
    const tags = text.match(/#[a-zA-Z0-9_]+/g) || []
    tags.forEach((tag) => {
      counts.set(tag, (counts.get(tag) || 0) + 1)
    })
  })

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([tag]) => tag)
})

function applyTrendTag(tag) {
  search.value = tag
  scrollToTop()
}

function surpriseMe() {
  const modes = ["foryou", "reels", "following", "threads", "rooms", "live", "saved", "pinned"]
  const next = modes[Math.floor(Math.random() * modes.length)]
  setFeedMode(next)

  if (next === "rooms") {
    const roomChoices = ["global", "support", "dev", "random", "callrooms"]
    selectChat(roomChoices[Math.floor(Math.random() * roomChoices.length)])
  }

  addActivity("Magic", `Surprise mode opened: ${next}`)
  scrollToTop()
}

/* =========================
   SAVED / PINNED
========================= */
const savedPostIds = ref(Array.isArray(initialSavedIds) ? initialSavedIds.map(Number) : [])
const pinnedPostIds = ref(Array.isArray(initialPinnedIds) ? initialPinnedIds.map(Number) : [])

function persistSaved() {
  try { localStorage.setItem(DASH_SAVED_POSTS_KEY, JSON.stringify(savedPostIds.value)) } catch {}
}

function persistPinned() {
  try { localStorage.setItem(DASH_PINNED_POSTS_KEY, JSON.stringify(pinnedPostIds.value)) } catch {}
}

function isSaved(postId) {
  return savedPostIds.value.includes(Number(postId))
}

function isPinned(postId) {
  return pinnedPostIds.value.includes(Number(postId))
}

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

const savedPosts = computed(() => {
  const ids = new Set(savedPostIds.value)
  return posts.value.filter((p) => ids.has(Number(p.id)))
})

const pinnedPosts = computed(() => {
  const ids = new Set(pinnedPostIds.value)
  return posts.value.filter((p) => ids.has(Number(p.id)))
})

/* =========================
   INTELLIGENCE LAYER
========================= */
const focusMode = ref(!!initialFocus.focusMode)
const streak = ref({
  days: Number(initialStreak?.days || 1),
  lastOpenDate: initialStreak?.lastOpenDate || "",
})

const todayStreak = computed(() => Math.max(1, Number(streak.value.days || 1)))

const moodGreeting = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return "Good morning."
  if (h < 18) return "Good afternoon."
  return "Good evening."
})

const totalLikesCount = computed(() =>
  Object.values(likesByPost.value).reduce((sum, item) => sum + Number(item?.count || 0), 0)
)

const totalCommentCount = computed(() =>
  posts.value.reduce((sum, p) => sum + Number(commentCount(p.id) || 0), 0)
)

const creatorScore = computed(() => {
  return (
    posts.value.length * 10 +
    videoPosts.value.length * 12 +
    savedPostIds.value.length * 4 +
    pinnedPostIds.value.length * 5 +
    totalLikesCount.value * 2 +
    totalCommentCount.value * 3 +
    onlineCount.value * 2
  )
})

const creatorInsight = computed(() => {
  if (videoPosts.value.length >= 3) return "Your video engine is warming up. Keep feeding Reels and live rooms."
  if (savedPostIds.value.length >= 5) return "You are curating your own content library like a creator operating system."
  if (posts.value.length >= 5) return "Momentum is building. Add more reels and room activity for a stronger growth loop."
  return "Post more consistently, create one room, and go live once to unlock the next level of engagement."
})

const spotlightTag = computed(() => trendingTags.value[0] || "")
const spotlightPerson = computed(() => {
  const onlineUser = people.value.find((u) => isOnline(u.id))
  return onlineUser ? displayUserName(onlineUser) : "You"
})

const quickStatusText = computed(() => {
  if (!socketConnected.value) return "Realtime sleeping"
  if (liveStreams.value.length > 0) return "Live world active"
  if (callRooms.value.length > 0) return "Rooms buzzing"
  if (posts.value.length > 0) return "Creator mode online"
  return "Ready to build"
})

const smartLaunchCards = computed(() => {
  return [
    { id: "post", label: "✍️ Create a post" },
    { id: "room", label: callRooms.value.length ? "📞 Join a room" : "📞 Start a room" },
    { id: "live", label: liveStreams.value.length ? "🔴 Watch live" : "🔴 Start live" },
    { id: "saved", label: savedPostIds.value.length ? "💾 Open saved" : "💾 Build saved list" },
    { id: "reels", label: videoPosts.value.length ? "🎞️ Open reels" : "🎞️ Create first reel" },
    { id: "focus", label: focusMode.value ? "🧘 Exit focus mode" : "🧘 Enter focus mode" },
  ]
})

function runSmartLaunch(id) {
  if (id === "post") {
    focusComposer()
    scrollToTop()
  } else if (id === "room") {
    if (callRooms.value.length) joinCallRoom(callRooms.value[0])
    else createFastRoom()
  } else if (id === "live") {
    if (liveStreams.value.length) joinLive(liveStreams.value[0])
    else startLive()
  } else if (id === "saved") {
    openSavedMode()
  } else if (id === "reels") {
    setFeedMode("reels")
  } else if (id === "focus") {
    toggleFocusMode()
  }
}

function toggleFocusMode() {
  focusMode.value = !focusMode.value
  persistFocusMode()
  addActivity("Focus", focusMode.value ? "Entered focus mode" : "Exited focus mode")
}

/* =========================
   THREAD MEDIA
========================= */
const threadMediaOpen = ref({})
function toggleThreadMedia(postId) {
  threadMediaOpen.value = {
    ...threadMediaOpen.value,
    [postId]: !threadMediaOpen.value[postId],
  }
}

/* =========================
   LIKES
========================= */
async function preloadLikesForPosts(list) {
  if (!token) return
  await Promise.allSettled(list.map((p) => ensureLikeState(p.id)))
}

async function ensureLikeState(postId) {
  if (!token) return
  if (likesByPost.value[postId]) return

  try {
    const res = await fetch(`${apiUrl}/likes/${postId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    if (!res.ok) return

    likesByPost.value = {
      ...likesByPost.value,
      [postId]: { count: data?.count ?? 0, likedByMe: !!data?.likedByMe },
    }
  } catch {}
}

async function toggleLike(post) {
  const postId = post.id
  if (!token) return alert("Please login again to like posts.")
  await ensureLikeState(postId)

  const prev = likesByPost.value[postId] || { count: 0, likedByMe: false }
  const optimisticLiked = !prev.likedByMe
  const optimisticCount = Math.max(0, prev.count + (optimisticLiked ? 1 : -1))

  likesByPost.value = {
    ...likesByPost.value,
    [postId]: { count: optimisticCount, likedByMe: optimisticLiked },
  }
  likeBusyByPost.value = { ...likeBusyByPost.value, [postId]: true }

  try {
    const res = await fetch(`${apiUrl}/likes/${postId}/toggle`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()

    if (!res.ok) {
      likesByPost.value = { ...likesByPost.value, [postId]: prev }
      return
    }

    likesByPost.value = {
      ...likesByPost.value,
      [postId]: { count: data?.count ?? optimisticCount, likedByMe: !!data?.likedByMe },
    }
  } catch {
    likesByPost.value = { ...likesByPost.value, [postId]: prev }
  } finally {
    likeBusyByPost.value = { ...likeBusyByPost.value, [postId]: false }
  }
}

/* =========================
   COMMENTS
========================= */
const commentsOpenByPost = ref({})
const commentCountsByPost = ref({})

function commentCount(postId) {
  const liveCount = commentCountsByPost.value[postId]
  if (typeof liveCount === "number") return liveCount

  const post = posts.value.find((p) => Number(p.id) === Number(postId))
  return Number(post?.comment_count || 0)
}

function toggleComments(postId) {
  commentsOpenByPost.value = {
    ...commentsOpenByPost.value,
    [postId]: !commentsOpenByPost.value[postId],
  }
}

function openCommentsFromFeed(post) {
  const postId = typeof post === "object" ? post.id : post
  commentsOpenByPost.value = { ...commentsOpenByPost.value, [postId]: true }
  nextTick(() => {
    window.scrollBy({ top: 220, behavior: "smooth" })
  })
}

async function reloadCommentCount(postId) {
  try {
    const res = await fetch(`${apiUrl}/posts/${postId}/comments`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    const data = await res.json()
    if (!res.ok) return

    const items = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : []

    commentCountsByPost.value = {
      ...commentCountsByPost.value,
      [postId]: items.length,
    }

    posts.value = posts.value.map((p) =>
      Number(p.id) === Number(postId)
        ? { ...p, comment_count: items.length }
        : p
    )
  } catch {}
}

function handleCommentsChanged(postId) {
  reloadCommentCount(postId)
}

/* =========================
   SHARE / COPY
========================= */
async function sharePost(post) {
  const url = `${window.location.origin}/#post-${post.id}`
  try {
    if (navigator.share) {
      await navigator.share({
        title: "Pulse Post",
        text: post.caption || "Post",
        url,
      })
      return
    }
  } catch {}

  try {
    await navigator.clipboard.writeText(url)
    alert("Link copied!")
  } catch {
    alert(url)
  }
}

async function copyPostText(post) {
  const text = (post?.caption || "").trim() || "(no caption)"
  try {
    await navigator.clipboard.writeText(text)
    alert("Copied!")
  } catch {
    alert(text)
  }
}

/* =========================
   CHAT / ROOMS
========================= */
const chatOpen = ref(false)
const chatRoom = ref("global")
const chatText = ref("")
const chatMessages = ref([])
const chatBoxRef = ref(null)
const roomsChatBoxRef = ref(null)

function toggleChat() {
  chatOpen.value = !chatOpen.value
}

function selectChat(room) {
  chatRoom.value = room

  if (room === "callrooms") {
    refreshCallRooms()
    return
  }

  socket?.emit("join-room", room)
  chatMessages.value.push({
    from: "system",
    text: `Joined room: ${room}`,
    created_at: new Date().toISOString(),
  })

  addActivity("Chat", `Joined room ${room}`)

  nextTick(() => {
    scrollChatToBottom()
    scrollRoomsToBottom()
  })
}

function scrollChatToBottom() {
  const el = chatBoxRef.value
  if (el) el.scrollTop = el.scrollHeight
}

function scrollRoomsToBottom() {
  const el = roomsChatBoxRef.value
  if (el) el.scrollTop = el.scrollHeight
}

function sendChat() {
  if (chatRoom.value === "callrooms") return
  if (!chatText.value.trim()) return

  const msg = {
    room: chatRoom.value,
    from: me?.username || me?.display_name || "me",
    text: chatText.value,
    created_at: new Date().toISOString(),
    tempId: `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    pending: !socketConnected.value
  }

  // 1) Show immediately so sender doesn't wait
  chatMessages.value.push(msg)
  persistChatMessages()
  nextTick(() => {
    scrollChatToBottom()
    scrollRoomsToBottom()
  })

  // 2) Send if online, queue if offline
  if (socketConnected.value && socket) {
    socket.emit("send-room-message", msg)
  } else {
    queueChatMessage(msg)
  }

  addActivity("Chat", `Sent message in #${chatRoom.value}`)
  chatText.value = ""
}

/* =========================
   LIVE
========================= */
function startLive() {
  if (!token) return alert("Login again to go live.")
  const liveId = `live-${me?.id || Math.random().toString(36).slice(2, 8)}-${Date.now().toString().slice(-4)}`
  addActivity("Live", `Started live setup: ${liveId}`)
  router.push(`/live?mode=host&liveId=${encodeURIComponent(liveId)}`)
}

function joinLive(liveId) {
  addActivity("Live", `Joined live: ${liveId}`)
  router.push(`/live?mode=watch&liveId=${encodeURIComponent(liveId)}`)
}

/* =========================
   AUTH
========================= */
function logout() {
  localStorage.removeItem("token")
  localStorage.removeItem("user")
  try { socket?.cleanupPulseSocket?.() } catch {}
  router.push("/login")
}

/* =========================
   BOTTOM NAV
========================= */
const isHomeActive = computed(() =>
  ["foryou", "reels", "following", "threads", "rooms", "saved", "pinned"].includes(feedMode.value)
)

function goHome() {
  setFeedMode("foryou")
  scrollToTop()
}

function goInbox() {
  router.push("/messages")
}

function goLiveTab() {
  setFeedMode("live")
  scrollToTop()
}

function goProfile() {
  const id = me?.id ? String(me.id) : ""
  router.push(id ? `/profile/${id}` : "/profile")
}

function openChat(user) {
  const targetId = String(user?.id || user?.userId || "").trim()
  const targetName = displayUserName(user)
  if (!targetId) return
  router.push({
    path: "/messages",
    query: {
      userId: targetId,
      name: targetName,
    },
  })
}

/* =========================
   FOR YOU INFINITE
========================= */
const pageSize = ref(8)
const infiniteLoading = ref(false)
const loadMoreRef = ref(null)

const visiblePosts = computed(() => forYouPosts.value.slice(0, pageSize.value))
const canLoadMore = computed(() => forYouPosts.value.length > visiblePosts.value.length)

let loadMoreObserver = null

function setupLoadMoreObserver() {
  try { loadMoreObserver?.disconnect() } catch {}
  if (!loadMoreRef.value) return

  loadMoreObserver = new IntersectionObserver(async (entries) => {
    const hit = entries.some((e) => e.isIntersecting)
    if (!hit || !canLoadMore.value || infiniteLoading.value) return

    infiniteLoading.value = true
    await new Promise((r) => setTimeout(r, 160))
    pageSize.value += 6
    infiniteLoading.value = false

    await preloadLikesForPosts(visiblePosts.value.slice(-10))
    await nextTick()
    setupVideoObserver()
    applyMuteToAllVideos()
  }, { threshold: 0.15 })

  loadMoreObserver.observe(loadMoreRef.value)
}

function loadMore() {
  if (!canLoadMore.value || infiniteLoading.value) return
  pageSize.value += 6
}

/* =========================
   REELS INFINITE
========================= */
const reelsPageSize = ref(8)
const reelsInfiniteLoading = ref(false)
const reelsLoadMoreRef = ref(null)

const reelsVisible = computed(() => reelsPosts.value.slice(0, reelsPageSize.value))
const reelsCanLoadMore = computed(() => reelsPosts.value.length > reelsVisible.value.length)

let reelsLoadMoreObserver = null

function setupReelsLoadMoreObserver() {
  try { reelsLoadMoreObserver?.disconnect() } catch {}
  if (!reelsLoadMoreRef.value) return

  reelsLoadMoreObserver = new IntersectionObserver(async (entries) => {
    const hit = entries.some((e) => e.isIntersecting)
    if (!hit || !reelsCanLoadMore.value || reelsInfiniteLoading.value) return

    reelsInfiniteLoading.value = true
    await new Promise((r) => setTimeout(r, 160))
    reelsPageSize.value += 6
    reelsInfiniteLoading.value = false

    await preloadLikesForPosts(reelsVisible.value.slice(-10))
    await nextTick()
    setupVideoObserver()
    applyMuteToAllVideos()
  }, { threshold: 0.15 })

  reelsLoadMoreObserver.observe(reelsLoadMoreRef.value)
}

function loadMoreReels() {
  if (!reelsCanLoadMore.value || reelsInfiniteLoading.value) return
  reelsPageSize.value += 6
}

/* =========================
   VIDEO AUTOPLAY
========================= */
const activePostId = ref(null)
const globalMuted = ref(savedPrefs.globalMuted ?? true)
const videoMutedByPost = ref({})

function isVideoMuted(postId) {
  return globalMuted.value || !!videoMutedByPost.value[postId]
}

function toggleGlobalMute() {
  globalMuted.value = !globalMuted.value
  applyMuteToAllVideos()
  addActivity("Video", globalMuted.value ? "Muted all feed videos" : "Unmuted feed videos")
}

function applyMuteToVideo(postId) {
  const v = document.querySelector(`video.tt-video[data-post-id="${postId}"]`)
  if (!v) return
  v.muted = isVideoMuted(postId)
  v.volume = v.muted ? 0 : 1
}

function applyMuteToAllVideos() {
  const vids = document.querySelectorAll("video.tt-video")
  vids.forEach((v) => {
    const pid = v.getAttribute("data-post-id")
    v.muted = globalMuted.value || !!videoMutedByPost.value[pid]
    v.volume = v.muted ? 0 : 1
  })
}

let videoObserver = null
function setupVideoObserver() {
  try { videoObserver?.disconnect() } catch {}

  videoObserver = new IntersectionObserver(async (entries) => {
    const visible = entries
      .filter((e) => e.isIntersecting)
      .sort((a, b) => (b.intersectionRatio || 0) - (a.intersectionRatio || 0))

    if (visible.length) {
      const top = visible[0].target
      const id = Number(top.getAttribute("data-post-id") || 0) || null
      activePostId.value = id
    }

    for (const entry of entries) {
      const video = entry.target
      const postId = Number(video.getAttribute("data-post-id") || 0)
      applyMuteToVideo(postId)

      if (feedMode.value !== "foryou" && feedMode.value !== "reels") {
        try { video.pause() } catch {}
        continue
      }

      if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
        try { await video.play() } catch {}
      } else {
        try { video.pause() } catch {}
      }
    }
  }, { threshold: [0.25, 0.6, 0.85] })

  nextTick(() => {
    if (feedMode.value !== "foryou" && feedMode.value !== "reels") return
    document.querySelectorAll("video.tt-video").forEach((v) => videoObserver.observe(v))
  })
}

/* =========================
   TOOLS / DIAGNOSTICS
========================= */
const toolsOpen = ref(false)
const studioOpen = ref(false)
const turnNote = ref("")
const activityFeed = ref(Array.isArray(initialActivity) ? initialActivity : [])

function toggleTools() {
  toolsOpen.value = !toolsOpen.value
}

function toggleStudio() {
  studioOpen.value = !studioOpen.value
}

function clearActivity() {
  activityFeed.value = []
  persistActivity()
}

async function copyMyProfileLink() {
  const id = me?.id ? String(me.id) : ""
  const url = `${window.location.origin}/#/profile/${id}`
  try {
    await navigator.clipboard.writeText(url)
    alert("Profile link copied!")
  } catch {
    alert(url)
  }
}

async function copyDiagnostics() {
  const diag = {
    at: new Date().toISOString(),
    apiUrl,
    socketConnected: socketConnected.value,
    me: me ? { id: me.id, username: me.username || me.display_name || me.name || me.email } : null,
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
  } catch {
    alert(JSON.stringify(diag, null, 2))
  }
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
  } catch {
    turnNote.value = "TURN test failed (network)."
  }
}

async function requestNotifications() {
  try {
    if (!("Notification" in window)) return alert("Notifications not supported here.")
    const perm = await Notification.requestPermission()
    alert(`Notifications: ${perm}`)
  } catch {
    alert("Notification permission failed.")
  }
}

function hardResetApp() {
  const ok = confirm("Hard reset local app data? (token + user + drafts) You will be logged out.")
  if (!ok) return
  localStorage.clear()
  router.push("/login")
}

/* =========================
   WATCHERS
========================= */
watch([feedMode, search, globalMuted, sortMode, postFilter], persistPrefs)

watch(caption, (v) => {
  try {
    localStorage.setItem(DASH_DRAFT_KEY, JSON.stringify({ caption: v || "" }))
    draftSavedNote.value = v ? "Draft saved locally" : ""
  } catch {}
})

watch(focusMode, persistFocusMode)

/* =========================
   KEYBOARD SHORTCUTS
========================= */
function handleKeydown(e) {
  const tag = (e.target?.tagName || "").toLowerCase()
  const typing = tag === "input" || tag === "textarea"

  if (e.key === "/" && !typing) {
    e.preventDefault()
    searchRef.value?.focus?.()
    return
  }

  if (typing) return

  if (e.key === "c") {
    e.preventDefault()
    focusComposer()
  } else if (e.key === "r") {
    e.preventDefault()
    refreshAll()
  } else if (e.key === "g") {
    e.preventDefault()
    goLiveTab()
  } else if (e.key === "m") {
    e.preventDefault()
    toggleGlobalMute()
  } else if (e.key === "f") {
    e.preventDefault()
    toggleFocusMode()
  }
}

/* =========================
   LIFECYCLE
========================= */
onMounted(async () => {
  updateDailyStreak()
  loadChatMessages()
  
    
  try {
    const savedDraft = JSON.parse(localStorage.getItem(DASH_DRAFT_KEY) || "{}")
    if (savedDraft?.caption) {
      caption.value = savedDraft.caption
      draftSavedNote.value = "Recovered saved draft"
    }
  } catch {}

  await fetchPosts()
  if (token) await fetchPeople()

  if (typeof window !== "undefined") {
    if (window.innerWidth <= 900) {
      peopleOpen.value = true
    }
    if (window.innerWidth <= 700 && feedMode.value === "live") {
      feedMode.value = "foryou"
    }
  }

  connectSocket()

    socket.on("receive-message", (msg) => {
      // If it's our own message coming back, swap the pending one
      if (msg.tempId && msg.from === (me?.username || me?.display_name || "me")) {
        const idx = chatMessages.value.findIndex(m => m.tempId === msg.tempId)
        if (idx !== -1) {
          chatMessages.value[idx] = { ...msg, pending: false }
          chatMessages.value = [...chatMessages.value] // trigger Vue reactivity
          persistChatMessages()
          nextTick(() => {
            scrollChatToBottom()
            scrollRoomsToBottom()
          })
          return
        }
      }

      // For other people's messages, block raw duplicates
      const isDup = chatMessages.value.some(m =>
        m.text === msg.text &&
        m.from === msg.from &&
        Math.abs(new Date(m.created_at || 0) - new Date(msg.created_at || Date.now())) < 3000
      )

      if (!isDup) {
        chatMessages.value.push(msg)
        persistChatMessages()
        nextTick(() => {
          scrollChatToBottom()
          scrollRoomsToBottom()
        })
      }
    })

    socket.on("live-list", (streams) => {
      liveStreams.value = Array.isArray(streams) ? streams : []
    })

    // ✅ KEEP THIS — it is already in the correct spot
    socket.on("presence:list", ({ onlineUserIds } = {}) => {
      if (!Array.isArray(onlineUserIds)) return
      onlinePairs.value = onlineUserIds.map((id) => [String(id), ""])
    })

    // ✅ KEEP THIS — it is already in the correct spot
    socket.on("location:nearby", (nearby) => {
      if (!Array.isArray(nearby)) return

      people.value = people.value.map((u) => {
        const match = nearby.find((n) => String(n.userId) === String(u.id))
        if (match && Number.isFinite(match.distance)) {
          return { ...u, distance: match.distance }
        }
        return { ...u, distance: null }
      })
    })
    socket.on("call:ringing", ({ roomId, kind } = {}) => {
    pendingRoomId.value = String(roomId || "")
    pendingKind.value = kind === "video" ? "video" : (kind || pendingKind.value || "audio")
    callingToast.value = `Calling ${pendingUserName.value || "user"}…`

    if (pendingRoomId.value) {
      router.push({
        path: "/call",
        query: {
          roomId: pendingRoomId.value,
          role: "caller",
          mode: "caller",
          kind: pendingKind.value,
          toUserId: pendingUserId.value,
          name: pendingUserName.value || "User",
        },
      })
    }
  })

  socket.on("call:incoming", (p) => {
    incomingCall.value = p || null
  })

  socket.on("call:accepted", ({ roomId, kind } = {}) => {
    callingToast.value = ""
    callBusy.value = false

    if (roomId) pendingRoomId.value = String(roomId)

    if (pendingRoomId.value) {
      router.push({
        path: "/call",
        query: {
          roomId: pendingRoomId.value,
          role: "caller",
          mode: "caller",
          kind: kind === "video" ? "video" : (kind || pendingKind.value || "audio"),
          toUserId: pendingUserId.value,
          name: pendingUserName.value || "User",
        },
      })
    }
  })

  socket.on("call:ended", () => {
    callingToast.value = ""
    callBusy.value = false
    incomingCall.value = null
    pendingRoomId.value = ""
    pendingUserId.value = ""
    pendingUserName.value = ""
  })

  socket.on("call:busy", ({ message } = {}) => {
    callingToast.value = ""
    callBusy.value = false
    pendingRoomId.value = ""
    pendingUserId.value = ""
    pendingUserName.value = ""
    alert(message || "User is busy.")
  })

  socket.on("call:error", ({ message } = {}) => {
    callingToast.value = ""
    callBusy.value = false
    incomingCall.value = null
    pendingRoomId.value = ""
    pendingUserId.value = ""
    pendingUserName.value = ""
    alert(message || "Call error")
  })

  socket.on("callroom:list", (list) => {
    callRoomsLoading.value = false
    callRooms.value = Array.isArray(list)
      ? list.map(normalizeCallRoom).filter(Boolean)
      : []
  })

  socket.on("callroom:created", (payload = {}) => {
    creatingCallRoom.value = false
    callRoomName.value = ""

    const roomId = payload?.roomId || payload?.room?.roomId
    if (!roomId) {
      refreshCallRooms()
      return
    }

    router.push(`/room-call?roomId=${encodeURIComponent(roomId)}`)
  })

  socket.on("callroom:state", (payload = {}) => {
    const roomId = String(payload?.roomId || "")
    if (!roomId) {
      refreshCallRooms()
      return
    }

    callRooms.value = callRooms.value.map((room) => {
      if (room.roomId !== roomId) return room
      return normalizeCallRoom({
        ...room,
        users: payload.users || room.users || [],
        participantCount: Array.isArray(payload.users)
          ? payload.users.length
          : room.participantCount,
      })
    })
  })

  socket.on("callroom:user-joined", () => {
    refreshCallRooms()
  })

  socket.on("callroom:user-left", () => {
    refreshCallRooms()
  })

  socket.on("callroom:error", ({ message } = {}) => {
    creatingCallRoom.value = false
    callRoomsLoading.value = false
    callRoomsError.value = message || "Call room error"
  })

  await nextTick()

  if (feedMode.value === "foryou") {
    setupLoadMoreObserver()
    setupVideoObserver()
    applyMuteToAllVideos()
  }

  if (feedMode.value === "reels") {
    setupReelsLoadMoreObserver()
    setupVideoObserver()
    applyMuteToAllVideos()
  }

  window.addEventListener("keydown", handleKeydown)
  window.addEventListener("online", handleNetworkOnline)
  window.addEventListener("offline", handleNetworkOffline)

  if (offlineQueueCount.value && isNetworkOnline.value) {
    flushOfflineQueue()
  }
})

onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleKeydown)
  window.removeEventListener("online", handleNetworkOnline)
  window.removeEventListener("offline", handleNetworkOffline)

  try { socket?.off("call:ringing") } catch {}
  try { socket?.off("call:incoming") } catch {}
  try { socket?.off("call:accepted") } catch {}
  try { socket?.off("call:ended") } catch {}
  try { socket?.off("call:busy") } catch {}
  try { socket?.off("call:error") } catch {}

  try { socket?.off("callroom:list") } catch {}
  try { socket?.off("callroom:created") } catch {}
  try { socket?.off("callroom:state") } catch {}
  try { socket?.off("callroom:user-joined") } catch {}
  try { socket?.off("callroom:user-left") } catch {}
  try { socket?.off("callroom:error") } catch {}

  try { socket?.off("receive-message") } catch {}
  try { socket?.off("live-list") } catch {}
  try { socket?.off("presence:list") } catch {}
  try { socket?.off("online-users") } catch {}

  try { socket?.cleanupPulseSocket?.() } catch {}

  socket = null

  try { loadMoreObserver?.disconnect() } catch {}
  try { reelsLoadMoreObserver?.disconnect() } catch {}
  try { videoObserver?.disconnect() } catch {}

  loadMoreObserver = null
  reelsLoadMoreObserver = null
  videoObserver = null
})
</script>

<style scoped>
/* =========================================================
   RESET LAYOUT SIDEBAR
========================================================= */
:deep(.sidebar),
:deep(.layout-sidebar),
:deep(.left-menu),
:deep(.sidemenu),
:deep(aside.sidebar),
:deep(nav.sidebar) {
  display: none !important;
}

/* =========================================================
   DESIGN TOKENS & BASE
========================================================= */
.wrap {
  position: relative;
  min-height: 100vh;
  padding-bottom: 100px;
  color: #f0f2f7;
  overflow-x: hidden;
  background:
    radial-gradient(1200px 800px at 15% -5%, rgba(99, 102, 241, 0.12), transparent 60%),
    radial-gradient(1000px 700px at 85% 10%, rgba(236, 72, 153, 0.10), transparent 60%),
    radial-gradient(900px 600px at 50% 105%, rgba(59, 130, 246, 0.08), transparent 60%),
    linear-gradient(180deg, #070a14 0%, #0a0e1a 40%, #070b14 100%);
}

/* =========================================================
   AMBIENT ORBS
========================================================= */
.bg-orb {
  position: fixed;
  border-radius: 50%;
  filter: blur(100px);
  pointer-events: none;
  opacity: 0.25;
  z-index: 0;
  animation: floatOrb 12s ease-in-out infinite;
}

.orb1 {
  width: 320px;
  height: 320px;
  left: -60px;
  top: 40px;
  background: radial-gradient(circle, rgba(236, 72, 153, 0.45), transparent 70%);
  animation-duration: 14s;
}

.orb2 {
  width: 360px;
  height: 360px;
  right: -80px;
  top: 180px;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.40), transparent 70%);
  animation-duration: 18s;
  animation-direction: reverse;
}

.orb3 {
  width: 260px;
  height: 260px;
  left: 35%;
  bottom: 60px;
  background: radial-gradient(circle, rgba(59, 130, 246, 0.30), transparent 70%);
  animation-duration: 16s;
}

@keyframes floatOrb {
  0%, 100% { transform: translateY(0) translateX(0) scale(1); }
  33% { transform: translateY(-24px) translateX(12px) scale(1.03); }
  66% { transform: translateY(8px) translateX(-8px) scale(0.97); }
}

/* =========================================================
   GLASSMORPHISM SYSTEM
========================================================= */
.glassy {
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px) saturate(1.4);
  -webkit-backdrop-filter: blur(20px) saturate(1.4);
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.glassy:hover {
  border-color: rgba(255, 255, 255, 0.12);
}

/* =========================================================
   TOPBAR
========================================================= */
.topbar {
  position: sticky;
  top: 0;
  z-index: 60;
  padding: 14px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  background: rgba(7, 10, 20, 0.78);
  backdrop-filter: blur(24px) saturate(1.3);
  -webkit-backdrop-filter: blur(24px) saturate(1.3);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.brand:hover {
  opacity: 0.85;
}

.logo {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 50%, #6366f1 100%);
  border: 1px solid rgba(255, 255, 255, 0.15);
  font-size: 22px;
  box-shadow: 0 8px 24px rgba(139, 92, 246, 0.25);
  animation: floatLogo 5s ease-in-out infinite;
}

@keyframes floatLogo {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}

.title {
  font-weight: 900;
  font-size: 19px;
  letter-spacing: -0.02em;
  background: linear-gradient(135deg, #fff 0%, #c7d2fe 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.sub {
  opacity: 0.55;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.top-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
  align-items: center;
}

/* =========================================================
   HERO SECTION
========================================================= */
.heroStrip {
  position: relative;
  z-index: 2;
  max-width: 1100px;
  margin: 16px auto 0;
  padding: 0 20px;
}

.heroCard {
  padding: 24px;
  border-radius: 28px;
  display: grid;
  grid-template-columns: 1.6fr 1fr;
  gap: 24px;
  align-items: center;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.heroEyebrow {
  font-size: 11px;
  opacity: 0.5;
  letter-spacing: 0.2em;
  font-weight: 800;
  text-transform: uppercase;
  color: #a5b4fc;
}

.heroTitle {
  font-size: 32px;
  font-weight: 900;
  margin-top: 6px;
  letter-spacing: -0.03em;
  background: linear-gradient(135deg, #fff 0%, #e0e7ff 60%, #c7d2fe 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.heroSub {
  margin-top: 10px;
  opacity: 0.7;
  max-width: 520px;
  line-height: 1.65;
  font-size: 14px;
  font-weight: 400;
}

.heroActions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 18px;
}

.heroStats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.heroStat {
  padding: 16px 12px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  text-align: center;
  transition: transform 0.2s ease, background 0.2s ease;
}

.heroStat:hover {
  transform: translateY(-2px);
  background: rgba(255, 255, 255, 0.07);
}

.heroStatNum {
  font-size: 26px;
  font-weight: 900;
  background: linear-gradient(135deg, #fff, #c7d2fe);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.heroStatLab {
  margin-top: 6px;
  font-size: 11px;
  opacity: 0.55;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.heroCard--solo {
  grid-template-columns: 1fr;
}

/* =========================================================
   DYNAMIC ISLAND
========================================================= */
.dynamicIsland {
  position: sticky;
  top: 72px;
  z-index: 55;
  max-width: 1100px;
  margin: 14px auto;
  padding: 10px 18px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  background: rgba(10, 14, 28, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(24px);
}

.islandLeft {
  display: flex;
  align-items: center;
  gap: 10px;
}

.islandDot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ef4444;
  box-shadow: 0 0 10px rgba(239, 68, 68, 0.5);
  transition: all 0.3s ease;
}

.islandDot.on {
  background: #22c55e;
  box-shadow: 0 0 12px rgba(34, 197, 94, 0.5);
}

.islandText {
  font-size: 12px;
  opacity: 0.7;
  font-weight: 600;
}

.islandCenter {
  display: flex;
  gap: 8px;
}

.islandBtn {
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.06);
  padding: 8px 14px;
  border-radius: 999px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  color: #e2e8f0;
  transition: all 0.18s ease;
}

.islandBtn:hover {
  background: rgba(255, 255, 255, 0.12);
  transform: translateY(-1px);
}

.islandRight {
  display: flex;
  gap: 14px;
  font-weight: 800;
}

.islandStat {
  font-size: 12px;
  opacity: 0.85;
  letter-spacing: 0.02em;
}

/* =========================================================
   MODEBAR
========================================================= */
.modebar {
  position: relative;
  z-index: 2;
  max-width: 1100px;
  margin: 14px auto 0;
  padding: 0 20px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}

.mode {
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
  color: #e2e8f0;
  padding: 10px 16px;
  border-radius: 999px;
  cursor: pointer;
  font-weight: 700;
  font-size: 13px;
  opacity: 0.85;
  transition: all 0.2s ease;
  letter-spacing: -0.01em;
}

.mode:hover {
  background: rgba(255, 255, 255, 0.08);
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
}

.mode.on {
  background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%);
  border-color: rgba(139, 92, 246, 0.4);
  opacity: 1;
  box-shadow: 0 4px 20px rgba(236, 72, 153, 0.25);
  color: #fff;
}

.mode.reels.on {
  background: linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%);
  box-shadow: 0 4px 20px rgba(139, 92, 246, 0.3);
}

.mode-right {
  margin-left: auto;
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.searchWrap {
  position: relative;
}

.search {
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #f1f5f9;
  padding: 10px 40px 10px 16px;
  border-radius: 999px;
  outline: none;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s ease;
  min-width: 200px;
}

.search::placeholder {
  color: rgba(255, 255, 255, 0.35);
}

.search:focus {
  border-color: rgba(139, 92, 246, 0.4);
  box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1), 0 4px 16px rgba(0, 0, 0, 0.15);
  background: rgba(0, 0, 0, 0.45);
}

.searchClear {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.7);
  width: 26px;
  height: 26px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 11px;
  transition: all 0.15s ease;
  display: grid;
  place-items: center;
}

.searchClear:hover {
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
}

.selectControl {
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #f1f5f9;
  padding: 10px 14px;
  border-radius: 999px;
  outline: none;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.selectControl:focus {
  border-color: rgba(139, 92, 246, 0.4);
}

/* =========================================================
   FILTER BAR
========================================================= */
.filterbar {
  position: relative;
  z-index: 2;
  max-width: 1100px;
  margin: 12px auto 0;
  padding: 0 20px;
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.filterChip {
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
  color: #e2e8f0;
  padding: 8px 16px;
  border-radius: 999px;
  cursor: pointer;
  font-weight: 700;
  font-size: 13px;
  transition: all 0.2s ease;
}

.filterChip:hover {
  background: rgba(255, 255, 255, 0.08);
  transform: translateY(-1px);
}

.filterChip.on {
  background: rgba(236, 72, 153, 0.15);
  border-color: rgba(236, 72, 153, 0.35);
  color: #f9a8d4;
}

.filterHint {
  margin-left: auto;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* =========================================================
   MAIN LAYOUT
========================================================= */
.main {
  position: relative;
  z-index: 2;
  max-width: 1100px;
  margin: 0 auto;
  padding: 20px;
}

.dock {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}

.panel,
.composer,
.post {
  border-radius: 24px;
  padding: 20px;
  margin-bottom: 16px;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.panel-title {
  font-weight: 800;
  font-size: 15px;
  letter-spacing: -0.01em;
  display: flex;
  align-items: center;
  gap: 8px;
}

.dockActions {
  display: flex;
  gap: 8px;
  align-items: center;
}

/* =========================================================
   BUTTONS
========================================================= */
.btn,
.chip {
  border: none;
  border-radius: 999px;
  padding: 10px 16px;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.08);
  color: #e2e8f0;
  transition: all 0.2s ease;
  font-weight: 600;
  font-size: 13px;
  letter-spacing: -0.01em;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.btn:hover,
.chip:hover {
  transform: translateY(-1px);
  background: rgba(255, 255, 255, 0.14);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.btn-primary {
  background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%);
  color: #fff;
  box-shadow: 0 8px 24px rgba(236, 72, 153, 0.25);
  border: 1px solid rgba(236, 72, 153, 0.2);
}

.btn-primary:hover {
  box-shadow: 0 12px 32px rgba(236, 72, 153, 0.35);
  transform: translateY(-2px);
}

.danger {
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.2);
  color: #fca5a5;
}

.danger:hover {
  background: rgba(239, 68, 68, 0.2);
}

.ghost {
  opacity: 0.85;
}

.ghostBtn {
  opacity: 0.85;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.chip.mini {
  padding: 8px 12px;
  font-size: 12px;
}

/* =========================================================
   TRENDING
========================================================= */
.trendingRow {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.trendChip {
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(236, 72, 153, 0.1));
  color: #e2e8f0;
  padding: 10px 16px;
  border-radius: 999px;
  cursor: pointer;
  font-weight: 700;
  font-size: 13px;
  transition: all 0.2s ease;
}

.trendChip:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(139, 92, 246, 0.15);
  border-color: rgba(139, 92, 246, 0.25);
}

/* =========================================================
   BADGE PILLS
========================================================= */
.badgePill {
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  font-weight: 700;
  font-size: 11px;
  letter-spacing: 0.02em;
  color: #cbd5e1;
}

.badgePill.ok {
  border-color: rgba(34, 197, 94, 0.25);
  background: rgba(34, 197, 94, 0.08);
  color: #86efac;
}

.badgePill.bad {
  border-color: rgba(239, 68, 68, 0.25);
  background: rgba(239, 68, 68, 0.08);
  color: #fca5a5;
}

.badgePill.accent {
  border-color: rgba(139, 92, 246, 0.25);
  background: rgba(139, 92, 246, 0.08);
  color: #c4b5fd;
}

/* =========================================================
   LIVE SECTIONS
========================================================= */
.live-strip {
  display: grid;
  gap: 10px;
}

.live-pill {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 16px;
  background: rgba(239, 68, 68, 0.06);
  border: 1px solid rgba(239, 68, 68, 0.12);
  cursor: pointer;
  transition: all 0.2s ease;
}

.live-pill:hover {
  transform: translateY(-2px);
  background: rgba(239, 68, 68, 0.1);
  box-shadow: 0 8px 24px rgba(239, 68, 68, 0.1);
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ef4444;
  box-shadow: 0 0 12px rgba(239, 68, 68, 0.6);
  animation: pulseDot 2s ease-in-out infinite;
}

@keyframes pulseDot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.2); }
}

.live-pill-name {
  font-weight: 800;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
}

.chev {
  margin-left: auto;
  opacity: 0.5;
  font-size: 20px;
}

/* Live Grid */
.live-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 14px;
  margin-top: 16px;
}

.live-big {
  padding: 20px;
  border-radius: 20px;
  background: rgba(239, 68, 68, 0.05);
  border: 1px solid rgba(239, 68, 68, 0.1);
  cursor: pointer;
  transition: all 0.2s ease;
}

.live-big:hover {
  transform: translateY(-3px);
  background: rgba(239, 68, 68, 0.08);
  box-shadow: 0 12px 32px rgba(239, 68, 68, 0.1);
}

.live-big-top {
  display: flex;
  align-items: center;
  gap: 10px;
}

.live-big-title {
  font-weight: 800;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 15px;
}

.live-big-sub {
  margin-top: 10px;
  opacity: 0.6;
  font-size: 13px;
}

/* =========================================================
   PEOPLE
========================================================= */
.miniAvatars {
  display: flex;
  gap: 10px;
  align-items: center;
  overflow-x: auto;
  padding-bottom: 8px;
  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,0.1) transparent;
}

.miniAvatars::-webkit-scrollbar {
  height: 4px;
}

.miniAvatars::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.15);
  border-radius: 4px;
}

.miniAvatarWrap {
  position: relative;
  flex: 0 0 auto;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.miniAvatarWrap:hover {
  transform: translateY(-3px);
}

.miniAvatar {
  width: 48px;
  height: 48px;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.25), rgba(236, 72, 153, 0.2));
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: grid;
  place-items: center;
  font-weight: 800;
  font-size: 15px;
  transition: all 0.2s ease;
}

.miniAvatarWrap:hover .miniAvatar {
  border-color: rgba(139, 92, 246, 0.3);
  box-shadow: 0 8px 20px rgba(139, 92, 246, 0.15);
}

.miniDot {
  position: absolute;
  right: 3px;
  bottom: 3px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  border: 2.5px solid #0a0e1a;
  transition: all 0.2s ease;
}

.miniDot.on {
  background: #22c55e;
  box-shadow: 0 0 8px rgba(34, 197, 94, 0.5);
}

.peopleCompact {
  margin-top: 14px;
  display: grid;
  gap: 10px;
}

.peopleList {
  display: grid;
  gap: 8px;
  max-height: 260px;
  overflow: auto;
  padding-right: 6px;
  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,0.1) transparent;
}

.person.compact {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 12px;
  border-radius: 18px;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.06);
  transition: all 0.2s ease;
}

.person.compact:hover {
  background: rgba(0, 0, 0, 0.35);
  border-color: rgba(255, 255, 255, 0.1);
  transform: translateX(2px);
}

.person-meta {
  flex: 1;
  min-width: 0;
}

.person-name {
  font-weight: 800;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
}

.person-sub {
  display: flex;
  align-items: center;
  gap: 8px;
  opacity: 0.55;
  font-size: 12px;
  margin-top: 3px;
  font-weight: 500;
}

.status {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
}

.status.on {
  background: #22c55e;
  box-shadow: 0 0 6px rgba(34, 197, 94, 0.4);
}

.sep {
  opacity: 0.4;
}

.person-actions {
  display: flex;
  gap: 6px;
}

.iconbtn {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.06);
  cursor: pointer;
  display: grid;
  place-items: center;
  font-size: 15px;
  transition: all 0.2s ease;
}

.iconbtn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.12);
  transform: translateY(-2px);
  border-color: rgba(255, 255, 255, 0.15);
}

.iconbtn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.iconbtn.msg-btn {
  background: linear-gradient(135deg, rgba(236, 72, 153, 0.25), rgba(139, 92, 246, 0.2));
  border: 1px solid rgba(139, 92, 246, 0.25);
}
.iconbtn.msg-btn:hover {
  background: linear-gradient(135deg, rgba(236, 72, 153, 0.35), rgba(139, 92, 246, 0.3));
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(139, 92, 246, 0.15);
}

/* =========================================================
   COMPOSER
========================================================= */
.composer {
  transition: all 0.3s ease;
  background: rgba(255, 255, 255, 0.03);
}

.composer:focus-within {
  border-color: rgba(139, 92, 246, 0.25);
  box-shadow:
    0 0 40px rgba(139, 92, 246, 0.08),
    0 12px 40px rgba(0, 0, 0, 0.2);
  transform: translateY(-2px);
  background: rgba(255, 255, 255, 0.05);
}

.composer-head {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 12px;
}

.composer-meta {
  flex: 1;
}

.composer-actions {
  display: flex;
  justify-content: flex-end;
}

.pill-btn {
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.08);
  color: #e2e8f0;
  padding: 10px 16px;
  border-radius: 999px;
  cursor: pointer;
  font-weight: 600;
  font-size: 13px;
  transition: all 0.2s ease;
}

.pill-btn:hover {
  background: rgba(255, 255, 255, 0.14);
  transform: translateY(-1px);
}

.me {
  font-weight: 800;
  font-size: 15px;
}

.small {
  font-size: 12px;
}

.muted {
  opacity: 0.55;
}

.input {
  width: 100%;
  border: none;
  outline: none;
  background: rgba(0, 0, 0, 0.3);
  color: #f1f5f9;
  border-radius: 16px;
  padding: 14px;
  resize: none;
  font-size: 14px;
  line-height: 1.6;
  transition: all 0.2s ease;
  font-family: inherit;
}

.input::placeholder {
  color: rgba(255, 255, 255, 0.3);
}

.input:focus {
  background: rgba(0, 0, 0, 0.4);
}

.composerMetaRow {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 12px;
  align-items: center;
}

.charCount {
  font-size: 12px;
  opacity: 0.5;
  font-weight: 600;
}

.charCount.warn {
  color: #fbbf24;
  opacity: 1;
}

.quickTags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.quickTag {
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.05);
  color: #c4b5fd;
  padding: 6px 12px;
  border-radius: 999px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 700;
  transition: all 0.2s ease;
}

.quickTag:hover {
  background: rgba(139, 92, 246, 0.15);
  border-color: rgba(139, 92, 246, 0.25);
  transform: translateY(-1px);
}

.upload-row {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
  margin-top: 12px;
}

.file-pill {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  padding: 10px 16px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.file-pill:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.14);
}

.file-pill input {
  display: none;
}

.file-dot {
  margin-left: 4px;
  opacity: 0.9;
  color: #22c55e;
}

/* =========================================================
   FEED & POSTS
========================================================= */
.feed {
  display: grid;
  gap: 16px;
}

.post {
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.06);
  transition: all 0.2s ease;
}

.post:hover {
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
}

.post-head {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 12px;
}

.compactHead {
  align-items: center;
}

.who .name {
  font-weight: 800;
  font-size: 14px;
}

.time {
  opacity: 0.5;
  font-size: 12px;
  font-weight: 500;
  margin-top: 2px;
}

.text {
  margin: 8px 0 12px;
  line-height: 1.65;
  font-size: 14px;
  color: #e2e8f0;
}

.thread-text {
  font-size: 15px;
  line-height: 1.7;
}

.media {
  width: 100%;
  border-radius: 20px;
  background: #000;
  margin-top: 12px;
  max-height: 720px;
  object-fit: cover;
  display: block;
}

.avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%);
  display: grid;
  place-items: center;
  font-weight: 800;
  font-size: 15px;
  box-shadow: 0 8px 20px rgba(236, 72, 153, 0.2);
  flex-shrink: 0;
}

.avatar.big {
  width: 52px;
  height: 52px;
  font-size: 18px;
}

.avatar.small {
  width: 40px;
  height: 40px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: none;
}

.postPills {
  margin-left: auto;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.miniPostPill {
  font-size: 10px;
  font-weight: 800;
  padding: 5px 10px;
  border-radius: 999px;
  background: rgba(236, 72, 153, 0.12);
  border: 1px solid rgba(236, 72, 153, 0.2);
  color: #f9a8d4;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.ghostPill {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.5);
}

.actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
  color: #e2e8f0;
  padding: 8px 14px;
  border-radius: 999px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-1px);
}

.action-btn.active {
  border-color: rgba(236, 72, 153, 0.35);
  background: rgba(236, 72, 153, 0.1);
  color: #f9a8d4;
}

.spacer {
  flex: 1;
}

.comments-shell {
  margin-top: -6px;
  border-top: none;
  border-radius: 0 0 24px 24px;
}

/* =========================================================
   ROOMS
========================================================= */
.rooms {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 14px;
}

.rooms-left {
  border-radius: 24px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  height: fit-content;
}

.rooms-head {
  font-weight: 800;
  margin-bottom: 14px;
  font-size: 15px;
  letter-spacing: -0.01em;
}

.room {
  width: 100%;
  text-align: left;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(0, 0, 0, 0.2);
  color: #e2e8f0;
  padding: 12px 14px;
  border-radius: 16px;
  cursor: pointer;
  margin-bottom: 8px;
  font-weight: 600;
  font-size: 13px;
  transition: all 0.2s ease;
}

.room:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.1);
  transform: translateX(2px);
}

.room.on {
  background: rgba(139, 92, 246, 0.12);
  border-color: rgba(139, 92, 246, 0.25);
  color: #c4b5fd;
}

.rooms-hint {
  opacity: 0.45;
  font-size: 11px;
  margin-top: 12px;
  font-weight: 500;
}

.rooms-main {
  border-radius: 24px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  min-height: 520px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.rooms-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
}

.rooms-title {
  font-weight: 800;
  font-size: 15px;
}

.rooms-messages {
  flex: 1;
  overflow: auto;
  display: grid;
  gap: 8px;
  padding: 10px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,0.1) transparent;
}

.rm {
  padding: 12px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  transition: all 0.15s ease;
}

.rm:hover {
  background: rgba(255, 255, 255, 0.06);
}

.rm-top {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
}

.rm-user {
  font-weight: 800;
  font-size: 13px;
}

.rm-time {
  opacity: 0.45;
  font-size: 11px;
  font-weight: 500;
}

.rm-text {
  margin-top: 6px;
  line-height: 1.5;
  font-size: 13px;
  color: #cbd5e1;
}

.rooms-input {
  display: flex;
  gap: 10px;
  margin-top: 12px;
}

.rooms-input input,
.chat-input input,
.roomInput {
  flex: 1;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #f1f5f9;
  padding: 12px 14px;
  border-radius: 14px;
  outline: none;
  font-size: 14px;
  transition: all 0.2s ease;
  font-family: inherit;
}

.rooms-input input:focus,
.chat-input input:focus,
.roomInput:focus {
  border-color: rgba(139, 92, 246, 0.3);
  background: rgba(0, 0, 0, 0.4);
}

.callrooms-create {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.roomSelect {
  flex: 0 0 160px;
}

.callrooms-list {
  display: grid;
  gap: 10px;
}

.callroom-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  padding: 16px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  transition: all 0.2s ease;
}

.callroom-card:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.1);
  transform: translateX(2px);
}

.callroom-main {
  min-width: 0;
}

.callroom-name {
  font-weight: 800;
  font-size: 15px;
}

.callroom-sub {
  margin-top: 4px;
  font-size: 13px;
  opacity: 0.6;
  font-weight: 500;
}

.miniState {
  padding: 24px;
}

/* =========================================================
   CHAT DRAWER
========================================================= */
.chatDrawer {
  position: fixed;
  right: 16px;
  top: 120px;
  width: min(420px, 92vw);
  z-index: 70;
  transform: translateX(110%);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.chatDrawer.open {
  transform: translateX(0);
}

.chatPanel {
  margin-bottom: 0;
  border-radius: 24px;
}

.chat-hint {
  opacity: 0.5;
  font-size: 12px;
  margin-bottom: 12px;
  font-weight: 500;
}

.chat-list {
  display: grid;
  gap: 8px;
  margin-bottom: 14px;
}

.chat-item {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  padding: 12px 14px;
  border-radius: 16px;
  color: #e2e8f0;
  cursor: pointer;
  text-align: left;
  font-weight: 600;
  font-size: 13px;
  transition: all 0.2s ease;
}

.chat-item:hover {
  background: rgba(255, 255, 255, 0.08);
  transform: translateX(2px);
}

.chat-item.active {
  border-color: rgba(139, 92, 246, 0.3);
  background: rgba(139, 92, 246, 0.1);
  color: #c4b5fd;
}

.chat-box {
  background: rgba(0, 0, 0, 0.25);
  border-radius: 20px;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.chat-messages {
  max-height: 320px;
  overflow: auto;
  display: grid;
  gap: 8px;
  padding: 8px;
  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,0.1) transparent;
}

.chat-msg {
  font-size: 13px;
  line-height: 1.5;
  padding: 6px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
}

.chat-msg strong {
  color: #c4b5fd;
  font-weight: 700;
}

.chat-input {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

/* =========================================================
   MESSAGES / ALERTS / STATES
========================================================= */
.alert {
  margin-top: 12px;
  padding: 12px 16px;
  border-radius: 16px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  color: #fca5a5;
  font-size: 13px;
  font-weight: 500;
}

.alert.soft {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #cbd5e1;
}

.state {
  text-align: center;
  padding: 32px 24px;
  opacity: 0.9;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.state-emoji {
  font-size: 32px;
  margin-bottom: 10px;
}

.state-title {
  font-weight: 800;
  font-size: 18px;
  letter-spacing: -0.01em;
}

.state-sub {
  opacity: 0.55;
  margin-top: 6px;
  font-size: 14px;
  font-weight: 500;
}

.hint {
  opacity: 0.55;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.5;
}

.mt10 {
  margin-top: 10px;
}

/* =========================================================
   MODAL
========================================================= */
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 80;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(8px);
  display: grid;
  place-items: center;
  padding: 20px;
}

.modal {
  width: min(520px, 100%);
  border-radius: 24px;
  padding: 24px;
  background: rgba(10, 14, 30, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.4);
}

.modal-title {
  font-weight: 800;
  font-size: 20px;
  letter-spacing: -0.02em;
}

.modal-sub {
  margin-top: 10px;
  opacity: 0.8;
  font-size: 14px;
}

.pill {
  display: inline-block;
  margin-left: 6px;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  font-weight: 700;
  font-size: 12px;
}

.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 20px;
}

.tiny {
  font-size: 12px;
  opacity: 0.5;
}

/* =========================================================
   TOAST
========================================================= */
.toast {
  position: fixed;
  left: 50%;
  bottom: 100px;
  transform: translateX(-50%);
  z-index: 90;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 12px 18px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(10, 14, 30, 0.95);
  backdrop-filter: blur(20px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
  font-weight: 600;
  font-size: 14px;
}

.toast-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 10px rgba(34, 197, 94, 0.5);
  animation: pulseDot 2s ease-in-out infinite;
}

.mini-x,
.x {
  border: none;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.7);
  border-radius: 10px;
  padding: 6px 10px;
  font-size: 13px;
  transition: all 0.15s ease;
}

.mini-x:hover,
.x:hover {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
}

.load-more {
  text-align: center;
  padding: 20px 14px;
  opacity: 0.5;
  font-size: 13px;
  font-weight: 500;
}

/* =========================================================
   BOTTOM NAV
========================================================= */
.bottomNav {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 95;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0;
  padding: 10px 10px calc(14px + env(safe-area-inset-bottom));
  background: rgba(7, 10, 20, 0.85);
  backdrop-filter: blur(24px) saturate(1.3);
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.bn {
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.5);
  display: grid;
  place-items: center;
  gap: 4px;
  padding: 8px 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.bn:hover {
  color: rgba(255, 255, 255, 0.8);
}

.bn.on {
  color: #fff;
}

.bn.on .bnI {
  filter: drop-shadow(0 0 10px rgba(139, 92, 246, 0.5));
  transform: translateY(-2px);
}

.bnI {
  font-size: 20px;
  transition: all 0.2s ease;
}

.bnT {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.02em;
}

/* =========================================================
   MINI PANEL / STATUS
========================================================= */
.miniPanel {
  padding: 16px;
}

.row {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

/* =========================================================
   TOOLS PANEL
========================================================= */
.toolsPanel {
  margin-top: -6px;
}

.toolsGrid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.toolBtn {
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(0, 0, 0, 0.25);
  color: #e2e8f0;
  padding: 12px 14px;
  border-radius: 16px;
  cursor: pointer;
  font-weight: 700;
  font-size: 13px;
  transition: all 0.2s ease;
  text-align: left;
}

.toolBtn:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.12);
  transform: translateY(-1px);
}

.dangerTool {
  border-color: rgba(239, 68, 68, 0.15);
  background: rgba(239, 68, 68, 0.06);
  color: #fca5a5;
}

.dangerTool:hover {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.25);
}

/* =========================================================
   THREAD MEDIA
========================================================= */
.thread-media-toggle {
  margin-top: 8px;
  font-size: 12px;
}

.thread-media {
  margin-top: 12px;
}

/* =========================================================
   ELITE UPGRADE ADDITIONS
========================================================= */
.eliteTopbar {
  position: sticky;
  top: 0;
  z-index: 60;
  backdrop-filter: blur(24px) saturate(1.3);
  background: rgba(7, 10, 22, 0.78);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.eliteLogo {
  box-shadow: 0 0 30px rgba(139, 92, 246, 0.35);
}

.eliteCenterSearch {
  flex: 1;
  max-width: 520px;
  margin: 0 16px;
}

.eliteSearchWrap {
  width: 100%;
}

.eliteSearch {
  min-height: 46px;
  font-size: 14px;
}

.eliteTopActions {
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
  align-items: center;
}

.eliteChip {
  min-height: 42px;
}

.hide-sm {
  display: inline-flex;
}

.netBadge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 12px;
  font-weight: 700;
  color: #e2e8f0;
  letter-spacing: 0.01em;
}

.netDot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 10px rgba(34, 197, 94, 0.5);
  animation: pulseDot 2s ease-in-out infinite;
}

.netBadge.offline .netDot {
  background: #f97316;
  box-shadow: 0 0 10px rgba(249, 115, 22, 0.5);
  animation: none;
}

.netBadge.syncing .netDot {
  background: #60a5fa;
  box-shadow: 0 0 10px rgba(96, 165, 250, 0.5);
  animation: pulseDot 1s ease-in-out infinite;
}

.eliteQuickRail {
  position: fixed;
  left: 16px;
  top: 140px;
  z-index: 40;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.quickRailBtn {
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(8, 12, 28, 0.65);
  color: #e2e8f0;
  padding: 12px 16px;
  border-radius: 18px;
  backdrop-filter: blur(20px);
  cursor: pointer;
  font-weight: 700;
  font-size: 13px;
  transition: all 0.2s ease;
  text-align: left;
  min-width: 130px;
}

.quickRailBtn:hover {
  background: rgba(139, 92, 246, 0.15);
  border-color: rgba(139, 92, 246, 0.25);
  transform: translateX(3px);
  color: #c4b5fd;
}

.quickCreateBackdrop {
  position: fixed;
  inset: 0;
  z-index: 80;
  background: rgba(1, 4, 14, 0.6);
  backdrop-filter: blur(8px);
  display: grid;
  place-items: end center;
  padding: 20px;
}

.quickCreateSheet {
  width: min(760px, 100%);
  border-radius: 32px;
  padding: 24px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(10, 15, 34, 0.92);
  backdrop-filter: blur(30px);
  box-shadow: 0 -20px 60px rgba(0, 0, 0, 0.4);
}

.quickCreateHead {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 20px;
}

.quickCreateGrid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.quickCreateCard {
  min-height: 90px;
  border-radius: 22px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.07), rgba(255, 255, 255, 0.02));
  color: #fff;
  font-weight: 800;
  cursor: pointer;
  padding: 16px;
  font-size: 13px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.quickCreateCard:hover {
  transform: translateY(-3px);
  border-color: rgba(139, 92, 246, 0.3);
  background: linear-gradient(180deg, rgba(139, 92, 246, 0.1), rgba(255, 255, 255, 0.03));
  box-shadow: 0 12px 32px rgba(139, 92, 246, 0.1);
}

.quickQueueBar {
  margin-top: 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.05);
  font-size: 13px;
  font-weight: 600;
}

.eliteBottomNav {
  grid-template-columns: repeat(5, 1fr);
  align-items: end;
}

.createBn {
  transform: translateY(-18px);
}

.createCore {
  width: 58px;
  height: 58px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  font-size: 30px;
  font-weight: 900;
  background: linear-gradient(135deg, #a78bfa 0%, #6366f1 50%, #4f46e5 100%);
  box-shadow: 0 12px 36px rgba(99, 102, 241, 0.4);
  border: 2px solid rgba(255, 255, 255, 0.15);
  transition: all 0.2s ease;
}

.createBn:hover .createCore {
  transform: scale(1.05);
  box-shadow: 0 16px 44px rgba(99, 102, 241, 0.5);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

/* =========================================================
   COMM HUB
========================================================= */
.commHub {
  position: relative;
  overflow: hidden;
}

/* =========================================================
   RESPONSIVE
========================================================= */
@media (max-width: 1100px) {
  .eliteQuickRail {
    display: none;
  }
}

@media (max-width: 900px) {
  .heroCard {
    grid-template-columns: 1fr;
    padding: 20px;
  }

  .heroStats {
    grid-template-columns: repeat(3, 1fr);
  }

  .dock {
    grid-template-columns: 1fr;
  }

  .chatDrawer {
    right: 0;
    left: 0;
    top: auto;
    bottom: 0;
    width: 100%;
    transform: translateY(110%);
    border-radius: 24px 24px 0 0;
  }

  .chatDrawer.open {
    transform: translateY(0);
  }

  .rooms {
    grid-template-columns: 1fr;
  }

  .dynamicIsland {
    flex-wrap: wrap;
    gap: 8px;
    padding: 10px 14px;
    border-radius: 20px;
  }

  .islandCenter {
    order: 3;
    width: 100%;
    justify-content: center;
  }

  .eliteTopActions {
    gap: 6px;
  }

  .eliteTopActions .chip {
    display: inline-flex;
    padding: 8px 12px;
    font-size: 12px;
  }

  .commHub {
    margin-top: 12px;
  }
}

@media (max-width: 820px) {
  .eliteCenterSearch {
    display: none;
  }

  .hide-sm {
    display: none;
  }

  .quickCreateGrid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .heroStats {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 500px) {
  .modebar,
  .filterbar {
    overflow-x: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .modebar::-webkit-scrollbar,
  .filterbar::-webkit-scrollbar {
    display: none;
  }

  .toolsGrid {
    grid-template-columns: 1fr;
  }

  .callroom-card {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .heroActions {
    flex-direction: column;
  }

  .heroStats {
    grid-template-columns: repeat(2, 1fr);
  }

  .topbar {
    padding: 12px 14px;
  }

  .main {
    padding: 14px;
  }

  .panel,
  .composer,
  .post {
    padding: 16px;
    border-radius: 20px;
  }

  .dynamicIsland {
    display: none;
  }
}
</style>