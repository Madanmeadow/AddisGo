<!-- src/views/Dashboard.vue -->

<template>
  <Layout>
    <div class="wrap">
      <div class="bg-orb orb1"></div>
      <div class="bg-orb orb2"></div>
      <div class="bg-orb orb3"></div>

  <!-- CLEAN TOPBAR -->
  <header class="topbar eliteTopbar glassy">
    <div class="brand" @click="scrollToTop" role="button" tabindex="0">
      <div class="logo eliteLogo">⚡</div>
      <div class="brand-text">
        <div class="title">Pulse</div>
        <div class="sub">Elite social cockpit</div>
      </div>
      <!-- tiny connection dot replaces the island -->
      <span
        class="topbarConnDot"
        :class="{ on: socketConnected }"
        :title="socketConnected ? 'Realtime Connected' : 'Realtime Offline'"
      ></span>
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

      <!-- SINGLE DROPDOWN -->
      <div class="topbar-dropdown" style="position:relative;">
        <button class="chip eliteChip menuTrigger" @click="topbarMenuOpen = !topbarMenuOpen">
          ☰ Menu
        </button>

        <div
          v-if="topbarMenuOpen"
          class="topbar-menu glassy"
          style="position:absolute; top:calc(100% + 10px); right:0; min-width:220px; padding:10px; border-radius:20px; display:flex; flex-direction:column; gap:6px; z-index:100;"
        >
          <!-- Stats row -->
          <div style="display:flex; gap:6px; padding:4px 4px 10px; border-bottom:1px solid rgba(255,255,255,0.06); margin-bottom:2px;">
            <div style="flex:1; text-align:center;">
              <div style="font-size:16px; font-weight:800; background:linear-gradient(135deg,#fff,#c7d2fe); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; color:transparent;">{{ creatorScore }}</div>
              <div style="font-size:10px; opacity:0.5; text-transform:uppercase; font-weight:600; letter-spacing:0.04em; margin-top:2px;">Score</div>
            </div>
            <div style="flex:1; text-align:center;">
              <div style="font-size:16px; font-weight:800; background:linear-gradient(135deg,#fff,#c7d2fe); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; color:transparent;">{{ todayStreak }}d</div>
              <div style="font-size:10px; opacity:0.5; text-transform:uppercase; font-weight:600; letter-spacing:0.04em; margin-top:2px;">Streak</div>
            </div>
            <div style="flex:1; text-align:center;">
              <div style="font-size:16px; font-weight:800;">
                <span class="hscard-dot" :class="{ on: socketConnected }"></span>
              </div>
              <div style="font-size:10px; opacity:0.5; text-transform:uppercase; font-weight:600; letter-spacing:0.04em; margin-top:2px;">{{ quickStatusText }}</div>
            </div>
          </div>

          <button class="menuItem" @click="focusComposer(); topbarMenuOpen = false">
            ✨ Create Post
          </button>
          <button class="menuItem" @click="startLive(); topbarMenuOpen = false">
            🔴 Go Live
          </button>
          <button class="menuItem" @click="createFastRoom(); topbarMenuOpen = false">
            🚪 Start Room
          </button>
          <button class="menuItem" @click="createZoomRoom(); topbarMenuOpen = false">
            🎥 New Meet
          </button>
          <button class="menuItem" @click="toggleChat(); topbarMenuOpen = false">
            {{ chatOpen ? "💬 Close Chat" : "💬 Chat" }}
          </button>
          <button class="menuItem" @click="toggleTools(); topbarMenuOpen = false">
            {{ toolsOpen ? "🧰 Close Tools" : "🧰 Tools" }}
          </button>
          <button class="menuItem" @click="toggleStudio(); topbarMenuOpen = false">
            {{ studioOpen ? "🪄 Close Studio" : "🪄 Studio" }}
          </button>
          <button class="menuItem" @click="toggleFocusMode(); topbarMenuOpen = false">
            {{ focusMode ? "🧘 Exit Focus" : "🧘 Focus Mode" }}
          </button>
          <button class="menuItem" @click="refreshAll(); topbarMenuOpen = false">
            🔄 Refresh
          </button>

          <div style="height:1px; background:rgba(255,255,255,0.08); margin:4px 0;"></div>

          <button class="menuItem dangerItem" @click="logout(); topbarMenuOpen = false">
            🚪 Logout
          </button>
        </div>
      </div>
    </div>
  </header>

  <!-- CLEAN HERO -->
  <section class="heroStrip">
    <div class="heroCard glassy" :class="{ 'heroCard--solo': token }">
      <div class="heroLeft">
        <div class="heroEyebrow">WELCOME BACK</div>
        <div class="heroTitle">{{ meName }}</div>
        <div class="heroSub">
          {{ moodGreeting }} Build, post, call, stream, chat, save ideas, and run your whole world from one magical dashboard.
        </div>

        
      </div>

      <!-- only shown when NOT logged in -->
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
    <button class="mode" :class="{ on: feedMode === 'following' }" @click="setFeedMode('following')">📸 Following</button>
    <button class="mode" :class="{ on: feedMode === 'foryou' }" @click="setFeedMode('foryou')">🎬 For You</button>
    <div class="mode-more" style="position:relative;">
      <button class="mode" @click="modeMoreOpen = !modeMoreOpen">More ▾</button>
      <div v-if="modeMoreOpen" class="mode-more-menu glassy" style="position:absolute; top:calc(100% + 6px); left:0; min-width:150px; padding:8px; border-radius:16px; display:flex; flex-direction:column; gap:4px; z-index:50;">
        <button class="mode" :class="{ on: feedMode === 'live' }" @click="setFeedMode('live'); modeMoreOpen = false" style="width:100%; text-align:left;">🔴 Live</button>
        <button class="mode" :class="{ on: feedMode === 'rooms' }" @click="setFeedMode('rooms'); modeMoreOpen = false" style="width:100%; text-align:left;">🎧 Rooms</button>
        <button class="mode" :class="{ on: feedMode === 'reels' }" @click="setFeedMode('reels'); modeMoreOpen = false" style="width:100%; text-align:left;">🎞️ Reels</button>
        <button class="mode" :class="{ on: feedMode === 'threads' }" @click="setFeedMode('threads'); modeMoreOpen = false" style="width:100%; text-align:left;">✍️ Threads</button>
        <button class="mode" :class="{ on: feedMode === 'saved' }" @click="setFeedMode('saved'); modeMoreOpen = false" style="width:100%; text-align:left;">💾 Saved</button>
        <button class="mode" :class="{ on: feedMode === 'pinned' }" @click="setFeedMode('pinned'); modeMoreOpen = false" style="width:100%; text-align:left;">📌 Pinned</button>
        <div style="height:1px; background:rgba(255,255,255,0.08); margin:4px 0;"></div>
        <button class="mode" @click="goCallSFU(); modeMoreOpen = false" style="width:100%; text-align:left;">🚀 SFU Call</button>
      </div>
    </div>

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

    <div class="trending-dropdown" style="position:relative;">
      <button class="filterChip" :class="{ on: trendingDropdownOpen }" @click="trendingDropdownOpen = !trendingDropdownOpen">🔥 Trending ▾</button>
      <div
        v-if="trendingDropdownOpen"
        class="glassy"
        style="position:absolute; top:calc(100% + 6px); left:0; min-width:180px; padding:8px; border-radius:16px; display:flex; flex-direction:column; gap:4px; z-index:50;"
      >
        <button
          v-for="tag in trendingTags"
          :key="tag"
          class="menuItem"
          style="font-size:12px;"
          @click="applyTrendTag(tag); trendingDropdownOpen = false"
        >
          {{ tag }}
        </button>
        <div v-if="!trendingTags.length" class="hint" style="padding:8px;">No trending tags yet</div>
        <div style="height:1px; background:rgba(255,255,255,0.08); margin:4px 0;"></div>
        <button class="menuItem" style="font-size:12px; color:#fca5a5;" @click="search = ''; trendingDropdownOpen = false">Clear search</button>
      </div>
    </div>

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
            <!-- Video Meet -->
      <div class="panel dockCard glassy">
        <div class="panel-head">
          <div class="panel-title">🎥 Video Meet</div>
          <button class="btn btn-primary" @click="createZoomRoom" :disabled="zoomCreating || !token">
            {{ zoomCreating ? "Starting…" : "New Meet" }}
          </button>
        </div>

        <div v-if="!token" class="alert soft mt10">
          Login to start or join video meetings.
        </div>

        <template v-else>
          <div class="zoom-create compact">
            <input
              v-model="zoomRoomName"
              class="roomInput"
              placeholder="Class / meeting name…"
            />
            <button class="btn btn-primary" @click="createZoomRoom" :disabled="zoomCreating">
              {{ zoomCreating ? "…" : "Start" }}
            </button>
          </div>

          <div v-if="zoomError" class="alert soft mt10">{{ zoomError }}</div>

          <div v-if="zoomRooms.length === 0" class="hint mt10">
            No active meetings. Start a class or team call.
          </div>

          <div v-else class="meet-strip">
            <div
              v-for="room in zoomRooms.slice(0, 4)"
              :key="'zoom-mini-' + room.roomId"
              class="meet-pill"
              @click="joinZoomRoom(room)"
            >
              <span class="meet-dot video"></span>
              <span class="meet-pill-name">{{ room.name }}</span>
              <span class="meet-count">{{ room.participantCount || 0 }} in</span>
              <span class="chev">›</span>
            </div>
            <button
              v-if="zoomRooms.length > 4"
              class="chip ghost mini"
              @click="refreshZoomRooms"
            >
              View all
            </button>
          </div>
        </template>
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
              <img class="miniAvatar" :src="getUserAvatar(u) || defaultAvatar" />
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
                <img class="avatar small" :src="getUserAvatar(u) || defaultAvatar" />

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

    <!-- STORIES -->
    <section v-if="!focusMode && token" class="panel glassy" style="margin-bottom: 16px;">
      <div class="panel-head">
        <div class="panel-title">📸 Stories</div>
      </div>
      <div class="storiesRow">
        <div class="storyItem" @click="openStoryCreator">
          <div class="storyRing" :class="{ unseen: !hasMyStory }">
            <img class="storyAvatar" :src="myAvatar || defaultAvatar" alt="me" />
            <div class="storyAdd">+</div>
          </div>
          <div class="storyLabel">Your Story</div>
        </div>
        <div
          v-for="s in friendStories"
          :key="s.userId"
          class="storyItem"
          @click="viewStory(s)"
        >
          <div class="storyRing" :class="{ unseen: !s.seen }">
            <img class="storyAvatar" :src="s.avatar || defaultAvatar" alt="story" />
          </div>
          <div class="storyLabel">{{ s.name }}</div>
        </div>
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
        <img class="avatar big" :src="myAvatar || defaultAvatar" />

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

        <!-- OPTIONAL: also send this media to your story -->
        <label
          v-if="imageFile || videoFile"
          class="file-pill"
          :class="{ storyOn: shareToStory }"
          @click.prevent="shareToStory = !shareToStory"
          style="cursor: pointer; user-select: none;"
        >
          📸 {{ shareToStory ? "Story: On" : "Story: Off" }}
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
          <img class="avatar" :src="getAvatar(post) || defaultAvatar" />
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
          <img class="avatar" :src="getAvatar(post) || defaultAvatar" />
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
          <img class="avatar" :src="getAvatar(post) || defaultAvatar" />
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
          <!-- REACTIONS BAR -->
          <div class="reaction-bar">
            <button
              v-for="rtype in ['like','love','fire','laugh','wow']"
              :key="rtype"
              class="reaction-btn"
              :class="{ active: hasMyReaction(post.id, rtype) }"
              :disabled="reactionBusyByPost[post.id]"
              @click="toggleReaction(post, rtype)"
              :title="rtype"
            >
              <span class="reaction-emoji">{{ REACTION_EMOJI[rtype] }}</span>
              <span v-if="reactionCount(post.id, rtype)" class="reaction-count">
                {{ reactionCount(post.id, rtype) }}
              </span>
            </button>
          </div>

          <div class="spacer"></div>

          <button class="action-btn" @click="toggleComments(post.id)">
            💬 <span class="label">{{ commentCount(post.id) }}</span>
          </button>

          <button class="action-btn" @click="toggleSavePost(post)">
            💾 <span class="label">{{ isSaved(post.id) ? "Saved" : "Save" }}</span>
          </button>

          <button class="action-btn" @click="togglePinPost(post)">
            📌 <span class="label">{{ isPinned(post.id) ? "Pinned" : "Pin" }}</span>
          </button>

          <!-- EDIT / DELETE (only for owner) -->
          <template v-if="isMyPost(post)">
            <button class="action-btn ghost" @click="startEdit(post)">✏️</button>
            <button class="action-btn danger-ghost" @click="deletePost(post)">🗑️</button>
          </template>

          <button class="action-btn ghost" @click="sharePost(post)">🔗</button>
          <button class="action-btn ghost" @click="copyPostText(post)">📋</button>
        </div>

        <!-- EDIT PANEL -->
        <div v-if="editingPostId === post.id" class="edit-panel glassy">
          <div class="edit-head">
            <span class="edit-title">✏️ Edit Post</span>
            <button class="mini-x" @click="cancelEdit">✕</button>
          </div>
          <textarea
            v-model="editCaption"
            class="input"
            rows="3"
            placeholder="Edit your caption..."
          ></textarea>
          <div class="edit-actions">
            <button class="btn ghostBtn" @click="cancelEdit">Cancel</button>
            <button class="btn btn-primary" @click="saveEdit(post.id)">Save Changes</button>
          </div>
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
          <img class="avatar" :src="getAvatar(post) || defaultAvatar" />
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
          <img class="avatar" :src="getAvatar(post) || defaultAvatar" />
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
          <!-- REACTIONS BAR -->
          <div class="reaction-bar">
            <button
              v-for="rtype in ['like','love','fire','laugh','wow']"
              :key="rtype"
              class="reaction-btn"
              :class="{ active: hasMyReaction(post.id, rtype) }"
              :disabled="reactionBusyByPost[post.id]"
              @click="toggleReaction(post, rtype)"
              :title="rtype"
            >
              <span class="reaction-emoji">{{ REACTION_EMOJI[rtype] }}</span>
              <span v-if="reactionCount(post.id, rtype)" class="reaction-count">
                {{ reactionCount(post.id, rtype) }}
              </span>
            </button>
          </div>

          <div class="spacer"></div>

          <button class="action-btn" @click="toggleComments(post.id)">
            💬 <span class="label">{{ commentCount(post.id) }}</span>
          </button>

          <button class="action-btn" @click="toggleSavePost(post)">
            💾 <span class="label">{{ isSaved(post.id) ? "Saved" : "Save" }}</span>
          </button>

          <button class="action-btn" @click="togglePinPost(post)">
            📌 <span class="label">{{ isPinned(post.id) ? "Pinned" : "Pin" }}</span>
          </button>

          <!-- EDIT / DELETE (only for owner) -->
          <template v-if="isMyPost(post)">
            <button class="action-btn ghost" @click="startEdit(post)">✏️</button>
            <button class="action-btn danger-ghost" @click="deletePost(post)">🗑️</button>
          </template>

          <button class="action-btn ghost" @click="sharePost(post)">🔗</button>
          <button class="action-btn ghost" @click="copyPostText(post)">📋</button>
        </div>

        <!-- EDIT PANEL -->
        <div v-if="editingPostId === post.id" class="edit-panel glassy">
          <div class="edit-head">
            <span class="edit-title">✏️ Edit Post</span>
            <button class="mini-x" @click="cancelEdit">✕</button>
          </div>
          <textarea
            v-model="editCaption"
            class="input"
            rows="3"
            placeholder="Edit your caption..."
          ></textarea>
          <div class="edit-actions">
            <button class="btn ghostBtn" @click="cancelEdit">Cancel</button>
            <button class="btn btn-primary" @click="saveEdit(post.id)">Save Changes</button>
          </div>
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
          <img class="avatar" :src="getAvatar(post) || defaultAvatar" />
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

  <!-- STORY CREATOR (direct photo / video / voice) -->
  <transition name="fade">
    <div v-if="storyCreatorOpen" class="quickCreateBackdrop" @click.self="closeStoryCreator">
      <div class="quickCreateSheet glassy" style="max-width: 480px;">
        <div class="quickCreateHead">
          <div>
            <div class="panel-title">📸 Add to Story</div>
            <div class="tiny muted">Visible for 24 hours. Photo, video, or voice.</div>
          </div>
          <button class="mini-x" @click="closeStoryCreator">✕</button>
        </div>

        <!-- Preview -->
        <div v-if="storyPreview" style="margin: 14px 0; text-align: center;">
          <img
            v-if="storyType === 'image'"
            :src="storyPreview"
            style="max-height: 320px; border-radius: 18px; width: 100%; object-fit: cover; border: 1px solid rgba(255,255,255,0.08);"
          />
          <video
            v-else-if="storyType === 'video'"
            :src="storyPreview"
            controls
            playsinline
            style="max-height: 320px; border-radius: 18px; width: 100%;"
          />
          <audio
            v-else-if="storyType === 'audio'"
            :src="storyPreview"
            controls
            style="width: 100%; margin-top: 20px;"
          />
        </div>

        <div class="quickCreateGrid" style="grid-template-columns: repeat(3, minmax(0, 1fr));">
          <button class="quickCreateCard" @click="triggerStoryFile('image')">📷 Photo</button>
          <button class="quickCreateCard" @click="triggerStoryFile('video')">🎥 Video</button>
          <button class="quickCreateCard" @click="triggerStoryFile('audio')">🎙 Voice</button>
        </div>

        <div v-if="storyFile" style="margin-top: 18px; display: flex; gap: 10px;">
          <button class="btn ghostBtn" @click="clearStory">Clear</button>
          <button class="btn btn-primary" style="flex: 1;" @click="submitStory" :disabled="storyPosting">
            {{ storyPosting ? "Adding…" : "Add to Story" }}
          </button>
        </div>
      </div>
    </div>
  </transition>

  <!-- Hidden story file inputs -->
  <input ref="storyImageInput" type="file" accept="image/*" hidden @change="onStoryFileChange('image', $event)" />
  <input ref="storyVideoInput" type="file" accept="video/*" hidden @change="onStoryFileChange('video', $event)" />
  <input ref="storyAudioInput" type="file" accept="audio/*" hidden @change="onStoryFileChange('audio', $event)" />

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
      <!-- ZOOM MEETING OVERLAY -->
    <div v-if="inZoomMeeting" class="zoom-overlay">
      <div class="zoom-header">
        <div class="zoom-title">{{ zoomCurrentRoom?.name }}</div>
        <div class="zoom-header-actions">
          <button class="chip ghost" @click="zoomShowParticipants = !zoomShowParticipants">
            👥 {{ zoomParticipants.length + 1 }}
          </button>
          <button class="chip danger" @click="leaveZoomRoom">Leave</button>
        </div>
      </div>

      <div class="zoom-stage" :class="{ sidebarOpen: zoomShowParticipants }">
        <div class="zoom-grid">
          <!-- Local -->
          <div class="zoom-tile" :class="{ muted: zoomAudioMuted }">
            <video
              autoplay
              playsinline
              muted
              :srcObject="zoomLocalStream"
              class="zoom-video"
              :class="{ off: !zoomVideoEnabled }"
            ></video>
            <img v-if="!zoomVideoEnabled" class="zoom-avatar-tile" :src="myAvatar || defaultAvatar" />
            <div class="zoom-tile-label">
              You {{ zoomAudioMuted ? "🔇" : "" }}
            </div>
          </div>

          <!-- Remotes -->
          <div v-for="p in zoomParticipants" :key="p.id" class="zoom-tile">
            <video
              v-if="p.stream"
              autoplay
              playsinline
              :srcObject="p.stream"
              class="zoom-video"
            ></video>
            <img v-else class="zoom-avatar-tile" :src="getZoomAvatar(p.id)" />
            <div class="zoom-tile-label">{{ p.username }}</div>
          </div>
        </div>
      </div>

      <div class="zoom-controls">
        <button class="zoom-ctrl" :class="{ off: zoomAudioMuted }" @click="toggleZoomMute">
          {{ zoomAudioMuted ? "🔇" : "🎤" }}
        </button>
        <button class="zoom-ctrl" :class="{ off: !zoomVideoEnabled }" @click="toggleZoomVideo">
          {{ zoomVideoEnabled ? "📹" : "🚫" }}
        </button>
        <button class="zoom-ctrl" :class="{ active: zoomScreenSharing }" @click="toggleZoomScreen">
          🖥️
        </button>
        <button class="zoom-ctrl danger" @click="leaveZoomRoom">📞 End</button>
      </div>

      <!-- Participants Sidebar -->
      <div v-if="zoomShowParticipants" class="zoom-sidebar">
        <div class="zoom-sidebar-head">
          <div class="panel-title">Participants</div>
          <button class="mini-x" @click="zoomShowParticipants = false">✕</button>
        </div>
        <div class="zoom-sidebar-list">
          <div class="zoom-participant">
            <span class="status on"></span> You {{ zoomAudioMuted ? "(muted)" : "" }}
          </div>
          <div v-for="p in zoomParticipants" :key="p.id" class="zoom-participant">
            <span class="status on"></span> {{ p.username }}
          </div>
        </div>
      </div>
    </div>
