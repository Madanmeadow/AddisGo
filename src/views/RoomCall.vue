<!-- ═══════════════════════════════════════════════════════════════
   ADDISGO ROOM CALL — ENTERPRISE EDITION v3.0
   Zoom-surpassing video conferencing with AI backgrounds, breakout
   rooms, whiteboard, annotation, polls, transcription, and enterprise
   security. Single-file Vue 3 powerhouse.
   ═══════════════════════════════════════════════════════════════ -->
<template>
  <!-- LOBBY / PRE-JOIN SCREEN -->
  <transition name="fade-scale">
    <div v-if="showLobby" class="lobby-overlay">
      <div class="lobby-bg">
        <div class="bg-orb orb1"></div>
        <div class="bg-orb orb2"></div>
        <div class="bg-orb orb3"></div>
      </div>
      <div class="lobby-card">
        <div class="lobby-brand">
          <div class="lobby-logo">AG</div>
          <h1 class="lobby-title">AddisGo Room Call</h1>
          <p class="lobby-sub">Premium video conferencing reimagined</p>
        </div>
        <div class="lobby-preview-wrap">
          <div class="lobby-preview">
            <video v-if="lobbyVideoReady" ref="lobbyVideoRef" class="lobby-video" :class="{ mirrored: mirrorLocal }" autoplay playsinline muted></video>
            <div v-else class="lobby-avatar">{{ myInitial }}</div>
            <canvas ref="lobbyCanvasRef" class="lobby-canvas"></canvas>
            <div class="lobby-preview-badge"><span class="live-dot"></span>Camera Preview</div>
            <div class="lobby-preview-actions">
              <button class="lobby-mini-btn" :class="{ off: !lobbyMicOn }" @click="lobbyMicOn = !lobbyMicOn">{{ lobbyMicOn ? "🎙" : "🔇" }}</button>
              <button class="lobby-mini-btn" :class="{ off: !lobbyCamOn }" @click="lobbyCamOn = !lobbyCamOn">{{ lobbyCamOn ? "📷" : "🚫" }}</button>
            </div>
          </div>
          <div class="lobby-audio-meter">
            <div v-for="n in 12" :key="n" class="meter-bar" :style="{ opacity: lobbyAudioLevel > (n / 12) ? 1 : 0.2 }"></div>
          </div>
        </div>
        <div class="lobby-form">
          <div class="lobby-field">
            <label>Display Name</label>
            <input v-model="lobbyName" type="text" placeholder="Your name" maxlength="32" />
          </div>
          <div class="lobby-field">
            <label>Virtual Background</label>
            <div class="bg-selector">
              <button v-for="opt in bgOptions" :key="opt.id" class="bg-option" :class="{ active: virtualBgType === opt.id }" @click="virtualBgType = opt.id">
                <span class="bg-option-preview" :style="opt.style">{{ opt.icon }}</span>
                <span class="bg-option-label">{{ opt.label }}</span>
              </button>
            </div>
          </div>
          <div class="lobby-field">
            <label>Camera Device</label>
            <select v-model="selectedCameraId" @change="changeCamera">
              <option v-for="d in videoDevices" :key="d.deviceId" :value="d.deviceId">{{ d.label || `Camera ${d.deviceId.slice(0,6)}` }}</option>
            </select>
          </div>
          <div class="lobby-field">
            <label>Microphone Device</label>
            <select v-model="selectedMicId" @change="changeMic">
              <option v-for="d in audioDevices" :key="d.deviceId" :value="d.deviceId">{{ d.label || `Mic ${d.deviceId.slice(0,6)}` }}</option>
            </select>
          </div>
        </div>
        <div class="lobby-actions">
          <button class="btn btn-primary lobby-join" @click="enterRoom" :disabled="joining">
            <span v-if="joining" class="spinner"></span>
            <span v-else>Join Room</span>
          </button>
          <button class="btn ghostBtn" @click="goBack">Cancel</button>
        </div>
      </div>
    </div>
  </transition>

  <!-- MAIN CALL INTERFACE -->
  <div v-show="!showLobby" class="roomcall-page" :class="{ compactMode, cinematicMode, focusOnly: !!focusedTileId, speakerMode: !!dominantSpeakerId, whiteboardMode, annotationMode }" @keydown="handleKeydown" tabindex="0">
    <div class="bg-layer bg1"></div>
    <div class="bg-layer bg2"></div>
    <div class="bg-layer bg3"></div>

    <!-- FLOATING REACTIONS -->
    <div class="floating-reactions">
      <transition-group name="float-up">
        <div v-for="r in floatingReactions" :key="r.id" class="floating-reaction" :style="{ left: r.x + '%', animationDuration: r.duration + 's' }">{{ r.emoji }}</div>
      </transition-group>
    </div>

    <!-- REACTION BURST -->
    <transition name="pop-reaction">
      <div v-if="reactionBurst" class="reaction-burst">{{ reactionBurst }}</div>
    </transition>

    <!-- RECORDING INDICATOR -->
    <transition name="slide-down">
      <div v-if="isRecording" class="recording-banner">
        <span class="rec-dot"></span>
        <span>Recording in progress</span>
        <span class="rec-timer">{{ recordingDurationLabel }}</span>
      </div>
    </transition>

    <!-- NETWORK QUALITY TOAST -->
    <transition name="slide-up">
      <div v-if="networkToast" class="network-toast" :class="networkToast.quality">
        <span class="nt-icon">{{ networkToast.icon }}</span>
        <span>{{ networkToast.message }}</span>
      </div>
    </transition>

    <!-- TOPBAR -->
    <header class="topbar glassy">
      <div class="top-left">
        <button class="chip ghost" @click="confirmLeave">← Back</button>
        <div class="room-pill">
          <span class="live-dot"></span>
          <div class="room-pill-meta">
            <div class="room-pill-title">{{ roomName || "Room Call" }}</div>
            <div class="room-pill-sub">
              {{ roomKindLabel }} • {{ participantCount }} participant{{ participantCount === 1 ? "" : "s" }}
              <span v-if="isLocked" class="lock-badge">🔒 Locked</span>
            </div>
          </div>
        </div>
        <button class="chip ghost miniChip" @click="copyRoomId">🆔 {{ shortRoomId }}</button>
        <div class="net-quality" :title="networkQualityTooltip">
          <div class="nq-bars">
            <div v-for="n in 4" :key="n" class="nq-bar" :class="{ active: networkQuality.score >= n, warn: networkQuality.score < 3 && n <= networkQuality.score }"></div>
          </div>
        </div>
      </div>
      <div class="top-right">
        <button v-if="isHost" class="chip ghost" :class="{ active: isLocked }" @click="toggleLockRoom">{{ isLocked ? "🔓 Unlock" : "🔒 Lock" }}</button>
        <button v-if="isHost" class="chip ghost" @click="toggleWaitingRoom">{{ waitingRoomEnabled ? "🛡 Waiting On" : "🛡 Waiting Off" }}</button>
        <button class="chip ghost" @click="showShortcuts = true">⌨️ Shortcuts</button>
        <button class="chip ghost" @click="copyInvite">🔗 Invite</button>
        <button class="chip ghost" @click="refreshRoomState">🔄 Refresh</button>
        <button class="chip ghost" @click="togglePanel">{{ sidePanelOpen ? "Hide Panel" : "Show Panel" }}</button>
        <button class="chip danger" @click="confirmLeave">Leave</button>
      </div>
    </header>

    <!-- HERO -->
    <section class="hero glassy" :class="{ collapsed: heroCollapsed }">
      <div class="hero-left">
        <div class="eyebrow">ADDISGO ROOM CALL — ENTERPRISE</div>
        <h1 class="hero-title">{{ roomName || "Future Room" }}</h1>
        <div class="hero-sub">AI backgrounds • Breakout rooms • Whiteboard • Live polls • Transcription • Screen annotation • 49-participant grid • Enterprise security</div>
        <div class="hero-badges">
          <span class="badge" :class="{ ok: socketConnected, bad: !socketConnected }">{{ socketConnected ? "Socket Connected" : "Socket Disconnected" }}</span>
          <span class="badge" :class="{ ok: joinedRoom, bad: !joinedRoom }">{{ joinedRoom ? "Joined Room" : "Not Joined" }}</span>
          <span class="badge">{{ participantCount }} in room</span>
          <span class="badge">{{ roomKindLabel }}</span>
          <span class="badge">{{ turnReady ? "TURN Ready" : "STUN Only" }}</span>
          <span class="badge accent">⏱ {{ sessionDurationLabel }}</span>
          <span v-if="isRecording" class="badge danger">⏺ Recording</span>
          <span v-if="isHost" class="badge accent">👑 Host</span>
          <span v-if="raisedHands.size > 0" class="badge warning">✋ {{ raisedHands.size }} raised</span>
        </div>
      </div>
      <div class="hero-right">
        <div class="hero-stat"><div class="hero-num">{{ participantCount }}</div><div class="hero-lab">People</div></div>
        <div class="hero-stat"><div class="hero-num">{{ remoteParticipants.length }}</div><div class="hero-lab">Remote</div></div>
        <div class="hero-stat"><div class="hero-num">{{ screenSharing ? "ON" : "OFF" }}</div><div class="hero-lab">Share</div></div>
        <div class="hero-stat"><div class="hero-num">{{ compactMode ? "ON" : "OFF" }}</div><div class="hero-lab">Compact</div></div>
      </div>
      <button class="hero-collapse" @click="heroCollapsed = !heroCollapsed">{{ heroCollapsed ? "▼" : "▲" }}</button>
    </section>

    <!-- PRESENCE STRIP -->
    <section class="presence-strip glassy">
      <div class="strip-head">
        <div class="panel-title">⚡ Live Presence</div>
        <div class="strip-actions">
          <button class="chip ghost miniChip" @click="toggleCompactMode">{{ compactMode ? "Normal View" : "Compact View" }}</button>
          <button class="chip ghost miniChip" @click="toggleCinematicMode">{{ cinematicMode ? "Standard Mode" : "Cinematic" }}</button>
          <button class="chip ghost miniChip" @click="toggleMirrorMode">{{ mirrorLocal ? "Mirror On" : "Mirror Off" }}</button>
          <button class="chip ghost miniChip" @click="toggleWhiteboard">{{ whiteboardMode ? "Close Whiteboard" : "Whiteboard" }}</button>
        </div>
      </div>
      <div class="presence-list">
        <button class="presenceCard self" @click="focusTile('local')">
          <div class="presenceAvatar" :class="{ speaking: isSpeaking('local'), raised: raisedHands.has('local') }">
            {{ myInitial }}
            <span v-if="raisedHands.has('local')" class="hand-icon">✋</span>
          </div>
          <div class="presenceMeta">
            <div class="presenceName">{{ myName }}</div>
            <div class="presenceSub">{{ isSpeaking('local') ? "Speaking" : "You" }}</div>
          </div>
        </button>
        <button v-for="p in remoteParticipants" :key="'presence-' + p.socketId" class="presenceCard" @click="focusTile(p.socketId)">
          <div class="presenceAvatar alt" :class="{ speaking: isSpeaking(p.socketId), raised: raisedHands.has(p.socketId) }">
            {{ getInitialName(p.displayName || p.username || p.userId) }}
            <span v-if="raisedHands.has(p.socketId)" class="hand-icon">✋</span>
          </div>
          <div class="presenceMeta">
            <div class="presenceName">{{ trimName(p.displayName || p.username || `User #${p.userId || "?"}`) }}</div>
            <div class="presenceSub">{{ isSpeaking(p.socketId) ? "Speaking" : (peerStatus[p.socketId] || "Connected") }}</div>
          </div>
        </button>
      </div>
    </section>

    <main class="main">
      <section class="stage-wrap">
        <div class="stage-toolbar glassy">
          <div class="stage-left">
            <button class="control" :class="{ active: micEnabled }" @click="toggleMic">{{ micEnabled ? "🎙 Mic On" : "🔇 Mic Off" }}</button>
            <button class="control" :class="{ active: camEnabled }" :disabled="roomKind !== 'video'" @click="toggleCamera">{{ camEnabled ? "📷 Camera On" : "🚫 Camera Off" }}</button>
            <button class="control" :class="{ active: screenSharing }" :disabled="roomKind !== 'video'" @click="toggleScreenShare">{{ screenSharing ? "🖥 Stop Share" : "🖥 Share Screen" }}</button>
            <button class="control" :class="{ active: speakerEnabled }" @click="toggleSpeaker">{{ speakerEnabled ? "🔊 Speaker On" : "🔈 Speaker Low" }}</button>
            <button class="control" :class="{ active: raisedHands.has('local') }" @click="toggleHandRaise">{{ raisedHands.has('local') ? "✋ Lower Hand" : "✋ Raise Hand" }}</button>
          </div>
          <div class="stage-right">
            <button class="control ghost" @click="focusTile('local')">Focus Me</button>
            <button class="control ghost" @click="focusDominantSpeaker" :disabled="!dominantSpeakerId">Focus Speaker</button>
            <button class="control ghost" @click="clearFocus">Show All</button>
            <button class="control ghost" @click="forceReconnectPeers">Repair Peers</button>
            <button class="control ghost" @click="togglePiP">PiP</button>
          </div>
        </div>

        <div class="magic-toolbar glassy">
          <div class="magic-left">
            <div class="reaction-picker">
              <button v-for="emoji in reactionEmojis" :key="emoji" class="magicBtn" @click="sendReaction(emoji)">{{ emoji }}</button>
            </div>
          </div>
          <div class="magic-right">
            <button v-if="isHost" class="magicChip" :class="{ active: isRecording }" @click="toggleRecording">{{ isRecording ? "⏹ Stop Record" : "⏺ Record" }}</button>
            <button v-if="isHost" class="magicChip" @click="showPollModal = true">📊 Poll</button>
            <button v-if="isHost" class="magicChip" @click="showBreakoutModal = true">🚪 Breakouts</button>
            <button class="magicChip" @click="toggleTranscription">{{ transcriptionActive ? "📝 Stop Transcript" : "📝 Transcribe" }}</button>
            <button class="magicChip" @click="copyDiagnostics">🧾 Diagnostics</button>
            <button class="magicChip" @click="copyInvite">🔗 Copy Invite</button>
            <button class="magicChip" @click="togglePanel">{{ sidePanelOpen ? "📚 Hide Panel" : "📚 Show Panel" }}</button>
          </div>
        </div>

        <!-- PAGINATION -->
        <div v-if="pageCount > 1" class="pagination-bar glassy">
          <button class="page-btn" :disabled="currentPage === 0" @click="currentPage--">← Prev</button>
          <span class="page-info">Page {{ currentPage + 1 }} of {{ pageCount }}</span>
          <button class="page-btn" :disabled="currentPage >= pageCount - 1" @click="currentPage++">Next →</button>
        </div>

        <!-- VIDEO STAGE / WHITEBOARD -->
        <div class="video-stage" :class="[gridClass, { focused: !!focusedTileId, cinematic: cinematicMode }]">
          <!-- WHITEBOARD -->
          <div v-if="whiteboardMode" class="whiteboard-wrap">
            <canvas ref="whiteboardRef" class="whiteboard-canvas" @mousedown="startDraw" @mousemove="draw" @mouseup="endDraw" @mouseleave="endDraw"></canvas>
            <div class="whiteboard-tools">
              <button v-for="color in wbColors" :key="color" class="wb-color" :style="{ background: color }" :class="{ active: wbColor === color }" @click="wbColor = color"></button>
              <button class="wb-tool" :class="{ active: wbTool === 'pen' }" @click="wbTool = 'pen'">✏️</button>
              <button class="wb-tool" :class="{ active: wbTool === 'eraser' }" @click="wbTool = 'eraser'">🧹</button>
              <button class="wb-tool" @click="clearWhiteboard">🗑</button>
            </div>
          </div>

          <!-- LOCAL TILE -->
          <article v-if="shouldShowLocalTile && !whiteboardMode" class="tile selfTile glassy" :class="{ big: focusedTileId === 'local', compact: compactMode, speaking: isSpeaking('local'), dominant: dominantSpeakerId === 'local', spotlight: spotlightIds.has('local') }" @click="focusTile('local')" @dblclick="toggleSpotlight('local')">
            <div class="tile-head">
              <div class="tile-user">
                <span class="avatar">{{ myInitial }}</span>
                <div class="tile-meta">
                  <div class="tile-name">{{ myName }}<span class="me-tag">You</span><span v-if="raisedHands.has('local')" class="hand-tag">✋</span></div>
                  <div class="tile-sub">{{ screenSharing ? "Screen sharing" : roomKind === "video" ? "Local camera" : "Local audio" }}</div>
                </div>
              </div>
              <div class="tile-pills">
                <span class="pill" :class="{ off: !micEnabled }">{{ micEnabled ? "Mic" : "Muted" }}</span>
                <span v-if="roomKind === 'video'" class="pill" :class="{ off: !camEnabled && !screenSharing }">{{ screenSharing ? "Screen" : (camEnabled ? "Cam" : "Cam Off") }}</span>
                <span class="pill">{{ sessionDurationLabel }}</span>
                <span v-if="networkQuality.score < 3" class="pill warn">⚠️ Network</span>
              </div>
            </div>
            <div class="media-wrap">
              <video v-if="roomKind === 'video' || screenSharing" ref="localVideoRef" class="media" :class="{ mirrored: mirrorLocal }" autoplay playsinline muted></video>
              <div v-else class="audio-room-card">
                <div class="audio-room-avatar">{{ myInitial }}</div>
                <div class="audio-room-name">{{ myName }}</div>
                <div class="audio-room-sub">Audio room connected</div>
              </div>
              <canvas v-if="screenSharing && annotationMode" ref="annotationRef" class="annotation-canvas" @mousedown="startAnnotate" @mousemove="annotate" @mouseup="endAnnotate"></canvas>
              <div class="corner-status">{{ joinedRoom ? "LIVE" : "CONNECTING" }}</div>
              <div class="speaker-ring" :style="speakerRingStyle('local')"></div>
              <div v-if="raisedHands.has('local')" class="hand-indicator">✋</div>
            </div>
          </article>

          <!-- REMOTE TILES -->
          <article v-for="p in paginatedRemoteParticipants" :key="p.socketId" class="tile remoteTile glassy" :class="{ big: focusedTileId === p.socketId, compact: compactMode, speaking: isSpeaking(p.socketId), dominant: dominantSpeakerId === p.socketId, spotlight: spotlightIds.has(p.socketId) }" @click="focusTile(p.socketId)" @dblclick="toggleSpotlight(p.socketId)">
            <div class="tile-head">
              <div class="tile-user">
                <span class="avatar alt">{{ getInitialName(p.displayName || p.username || p.userId) }}</span>
                <div class="tile-meta">
                  <div class="tile-name">{{ p.displayName || p.username || `User #${p.userId || "?"}` }}<span v-if="raisedHands.has(p.socketId)" class="hand-tag">✋</span></div>
                  <div class="tile-sub">{{ peerStatus[p.socketId] || "Connected" }}</div>
                </div>
              </div>
              <div class="tile-pills">
                <span class="pill">{{ roomKind === "video" ? "Video" : "Audio" }}</span>
                <span class="pill ghostState">{{ peerConnectionState[p.socketId] || "online" }}</span>
                <span v-if="networkQuality.remote[p.socketId] && networkQuality.remote[p.socketId].score < 3" class="pill warn">⚠️ Weak</span>
              </div>
            </div>
            <div class="media-wrap">
              <video v-if="roomKind === 'video'" :ref="(el) => setRemoteVideoRef(p.socketId, el)" class="media" autoplay playsinline></video>
              <div v-else class="audio-room-card">
                <div class="audio-room-avatar">{{ getInitialName(p.displayName || p.username || p.userId) }}</div>
                <div class="audio-room-name">{{ p.displayName || p.username || `User #${p.userId || "?"}` }}</div>
                <div class="audio-room-sub">Audio participant</div>
              </div>
              <div class="corner-status remote">{{ peerConnectionState[p.socketId] || "online" }}</div>
              <div class="speaker-ring" :style="speakerRingStyle(p.socketId)"></div>
              <div v-if="raisedHands.has(p.socketId)" class="hand-indicator">✋</div>
            </div>
          </article>

          <!-- EMPTY STATE -->
          <div v-if="visibleRemoteParticipants.length === 0 && (!focusedTileId || focusedTileId === 'local') && !whiteboardMode" class="empty-state glassy">
            <div class="empty-emoji">✨</div>
            <div class="empty-title">Room is ready</div>
            <div class="empty-sub">Share the invite link so others can join your AddisGo room call.</div>
            <div class="empty-actions">
              <button class="btn btn-primary" @click="copyInvite">Copy Invite</button>
              <button class="btn ghostBtn" @click="refreshRoomState">Refresh</button>
              <button class="btn ghostBtn" @click="sendReaction('🚀')">Launch Vibe</button>
            </div>
          </div>
        </div>
      </section>

      <!-- SIDE PANEL -->
      <aside class="side" :class="{ closed: !sidePanelOpen }">
        <div class="panel-tabs">
          <button v-for="tab in panelTabs" :key="tab.id" class="panel-tab" :class="{ active: activePanelTab === tab.id }" @click="activePanelTab = tab.id">
            {{ tab.label }}
            <span v-if="tab.id === 'chat' && unreadChatCount > 0" class="tab-badge">{{ unreadChatCount }}</span>
            <span v-if="tab.id === 'waiting' && waitingParticipants.length > 0" class="tab-badge warn">{{ waitingParticipants.length }}</span>
          </button>
        </div>

        <!-- PARTICIPANTS -->
        <section v-if="activePanelTab === 'participants'" class="panel glassy">
          <div class="panel-head">
            <div class="panel-title">👥 Participants</div>
            <div class="panel-sub">{{ participantCount }} connected</div>
          </div>
          <div class="people-list">
            <div class="person-card self">
              <div class="avatar big">{{ myInitial }}</div>
              <div class="person-meta">
                <div class="person-name">{{ myName }} <span class="me-tag">You</span><span v-if="isHost" class="host-tag">HOST</span></div>
                <div class="person-sub"><span class="status-dot on"></span>{{ joinedRoom ? "In room" : "Joining..." }}</div>
              </div>
              <button class="person-action" @click="toggleHandRaise">{{ raisedHands.has('local') ? "✋" : "✊" }}</button>
            </div>
            <div v-for="p in remoteParticipants" :key="'side-' + p.socketId" class="person-card">
              <div class="avatar big alt">{{ getInitialName(p.displayName || p.username || p.userId) }}</div>
              <div class="person-meta">
                <div class="person-name">{{ p.displayName || p.username || `User #${p.userId || "?"}` }}<span v-if="p.isHost" class="host-tag">HOST</span></div>
                <div class="person-sub"><span class="status-dot" :class="{ on: isSpeaking(p.socketId) || (peerConnectionState[p.socketId] === 'connected') }"></span>{{ peerStatus[p.socketId] || "Connected" }}</div>
              </div>
              <div class="person-actions">
                <button v-if="isHost && p.socketId !== mySocketId" class="person-action" @click="removeParticipant(p.socketId)" title="Remove">🚫</button>
                <button class="person-action" @click="focusTile(p.socketId)" title="Focus">🎯</button>
              </div>
            </div>
          </div>
        </section>

        <!-- CHAT -->
        <section v-if="activePanelTab === 'chat'" class="panel glassy chat-panel">
          <div class="panel-head">
            <div class="panel-title">💬 Chat</div>
            <button class="chip ghost miniChip" @click="chatMessages = []">Clear</button>
          </div>
          <div ref="chatScrollRef" class="chat-messages">
            <div v-for="msg in chatMessages" :key="msg.id" class="chat-msg" :class="{ self: msg.from === mySocketId }">
              <div class="chat-msg-header"><strong>{{ msg.name }}</strong><span class="chat-time">{{ formatTime(msg.time) }}</span></div>
              <div class="chat-msg-body">{{ msg.text }}</div>
              <div v-if="msg.reactions?.length" class="chat-reactions"><span v-for="r in msg.reactions" :key="r" class="chat-reaction">{{ r }}</span></div>
            </div>
            <div v-if="chatMessages.length === 0" class="chat-empty">No messages yet. Start the conversation!</div>
          </div>
          <div class="chat-input-wrap">
            <input v-model="chatInput" type="text" placeholder="Type a message..." maxlength="500" @keydown.enter="sendChatMessage" />
            <button class="chat-send" @click="sendChatMessage">➤</button>
          </div>
        </section>

        <!-- POLLS -->
        <section v-if="activePanelTab === 'polls'" class="panel glassy">
          <div class="panel-head">
            <div class="panel-title">📊 Polls</div>
            <button v-if="isHost" class="chip ghost miniChip" @click="showPollModal = true">+ New</button>
          </div>
          <div v-if="!activePoll" class="chat-empty">No active poll.</div>
          <div v-else class="poll-wrap">
            <div class="poll-q">{{ activePoll.question }}</div>
            <div class="poll-options">
              <button v-for="(opt, idx) in activePoll.options" :key="idx" class="poll-option" :class="{ voted: activePoll.myVote === idx, winner: activePoll.revealed && activePoll.winner === idx }" :disabled="activePoll.myVote !== null && !activePoll.revealed" @click="votePoll(idx)">
                <span class="poll-opt-text">{{ opt }}</span>
                <span v-if="activePoll.revealed" class="poll-opt-bar" :style="{ width: activePoll.percentages[idx] + '%' }"></span>
                <span v-if="activePoll.revealed" class="poll-opt-pct">{{ activePoll.percentages[idx] }}%</span>
              </button>
            </div>
            <div v-if="activePoll.revealed" class="poll-total">{{ activePoll.totalVotes }} votes</div>
            <button v-if="isHost && !activePoll.revealed" class="btn btn-primary mt10" @click="revealPoll">Reveal Results</button>
            <button v-if="isHost" class="btn ghostBtn mt10" @click="closePoll">Close Poll</button>
          </div>
        </section>

        <!-- WAITING ROOM -->
        <section v-if="activePanelTab === 'waiting'" class="panel glassy">
          <div class="panel-head">
            <div class="panel-title">🛡 Waiting Room</div>
            <div class="panel-sub">{{ waitingParticipants.length }} waiting</div>
          </div>
          <div class="people-list">
            <div v-for="w in waitingParticipants" :key="w.socketId" class="person-card">
              <div class="avatar big alt">{{ getInitialName(w.name) }}</div>
              <div class="person-meta">
                <div class="person-name">{{ w.name }}</div>
                <div class="person-sub">Waiting to join</div>
              </div>
              <div class="person-actions">
                <button class="person-action ok" @click="admitParticipant(w.socketId)">✓</button>
                <button class="person-action danger" @click="denyParticipant(w.socketId)">✕</button>
              </div>
            </div>
            <div v-if="waitingParticipants.length === 0" class="chat-empty">Nobody in waiting room.</div>
          </div>
        </section>

        <!-- TRANSCRIPTION -->
        <section v-if="activePanelTab === 'transcript'" class="panel glassy">
          <div class="panel-head">
            <div class="panel-title">📝 Live Transcription</div>
            <button class="chip ghost miniChip" @click="transcriptLines = []">Clear</button>
          </div>
          <div class="transcript-wrap">
            <div v-for="(line, idx) in transcriptLines" :key="idx" class="transcript-line">
              <span class="transcript-name">{{ line.name }}:</span>
              <span class="transcript-text">{{ line.text }}</span>
            </div>
            <div v-if="transcriptLines.length === 0" class="chat-empty">{{ transcriptionActive ? "Listening..." : "Transcription is off." }}</div>
          </div>
        </section>

        <!-- CONTROLS -->
        <section v-if="activePanelTab === 'controls'" class="panel glassy">
          <div class="panel-head"><div class="panel-title">🧰 Controls</div></div>
          <div class="tools-grid">
            <button class="toolBtn" @click="copyInvite">🔗 Copy Invite</button>
            <button class="toolBtn" @click="copyRoomId">🆔 Copy Room ID</button>
            <button class="toolBtn" @click="refreshRoomState">🔄 Refresh State</button>
            <button class="toolBtn" @click="toggleMic">{{ micEnabled ? "🔇 Mute Mic" : "🎙 Unmute" }}</button>
            <button class="toolBtn" :disabled="roomKind !== 'video'" @click="toggleCamera">{{ camEnabled ? "🚫 Stop Camera" : "📷 Start Camera" }}</button>
            <button class="toolBtn" :disabled="roomKind !== 'video'" @click="toggleScreenShare">{{ screenSharing ? "🖥 Stop Share" : "🖥 Share Screen" }}</button>
            <button class="toolBtn" @click="toggleMirrorMode">{{ mirrorLocal ? "🪞 Mirror On" : "🪞 Mirror Off" }}</button>
            <button class="toolBtn" @click="toggleCompactMode">{{ compactMode ? "🧩 Normal View" : "🧩 Compact View" }}</button>
            <button class="toolBtn" @click="toggleCinematicMode">{{ cinematicMode ? "🎬 Standard Mode" : "🎬 Cinematic" }}</button>
            <button class="toolBtn" @click="toggleWhiteboard">{{ whiteboardMode ? "🎨 Close Board" : "🎨 Whiteboard" }}</button>
            <button class="toolBtn" @click="focusDominantSpeaker" :disabled="!dominantSpeakerId">🎯 Focus Speaker</button>
            <button class="toolBtn" @click="forceReconnectPeers">🛠 Repair Peers</button>
            <button class="toolBtn" @click="copyDiagnostics">🧾 Copy Diagnostics</button>
            <button class="toolBtn" @click="toggleTranscription">{{ transcriptionActive ? "📝 Stop Transcript" : "📝 Transcribe" }}</button>
          </div>
          <div v-if="notice" class="hint mt10">{{ notice }}</div>
          <div v-if="errorText" class="alert mt10">{{ errorText }}</div>
        </section>

        <!-- DIAGNOSTICS -->
        <section v-if="activePanelTab === 'diagnostics'" class="panel glassy">
          <div class="panel-head"><div class="panel-title">📡 Diagnostics</div></div>
          <div class="diag-list">
            <div class="diag-row"><span>Room ID</span><strong>{{ roomId }}</strong></div>
            <div class="diag-row"><span>Kind</span><strong>{{ roomKindLabel }}</strong></div>
            <div class="diag-row"><span>Socket</span><strong>{{ socketConnected ? "Connected" : "Disconnected" }}</strong></div>
            <div class="diag-row"><span>Joined</span><strong>{{ joinedRoom ? "Yes" : "No" }}</strong></div>
            <div class="diag-row"><span>Peers</span><strong>{{ remoteParticipants.length }}</strong></div>
            <div class="diag-row"><span>Mic</span><strong>{{ micEnabled ? "On" : "Off" }}</strong></div>
            <div class="diag-row"><span>Cam</span><strong>{{ roomKind === 'video' ? (camEnabled ? "On" : "Off") : "Audio Room" }}</strong></div>
            <div class="diag-row"><span>Screen</span><strong>{{ screenSharing ? "Sharing" : "Off" }}</strong></div>
            <div class="diag-row"><span>TURN</span><strong>{{ turnReady ? "Ready" : "No" }}</strong></div>
            <div class="diag-row"><span>Timer</span><strong>{{ sessionDurationLabel }}</strong></div>
            <div class="diag-row"><span>Dominant Speaker</span><strong>{{ dominantSpeakerLabel }}</strong></div>
            <div class="diag-row"><span>Network</span><strong>{{ networkQuality.label }}</strong></div>
            <div class="diag-row"><span>Downlink</span><strong>{{ networkQuality.downlink }} Mbps</strong></div>
            <div class="diag-row"><span>Uplink</span><strong>{{ networkQuality.uplink }} Mbps</strong></div>
            <div class="diag-row"><span>Packet Loss</span><strong>{{ networkQuality.packetLoss }}%</strong></div>
            <div class="diag-row"><span>Jitter</span><strong>{{ networkQuality.jitter }}ms</strong></div>
            <div class="diag-row"><span>Resolution</span><strong>{{ localResolution }}</strong></div>
            <div class="diag-row"><span>FPS</span><strong>{{ localFps }}</strong></div>
          </div>
        </section>
      </aside>
    </main>

    <!-- BOTTOM BAR -->
    <footer class="bottomBar glassy">
      <button class="fab mute" :class="{ off: !micEnabled }" @click="toggleMic">{{ micEnabled ? "🎙" : "🔇" }}</button>
      <button class="fab cam" :class="{ off: !camEnabled && !screenSharing }" :disabled="roomKind !== 'video'" @click="toggleCamera">{{ camEnabled ? "📷" : "🚫" }}</button>
      <button class="fab share" :class="{ on: screenSharing }" :disabled="roomKind !== 'video'" @click="toggleScreenShare">🖥</button>
      <button class="fab" :class="{ active: raisedHands.has('local') }" @click="toggleHandRaise">✋</button>
      <button class="fab" @click="togglePanel">{{ sidePanelOpen ? "📚" : "📖" }}</button>
      <button class="fab invite" @click="copyInvite">🔗</button>
      <button class="fab invite" @click="forceReconnectPeers">🛠</button>
      <button class="fab invite" @click="sendReaction('🔥')">🔥</button>
      <button class="fab end" @click="confirmLeave">❌</button>
    </footer>

    <!-- SHORTCUTS MODAL -->
    <transition name="fade-scale">
      <div v-if="showShortcuts" class="modal-overlay" @click.self="showShortcuts = false">
        <div class="modal glassy">
          <h3>⌨️ Keyboard Shortcuts</h3>
          <div class="shortcuts-grid">
            <div v-for="s in shortcuts" :key="s.key" class="shortcut-row"><kbd>{{ s.key }}</kbd><span>{{ s.desc }}</span></div>
          </div>
          <button class="btn btn-primary mt10" @click="showShortcuts = false">Close</button>
        </div>
      </div>
    </transition>

    <!-- POLL MODAL -->
    <transition name="fade-scale">
      <div v-if="showPollModal" class="modal-overlay" @click.self="showPollModal = false">
        <div class="modal glassy">
          <h3>📊 Create Poll</h3>
          <input v-model="pollQuestion" type="text" placeholder="Ask a question..." class="modal-input" />
          <div v-for="(opt, idx) in pollOptions" :key="idx" class="poll-input-row">
            <input v-model="pollOptions[idx]" type="text" :placeholder="`Option ${idx + 1}`" class="modal-input" />
            <button v-if="pollOptions.length > 2" class="chip danger miniChip" @click="pollOptions.splice(idx, 1)">✕</button>
          </div>
          <button class="chip ghost miniChip" @click="pollOptions.push('')">+ Add Option</button>
          <div class="modal-actions">
            <button class="btn btn-primary" @click="createPoll">Launch Poll</button>
            <button class="btn ghostBtn" @click="showPollModal = false">Cancel</button>
          </div>
        </div>
      </div>
    </transition>

    <!-- BREAKOUT MODAL -->
    <transition name="fade-scale">
      <div v-if="showBreakoutModal" class="modal-overlay" @click.self="showBreakoutModal = false">
        <div class="modal glassy breakout-modal">
          <h3>🚪 Breakout Rooms</h3>
          <div class="breakout-list">
            <div v-for="(br, idx) in breakoutRooms" :key="idx" class="breakout-room">
              <div class="breakout-header"><span>Room {{ idx + 1 }}</span><button class="chip danger miniChip" @click="breakoutRooms.splice(idx, 1)">✕</button></div>
              <div class="breakout-members">
                <span v-for="m in br.members" :key="m" class="breakout-chip">{{ getParticipantName(m) }}</span>
              </div>
            </div>
          </div>
          <button class="chip ghost miniChip" @click="addBreakoutRoom">+ Add Room</button>
          <div class="modal-actions">
            <button class="btn btn-primary" @click="startBreakouts">Start Breakouts</button>
            <button class="btn ghostBtn" @click="showBreakoutModal = false">Close</button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