</div>

  </Layout>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from "vue"
import { useRouter } from "vue-router"
import Layout from "../components/Layout.vue"
import { useFeed } from "../composables/useFeed.js"
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

const {
  feed,
  fetchPosts: feedFetchPosts,
  ensureLikeState: feedEnsureLikeState,
  toggleLike: feedToggleLike,
  isSaved: feedIsSaved,
  isPinned: feedIsPinned,
  toggleSave: feedToggleSave,
  togglePin: feedTogglePin,
} = useFeed()

const posts = computed(() => feed.posts)
const loading = computed(() => feed.loading)
const error = computed(() => feed.error)
const likesByPost = ref({})       // ← LOCAL (not from useFeed)
const likeBusyByPost = ref({})    // ← LOCAL (not from useFeed)
const savedPostIds = computed(() => feed.savedPostIds)

// Reactions state
const reactionsByPost = ref({})      // { [postId]: { like: 5, fire: 2, ... } }
const myReactionsByPost = ref({})    // { [postId]: ['fire'] }
const reactionBusyByPost = ref({})   // { [postId]: true }

// Edit state
const editingPostId = ref(null)
const editCaption = ref("")
const pinnedPostIds = computed(() => feed.pinnedPostIds)
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
    // ✅ keep what the backend sends
    likes: Array.isArray(obj.likes) ? obj.likes : [],
    likedByMe: !!obj.likedByMe,
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