onMounted(async () => {
  if (!token) { router.push("/login"); return }
  if (!roomId.value) { setError("No roomId provided."); return }
  await loadTurnServers()
  await initLobbyMedia()
  socket = createSocket()
  attachSocketListeners()
  startSpeakerLoop()
  networkStatsTimer = setInterval(monitorNetworkQuality, 2000)
})

onBeforeUnmount(() => {
  try { socket?.emit("callroom:leave", { roomId: roomId.value }) } catch {}
  try { socket?.off("connect") } catch {}
  try { socket?.off("disconnect") } catch {}
  try { socket?.off("callroom:state") } catch {}
  try { socket?.off("callroom:user-joined") } catch {}
  try { socket?.off("callroom:user-left") } catch {}
  try { socket?.off("callroom:webrtc:offer", handleOfferPayload) } catch {}
  try { socket?.off("callroom:webrtc:answer", handleAnswerPayload) } catch {}
  try { socket?.off("callroom:webrtc:ice", handleIcePayload) } catch {}
  try { socket?.off("callroom:error") } catch {}
  try { socket?.cleanupPulseSocket?.() } catch {}
  try { socket?.disconnect?.() } catch {}
  if (reconnectTimer) { window.clearTimeout(reconnectTimer); reconnectTimer = null }
  stopSessionTimer()
  cleanupAll()
  try { audioContext?.close?.() } catch {}
  audioContext = null
  socket = null
})
</script>