const defaultAvatar = "data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><defs><linearGradient id='g' x1='0' x2='1'><stop offset='0' stop-color='#ec4899'/><stop offset='1' stop-color='#8b5cf6'/></linearGradient></defs><rect width='200' height='200' rx='100' fill='url(#g)'/></svg>`)

function getAvatar(postOrUser) {
  if (!postOrUser) return ""
  return postOrUser.avatar_url || postOrUser.avatarUrl || postOrUser.avatar || ""
}

function getUserAvatar(u) {
  if (!u) return ""
  return u.avatar_url || u.avatarUrl || u.avatar || u.profile_image || ""
}

const myAvatar = computed(() => me?.avatar_url || me?.avatarUrl || me?.profile_image || "")

function getZoomAvatar(userId) {
  const u = people.value.find(x => String(x.id) === String(userId))
  return getUserAvatar(u) || defaultAvatar
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
   STORY CREATOR
========================= */
const storyCreatorOpen = ref(false)
const storyFile = ref(null)
const storyType = ref("") // 'image' | 'video' | 'audio'
const storyPreview = ref("")
const storyPosting = ref(false)
const shareToStory = ref(false)

const storyImageInput = ref(null)
const storyVideoInput = ref(null)
const storyAudioInput = ref(null)

function openStoryCreator() {
  storyCreatorOpen.value = true
}

function closeStoryCreator() {
  storyCreatorOpen.value = false
  clearStory()
}

function triggerStoryFile(type) {
  storyType.value = type
  if (type === "image") storyImageInput.value?.click()
  if (type === "video") storyVideoInput.value?.click()
  if (type === "audio") storyAudioInput.value?.click()
}

function onStoryFileChange(type, e) {
  const file = e.target.files?.[0] || null
  if (!file) return
  storyFile.value = file
  storyType.value = type
  storyPreview.value = URL.createObjectURL(file)
}

function clearStory() {
  storyFile.value = null
  storyPreview.value = ""
  storyType.value = ""
  if (storyImageInput.value) storyImageInput.value.value = ""
  if (storyVideoInput.value) storyVideoInput.value.value = ""
  if (storyAudioInput.value) storyAudioInput.value.value = ""
}

async function submitStory() {
  if (!token) return alert("Login to add to your story.")
  if (!storyFile.value) return

  try {
    storyPosting.value = true
    const form = new FormData()
    form.append("media", storyFile.value)
    form.append("type", storyType.value)
    if (caption.value.trim()) form.append("caption", caption.value.trim())

    // NOTE: make sure your backend has a POST /stories endpoint
    const res = await fetch(`${apiUrl}/stories`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    })

    const data = await res.json()
    if (!res.ok) throw new Error(data?.error || "Story upload failed")

    draftSavedNote.value = "Added to your story! 🎉"
    addActivity("Story", `Added ${storyType.value} story`)
    hasMyStory.value = true
    closeStoryCreator()
  } catch (err) {
    alert(err.message || "Failed to add story")
  } finally {
    storyPosting.value = false
  }
}