<style scoped>
/* ═══════════════════════════════════════════════════════════════
   ADDISGO ROOM CALL — ENTERPRISE DESIGN SYSTEM v3.0
   Linear × Discord × Creator Platform × Zoom aesthetic
   ═══════════════════════════════════════════════════════════════ */

/* ─── CSS Variables ─── */
:root {
  --bg-base: #060913;
  --bg-elevated: #0a0e1a;
  --bg-surface: rgba(255,255,255,0.025);
  --bg-surface-hover: rgba(255,255,255,0.045);
  --bg-surface-active: rgba(255,255,255,0.06);
  --accent-start: #8b5cf6;
  --accent-end: #ec4899;
  --accent-gradient: linear-gradient(135deg, var(--accent-start), var(--accent-end));
  --accent-glow: rgba(139, 92, 246, 0.35);
  --success: #10b981;
  --success-glow: rgba(16, 185, 129, 0.35);
  --warning: #f59e0b;
  --danger: #ef4444;
  --danger-glow: rgba(239, 68, 68, 0.35);
  --info: #3b82f6;
  --text-primary: rgba(255,255,255,0.95);
  --text-secondary: rgba(255,255,255,0.70);
  --text-tertiary: rgba(255,255,255,0.45);
  --text-muted: rgba(255,255,255,0.30);
  --border-subtle: rgba(255,255,255,0.06);
  --border-default: rgba(255,255,255,0.10);
  --border-strong: rgba(255,255,255,0.14);
  --border-accent: rgba(139, 92, 246, 0.35);
  --radius-sm: 10px;
  --radius-md: 14px;
  --radius-lg: 20px;
  --radius-xl: 28px;
  --radius-full: 999px;
  --shadow-sm: 0 2px 8px rgba(0,0,0,0.20);
  --shadow-md: 0 8px 24px rgba(0,0,0,0.28);
  --shadow-lg: 0 16px 48px rgba(0,0,0,0.35);
  --shadow-glow: 0 0 40px var(--accent-glow);
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --duration-fast: 0.15s;
  --duration-normal: 0.25s;
  --duration-slow: 0.4s;
}