/* =========================
   MODEBAR
========================= */
const isNetworkOnline = ref(typeof navigator !== "undefined" ? navigator.onLine : true)
const isSyncingQueue = ref(false)
const quickCreateOpen = ref(false)
const quickCreateIntent = ref("post")
const topbarMenuOpen = ref(false)
const modeMoreOpen = ref(false)
const trendingDropdownOpen = ref(false)
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
        feed.posts.unshift(clean)
        await feedEnsureLikeState(clean.id, apiUrl, token)
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

const hasMyStory = ref(false)

const friendStories = computed(() => {
  return people.value
    .filter(u => String(u.id) !== String(me?.id))
    .map(u => ({
      userId: u.id,
      name: displayUserName(u).slice(0, 12),
      avatar: getUserAvatar(u),
      seen: false,
    }))
    .slice(0, 14)
})

function viewStory(s) {
  draftSavedNote.value = `Opening ${s.name}'s story… (viewer coming soon)`
  setTimeout(() => { draftSavedNote.value = "" }, 2500)
}

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
/* =========================
   ZOOM MEETINGS (SEPARATE)
========================= */
const zoomRoomName = ref("")
const zoomRooms = ref([])
const zoomCreating = ref(false)
const zoomError = ref("")
const inZoomMeeting = ref(false)
const zoomCurrentRoom = ref(null)
const zoomParticipants = ref([]) // { id, username, stream, audioMuted, videoOn }
const zoomLocalStream = ref(null)
const zoomScreenStream = ref(null)
const zoomAudioMuted = ref(false)
const zoomVideoEnabled = ref(true)
const zoomScreenSharing = ref(false)
const zoomShowParticipants = ref(false)
const zoomPeerConnections = ref(new Map()) // userId -> RTCPeerConnection