/* ─── Scrollbars ─── */
* { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.12) transparent; }
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: var(--radius-full); }
::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.22); }
::-webkit-scrollbar-corner { background: transparent; }

/* ─── Animations ─── */
@keyframes floatA { from { transform: translateY(0) scale(1); } to { transform: translateY(-18px) scale(1.03); } }
@keyframes floatB { from { transform: translateX(0) scale(1); } to { transform: translateX(16px) scale(1.04); } }
@keyframes floatC { from { transform: translateY(0) translateX(0); } to { transform: translateY(10px) translateX(-12px); } }
@keyframes pulseRing { 0% { transform: scale(1); opacity: 0.6; } 100% { transform: scale(2.2); opacity: 0; } }
@keyframes speakPulse { 0%, 100% { box-shadow: 0 0 0 6px rgba(16,185,129,0.15), 0 0 24px rgba(16,185,129,0.25); } 50% { box-shadow: 0 0 0 10px rgba(16,185,129,0.08), 0 0 32px rgba(16,185,129,0.15); } }
@keyframes floatUp { 0% { transform: translateY(0) scale(1); opacity: 1; } 100% { transform: translateY(-120vh) scale(1.4); opacity: 0; } }
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes recPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

/* ─── Transitions ─── */
.fade-scale-enter-active, .fade-scale-leave-active { transition: all 0.3s var(--ease-out); }
.fade-scale-enter-from, .fade-scale-leave-to { opacity: 0; transform: scale(0.92); }
.pop-reaction-enter-active, .pop-reaction-leave-active { transition: all 0.3s var(--ease-out); }
.pop-reaction-enter-from, .pop-reaction-leave-to { opacity: 0; transform: scale(0.7) translateY(24px); }
.slide-down-enter-active, .slide-down-leave-active { transition: all 0.3s var(--ease-out); }
.slide-down-enter-from, .slide-down-leave-to { transform: translateY(-100%); opacity: 0; }
.slide-up-enter-active, .slide-up-leave-active { transition: all 0.3s var(--ease-out); }
.slide-up-enter-from, .slide-up-leave-to { transform: translateY(20px); opacity: 0; }
.float-up-enter-active { animation: floatUp 3s ease-out forwards; }
.float-up-leave-active { transition: opacity 0.3s; }
.float-up-leave-to { opacity: 0; }

/* ─── Page Layout ─── */
.roomcall-page {
  min-height: 100vh;
  color: var(--text-primary);
  position: relative;
  overflow-x: hidden;
  padding: 18px 18px 110px;
  background:
    radial-gradient(1400px 800px at 15% -5%, rgba(139,92,246,0.10), transparent 60%),
    radial-gradient(1200px 700px at 85% 10%, rgba(236,72,153,0.08), transparent 55%),
    radial-gradient(900px 600px at 50% 110%, rgba(59,130,246,0.06), transparent 50%),
    linear-gradient(180deg, var(--bg-base) 0%, var(--bg-elevated) 50%, var(--bg-base) 100%);
}

/* Ambient Background Layers */
.bg-layer { position: fixed; inset: 0; pointer-events: none; z-index: 0; border-radius: 0; }
.bg1 { background: radial-gradient(circle at 20% 10%, rgba(139,92,246,0.06), transparent 30%); animation: floatA 14s ease-in-out infinite alternate; }
.bg2 { background: radial-gradient(circle at 80% 20%, rgba(236,72,153,0.05), transparent 25%); animation: floatB 16s ease-in-out infinite alternate; }
.bg3 { background: radial-gradient(circle at 55% 80%, rgba(59,130,246,0.05), transparent 28%); animation: floatC 18s ease-in-out infinite alternate; }

/* ─── Glassmorphism Base ─── */
.glassy {
  background: var(--bg-surface);
  border: 1px solid var(--border-default);
  backdrop-filter: blur(24px) saturate(160%);
  -webkit-backdrop-filter: blur(24px) saturate(160%);
  box-shadow: var(--shadow-md), inset 0 1px 1px rgba(255,255,255,0.04);
  transition: border-color var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out), transform var(--duration-fast) var(--ease-out);
}