const ZOOM_ICE = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
]

function getZoomMedia(video = true) {
  return navigator.mediaDevices.getUserMedia({
    audio: true,
    video: video ? { width: 1280, height: 720 } : false,
  })
}

function makeZoomPC(userId) {
  const pc = new RTCPeerConnection({ iceServers: ZOOM_ICE })

  // add camera + mic
  zoomLocalStream.value?.getTracks().forEach((t) => {
    pc.addTrack(t, zoomLocalStream.value)
  })

  // add screen if active
  zoomScreenStream.value?.getTracks().forEach((t) => {
    pc.addTrack(t, zoomScreenStream.value)
  })

  pc.onicecandidate = (e) => {
    if (e.candidate && zoomCurrentRoom.value) {
      socket.emit("zoom:signal", {
        roomId: zoomCurrentRoom.value.roomId,
        toUserId: userId,
        signal: { type: "ice-candidate", candidate: e.candidate },
      })
    }
  }

  pc.ontrack = (e) => {
    const p = zoomParticipants.value.find((x) => x.id === userId)
    if (p) {
      p.stream = e.streams[0]
      zoomParticipants.value = [...zoomParticipants.value] // trigger reactivity
    }
  }

  pc.onconnectionstatechange = () => {
    if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
      dropZoomPeer(userId)
    }
  }

  return pc
}

async function createZoomRoom() {
  if (!token) return alert("Login to start a meeting.")
  if (zoomCreating.value) return
  zoomCreating.value = true
  zoomError.value = ""

  try {
    zoomLocalStream.value = await getZoomMedia(true)
    const name = zoomRoomName.value.trim() || `${meName.value}'s Meeting`

    socket.emit("zoom:create", { name }, async (res) => {
      zoomCreating.value = false
      if (res?.error) {
        zoomError.value = res.error
        return
      }

      const roomId = res.roomId
      zoomCurrentRoom.value = { roomId, name, isHost: true }
      inZoomMeeting.value = true
      zoomParticipants.value = []
      zoomRoomName.value = ""

      // wire room-specific listeners
      socket.on(`zoom:user-joined:${roomId}`, async ({ userId, username }) => {
        if (userId === String(me?.id)) return
        if (zoomParticipants.value.find((p) => p.id === userId)) return

        zoomParticipants.value.push({
          id: userId,
          username: username || "Guest",
          stream: null,
          audioMuted: false,
          videoOn: true,
        })

        const pc = makeZoomPC(userId)
        zoomPeerConnections.value.set(userId, pc)

        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)

        socket.emit("zoom:signal", {
          roomId,
          toUserId: userId,
          signal: { type: "offer", sdp: offer.sdp },
        })
      })

      socket.on(`zoom:signal:${roomId}`, async ({ fromUserId, signal }) => {
        await handleZoomSignal(fromUserId, signal)
      })

      socket.on(`zoom:user-left:${roomId}`, ({ userId }) => {
        dropZoomPeer(userId)
      })
    })
  } catch {
    zoomError.value = "Camera / microphone access denied."
    zoomCreating.value = false
  }
}

async function joinZoomRoom(room) {
  if (!token) return alert("Login to join.")
  zoomError.value = ""

  try {
    zoomLocalStream.value = await getZoomMedia(true)
    const roomId = room.roomId || room.id

    socket.emit("zoom:join", { roomId }, async (res) => {
      if (res?.error) {
        zoomError.value = res.error
        return
      }

      zoomCurrentRoom.value = { roomId, name: room.name, isHost: false }
      inZoomMeeting.value = true
      zoomParticipants.value = (res.participants || [])
        .filter((p) => String(p.userId) !== String(me?.id))
        .map((p) => ({
          id: p.userId,
          username: p.username || "Guest",
          stream: null,
          audioMuted: false,
          videoOn: true,
        }))

      socket.on(`zoom:signal:${roomId}`, async ({ fromUserId, signal }) => {
        await handleZoomSignal(fromUserId, signal)
      })

      socket.on(`zoom:user-left:${roomId}`, ({ userId }) => {
        dropZoomPeer(userId)
      })
    })
  } catch {
    zoomError.value = "Camera / microphone access denied."
  }
}

async function handleZoomSignal(fromUserId, signal) {
  let pc = zoomPeerConnections.value.get(fromUserId)

  if (signal.type === "offer") {
    if (!pc) {
      pc = makeZoomPC(fromUserId)
      zoomPeerConnections.value.set(fromUserId, pc)
    }
    await pc.setRemoteDescription(new RTCSessionDescription({ type: "offer", sdp: signal.sdp }))
    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)

    socket.emit("zoom:signal", {
      roomId: zoomCurrentRoom.value.roomId,
      toUserId: fromUserId,
      signal: { type: "answer", sdp: answer.sdp },
    })
  } else if (signal.type === "answer") {
    if (pc) await pc.setRemoteDescription(new RTCSessionDescription({ type: "answer", sdp: signal.sdp }))
  } else if (signal.type === "ice-candidate") {
    if (pc) await pc.addIceCandidate(new RTCIceCandidate(signal.candidate))
  }
}

function dropZoomPeer(userId) {
  const pc = zoomPeerConnections.value.get(userId)
  if (pc) {
    pc.close()
    zoomPeerConnections.value.delete(userId)
  }
  zoomParticipants.value = zoomParticipants.value.filter((p) => p.id !== userId)
}

function leaveZoomRoom() {
  const roomId = zoomCurrentRoom.value?.roomId
  if (roomId) {
    socket.emit("zoom:leave", { roomId })
    socket.off(`zoom:signal:${roomId}`)
    socket.off(`zoom:user-joined:${roomId}`)
    socket.off(`zoom:user-left:${roomId}`)
  }

  zoomPeerConnections.value.forEach((pc) => pc.close())
  zoomPeerConnections.value.clear()

  zoomLocalStream.value?.getTracks().forEach((t) => t.stop())
  zoomScreenStream.value?.getTracks().forEach((t) => t.stop())

  zoomLocalStream.value = null
  zoomScreenStream.value = null
  inZoomMeeting.value = false
  zoomCurrentRoom.value = null
  zoomParticipants.value = []
  zoomScreenSharing.value = false
  zoomAudioMuted.value = false
  zoomVideoEnabled.value = true
  zoomShowParticipants.value = false
}

function toggleZoomMute() {
  if (!zoomLocalStream.value) return
  zoomLocalStream.value.getAudioTracks().forEach((t) => {
    t.enabled = !t.enabled
  })
  zoomAudioMuted.value = !zoomAudioMuted.value
}

function toggleZoomVideo() {
  if (!zoomLocalStream.value) return
  zoomLocalStream.value.getVideoTracks().forEach((t) => {
    t.enabled = !t.enabled
  })
  zoomVideoEnabled.value = !zoomVideoEnabled.value
}

async function toggleZoomScreen() {
  if (zoomScreenSharing.value) {
    zoomScreenStream.value?.getTracks().forEach((t) => t.stop())
    zoomScreenStream.value = null
    zoomScreenSharing.value = false
    // note: in production you'd renegotiate peers here
  } else {
    try {
      zoomScreenStream.value = await navigator.mediaDevices.getDisplayMedia({ video: true })
      zoomScreenSharing.value = true
      zoomScreenStream.value.getVideoTracks()[0].onended = () => {
        zoomScreenStream.value = null
        zoomScreenSharing.value = false
      }
    } catch {
      /* user cancelled */
    }
  }
}

function refreshZoomRooms() {
  socket.emit("zoom:list", {}, (res) => {
    zoomRooms.value = Array.isArray(res?.rooms) ? res.rooms : []
  })
}

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
const posting = ref(false)

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
  shareToStory.value = false
  draftSavedNote.value = "Draft cleared"
  try { localStorage.removeItem(DASH_DRAFT_KEY) } catch {}
}

async function fetchPosts() {
  await feedFetchPosts(apiUrl, token)
  pageSize.value = 8
  reelsPageSize.value = 8
  await preloadLikesForPosts(feed.posts.slice(0, 24))
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
    feed.error = ""

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
      feed.error = data?.error || "Post failed"
      return
    }

    const clean = normalizePost(data)
    if (clean) {
      feed.posts.unshift(clean)
      await feedEnsureLikeState(clean.id, apiUrl, token)
      addActivity("Post", "Created a new post")
    }

    clearDraft()

    // Optional: also share this media to your story
    if (shareToStory.value && (imageFile.value || videoFile.value)) {
      try {
        const storyForm = new FormData()
        if (imageFile.value) storyForm.append("media", imageFile.value)
        if (videoFile.value) storyForm.append("media", videoFile.value)
        storyForm.append("type", imageFile.value ? "image" : "video")
        storyForm.append("caption", caption.value || "")

        await fetch(`${apiUrl}/stories`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: storyForm,
        })
        draftSavedNote.value = "Posted & shared to story! 🎉"
        hasMyStory.value = true
        addActivity("Story", "Auto-shared post to story")
      } catch {
        // silent fail — main post already succeeded
      }
    } else {
      draftSavedNote.value = "Posted successfully"
    }

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
      feed.error = "Post failed"
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
    feed.error = ""

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
      feed.error = data?.error || "Reel failed"
      return
    }

    const clean = normalizePost(data?.post || data)
    if (clean) {
      feed.posts.unshift(clean)
      await feedEnsureLikeState(clean.id, apiUrl, token)
      addActivity("Reel", "Created a new reel")
    }

    clearDraft()
    draftSavedNote.value = "Reel posted successfully"

    await nextTick()
    setupVideoObserver()
    applyMuteToAllVideos()
  } catch {
    feed.error = "Reel failed"
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

function persistSaved() {
  /* handled by useFeed */
}

function persistPinned() {
  /* handled by useFeed */
}

function isSaved(postId) {
  return feedIsSaved(postId)
}

function isPinned(postId) {
  return feedIsPinned(postId)
}

function toggleSavePost(post) {
  const id = Number(post?.id)
  if (!id) return
  const wasSaved = feedIsSaved(id)
  feedToggleSave(id)
  addActivity("Saved", wasSaved ? `Removed post #${id} from saved` : `Saved post #${id}`)
}

function togglePinPost(post) {
  const id = Number(post?.id)
  if (!id) return
  const wasPinned = feedIsPinned(id)
  feedTogglePin(id)
  addActivity("Pinned", wasPinned ? `Unpinned post #${id}` : `Pinned post #${id}`)
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
   REACTIONS
========================= */
const REACTION_EMOJI = {
  like: "❤️",
  love: "🩷",
  fire: "🔥",
  laugh: "😂",
  wow: "😮",
  sad: "😢",
  angry: "😡",
}

async function fetchReactions(postId) {
  try {
    const res = await fetch(`${apiUrl}/posts/${postId}/reactions`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) return
    const data = await res.json()
    reactionsByPost.value = {
      ...reactionsByPost.value,
      [postId]: data.counts || [],
    }
    myReactionsByPost.value = {
      ...myReactionsByPost.value,
      [postId]: data.myReactions || [],
    }
  } catch {
    // silent
  }
}

async function toggleReaction(post, type = "like") {
  const postId = post.id
  if (!token) return alert("Login to react.")
  if (reactionBusyByPost.value[postId]) return

  reactionBusyByPost.value = { ...reactionBusyByPost.value, [postId]: true }

  // Optimistic UI
  const prevCounts = reactionsByPost.value[postId] || []
  const prevMine = myReactionsByPost.value[postId] || []
  const hadThis = prevMine.includes(type)

  // Build optimistic counts
  const nextCounts = [...prevCounts]
  const idx = nextCounts.findIndex((c) => c.reaction_type === type)
  if (hadThis) {
    // removing
    if (idx !== -1) {
      nextCounts[idx] = { ...nextCounts[idx], count: Math.max(0, nextCounts[idx].count - 1) }
      if (nextCounts[idx].count === 0) nextCounts.splice(idx, 1)
    }
  } else {
    // adding - also remove previous reaction if any (only one reaction per user)
    const prevType = prevMine[0]
    if (prevType) {
      const pIdx = nextCounts.findIndex((c) => c.reaction_type === prevType)
      if (pIdx !== -1) {
        nextCounts[pIdx] = { ...nextCounts[pIdx], count: Math.max(0, nextCounts[pIdx].count - 1) }
        if (nextCounts[pIdx].count === 0) nextCounts.splice(pIdx, 1)
      }
    }
    if (idx !== -1) {
      nextCounts[idx] = { ...nextCounts[idx], count: (nextCounts[idx].count || 0) + 1 }
    } else {
      nextCounts.push({ reaction_type: type, count: 1 })
    }
  }

  const nextMine = hadThis ? [] : [type]

  reactionsByPost.value = { ...reactionsByPost.value, [postId]: nextCounts }
  myReactionsByPost.value = { ...myReactionsByPost.value, [postId]: nextMine }

  try {
    const res = await fetch(`${apiUrl}/posts/${postId}/react`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ reaction: type }),
    })
    if (!res.ok) throw new Error("Reaction failed")
    const data = await res.json()
    reactionsByPost.value = { ...reactionsByPost.value, [postId]: data.counts || [] }
    myReactionsByPost.value = { ...myReactionsByPost.value, [postId]: data.myReactions || [] }
  } catch (err) {
    // rollback
    reactionsByPost.value = { ...reactionsByPost.value, [postId]: prevCounts }
    myReactionsByPost.value = { ...myReactionsByPost.value, [postId]: prevMine }
    alert(err.message || "Reaction failed")
  } finally {
    reactionBusyByPost.value = { ...reactionBusyByPost.value, [postId]: false }
  }
}