/* ─── Floating Reactions ─── */
.floating-reactions { position: fixed; inset: 0; pointer-events: none; z-index: 25; overflow: hidden; }
.floating-reaction { position: absolute; bottom: 120px; font-size: 32px; animation: floatUp 3s ease-out forwards; pointer-events: none; filter: drop-shadow(0 4px 12px rgba(0,0,0,0.3)); }

/* ─── Reaction Burst ─── */
.reaction-burst { position: fixed; inset: 0; display: grid; place-items: center; font-size: 100px; z-index: 30; pointer-events: none; text-shadow: 0 12px 48px rgba(0,0,0,0.5); filter: drop-shadow(0 0 30px rgba(139,92,246,0.4)); }

/* ─── Recording Banner ─── */
.recording-banner { position: fixed; top: 0; left: 0; right: 0; z-index: 20; background: rgba(239,68,68,0.15); backdrop-filter: blur(12px); border-bottom: 1px solid rgba(239,68,68,0.25); padding: 10px; display: flex; align-items: center; justify-content: center; gap: 12px; font-size: 13px; font-weight: 800; color: #fca5a5; }
.rec-dot { width: 10px; height: 10px; border-radius: 50%; background: #ef4444; animation: recPulse 1.5s ease-in-out infinite; }
.rec-timer { font-variant-numeric: tabular-nums; }

/* ─── Network Toast ─── */
.network-toast { position: fixed; bottom: 100px; left: 50%; transform: translateX(-50%); z-index: 20; padding: 12px 20px; border-radius: var(--radius-lg); background: rgba(6,9,19,0.9); backdrop-filter: blur(16px); border: 1px solid var(--border-default); display: flex; align-items: center; gap: 10px; font-size: 13px; font-weight: 700; box-shadow: var(--shadow-lg); }
.network-toast.warn { border-color: rgba(245,158,11,0.4); color: #fcd34d; }
.network-toast.bad { border-color: rgba(239,68,68,0.4); color: #fca5a5; }

/* ─── Lobby ─── */
.lobby-overlay { position: fixed; inset: 0; z-index: 50; display: grid; place-items: center; padding: 24px; background: var(--bg-base); }
.lobby-bg { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
.bg-orb { position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.4; }
.orb1 { width: 500px; height: 500px; background: rgba(139,92,246,0.25); top: -10%; left: -5%; animation: floatA 12s ease-in-out infinite alternate; }
.orb2 { width: 400px; height: 400px; background: rgba(236,72,153,0.2); bottom: -10%; right: -5%; animation: floatB 14s ease-in-out infinite alternate; }
.orb3 { width: 300px; height: 300px; background: rgba(59,130,246,0.15); top: 40%; left: 40%; animation: floatC 16s ease-in-out infinite alternate; }
.lobby-card { position: relative; z-index: 1; width: min(520px, 92vw); background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: var(--radius-xl); padding: 32px; backdrop-filter: blur(24px); box-shadow: var(--shadow-lg); }
.lobby-brand { text-align: center; margin-bottom: 24px; }
.lobby-logo { width: 56px; height: 56px; border-radius: var(--radius-lg); background: var(--accent-gradient); display: grid; place-items: center; font-weight: 900; font-size: 22px; color: white; margin: 0 auto 12px; box-shadow: 0 8px 24px rgba(139,92,246,0.3); }
.lobby-title { font-size: 24px; font-weight: 900; margin: 0; }
.lobby-sub { color: var(--text-tertiary); font-size: 14px; margin-top: 6px; }
.lobby-preview-wrap { margin-bottom: 24px; }
.lobby-preview { position: relative; width: 100%; aspect-ratio: 16/9; background: var(--bg-elevated); border-radius: var(--radius-lg); overflow: hidden; border: 1px solid var(--border-default); }
.lobby-video { width: 100%; height: 100%; object-fit: cover; }
.lobby-video.mirrored { transform: scaleX(-1); }
.lobby-canvas { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
.lobby-avatar { width: 100%; height: 100%; display: grid; place-items: center; font-size: 64px; font-weight: 900; background: var(--accent-gradient); color: white; }
.lobby-preview-badge { position: absolute; top: 12px; left: 12px; display: flex; align-items: center; gap: 8px; padding: 8px 14px; border-radius: var(--radius-full); background: rgba(0,0,0,0.5); backdrop-filter: blur(8px); font-size: 12px; font-weight: 800; }
.lobby-preview-actions { position: absolute; bottom: 12px; left: 50%; transform: translateX(-50%); display: flex; gap: 10px; }
.lobby-mini-btn { width: 44px; height: 44px; border-radius: 50%; border: 1px solid var(--border-default); background: rgba(0,0,0,0.5); backdrop-filter: blur(8px); color: white; font-size: 18px; cursor: pointer; transition: all 0.15s; }
.lobby-mini-btn:hover { background: rgba(0,0,0,0.7); transform: scale(1.08); }
.lobby-mini-btn.off { background: rgba(239,68,68,0.3); border-color: rgba(239,68,68,0.5); }
.lobby-audio-meter { display: flex; gap: 3px; justify-content: center; margin-top: 10px; }
.meter-bar { width: 6px; height: 20px; border-radius: 3px; background: var(--accent-gradient); transition: opacity 0.1s; }
.lobby-form { display: grid; gap: 16px; margin-bottom: 24px; }
.lobby-field label { display: block; font-size: 12px; font-weight: 800; color: var(--text-secondary); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.08em; }
.lobby-field input, .lobby-field select { width: 100%; padding: 12px 14px; border-radius: var(--radius-md); background: var(--bg-surface-hover); border: 1px solid var(--border-default); color: var(--text-primary); font-size: 14px; font-weight: 600; outline: none; transition: all 0.15s; }
.lobby-field input:focus, .lobby-field select:focus { border-color: var(--accent-start); box-shadow: 0 0 0 3px rgba(139,92,246,0.15); }
.bg-selector { display: flex; gap: 10px; flex-wrap: wrap; }
.bg-option { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 10px; border-radius: var(--radius-md); background: var(--bg-surface-hover); border: 2px solid transparent; cursor: pointer; transition: all 0.15s; min-width: 72px; }
.bg-option:hover { border-color: var(--border-strong); transform: translateY(-2px); }
.bg-option.active { border-color: var(--accent-start); background: rgba(139,92,246,0.1); }
.bg-option-preview { width: 48px; height: 36px; border-radius: var(--radius-sm); display: grid; place-items: center; font-size: 18px; }
.bg-option-label { font-size: 11px; font-weight: 700; color: var(--text-secondary); }
.lobby-actions { display: flex; gap: 12px; }
.lobby-join { flex: 1; justify-content: center; }
.spinner { width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite; display: inline-block; }

/* ─── Topbar ─── */
.topbar { position: relative; z-index: 2; padding: 12px 18px; display: flex; justify-content: space-between; gap: 14px; align-items: center; flex-wrap: wrap; margin-bottom: 16px; border-radius: var(--radius-xl); }
.top-left, .top-right { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

/* Chips */
.chip { border: 1px solid var(--border-default); border-radius: var(--radius-full); padding: 10px 16px; cursor: pointer; background: var(--bg-surface-hover); color: var(--text-primary); font-weight: 700; font-size: 13px; display: inline-flex; align-items: center; justify-content: center; gap: 6px; transition: all var(--duration-fast) var(--ease-out); user-select: none; }
.chip:hover { background: var(--bg-surface-active); border-color: var(--border-strong); transform: translateY(-1px); box-shadow: var(--shadow-sm); }
.chip:active { transform: translateY(0) scale(0.97); }
.chip:focus-visible { outline: 2px solid var(--accent-start); outline-offset: 2px; }
.chip.ghost { background: transparent; border-color: var(--border-default); color: var(--text-secondary); }
.chip.ghost:hover { background: var(--bg-surface-hover); border-color: var(--border-strong); color: var(--text-primary); }
.chip.danger { background: rgba(239,68,68,0.15); border-color: rgba(239,68,68,0.30); color: #fca5a5; }
.chip.danger:hover { background: rgba(239,68,68,0.22); border-color: rgba(239,68,68,0.45); box-shadow: 0 4px 16px rgba(239,68,68,0.15); }
.chip.active { background: rgba(139,92,246,0.15); border-color: rgba(139,92,246,0.35); color: #c4b5fd; }
.miniChip { font-size: 12px; padding: 8px 12px; }

/* Room Pill */
.room-pill { display: flex; align-items: center; gap: 12px; padding: 10px 16px; border-radius: var(--radius-lg); background: var(--bg-surface-hover); border: 1px solid var(--border-default); }
.live-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--success); box-shadow: 0 0 12px var(--success-glow); position: relative; flex-shrink: 0; }
.live-dot::after { content: ''; position: absolute; inset: -3px; border-radius: 50%; border: 1.5px solid var(--success); animation: pulseRing 2s ease-out infinite; }
.room-pill-title { font-weight: 900; font-size: 15px; color: var(--text-primary); }
.room-pill-sub { color: var(--text-tertiary); font-size: 12px; font-weight: 500; margin-top: 2px; }
.lock-badge { margin-left: 8px; padding: 3px 8px; border-radius: var(--radius-full); background: rgba(245,158,11,0.15); border: 1px solid rgba(245,158,11,0.3); color: #fcd34d; font-size: 10px; font-weight: 900; }

/* Network Quality */
.net-quality { display: flex; align-items: center; gap: 6px; }
.nq-bars { display: flex; align-items: flex-end; gap: 3px; height: 18px; }
.nq-bar { width: 4px; border-radius: 2px; background: rgba(255,255,255,0.15); transition: all 0.3s; }
.nq-bar:nth-child(1) { height: 6px; }
.nq-bar:nth-child(2) { height: 10px; }
.nq-bar:nth-child(3) { height: 14px; }
.nq-bar:nth-child(4) { height: 18px; }
.nq-bar.active { background: var(--success); box-shadow: 0 0 8px var(--success-glow); }
.nq-bar.active.warn { background: var(--warning); box-shadow: 0 0 8px rgba(245,158,11,0.3); }

/* ─── Hero ─── */
.hero { position: relative; z-index: 2; padding: 28px; display: grid; grid-template-columns: 1.4fr 0.8fr; gap: 28px; margin-bottom: 16px; border-radius: var(--radius-xl); background: linear-gradient(135deg, rgba(139,92,246,0.08), rgba(236,72,153,0.05)); border: 1px solid var(--border-default); overflow: hidden; transition: all 0.3s var(--ease-out); }
.hero::before { content: ''; position: absolute; top: -50%; right: -20%; width: 400px; height: 400px; background: radial-gradient(circle, rgba(139,92,246,0.10), transparent 70%); pointer-events: none; }
.hero.collapsed { padding: 16px 24px; }
.hero.collapsed .hero-sub, .hero.collapsed .hero-badges, .hero.collapsed .hero-right { display: none; }
.hero-left { position: relative; z-index: 1; }
.eyebrow { font-size: 11px; font-weight: 900; letter-spacing: 0.2em; color: var(--accent-start); text-transform: uppercase; }
.hero-title { margin: 8px 0 12px; font-size: clamp(28px, 4vw, 44px); line-height: 1.05; font-weight: 900; letter-spacing: -0.03em; background: linear-gradient(135deg, #fff 60%, rgba(255,255,255,0.7)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.hero-sub { max-width: 720px; color: var(--text-secondary); line-height: 1.6; font-size: 14px; }
.hero-badges { margin-top: 18px; display: flex; gap: 8px; flex-wrap: wrap; }
.badge { padding: 7px 12px; border-radius: var(--radius-full); background: var(--bg-surface); border: 1px solid var(--border-default); font-size: 12px; font-weight: 800; color: var(--text-secondary); transition: all var(--duration-fast) var(--ease-out); }
.badge.ok { border-color: rgba(16,185,129,0.35); background: rgba(16,185,129,0.10); color: #6ee7b7; }
.badge.bad { border-color: rgba(239,68,68,0.35); background: rgba(239,68,68,0.10); color: #fca5a5; }
.badge.accent { border-color: rgba(139,92,246,0.35); background: rgba(139,92,246,0.12); color: #c4b5fd; }
.badge.danger { border-color: rgba(239,68,68,0.35); background: rgba(239,68,68,0.12); color: #fca5a5; }
.badge.warning { border-color: rgba(245,158,11,0.35); background: rgba(245,158,11,0.12); color: #fcd34d; }
.hero-right { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; align-content: start; position: relative; z-index: 1; }
.hero-stat { border-radius: var(--radius-lg); background: var(--bg-surface); border: 1px solid var(--border-default); padding: 18px 14px; text-align: center; transition: all var(--duration-fast) var(--ease-out); }
.hero-stat:hover { background: var(--bg-surface-hover); border-color: var(--border-strong); transform: translateY(-2px); box-shadow: var(--shadow-sm); }
.hero-num { font-size: 26px; font-weight: 900; background: var(--accent-gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.hero-lab { font-size: 12px; color: var(--text-tertiary); font-weight: 600; margin-top: 6px; }
.hero-collapse { position: absolute; top: 12px; right: 12px; width: 32px; height: 32px; border-radius: 50%; border: 1px solid var(--border-default); background: var(--bg-surface-hover); color: var(--text-secondary); cursor: pointer; display: grid; place-items: center; font-size: 12px; transition: all 0.15s; }
.hero-collapse:hover { background: var(--bg-surface-active); color: var(--text-primary); }

/* ─── Presence Strip ─── */
.presence-strip { position: relative; z-index: 2; padding: 18px; margin-bottom: 16px; border-radius: var(--radius-xl); }
.strip-head { display: flex; justify-content: space-between; gap: 12px; align-items: center; flex-wrap: wrap; margin-bottom: 14px; }
.strip-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.presence-list { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 6px; scrollbar-width: thin; }
.presenceCard { min-width: 160px; display: flex; align-items: center; gap: 12px; background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 12px 14px; text-align: left; cursor: pointer; transition: all var(--duration-fast) var(--ease-out); user-select: none; }
.presenceCard:hover { background: var(--bg-surface-hover); border-color: var(--border-strong); transform: translateY(-2px); box-shadow: var(--shadow-sm); }
.presenceCard:active { transform: translateY(0) scale(0.98); }
.presenceCard.self { background: rgba(139,92,246,0.10); border-color: rgba(139,92,246,0.22); }
.presenceCard.self:hover { background: rgba(139,92,246,0.15); border-color: rgba(139,92,246,0.30); }
.presenceAvatar { width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; font-weight: 900; font-size: 16px; color: white; background: var(--accent-gradient); flex: 0 0 auto; box-shadow: 0 0 0 0 transparent; transition: all var(--duration-fast) var(--ease-out); position: relative; }
.presenceAvatar.alt { background: linear-gradient(135deg, #f59e0b, #ef4444); }
.presenceAvatar.speaking { box-shadow: 0 0 0 6px rgba(16,185,129,0.15), 0 0 24px rgba(16,185,129,0.25); animation: speakPulse 1.5s ease-in-out infinite; }
.presenceAvatar.raised { box-shadow: 0 0 0 4px rgba(245,158,11,0.3); }
.hand-icon { position: absolute; bottom: -4px; right: -4px; font-size: 14px; background: var(--bg-base); border-radius: 50%; width: 18px; height: 18px; display: grid; place-items: center; }
.presenceMeta { min-width: 0; }
.presenceName { font-weight: 900; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text-primary); }
.presenceSub { font-size: 11px; color: var(--text-tertiary); font-weight: 500; margin-top: 2px; }

/* ─── Main Layout ─── */
.main { position: relative; z-index: 2; display: grid; grid-template-columns: 1.5fr 0.65fr; gap: 16px; }
.stage-wrap { min-width: 0; }

/* ─── Toolbars ─── */
.stage-toolbar, .magic-toolbar { position: relative; z-index: 2; padding: 14px; display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 14px; border-radius: var(--radius-xl); }
.magic-toolbar { padding: 12px 14px; }
.magic-left, .magic-right, .stage-left, .stage-right { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }

.control { border: 1px solid var(--border-default); border-radius: var(--radius-md); padding: 11px 14px; background: var(--bg-surface-hover); color: var(--text-primary); font-weight: 800; font-size: 13px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: all var(--duration-fast) var(--ease-out); user-select: none; }
.control:hover { background: var(--bg-surface-active); border-color: var(--border-strong); transform: translateY(-1px); box-shadow: var(--shadow-sm); }
.control:active { transform: translateY(0) scale(0.97); }
.control:focus-visible { outline: 2px solid var(--accent-start); outline-offset: 2px; }
.control.active { background: rgba(139,92,246,0.15); border-color: rgba(139,92,246,0.35); color: #c4b5fd; box-shadow: 0 0 16px rgba(139,92,246,0.10); }
.control.active:hover { background: rgba(139,92,246,0.20); box-shadow: 0 4px 20px rgba(139,92,246,0.15); }
.control.ghost { background: transparent; border-color: var(--border-default); color: var(--text-secondary); }
.control.ghost:hover { background: var(--bg-surface-hover); color: var(--text-primary); }
.control:disabled { opacity: 0.35; cursor: not-allowed; transform: none !important; }

.reaction-picker { display: flex; gap: 6px; }
.magicBtn { width: 44px; height: 44px; border-radius: var(--radius-md); border: 1px solid var(--border-default); background: var(--bg-surface-hover); color: var(--text-primary); cursor: pointer; font-size: 20px; display: grid; place-items: center; transition: all var(--duration-fast) var(--ease-out); }
.magicBtn:hover { background: var(--bg-surface-active); border-color: var(--border-strong); transform: translateY(-2px) scale(1.08); box-shadow: var(--shadow-sm); }
.magicBtn:active { transform: translateY(0) scale(0.95); }

.magicChip { border: 1px solid var(--border-default); border-radius: var(--radius-md); padding: 10px 14px; background: var(--bg-surface-hover); color: var(--text-secondary); cursor: pointer; font-weight: 800; font-size: 13px; transition: all var(--duration-fast) var(--ease-out); }
.magicChip:hover { background: var(--bg-surface-active); border-color: var(--border-strong); color: var(--text-primary); transform: translateY(-1px); }
.magicChip.active { background: rgba(239,68,68,0.15); border-color: rgba(239,68,68,0.3); color: #fca5a5; }

/* Pagination */
.pagination-bar { padding: 10px 16px; display: flex; justify-content: center; align-items: center; gap: 16px; margin-bottom: 14px; }
.page-btn { border: 1px solid var(--border-default); border-radius: var(--radius-md); padding: 8px 14px; background: var(--bg-surface-hover); color: var(--text-primary); cursor: pointer; font-weight: 800; font-size: 12px; transition: all 0.15s; }
.page-btn:hover:not(:disabled) { background: var(--bg-surface-active); border-color: var(--border-strong); }
.page-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.page-info { font-size: 13px; font-weight: 700; color: var(--text-secondary); }

/* ─── Video Stage ─── */
.video-stage { display: grid; gap: 16px; }
.video-stage.grid-one { grid-template-columns: 1fr; }
.video-stage.grid-two { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.video-stage.grid-four { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.video-stage.grid-many { grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); }
.video-stage.grid-focus, .video-stage.focused { grid-template-columns: 1fr; }
.video-stage.cinematic .tile { background: rgba(255,255,255,0.04); border-color: rgba(139,92,246,0.12); }

/* ─── Tiles ─── */
.tile { border-radius: var(--radius-xl); overflow: hidden; padding: 16px; min-height: 300px; display: flex; flex-direction: column; background: var(--bg-surface); border: 1px solid var(--border-default); transition: all var(--duration-fast) var(--ease-out); position: relative; cursor: pointer; }
.tile:hover { border-color: var(--border-strong); box-shadow: var(--shadow-lg), 0 0 0 1px rgba(139,92,246,0.04); }
.tile.compact { min-height: 240px; }
.tile.big { min-height: 560px; }
.tile.speaking { border-color: rgba(16,185,129,0.25); box-shadow: 0 24px 64px rgba(0,0,0,0.30), 0 0 0 1px rgba(16,185,129,0.12), 0 0 40px rgba(16,185,129,0.08); }
.tile.dominant { border-color: rgba(139,92,246,0.30); box-shadow: 0 24px 64px rgba(0,0,0,0.30), 0 0 0 1px rgba(139,92,246,0.12), 0 0 48px rgba(139,92,246,0.10); }
.tile.spotlight { border-color: rgba(245,158,11,0.4); box-shadow: 0 0 0 2px rgba(245,158,11,0.2), 0 24px 64px rgba(0,0,0,0.30); }

.tile-head { display: flex; justify-content: space-between; gap: 10px; align-items: center; margin-bottom: 14px; flex-wrap: wrap; }
.tile-user { display: flex; gap: 12px; align-items: center; min-width: 0; }
.tile-meta { min-width: 0; }
.tile-name { font-weight: 900; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text-primary); font-size: 14px; }
.tile-sub { font-size: 12px; color: var(--text-tertiary); font-weight: 500; margin-top: 3px; }

.avatar { width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; font-weight: 900; font-size: 16px; color: white; background: var(--accent-gradient); flex: 0 0 auto; box-shadow: 0 6px 18px rgba(139,92,246,0.25); transition: all var(--duration-fast) var(--ease-out); }
.avatar.alt { background: linear-gradient(135deg, #f59e0b, #ef4444); }
.avatar.big { width: 48px; height: 48px; font-size: 20px; }
.avatar:hover { transform: scale(1.08); }

.me-tag { font-size: 10px; font-weight: 900; background: var(--bg-surface-active); padding: 4px 8px; border-radius: var(--radius-full); margin-left: 6px; color: var(--text-tertiary); letter-spacing: 0.05em; text-transform: uppercase; }
.hand-tag { font-size: 12px; margin-left: 4px; }
.host-tag { font-size: 9px; font-weight: 900; background: rgba(245,158,11,0.2); color: #fcd34d; padding: 3px 7px; border-radius: var(--radius-full); margin-left: 6px; letter-spacing: 0.05em; }

.tile-pills { display: flex; gap: 8px; flex-wrap: wrap; }
.pill { padding: 6px 10px; border-radius: var(--radius-full); background: var(--bg-surface-hover); border: 1px solid var(--border-default); font-size: 11px; font-weight: 900; color: var(--text-secondary); transition: all var(--duration-fast) var(--ease-out); }
.pill.off { background: rgba(239,68,68,0.12); border-color: rgba(239,68,68,0.25); color: #fca5a5; }
.pill.warn { background: rgba(245,158,11,0.12); border-color: rgba(245,158,11,0.25); color: #fcd34d; }
.pill.ghostState { text-transform: capitalize; color: var(--text-tertiary); }

/* ─── Media ─── */
.media-wrap { position: relative; flex: 1; min-height: 0; }
.media { width: 100%; height: 100%; min-height: 240px; max-height: 72vh; border-radius: var(--radius-lg); object-fit: cover; background: #02060c; transition: transform var(--duration-normal) var(--ease-out); }
.tile:hover .media { transform: scale(1.003); }
.media.mirrored { transform: scaleX(-1); }

/* ─── Audio Room Card ─── */
.audio-room-card { min-height: 240px; height: 100%; border-radius: var(--radius-lg); display: grid; place-items: center; text-align: center; background: radial-gradient(circle at 50% 20%, rgba(139,92,246,0.12), transparent 35%), linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01)); padding: 24px; border: 1px solid var(--border-default); }
.audio-room-avatar { width: 100px; height: 100px; border-radius: 50%; display: grid; place-items: center; font-size: 36px; font-weight: 900; color: white; background: var(--accent-gradient); margin: 0 auto 16px; box-shadow: 0 12px 36px rgba(139,92,246,0.30); transition: all var(--duration-fast) var(--ease-out); }
.audio-room-card:hover .audio-room-avatar { transform: scale(1.05); box-shadow: 0 16px 44px rgba(139,92,246,0.40); }
.audio-room-name { font-size: 22px; font-weight: 900; color: var(--text-primary); }
.audio-room-sub { color: var(--text-tertiary); margin-top: 8px; font-size: 14px; font-weight: 500; }

/* ─── Corner Status ─── */
.corner-status { position: absolute; right: 12px; bottom: 12px; padding: 8px 14px; border-radius: var(--radius-full); background: rgba(0,0,0,0.55); backdrop-filter: blur(8px); font-size: 11px; font-weight: 900; color: var(--text-primary); z-index: 2; border: 1px solid rgba(255,255,255,0.08); }
.corner-status.remote { text-transform: capitalize; color: var(--text-secondary); }

/* ─── Speaker Ring ─── */
.speaker-ring { position: absolute; inset: 0; border-radius: var(--radius-lg); border: 2px solid rgba(16,185,129,0.50); pointer-events: none; transition: all 0.12s ease; opacity: 0; }

/* ─── Hand Indicator ─── */
.hand-indicator { position: absolute; top: 12px; right: 12px; width: 36px; height: 36px; border-radius: 50%; background: rgba(245,158,11,0.2); backdrop-filter: blur(8px); border: 1px solid rgba(245,158,11,0.3); display: grid; place-items: center; font-size: 18px; z-index: 3; animation: speakPulse 2s ease-in-out infinite; }

/* ─── Empty State ─── */
.empty-state { border-radius: var(--radius-xl); padding: 48px 24px; text-align: center; min-height: 300px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: var(--bg-surface); border: 1px solid var(--border-default); gap: 12px; transition: all var(--duration-fast) var(--ease-out); }
.empty-state:hover { border-color: var(--border-strong); box-shadow: var(--shadow-md); }
.empty-emoji { font-size: 48px; filter: drop-shadow(0 6px 16px rgba(0,0,0,0.3)); }
.empty-title { font-size: 24px; font-weight: 900; color: var(--text-primary); letter-spacing: -0.02em; }
.empty-sub { color: var(--text-tertiary); font-size: 14px; font-weight: 500; max-width: 480px; line-height: 1.5; }
.empty-actions { margin-top: 8px; display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }

/* ─── Buttons ─── */
.btn { border: 1px solid var(--border-default); border-radius: var(--radius-md); padding: 12px 18px; font-weight: 900; font-size: 13px; background: var(--bg-surface-hover); color: var(--text-primary); cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: all var(--duration-fast) var(--ease-out); user-select: none; }
.btn:hover { background: var(--bg-surface-active); border-color: var(--border-strong); transform: translateY(-1px); box-shadow: var(--shadow-sm); }
.btn:active { transform: translateY(0) scale(0.97); }
.btn:focus-visible { outline: 2px solid var(--accent-start); outline-offset: 2px; }
.btn.btn-primary { background: var(--accent-gradient); border-color: transparent; color: white; box-shadow: 0 8px 24px rgba(139,92,246,0.25); }
.btn.btn-primary:hover { box-shadow: 0 12px 32px rgba(139,92,246,0.35); filter: brightness(1.1); }
.btn.ghostBtn { background: transparent; border-color: var(--border-default); color: var(--text-secondary); }
.btn.ghostBtn:hover { background: var(--bg-surface-hover); color: var(--text-primary); }

/* ─── Side Panel ─── */
.side { min-width: 0; display: grid; gap: 16px; align-content: start; transition: opacity var(--duration-normal) var(--ease-out); }
.side.closed { display: none; }

.panel-tabs { display: flex; gap: 4px; overflow-x: auto; padding-bottom: 4px; }
.panel-tab { flex: 1; min-width: 60px; padding: 10px 8px; border-radius: var(--radius-md); background: var(--bg-surface); border: 1px solid var(--border-default); color: var(--text-secondary); font-size: 12px; font-weight: 800; cursor: pointer; transition: all 0.15s; white-space: nowrap; position: relative; }
.panel-tab:hover { background: var(--bg-surface-hover); color: var(--text-primary); }
.panel-tab.active { background: rgba(139,92,246,0.15); border-color: rgba(139,92,246,0.3); color: #c4b5fd; }
.tab-badge { position: absolute; top: -6px; right: -6px; min-width: 18px; height: 18px; padding: 0 5px; border-radius: 50%; background: var(--danger); color: white; font-size: 10px; font-weight: 900; display: grid; place-items: center; }
.tab-badge.warn { background: var(--warning); }

.panel { border-radius: var(--radius-xl); padding: 20px; background: var(--bg-surface); border: 1px solid var(--border-default); transition: all var(--duration-fast) var(--ease-out); }
.panel:hover { border-color: var(--border-strong); box-shadow: var(--shadow-md); }
.panel-head { display: flex; justify-content: space-between; gap: 10px; align-items: baseline; margin-bottom: 16px; flex-wrap: wrap; }
.panel-title { font-size: 16px; font-weight: 900; color: var(--text-primary); letter-spacing: -0.01em; }
.panel-sub { font-size: 12px; color: var(--text-tertiary); font-weight: 600; }

.people-list { display: grid; gap: 10px; }
.person-card { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: var(--radius-lg); background: var(--bg-surface-hover); border: 1px solid var(--border-default); transition: all var(--duration-fast) var(--ease-out); }
.person-card:hover { background: var(--bg-surface-active); border-color: var(--border-strong); transform: translateX(3px); }
.person-card.self { background: rgba(139,92,246,0.08); border-color: rgba(139,92,246,0.18); }
.person-card.self:hover { background: rgba(139,92,246,0.12); border-color: rgba(139,92,246,0.25); }
.person-meta { min-width: 0; flex: 1; }
.person-name { font-weight: 900; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text-primary); font-size: 14px; }
.person-sub { display: flex; align-items: center; gap: 8px; color: var(--text-tertiary); font-size: 12px; margin-top: 3px; font-weight: 500; }
.status-dot { width: 8px; height: 8px; border-radius: 50%; background: rgba(255,255,255,0.20); flex-shrink: 0; transition: all var(--duration-fast) var(--ease-out); }
.status-dot.on { background: var(--success); box-shadow: 0 0 8px var(--success-glow); }
.person-actions { display: flex; gap: 6px; }
.person-action { width: 32px; height: 32px; border-radius: 50%; border: 1px solid var(--border-default); background: var(--bg-surface); color: var(--text-secondary); cursor: pointer; display: grid; place-items: center; font-size: 14px; transition: all 0.15s; }
.person-action:hover { background: var(--bg-surface-hover); color: var(--text-primary); transform: scale(1.1); }
.person-action.ok:hover { background: rgba(16,185,129,0.2); color: #6ee7b7; }
.person-action.danger:hover { background: rgba(239,68,68,0.2); color: #fca5a5; }

/* Chat Panel */
.chat-panel { display: flex; flex-direction: column; max-height: 70vh; }
.chat-messages { flex: 1; overflow-y: auto; display: grid; gap: 10px; padding-right: 4px; margin-bottom: 12px; min-height: 200px; }
.chat-msg { padding: 10px 14px; border-radius: var(--radius-lg); background: var(--bg-surface-hover); border: 1px solid var(--border-default); max-width: 90%; }
.chat-msg.self { background: rgba(139,92,246,0.10); border-color: rgba(139,92,246,0.2); margin-left: auto; }
.chat-msg-header { display: flex; justify-content: space-between; gap: 10px; margin-bottom: 4px; font-size: 12px; }
.chat-msg-header strong { color: var(--text-primary); }
.chat-time { color: var(--text-muted); font-size: 11px; }
.chat-msg-body { color: var(--text-secondary); font-size: 13px; line-height: 1.5; word-break: break-word; }
.chat-reactions { display: flex; gap: 4px; margin-top: 6px; }
.chat-reaction { font-size: 14px; background: var(--bg-surface-active); padding: 2px 6px; border-radius: var(--radius-full); }
.chat-empty { text-align: center; color: var(--text-muted); font-size: 13px; padding: 24px; }
.chat-input-wrap { display: flex; gap: 8px; }
.chat-input-wrap input { flex: 1; padding: 12px 14px; border-radius: var(--radius-md); background: var(--bg-surface-hover); border: 1px solid var(--border-default); color: var(--text-primary); font-size: 14px; outline: none; transition: all 0.15s; }
.chat-input-wrap input:focus { border-color: var(--accent-start); box-shadow: 0 0 0 3px rgba(139,92,246,0.15); }
.chat-send { width: 44px; height: 44px; border-radius: 50%; border: none; background: var(--accent-gradient); color: white; cursor: pointer; display: grid; place-items: center; font-size: 16px; transition: all 0.15s; flex-shrink: 0; }
.chat-send:hover { filter: brightness(1.15); transform: scale(1.05); }

/* Poll */
.poll-wrap { display: grid; gap: 12px; }
.poll-q { font-size: 16px; font-weight: 900; color: var(--text-primary); line-height: 1.4; }
.poll-options { display: grid; gap: 8px; }
.poll-option { position: relative; padding: 12px 16px; border-radius: var(--radius-md); background: var(--bg-surface-hover); border: 1px solid var(--border-default); color: var(--text-primary); cursor: pointer; font-size: 14px; font-weight: 700; text-align: left; overflow: hidden; transition: all 0.15s; }
.poll-option:hover:not(:disabled) { border-color: var(--border-strong); transform: translateX(3px); }
.poll-option:disabled { opacity: 0.6; cursor: default; }
.poll-option.voted { border-color: rgba(139,92,246,0.4); background: rgba(139,92,246,0.1); }
.poll-option.winner { border-color: rgba(16,185,129,0.4); background: rgba(16,185,129,0.1); }
.poll-opt-bar { position: absolute; left: 0; top: 0; bottom: 0; background: rgba(139,92,246,0.15); z-index: 0; transition: width 0.5s var(--ease-out); }
.poll-opt-text { position: relative; z-index: 1; }
.poll-opt-pct { position: relative; z-index: 1; margin-left: auto; font-weight: 900; color: var(--accent-start); }
.poll-total { text-align: center; color: var(--text-tertiary); font-size: 13px; font-weight: 600; }

/* Transcript */
.transcript-wrap { max-height: 400px; overflow-y: auto; display: grid; gap: 8px; }
.transcript-line { padding: 8px 12px; border-radius: var(--radius-md); background: var(--bg-surface-hover); font-size: 13px; line-height: 1.5; }
.transcript-name { font-weight: 900; color: var(--accent-start); margin-right: 6px; }
.transcript-text { color: var(--text-secondary); }

/* Whiteboard */
.whiteboard-wrap { position: relative; width: 100%; min-height: 500px; background: var(--bg-elevated); border-radius: var(--radius-xl); border: 1px solid var(--border-default); overflow: hidden; }
.whiteboard-canvas { width: 100%; height: 100%; cursor: crosshair; }
.whiteboard-tools { position: absolute; bottom: 16px; left: 50%; transform: translateX(-50%); display: flex; gap: 8px; padding: 10px; border-radius: var(--radius-full); background: rgba(6,9,19,0.8); backdrop-filter: blur(12px); border: 1px solid var(--border-default); }
.wb-color { width: 28px; height: 28px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; transition: all 0.15s; }
.wb-color.active { border-color: white; transform: scale(1.15); }
.wb-tool { width: 32px; height: 32px; border-radius: 50%; border: 1px solid var(--border-default); background: var(--bg-surface); cursor: pointer; font-size: 14px; display: grid; place-items: center; transition: all 0.15s; }
.wb-tool:hover { background: var(--bg-surface-hover); transform: scale(1.1); }
.wb-tool.active { border-color: var(--accent-start); background: rgba(139,92,246,0.2); }

/* Annotation */
.annotation-canvas { position: absolute; inset: 0; z-index: 5; cursor: crosshair; pointer-events: auto; }

/* Tools Grid */
.tools-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.toolBtn { border: 1px solid var(--border-default); border-radius: var(--radius-md); padding: 12px 10px; background: var(--bg-surface-hover); color: var(--text-secondary); cursor: pointer; font-weight: 800; font-size: 13px; transition: all var(--duration-fast) var(--ease-out); user-select: none; }
.toolBtn:hover { background: var(--bg-surface-active); border-color: var(--border-strong); color: var(--text-primary); transform: translateY(-1px); box-shadow: var(--shadow-sm); }
.toolBtn:active { transform: translateY(0) scale(0.97); }
.toolBtn:focus-visible { outline: 2px solid var(--accent-start); outline-offset: 2px; }

.diag-list { display: grid; gap: 8px; }
.diag-row { display: flex; justify-content: space-between; gap: 12px; padding: 10px 14px; border-radius: var(--radius-md); background: var(--bg-surface-hover); border: 1px solid var(--border-default); font-size: 13px; align-items: center; transition: all var(--duration-fast) var(--ease-out); }
.diag-row:hover { background: var(--bg-surface-active); border-color: var(--border-strong); }
.diag-row span { color: var(--text-tertiary); font-weight: 500; }
.diag-row strong { color: var(--text-primary); font-weight: 900; }

.hint { padding: 12px 14px; border-radius: var(--radius-md); background: var(--bg-surface-hover); border: 1px solid var(--border-default); font-size: 13px; color: var(--text-tertiary); font-weight: 500; line-height: 1.5; }
.alert { padding: 12px 14px; border-radius: var(--radius-md); background: rgba(239,68,68,0.10); border: 1px solid rgba(239,68,68,0.20); color: #fca5a5; font-size: 13px; font-weight: 600; }
.mt10 { margin-top: 10px; }

/* ─── Bottom Bar ─── */
.bottomBar { position: fixed; left: 50%; bottom: 18px; transform: translateX(-50%); width: min(92vw, 820px); padding: 12px; border-radius: var(--radius-full); z-index: 5; display: flex; justify-content: center; gap: 10px; background: rgba(6, 9, 19, 0.80); backdrop-filter: blur(24px) saturate(180%); border: 1px solid var(--border-default); box-shadow: var(--shadow-lg); }
.fab { width: 54px; height: 54px; border-radius: 50%; border: 1px solid var(--border-default); background: var(--bg-surface-hover); color: var(--text-primary); cursor: pointer; display: grid; place-items: center; font-size: 22px; transition: all var(--duration-fast) var(--ease-out); user-select: none; }
.fab:hover { background: var(--bg-surface-active); border-color: var(--border-strong); transform: translateY(-2px) scale(1.05); box-shadow: var(--shadow-sm); }
.fab:active { transform: translateY(0) scale(0.95); }
.fab:focus-visible { outline: 2px solid var(--accent-start); outline-offset: 2px; }
.fab.mute.off { background: rgba(239,68,68,0.15); border-color: rgba(239,68,68,0.30); color: #fca5a5; }
.fab.cam.off { background: rgba(239,68,68,0.15); border-color: rgba(239,68,68,0.30); color: #fca5a5; }
.fab.share.on { background: var(--accent-gradient); border-color: transparent; color: white; box-shadow: 0 8px 24px rgba(139,92,246,0.30); }
.fab.share.on:hover { box-shadow: 0 12px 32px rgba(139,92,246,0.40); }
.fab.active { background: rgba(245,158,11,0.15); border-color: rgba(245,158,11,0.3); color: #fcd34d; }
.fab.end { background: linear-gradient(135deg, #ef4444, #dc2626); border-color: transparent; color: white; box-shadow: 0 8px 24px rgba(239,68,68,0.25); }
.fab.end:hover { box-shadow: 0 12px 32px rgba(239,68,68,0.35); filter: brightness(1.1); }

/* ─── Modals ─── */
.modal-overlay { position: fixed; inset: 0; z-index: 40; background: rgba(0,0,0,0.6); backdrop-filter: blur(8px); display: grid; place-items: center; padding: 24px; }
.modal { width: min(480px, 92vw); padding: 28px; border-radius: var(--radius-xl); }
.modal h3 { margin: 0 0 20px; font-size: 20px; font-weight: 900; color: var(--text-primary); }
.modal-input { width: 100%; padding: 12px 14px; margin-bottom: 12px; border-radius: var(--radius-md); background: var(--bg-surface-hover); border: 1px solid var(--border-default); color: var(--text-primary); font-size: 14px; outline: none; transition: all 0.15s; }
.modal-input:focus { border-color: var(--accent-start); box-shadow: 0 0 0 3px rgba(139,92,246,0.15); }
.modal-actions { display: flex; gap: 12px; margin-top: 20px; }
.poll-input-row { display: flex; gap: 8px; align-items: center; }
.poll-input-row .modal-input { margin-bottom: 8px; }

.shortcuts-grid { display: grid; gap: 10px; }
.shortcut-row { display: flex; align-items: center; gap: 16px; padding: 10px 12px; border-radius: var(--radius-md); background: var(--bg-surface-hover); border: 1px solid var(--border-default); }
.shortcut-row kbd { padding: 6px 10px; border-radius: var(--radius-sm); background: var(--bg-surface-active); border: 1px solid var(--border-strong); font-family: inherit; font-size: 12px; font-weight: 900; color: var(--text-primary); min-width: 80px; text-align: center; }
.shortcut-row span { color: var(--text-secondary); font-size: 13px; }

.breakout-modal { width: min(560px, 92vw); }
.breakout-list { display: grid; gap: 12px; margin-bottom: 16px; max-height: 300px; overflow-y: auto; }
.breakout-room { padding: 14px; border-radius: var(--radius-lg); background: var(--bg-surface-hover); border: 1px solid var(--border-default); }
.breakout-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; font-weight: 800; color: var(--text-primary); }
.breakout-members { display: flex; flex-wrap: wrap; gap: 6px; }
.breakout-chip { padding: 6px 10px; border-radius: var(--radius-full); background: var(--bg-surface); border: 1px solid var(--border-default); font-size: 12px; font-weight: 700; color: var(--text-secondary); }

/* ─── Responsive ─── */
@media (max-width: 1100px) {
  .main { grid-template-columns: 1fr; }
  .side { grid-template-columns: 1fr; }
  .hero { grid-template-columns: 1fr; }
}
@media (max-width: 820px) {
  .hero-right { grid-template-columns: repeat(2, 1fr); }
  .tools-grid { grid-template-columns: 1fr 1fr; }
  .stage-toolbar, .magic-toolbar { flex-direction: column; align-items: stretch; }
  .video-stage.grid-two, .video-stage.grid-four { grid-template-columns: 1fr; }
  .tile.big { min-height: 400px; }
  .lobby-card { padding: 20px; }
}
@media (max-width: 640px) {
  .roomcall-page { padding: 12px 12px 100px; }
  .topbar, .hero, .panel, .stage-toolbar, .magic-toolbar, .presence-strip { border-radius: var(--radius-lg); }
  .video-stage { grid-template-columns: 1fr; }
  .tile { min-height: 260px; }
  .tile.big { min-height: 360px; }
  .tools-grid { grid-template-columns: 1fr; }
  .bottomBar { width: calc(100vw - 20px); gap: 8px; padding: 10px; }
  .fab { width: 48px; height: 48px; font-size: 20px; }
  .presenceCard { min-width: 140px; }
  .hero-title { font-size: 28px; }
  .hero { padding: 20px; }
  .diag-row { flex-direction: column; align-items: flex-start; gap: 4px; }
  .lobby-form { gap: 12px; }
  .bg-selector { gap: 8px; }
  .modal { padding: 20px; }
}

/* ─── Accessibility ─── */
*:focus-visible { outline: 2px solid var(--accent-start); outline-offset: 2px; border-radius: 4px; }
button, input, textarea, select { font-family: inherit; }
button { touch-action: manipulation; }
</style>