function reactionCount(postId, type) {
  const counts = reactionsByPost.value[postId] || []
  const found = counts.find((c) => c.reaction_type === type)
  return found ? found.count : 0
}

function hasMyReaction(postId, type) {
  return (myReactionsByPost.value[postId] || []).includes(type)
}

/* =========================
   EDIT / DELETE POST
========================= */
function startEdit(post) {
  if (Number(post.user_id) !== Number(me?.id)) return
  editingPostId.value = post.id
  editCaption.value = post.caption || ""
}

function cancelEdit() {
  editingPostId.value = null
  editCaption.value = ""
}

async function saveEdit(postId) {
  if (!token) return
  try {
    const res = await fetch(`${apiUrl}/posts/${postId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ caption: editCaption.value }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.error || "Edit failed")

    // Update local post
    const idx = feed.posts.findIndex((p) => Number(p.id) === Number(postId))
    if (idx !== -1) {
      feed.posts[idx] = { ...feed.posts[idx], caption: data.caption }
    }
    editingPostId.value = null
    editCaption.value = ""
    addActivity("Post", `Edited post #${postId}`)
  } catch (err) {
    alert(err.message || "Edit failed")
  }
}

async function deletePost(post) {
  if (Number(post.user_id) !== Number(me?.id)) return
  if (!confirm("Delete this post forever?")) return

  try {
    const res = await fetch(`${apiUrl}/posts/${post.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.error || "Delete failed")

    feed.posts = feed.posts.filter((p) => Number(p.id) !== Number(post.id))
    addActivity("Post", `Deleted post #${post.id}`)
  } catch (err) {
    alert(err.message || "Delete failed")
  }
}

function isMyPost(post) {
  return Number(post.user_id) === Number(me?.id)
}

/* =========================
   LIKES
========================= */
async function preloadLikesForPosts(list) {
  if (!token) return
  list.forEach((p) => {
    if (!likesByPost.value[p.id]) {
      likesByPost.value[p.id] = {
        count: p.likes?.length ?? 0,
        likedByMe: p.likedByMe ?? false,
      }
    }
  })
  await Promise.allSettled([
    ...list.map((p) => fetchLikeState(p.id)),
    ...list.map((p) => fetchReactions(p.id)),
  ])
}

async function fetchLikeState(postId) {
  try {
    const res = await fetch(`${apiUrl}/api/posts/${postId}/likes`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (res.status === 404) return // no GET endpoint? ignore
    if (!res.ok) return
    const data = await res.json().catch(() => ({}))
    likesByPost.value = {
      ...likesByPost.value,
      [postId]: {
        count: Number(data.count ?? data.likes ?? 0),
        likedByMe: !!data.likedByMe,
      },
    }
  } catch {
    // silent
  }
}

async function toggleLike(post) {
  const postId = post.id
  if (!token) return alert("Please login again to like posts.")
  if (likeBusyByPost.value[postId]) return

  likeBusyByPost.value = { ...likeBusyByPost.value, [postId]: true }

  const prev = likesByPost.value[postId] || { count: 0, likedByMe: false }
  const next = {
    count: Math.max(0, prev.count + (prev.likedByMe ? -1 : 1)),
    likedByMe: !prev.likedByMe,
  }

  // Optimistic UI
  likesByPost.value = { ...likesByPost.value, [postId]: next }

  try {
    const res = await fetch(`${apiUrl}/api/posts/${postId}/like`, {
      method: "PUT",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) throw new Error("Like failed")

    // Sync with server if it returns useful data
    const data = await res.json().catch(() => null)
    if (data) {
      likesByPost.value = {
        ...likesByPost.value,
        [postId]: {
          count: Number(data.count ?? data.likes?.length ?? next.count),
          likedByMe: !!data.likedByMe,
        },
      }
    }
  } catch (err) {
    // Rollback on error
    likesByPost.value = { ...likesByPost.value, [postId]: prev }
    alert(err.message || "Failed to like")
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

    feed.posts = feed.posts.map((p) =>
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
     refreshZoomRooms()
    socket.on("zoom:room-list", (rooms) => {
      zoomRooms.value = Array.isArray(rooms) ? rooms : []
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
  socket?.off("zoom:room-list")
    leaveZoomRoom()
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
/* Topbar connection dot (replaces the island) */
.topbarConnDot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ef4444;
  box-shadow: 0 0 10px rgba(239, 68, 68, 0.5);
  margin-left: 10px;
  align-self: center;
  transition: all 0.3s ease;
}
.topbarConnDot.on {
  background: #22c55e;
  box-shadow: 0 0 10px rgba(34, 197, 94, 0.5);
}

/* Topbar dropdown */
.topbar-dropdown .menuTrigger {
  min-height: 42px;
  padding: 10px 18px;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
.topbar-dropdown .menuTrigger:hover {
  background: rgba(255, 255, 255, 0.14);
  transform: translateY(-1px);
}
.topbar-menu {
  animation: fadeIn 0.15s ease;
}
.menuItem {
  width: 100%;
  text-align: left;
  border: none;
  background: transparent;
  color: #e2e8f0;
  padding: 10px 12px;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 600;
  font-size: 13px;
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}
.menuItem:hover {
  background: rgba(255, 255, 255, 0.08);
  transform: translateX(2px);
}
.menuItem.dangerItem {
  color: #fca5a5;
}
.menuItem.dangerItem:hover {
  background: rgba(239, 68, 68, 0.1);
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: translateY(0); }
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
   ZOOM MEETING DOCK CARD
========================================================= */
.zoom-create.compact {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.zoom-create.compact .roomInput {
  flex: 1;
  min-width: 140px;
}

/* =========================================================
   ZOOM MEETING OVERLAY
========================================================= */
.zoom-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: #070a14;
  display: flex;
  flex-direction: column;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.zoom-header {
  padding: 14px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(7, 10, 20, 0.85);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(20px);
}

.zoom-title {
  font-weight: 800;
  font-size: 16px;
  letter-spacing: -0.01em;
}

.zoom-header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.zoom-stage {
  flex: 1;
  overflow: auto;
  padding: 20px;
  position: relative;
}

.zoom-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
  align-content: center;
  min-height: 100%;
}

.zoom-tile {
  position: relative;
  background: rgba(0, 0, 0, 0.45);
  border-radius: 24px;
  overflow: hidden;
  aspect-ratio: 16 / 10;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.zoom-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.zoom-video.off {
  display: none;
}

.zoom-avatar-tile {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%);
  display: grid;
  place-items: center;
  font-size: 28px;
  font-weight: 900;
  color: #fff;
}

.zoom-tile-label {
  position: absolute;
  bottom: 14px;
  left: 14px;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.55);
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  backdrop-filter: blur(8px);
}

.zoom-controls {
  padding: 16px;
  display: flex;
  justify-content: center;
  gap: 18px;
  background: rgba(7, 10, 20, 0.85);
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(20px);
}

.zoom-ctrl {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  font-size: 20px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: grid;
  place-items: center;
}

.zoom-ctrl:hover {
  background: rgba(255, 255, 255, 0.15);
  transform: translateY(-2px);
}

.zoom-ctrl.off {
  background: rgba(239, 68, 68, 0.9);
  border-color: rgba(239, 68, 68, 0.4);
}

.zoom-ctrl.danger {
  background: rgba(220, 38, 38, 0.9);
  border-color: rgba(220, 38, 38, 0.4);
}

.zoom-ctrl.danger:hover {
  background: rgba(185, 28, 28, 1);
}

/* Sidebar */
.zoom-sidebar {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 280px;
  background: rgba(10, 14, 30, 0.95);
  border-left: 1px solid rgba(255, 255, 255, 0.08);
  padding: 20px;
  z-index: 10;
  display: flex;
  flex-direction: column;
  animation: slideInRight 0.2s ease;
}

@keyframes slideInRight {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

.zoom-sidebar-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.zoom-sidebar-list {
  overflow: auto;
  display: grid;
  gap: 10px;
}

.zoom-participant {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.04);
  font-size: 13px;
  font-weight: 600;
}

/* Responsive */
@media (max-width: 900px) {
  .zoom-grid {
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  }
  .zoom-sidebar {
    width: 240px;
  }
}

@media (max-width: 600px) {
  .zoom-grid {
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  .zoom-tile {
    aspect-ratio: 1 / 1;
    border-radius: 18px;
  }
  .zoom-controls {
    gap: 12px;
    padding: 12px;
  }
  .zoom-ctrl {
    width: 48px;
    height: 48px;
    font-size: 18px;
  }
  .zoom-sidebar {
    width: 100%;
    border-left: none;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    top: auto;
    left: 0;
    right: 0;
    bottom: 76px; /* above controls */
    height: 260px;
    animation: slideUp 0.2s ease;
  }
  @keyframes slideUp {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
  }
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

/* =========================================================
   OPTION A SIMPLIFICATION
========================================================= */
.heroStatsCompact {
  display: flex;
  gap: 10px;
  margin-top: 16px;
  flex-wrap: wrap;
}
.hscard {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 14px;
  padding: 10px 16px;
  text-align: center;
  min-width: 80px;
  transition: all 0.2s ease;
}
.hscard:hover {
  background: rgba(255,255,255,0.07);
  border-color: rgba(255,255,255,0.1);
  transform: translateY(-1px);
}
.hscard-num {
  font-size: 18px;
  font-weight: 800;
  background: linear-gradient(135deg, #fff, #c7d2fe);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.hscard-label {
  font-size: 10px;
  opacity: 0.55;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-top: 4px;
}
.hscard-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ef4444;
  display: inline-block;
}
.hscard-dot.on {
  background: #22c55e;
  box-shadow: 0 0 8px rgba(34,197,94,0.5);
}
.topbar-more-menu .chip,
.mode-more-menu .mode {
  border-radius: 10px;
  padding: 8px 12px;
  font-size: 12px;
  justify-content: flex-start;
}
.mode-more-menu .mode.on {
  box-shadow: none;
  background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%);
}
.trendingInline {
  max-width: 1100px;
  margin: 12px auto 0;
  padding: 0 20px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.trendingInline-label {
  font-size: 12px;
  font-weight: 800;
  color: #f59e0b;
  white-space: nowrap;
}
.trendingInline-scroll {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  flex: 1;
  padding-bottom: 4px;
  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,0.1) transparent;
}
.trendingInline-scroll::-webkit-scrollbar {
  height: 4px;
}
.trendingInline-scroll::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.15);
  border-radius: 4px;
}



/* Reactions */
.reaction-bar {
  display: flex;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;
}

.reaction-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
  color: #e2e8f0;
  padding: 6px 10px;
  border-radius: 999px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.2s ease;
}

.reaction-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-2px);
}

.reaction-btn.active {
  background: rgba(236, 72, 153, 0.15);
  border-color: rgba(236, 72, 153, 0.35);
  box-shadow: 0 4px 12px rgba(236, 72, 153, 0.15);
}

.reaction-emoji {
  font-size: 16px;
  line-height: 1;
}

.reaction-count {
  font-size: 11px;
  font-weight: 700;
  opacity: 0.9;
}

/* Edit panel */
.edit-panel {
  margin: 12px 0 4px;
  padding: 16px;
  border-radius: 20px;
  background: rgba(139, 92, 246, 0.06);
  border: 1px solid rgba(139, 92, 246, 0.15);
}

.edit-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.edit-title {
  font-weight: 800;
  font-size: 14px;
  color: #c4b5fd;
}

.edit-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 12px;
}

.action-btn.danger-ghost {
  color: #fca5a5;
  border-color: rgba(239, 68, 68, 0.15);
  background: rgba(239, 68, 68, 0.06);
}

.action-btn.danger-ghost:hover {
  background: rgba(239, 68, 68, 0.12);
  border-color: rgba(239, 68, 68, 0.25);
}


/* ===== STORIES ===== */
.storiesRow {
  display: flex;
  gap: 14px;
  overflow-x: auto;
  padding-bottom: 8px;
  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,0.1) transparent;
}
.storiesRow::-webkit-scrollbar { height: 4px; }
.storiesRow::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 4px; }

.storyItem {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  min-width: 64px;
  cursor: pointer;
  transition: transform 0.2s ease;
}
.storyItem:hover { transform: translateY(-2px); }

.storyRing {
  width: 68px;
  height: 68px;
  border-radius: 50%;
  padding: 3px;
  background: #334155;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
.storyRing.unseen {
  background: linear-gradient(135deg, #f59e0b, #ec4899, #8b5cf6);
}

.storyAvatar {
  width: 62px;
  height: 62px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #0a0e1a;
  background: #1e293b;
}

.storyAdd {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 22px;
  height: 22px;
  background: #a855f7;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  border: 2px solid #0a0e1a;
}

.storyLabel {
  font-size: 11px;
  color: #94a3b8;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 64px;
}

/* Avatar image polish */
.avatar, .miniAvatar { object-fit: cover; }

.file-pill.storyOn {
  background: rgba(236, 72, 153, 0.18);
  border-color: rgba(236, 72, 153, 0.35);
  color: #f9a8d4;
}

</style>