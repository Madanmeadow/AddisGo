<!-- src/views/RoomCall.vue -->
<template>
  <div
    class="roomcall-page"
    :class="{
      compactMode,
      cinematicMode,
      focusOnly: !!focusedTileId,
      speakerMode: !!dominantSpeakerId,
    }"
  >
    <div class="bg-layer bg1"></div>
    <div class="bg-layer bg2"></div>
    <div class="bg-layer bg3"></div>

    <transition name="pop-reaction">
      <div v-if="reactionBurst" class="reaction-burst">
        {{ reactionBurst }}
      </div>
    </transition>

    <header class="topbar glassy">
      <div class="top-left">
        <button class="chip ghost" @click="goBack">← Back</button>

        <div class="room-pill">
          <span class="live-dot"></span>
          <div class="room-pill-meta">
            <div class="room-pill-title">{{ roomName || "Room Call" }}</div>
            <div class="room-pill-sub">
              {{ roomKindLabel }} • {{ participantCount }} participant{{ participantCount === 1 ? "" : "s" }}
            </div>
          </div>
        </div>

        <button class="chip ghost miniChip" @click="copyRoomId">
          🆔 {{ shortRoomId }}
        </button>
      </div>

      <div class="top-right">
        <button class="chip ghost" @click="copyInvite">🔗 Invite</button>
        <button class="chip ghost" @click="refreshRoomState">🔄 Refresh</button>
        <button class="chip ghost" @click="togglePanel">
          {{ sidePanelOpen ? "Hide Panel" : "Show Panel" }}
        </button>
        <button class="chip danger" @click="leaveRoom">Leave</button>
      </div>
    </header>

    <section class="hero glassy">
      <div class="hero-left">
        <div class="eyebrow">ADDISGO ROOM CALL</div>
        <h1 class="hero-title">{{ roomName || "Future Room" }}</h1>
        <div class="hero-sub">
          {{ roomKindLabel }} with camera, mic, screen sharing, active speaker glow,
          compact mode, cinematic mode, focus pinning, low-data mode, and stronger peer recovery.
        </div>

        <div class="hero-badges">
          <span class="badge" :class="{ ok: socketConnected, bad: !socketConnected }">
            {{ socketConnected ? "Socket Connected" : "Socket Disconnected" }}
          </span>

          <span class="badge" :class="{ ok: joinedRoom, bad: !joinedRoom }">
            {{ joinedRoom ? "Joined Room" : "Not Joined" }}
          </span>

          <span class="badge">{{ participantCount }} in room</span>
          <span class="badge">{{ roomKindLabel }}</span>
          <span class="badge">{{ turnReady ? "TURN Ready" : "STUN Only" }}</span>
          <span class="badge">{{ lowDataMode ? "Low Data" : "Balanced HD" }}</span>
          <span class="badge accent">⏱ {{ sessionDurationLabel }}</span>
        </div>
      </div>

      <div class="hero-right">
        <div class="hero-stat">
          <div class="hero-num">{{ participantCount }}</div>
          <div class="hero-lab">People</div>
        </div>

        <div class="hero-stat">
          <div class="hero-num">{{ remoteParticipants.length }}</div>
          <div class="hero-lab">Remote</div>
        </div>

        <div class="hero-stat">
          <div class="hero-num">{{ screenSharing ? "ON" : "OFF" }}</div>
          <div class="hero-lab">Share</div>
        </div>

        <div class="hero-stat">
          <div class="hero-num">{{ compactMode ? "ON" : "OFF" }}</div>
          <div class="hero-lab">Compact</div>
        </div>
      </div>
    </section>

    <section class="presence-strip glassy">
      <div class="strip-head">
        <div class="panel-title">⚡ Live Presence</div>

        <div class="strip-actions">
          <button class="chip ghost miniChip" @click="toggleCompactMode">
            {{ compactMode ? "Normal View" : "Compact View" }}
          </button>

          <button class="chip ghost miniChip" @click="toggleCinematicMode">
            {{ cinematicMode ? "Standard Mode" : "Cinematic" }}
          </button>

          <button class="chip ghost miniChip" @click="toggleMirrorMode">
            {{ mirrorLocal ? "Mirror On" : "Mirror Off" }}
          </button>

          <button class="chip ghost miniChip" @click="toggleLowDataMode">
            {{ lowDataMode ? "Balanced HD" : "Low Data" }}
          </button>
        </div>
      </div>

      <div class="presence-list">
        <button class="presenceCard self" @click="focusTile('local')">
          <div class="presenceAvatar" :class="{ speaking: isSpeaking('local') }">
            {{ myInitial }}
          </div>

          <div class="presenceMeta">
            <div class="presenceName">{{ myName }}</div>
            <div class="presenceSub">
              {{ isSpeaking('local') ? "Speaking" : "You" }}
            </div>
          </div>
        </button>

        <button
          v-for="p in remoteParticipants"
          :key="'presence-' + p.socketId"
          class="presenceCard"
          @click="focusTile(p.socketId)"
        >
          <div class="presenceAvatar alt" :class="{ speaking: isSpeaking(p.socketId) }">
            {{ getInitialName(p.displayName || p.username || p.userId) }}
          </div>

          <div class="presenceMeta">
            <div class="presenceName">
              {{ trimName(p.displayName || p.username || `User #${p.userId || "?"}`) }}
            </div>
            <div class="presenceSub">
              {{ isSpeaking(p.socketId) ? "Speaking" : (peerStatus[p.socketId] || "Connected") }}
            </div>
          </div>
        </button>
      </div>
    </section>

    <main class="main">
      <section class="stage-wrap">
        <div class="stage-toolbar glassy">
          <div class="stage-left">
            <button class="control" :class="{ active: micEnabled }" @click="toggleMic">
              {{ micEnabled ? "🎙 Mic On" : "🔇 Mic Off" }}
            </button>

            <button
              class="control"
              :class="{ active: camEnabled }"
              :disabled="roomKind !== 'video'"
              @click="toggleCamera"
            >
              {{ camEnabled ? "📷 Camera On" : "🚫 Camera Off" }}
            </button>

            <button
              class="control"
              :class="{ active: screenSharing }"
              :disabled="roomKind !== 'video'"
              @click="toggleScreenShare"
            >
              {{ screenSharing ? "🖥 Stop Share" : "🖥 Share Screen" }}
            </button>

            <button class="control" :class="{ active: speakerEnabled }" @click="toggleSpeaker">
              {{ speakerEnabled ? "🔊 Speaker On" : "🔈 Speaker Low" }}
            </button>

            <button class="control" :class="{ active: lowDataMode }" @click="toggleLowDataMode">
              {{ lowDataMode ? "📶 Low Data" : "🚀 Balanced HD" }}
            </button>
          </div>

          <div class="stage-right">
            <button class="control ghost" @click="focusTile('local')">Focus Me</button>
            <button class="control ghost" @click="focusDominantSpeaker" :disabled="!dominantSpeakerId">
              Focus Speaker
            </button>
            <button class="control ghost" @click="clearFocus">Show All</button>
            <button class="control ghost" @click="forceReconnectPeers">Repair Peers</button>
          </div>
        </div>

        <div class="magic-toolbar glassy">
          <div class="magic-left">
            <button class="magicBtn" @click="sendReaction('🔥')">🔥</button>
            <button class="magicBtn" @click="sendReaction('👏')">👏</button>
            <button class="magicBtn" @click="sendReaction('🚀')">🚀</button>
            <button class="magicBtn" @click="sendReaction('💎')">💎</button>
            <button class="magicBtn" @click="sendReaction('🎉')">🎉</button>
          </div>

          <div class="magic-right">
            <button class="magicChip" @click="copyDiagnostics">🧾 Diagnostics</button>
            <button class="magicChip" @click="copyInvite">🔗 Copy Invite</button>
            <button class="magicChip" @click="togglePanel">
              {{ sidePanelOpen ? "📚 Hide Panel" : "📚 Show Panel" }}
            </button>
          </div>
        </div>

        <div
          class="video-stage"
          :class="[gridClass, { focused: !!focusedTileId, cinematic: cinematicMode }]"
        >
          <article
            v-if="shouldShowLocalTile"
            class="tile selfTile glassy"
            :class="{
              big: focusedTileId === 'local',
              compact: compactMode,
              speaking: isSpeaking('local'),
              dominant: dominantSpeakerId === 'local',
            }"
            @click="focusTile('local')"
          >
            <div class="tile-head">
              <div class="tile-user">
                <span class="avatar">{{ myInitial }}</span>

                <div class="tile-meta">
                  <div class="tile-name">
                    {{ myName }}
                    <span class="me-tag">You</span>
                  </div>

                  <div class="tile-sub">
                    {{
                      screenSharing
                        ? "Screen sharing"
                        : roomKind === "video"
                          ? "Local camera"
                          : "Local audio"
                    }}
                  </div>
                </div>
              </div>

              <div class="tile-pills">
                <span class="pill" :class="{ off: !micEnabled }">{{ micEnabled ? "Mic" : "Muted" }}</span>
                <span
                  v-if="roomKind === 'video'"
                  class="pill"
                  :class="{ off: !camEnabled && !screenSharing }"
                >
                  {{ screenSharing ? "Screen" : (camEnabled ? "Cam" : "Cam Off") }}
                </span>
                <span class="pill">{{ sessionDurationLabel }}</span>
              </div>
            </div>

            <div class="media-wrap">
              <video
                v-if="roomKind === 'video' || screenSharing"
                ref="localVideoRef"
                class="media"
                :class="{ mirrored: mirrorLocal }"
                autoplay
                playsinline
                muted
              ></video>

              <div v-else class="audio-room-card">
                <div class="audio-room-avatar">{{ myInitial }}</div>
                <div class="audio-room-name">{{ myName }}</div>
                <div class="audio-room-sub">Audio room connected</div>
              </div>

              <div class="corner-status">{{ joinedRoom ? "LIVE" : "CONNECTING" }}</div>
              <div class="speaker-ring" :style="speakerRingStyle('local')"></div>
            </div>
          </article>

          <article
            v-for="p in visibleRemoteParticipants"
            :key="p.socketId"
            class="tile remoteTile glassy"
            :class="{
              big: focusedTileId === p.socketId,
              compact: compactMode,
              speaking: isSpeaking(p.socketId),
              dominant: dominantSpeakerId === p.socketId,
            }"
            @click="focusTile(p.socketId)"
          >
            <div class="tile-head">
              <div class="tile-user">
                <span class="avatar alt">
                  {{ getInitialName(p.displayName || p.username || p.userId) }}
                </span>

                <div class="tile-meta">
                  <div class="tile-name">
                    {{ p.displayName || p.username || `User #${p.userId || "?"}` }}
                  </div>

                  <div class="tile-sub">
                    {{ peerStatus[p.socketId] || "Connected" }}
                  </div>
                </div>
              </div>

              <div class="tile-pills">
                <span class="pill">{{ roomKind === "video" ? "Video" : "Audio" }}</span>
                <span class="pill ghostState">
                  {{ peerConnectionState[p.socketId] || "online" }}
                </span>
              </div>
            </div>

            <div class="media-wrap">
              <video
                v-if="roomKind === 'video'"
                :ref="(el) => setRemoteVideoRef(p.socketId, el)"
                class="media"
                autoplay
                playsinline
              ></video>

              <div v-else class="audio-room-card">
                <div class="audio-room-avatar">
                  {{ getInitialName(p.displayName || p.username || p.userId) }}
                </div>
                <div class="audio-room-name">
                  {{ p.displayName || p.username || `User #${p.userId || "?"}` }}
                </div>
                <div class="audio-room-sub">Audio participant</div>
              </div>

              <div class="corner-status remote">
                {{ peerConnectionState[p.socketId] || "online" }}
              </div>
              <div class="speaker-ring" :style="speakerRingStyle(p.socketId)"></div>
            </div>
          </article>

          <div
            v-if="visibleRemoteParticipants.length === 0 && (!focusedTileId || focusedTileId === 'local')"
            class="empty-state glassy"
          >
            <div class="empty-emoji">✨</div>
            <div class="empty-title">Room is ready</div>
            <div class="empty-sub">
              Share the invite link so others can join your AddisGo room call.
            </div>

            <div class="empty-actions">
              <button class="btn btn-primary" @click="copyInvite">Copy Invite</button>
              <button class="btn ghostBtn" @click="refreshRoomState">Refresh</button>
              <button class="btn ghostBtn" @click="sendReaction('🚀')">Launch Vibe</button>
            </div>
          </div>
        </div>
      </section>

      <aside class="side" :class="{ closed: !sidePanelOpen }">
        <section class="panel glassy">
          <div class="panel-head">
            <div class="panel-title">👥 Participants</div>
            <div class="panel-sub">{{ participantCount }} connected</div>
          </div>

          <div class="people-list">
            <div class="person-card self">
              <div class="avatar big">{{ myInitial }}</div>
              <div class="person-meta">
                <div class="person-name">
                  {{ myName }} <span class="me-tag">You</span>
                </div>
                <div class="person-sub">
                  <span class="status-dot on"></span>
                  {{ joinedRoom ? "In room" : "Joining..." }}
                </div>
              </div>
            </div>

            <div
              v-for="p in remoteParticipants"
              :key="'side-' + p.socketId"
              class="person-card"
            >
              <div class="avatar big alt">
                {{ getInitialName(p.displayName || p.username || p.userId) }}
              </div>

              <div class="person-meta">
                <div class="person-name">
                  {{ p.displayName || p.username || `User #${p.userId || "?"}` }}
                </div>
                <div class="person-sub">
                  <span
                    class="status-dot"
                    :class="{ on: isSpeaking(p.socketId) || (peerConnectionState[p.socketId] === 'connected') }"
                  ></span>
                  {{ peerStatus[p.socketId] || "Connected" }}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="panel glassy">
          <div class="panel-head">
            <div class="panel-title">🧰 Controls</div>
          </div>

          <div class="tools-grid">
            <button class="toolBtn" @click="copyInvite">🔗 Copy Invite</button>
            <button class="toolBtn" @click="copyRoomId">🆔 Copy Room ID</button>
            <button class="toolBtn" @click="refreshRoomState">🔄 Refresh State</button>
            <button class="toolBtn" @click="toggleMic">
              {{ micEnabled ? "🔇 Mute Mic" : "🎙 Unmute" }}
            </button>
            <button class="toolBtn" :disabled="roomKind !== 'video'" @click="toggleCamera">
              {{ camEnabled ? "🚫 Stop Camera" : "📷 Start Camera" }}
            </button>
            <button class="toolBtn" :disabled="roomKind !== 'video'" @click="toggleScreenShare">
              {{ screenSharing ? "🖥 Stop Share" : "🖥 Share Screen" }}
            </button>
            <button class="toolBtn" @click="toggleMirrorMode">
              {{ mirrorLocal ? "🪞 Mirror On" : "🪞 Mirror Off" }}
            </button>
            <button class="toolBtn" @click="toggleLowDataMode">
              {{ lowDataMode ? "📶 Balanced HD" : "📶 Low Data" }}
            </button>
            <button class="toolBtn" @click="toggleCompactMode">
              {{ compactMode ? "🧩 Normal View" : "🧩 Compact View" }}
            </button>
            <button class="toolBtn" @click="toggleCinematicMode">
              {{ cinematicMode ? "🎬 Standard Mode" : "🎬 Cinematic" }}
            </button>
            <button class="toolBtn" @click="focusDominantSpeaker" :disabled="!dominantSpeakerId">
              🎯 Focus Speaker
            </button>
            <button class="toolBtn" @click="forceReconnectPeers">🛠 Repair Peers</button>
            <button class="toolBtn" @click="copyDiagnostics">🧾 Copy Diagnostics</button>
          </div>

          <div v-if="notice" class="hint mt10">{{ notice }}</div>
          <div v-if="errorText" class="alert mt10">{{ errorText }}</div>
        </section>

        <section class="panel glassy">
          <div class="panel-head">
            <div class="panel-title">📡 Diagnostics</div>
          </div>

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
          </div>
        </section>
      </aside>
    </main>

    <footer class="bottomBar glassy">
      <button class="fab mute" :class="{ off: !micEnabled }" @click="toggleMic">
        {{ micEnabled ? "🎙" : "🔇" }}
      </button>

      <button
        class="fab cam"
        :class="{ off: !camEnabled && !screenSharing }"
        :disabled="roomKind !== 'video'"
        @click="toggleCamera"
      >
        {{ camEnabled ? "📷" : "🚫" }}
      </button>

      <button
        class="fab share"
        :class="{ on: screenSharing }"
        :disabled="roomKind !== 'video'"
        @click="toggleScreenShare"
      >
        🖥
      </button>

      <button class="fab invite" @click="copyInvite">🔗</button>
      <button class="fab invite" @click="toggleLowDataMode">📶</button>
      <button class="fab invite" @click="forceReconnectPeers">🛠</button>
      <button class="fab invite" @click="sendReaction('🔥')">🔥</button>
      <button class="fab end" @click="leaveRoom">❌</button>
    </footer>
  </div>
</template>

<script setup>
defineOptions({ name: "RoomCall" })

import { ref, computed, nextTick, onMounted, onBeforeUnmount } from "vue"
import { useRoute, useRouter } from "vue-router"
import { io } from "socket.io-client"

const route = useRoute()
const router = useRouter()

const API_BASE =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_SERVER_URL ||
  "http://localhost:5000"

const token = localStorage.getItem("token") || ""

const me = (() => {
  try { return JSON.parse(localStorage.getItem("user") || "null") } catch { return null }
})()

/* =========================
   ROOM / ROUTE
========================= */
const roomId = computed(() => String(route.query.roomId || "").trim())
const roomName = ref(String(route.query.name || ""))
const roomKind = ref(String(route.query.kind || "video"))
const joinedRoom = ref(false)
const sidePanelOpen = ref(true)
const focusedTileId = ref("")
const notice = ref("")
const errorText = ref("")

const compactMode = ref(false)
const cinematicMode = ref(false)
const mirrorLocal = ref(true)
const reactionBurst = ref("")
const sessionStartedAt = ref(Date.now())
let sessionTimer = null

const roomKindLabel = computed(() => roomKind.value === "audio" ? "Audio Room" : "Video Room")
const myName = computed(() => me?.display_name || me?.username || me?.name || me?.email || "You")
const myInitial = computed(() => getInitialName(myName.value))
const shortRoomId = computed(() => String(roomId.value || "").slice(-8) || "room")

const sessionDurationMs = ref(0)
const sessionDurationLabel = computed(() => {
  const total = Math.floor(sessionDurationMs.value / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
})

/* =========================
   SOCKET
========================= */
const socket = ref(null)
const socketConnected = ref(false)
const mySocketId = ref("")

/* =========================
   TURN / ICE
========================= */
const turnReady = ref(false)
const rtcIceServers = ref([
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
])

/* =========================
   MEDIA
========================= */
const localVideoRef = ref(null)
const localStream = ref(null)
const cameraStream = ref(null)
const screenStream = ref(null)

const micEnabled = ref(true)
const camEnabled = ref(roomKind.value === "video")
const screenSharing = ref(false)
const speakerEnabled = ref(true)
const lowDataMode = ref(false)

/* =========================
   PARTICIPANTS
========================= */
const roomUsers = ref([])
const remoteParticipants = computed(() =>
  roomUsers.value.filter((u) => String(u.socketId) !== String(mySocketId.value))
)

const participantCount = computed(() => {
  const ids = new Set(roomUsers.value.map((u) => String(u.socketId)))
  return ids.size
})

const visibleRemoteParticipants = computed(() => {
  if (!focusedTileId.value) return remoteParticipants.value
  if (focusedTileId.value === "local") return []
  return remoteParticipants.value.filter((p) => p.socketId === focusedTileId.value)
})

const shouldShowLocalTile = computed(() => {
  return !focusedTileId.value || focusedTileId.value === "local"
})

/* =========================
   SPEAKER DETECTION
========================= */
const speakerLevelMap = ref({})
const dominantSpeakerId = ref("")

let audioContext = null
const analyserMap = new Map()
const analyserDataMap = new Map()
const mediaSourceMap = new Map()
let speakerLoopRaf = null

const dominantSpeakerLabel = computed(() => {
  if (!dominantSpeakerId.value) return "None"
  if (dominantSpeakerId.value === "local") return "You"
  const p = remoteParticipants.value.find((x) => String(x.socketId) === String(dominantSpeakerId.value))
  return p?.displayName || p?.username || `User #${p?.userId || "?"}`
})

function isSpeaking(id) {
  return (speakerLevelMap.value[id] || 0) > 0.12
}

function speakerRingStyle(id) {
  const level = Math.max(0, Math.min(1, speakerLevelMap.value[id] || 0))
  return {
    opacity: String(level > 0.04 ? 0.22 + level * 0.55 : 0),
    transform: `scale(${1 + level * 0.08})`,
  }
}

function ensureAudioContext() {
  if (!audioContext) {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (Ctx) audioContext = new Ctx()
  }
  if (audioContext?.state === "suspended") {
    audioContext.resume().catch(() => {})
  }
}

function attachSpeakerAnalysis(id, stream) {
  const sid = String(id || "")
  if (!sid || !stream) return
  if (!stream.getAudioTracks?.().length) return

  try {
    ensureAudioContext()
    if (!audioContext) return

    detachSpeakerAnalysis(sid)

    const source = audioContext.createMediaStreamSource(stream)
    const analyser = audioContext.createAnalyser()
    analyser.fftSize = 256
    analyser.smoothingTimeConstant = 0.82

    const data = new Uint8Array(analyser.frequencyBinCount)
    source.connect(analyser)

    mediaSourceMap.set(sid, source)
    analyserMap.set(sid, analyser)
    analyserDataMap.set(sid, data)
  } catch (err) {
    console.warn("attachSpeakerAnalysis failed", sid, err)
  }
}

function detachSpeakerAnalysis(id) {
  const sid = String(id || "")
  try { mediaSourceMap.get(sid)?.disconnect?.() } catch {}
  try { analyserMap.get(sid)?.disconnect?.() } catch {}
  mediaSourceMap.delete(sid)
  analyserMap.delete(sid)
  analyserDataMap.delete(sid)

  const nextLevels = { ...speakerLevelMap.value }
  delete nextLevels[sid]
  speakerLevelMap.value = nextLevels
}

function startSpeakerLoop() {
  stopSpeakerLoop()

  const tick = () => {
    const next = { ...speakerLevelMap.value }
    let maxId = ""
    let maxVal = 0

    for (const [sid, analyser] of analyserMap.entries()) {
      const data = analyserDataMap.get(sid)
      if (!data) continue

      analyser.getByteFrequencyData(data)

      let sum = 0
      for (let i = 0; i < data.length; i++) sum += data[i]
      const avg = sum / (data.length * 255)

      next[sid] = avg

      if (avg > maxVal) {
        maxVal = avg
        maxId = sid
      }
    }

    speakerLevelMap.value = next
    dominantSpeakerId.value = maxVal > 0.08 ? maxId : ""

    speakerLoopRaf = requestAnimationFrame(tick)
  }

  speakerLoopRaf = requestAnimationFrame(tick)
}

function stopSpeakerLoop() {
  if (speakerLoopRaf) {
    cancelAnimationFrame(speakerLoopRaf)
    speakerLoopRaf = null
  }
}

function focusDominantSpeaker() {
  if (!dominantSpeakerId.value) return
  focusedTileId.value = dominantSpeakerId.value
}

/* =========================
   WEBRTC STATE
========================= */
const peerConnections = new Map()
const remoteStreams = new Map()
const remoteVideoRefs = new Map()
const pendingIceCandidates = new Map()
const peerStatus = ref({})
const peerConnectionState = ref({})
const makingOffer = new Map()
const ignoreOffer = new Map()
const isSettingRemoteAnswerPending = new Map()
const peerMeta = new Map()
let reconnectTimer = null

/* =========================
   COMPUTED LAYOUT
========================= */
const displayedTileCount = computed(() => {
  return visibleRemoteParticipants.value.length + (shouldShowLocalTile.value ? 1 : 0)
})

const gridClass = computed(() => {
  if (focusedTileId.value) return "grid-focus"
  if (displayedTileCount.value <= 1) return "grid-one"
  if (displayedTileCount.value === 2) return "grid-two"
  if (displayedTileCount.value <= 4) return "grid-four"
  return "grid-many"
})

/* =========================
   HELPERS
========================= */
function getInitialName(v) {
  return String(v || "U").trim().charAt(0).toUpperCase() || "U"
}

function trimName(v) {
  const s = String(v || "")
  return s.length > 16 ? `${s.slice(0, 16)}…` : s
}

function togglePanel() {
  sidePanelOpen.value = !sidePanelOpen.value
}

function goBack() {
  router.push("/dashboard")
}

function focusTile(id) {
  focusedTileId.value = focusedTileId.value === id ? "" : id
}

function clearFocus() {
  focusedTileId.value = ""
}

function toggleCompactMode() {
  compactMode.value = !compactMode.value
  setNotice(compactMode.value ? "Compact mode enabled." : "Compact mode disabled.")
}

function toggleCinematicMode() {
  cinematicMode.value = !cinematicMode.value
  setNotice(cinematicMode.value ? "Cinematic mode enabled." : "Cinematic mode disabled.")
}

function toggleMirrorMode() {
  mirrorLocal.value = !mirrorLocal.value
  setNotice(mirrorLocal.value ? "Mirror mode on." : "Mirror mode off.")
}

function sendReaction(emoji) {
  reactionBurst.value = emoji
  window.clearTimeout(sendReaction._t)
  sendReaction._t = window.setTimeout(() => {
    reactionBurst.value = ""
  }, 1200)
  setNotice(`Reaction sent ${emoji}`)
}

function setNotice(text = "") {
  notice.value = text
  if (!text) return
  window.clearTimeout(setNotice._t)
  setNotice._t = window.setTimeout(() => {
    notice.value = ""
  }, 2500)
}

function setError(text = "") {
  errorText.value = text
  if (!text) return
  window.clearTimeout(setError._t)
  setError._t = window.setTimeout(() => {
    errorText.value = ""
  }, 4000)
}

function currentUsername() {
  return me?.username || me?.display_name || me?.name || me?.email || "User"
}

function safeReplaceRoomUsers(users = []) {
  roomUsers.value = Array.isArray(users)
    ? users
        .map((u) => ({
          userId: u?.userId ? String(u.userId) : "",
          socketId: u?.socketId ? String(u.socketId) : "",
          displayName: u?.displayName || u?.username || u?.name || "",
          username: u?.username || "",
          kind: u?.kind || roomKind.value || "video",
        }))
        .filter((u) => u.socketId)
    : []
}

function mergeUserIntoRoom(user) {
  if (!user?.socketId) return
  const sid = String(user.socketId)
  const existing = roomUsers.value.find((u) => String(u.socketId) === sid)

  if (existing) {
    roomUsers.value = roomUsers.value.map((u) =>
      String(u.socketId) === sid
        ? {
            ...u,
            userId: String(user.userId || u.userId || ""),
            socketId: sid,
            displayName: user.displayName || user.username || user.name || u.displayName || "",
            username: user.username || u.username || "",
            kind: user.kind || u.kind || roomKind.value,
          }
        : u
    )
  } else {
    roomUsers.value = [
      ...roomUsers.value,
      {
        userId: String(user.userId || ""),
        socketId: sid,
        displayName: user.displayName || user.username || user.name || "",
        username: user.username || "",
        kind: user.kind || roomKind.value,
      },
    ]
  }
}

function setRemoteVideoRef(socketId, el) {
  const sid = String(socketId || "")
  if (!sid) return

  if (el) {
    remoteVideoRefs.set(sid, el)
    const stream = remoteStreams.get(sid)
    if (stream) {
      el.srcObject = stream
      el.muted = false
      el.volume = speakerEnabled.value ? 1 : 0.2
      el.playsInline = true
      el.autoplay = true
      el.play?.().catch(() => {})
      attachSpeakerAnalysis(sid, stream)
    }
  } else {
    remoteVideoRefs.delete(sid)
  }
}

function refreshRemoteVideoAudio() {
  remoteVideoRefs.forEach((el) => {
    if (!el) return
    el.muted = false
    el.volume = speakerEnabled.value ? 1 : 0.2
  })
}

function startSessionTimer() {
  if (sessionTimer) window.clearInterval(sessionTimer)
  sessionStartedAt.value = Date.now()
  sessionDurationMs.value = 0
  sessionTimer = window.setInterval(() => {
    sessionDurationMs.value = Date.now() - sessionStartedAt.value
  }, 1000)
}

function stopSessionTimer() {
  if (sessionTimer) {
    window.clearInterval(sessionTimer)
    sessionTimer = null
  }
}

/* =========================
   TURN
========================= */
async function loadTurnServers() {
  try {
    const res = await fetch(`${API_BASE}/api/turn`)
    const data = await res.json()

    if (res.ok && data?.ok && Array.isArray(data?.iceServers) && data.iceServers.length) {
      rtcIceServers.value = data.iceServers
      const allUrls = data.iceServers.flatMap((s) => Array.isArray(s?.urls) ? s.urls : [s?.urls])
      turnReady.value = allUrls.some((u) => String(u || "").includes("turn:"))
      return
    }
  } catch {}

  turnReady.value = false
}

function getRtcConfig() {
  return {
    iceServers: rtcIceServers.value,
    iceCandidatePoolSize: 20,
    bundlePolicy: "max-bundle",
    iceTransportPolicy: "all",
    rtcpMuxPolicy: "require",
  }
}

/* =========================
   LOCAL MEDIA
========================= */
async function initLocalMedia() {
  try {
    errorText.value = ""

    const wantsVideo = roomKind.value === "video"
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        latency: 0,
      },
      video: wantsVideo
        ? {
            width: lowDataMode.value ? { ideal: 640, max: 960 } : { ideal: 960, max: 1280 },
            height: lowDataMode.value ? { ideal: 360, max: 540 } : { ideal: 540, max: 720 },
            frameRate: lowDataMode.value ? { ideal: 12, max: 18 } : { ideal: 20, max: 24 },
            facingMode: "user",
          }
        : false,
    })

    if (cameraStream.value) {
      try { cameraStream.value.getTracks().forEach((t) => t.stop()) } catch {}
    }

    cameraStream.value = stream
    localStream.value = stream

    const audioTrack = stream.getAudioTracks?.()[0]
    const videoTrack = stream.getVideoTracks?.()[0]

    micEnabled.value = !!audioTrack
    camEnabled.value = wantsVideo ? !!videoTrack : false

    if (audioTrack) audioTrack.enabled = micEnabled.value
    if (videoTrack) videoTrack.enabled = camEnabled.value

    updateLocalPreview()
    attachSpeakerAnalysis("local", stream)
    return stream
  } catch (err) {
    console.error("initLocalMedia error:", err)
    setError("Camera or microphone permission failed.")
    throw err
  }
}

async function ensureLocalTracksReady() {
  if (roomKind.value === "audio") {
    if (!localStream.value) await initLocalMedia()
    return
  }

  if (screenSharing.value && screenStream.value) return
  if (!localStream.value) await initLocalMedia()
}

function getCurrentSendStream() {
  return screenSharing.value && screenStream.value ? screenStream.value : localStream.value
}

function updateLocalPreview() {
  if (!localVideoRef.value) return
  if (roomKind.value !== "video" && !screenSharing.value) return
  const stream = getCurrentSendStream()
  if (stream) {
    localVideoRef.value.srcObject = stream
    localVideoRef.value.muted = true
    localVideoRef.value.playsInline = true
    localVideoRef.value.play?.().catch(() => {})
  }
}

function getActiveAudioTrack() {
  if (screenSharing.value && screenStream.value) {
    const displayAudio = screenStream.value.getAudioTracks?.()[0]
    if (displayAudio) return displayAudio
  }
  return localStream.value?.getAudioTracks?.()[0] || null
}

function getActiveVideoTrack() {
  const stream = getCurrentSendStream()
  return stream?.getVideoTracks?.()[0] || null
}

/* =========================
   PEER CONNECTIONS
========================= */
function isPolitePeer(socketId) {
  const mine = String(mySocketId.value || "")
  const theirs = String(socketId || "")
  if (!mine || !theirs) return false
  return mine > theirs
}

function ensurePendingCandidateList(socketId) {
  const sid = String(socketId)
  if (!pendingIceCandidates.has(sid)) pendingIceCandidates.set(sid, [])
  return pendingIceCandidates.get(sid)
}

async function flushPendingIce(socketId) {
  const sid = String(socketId)
  const pc = peerConnections.get(sid)
  if (!pc || !pendingIceCandidates.has(sid)) return
  const list = pendingIceCandidates.get(sid) || []
  while (list.length) {
    const c = list.shift()
    try {
      await pc.addIceCandidate(new RTCIceCandidate(c))
    } catch {}
  }
}

function buildPeerConnection(targetSocketId) {
  const sid = String(targetSocketId)
  if (peerConnections.has(sid)) return peerConnections.get(sid)

  const pc = new RTCPeerConnection(getRtcConfig())
  peerMeta.set(sid, { polite: isPolitePeer(sid) })
  makingOffer.set(sid, false)
  ignoreOffer.set(sid, false)
  isSettingRemoteAnswerPending.set(sid, false)
  ensurePendingCandidateList(sid)

  const sendStream = getCurrentSendStream() || localStream.value
  if (sendStream) {
    sendStream.getTracks().forEach((track) => {
      pc.addTrack(track, sendStream)
    })
  }

  queueMicrotask(() => {
    applyPeerQualityProfile(sid).catch(() => {})
  })

  pc.onicecandidate = (event) => {
    if (!event.candidate || !socket.value) return

    socket.value.emit("callroom:webrtc:ice", {
      roomId: roomId.value,
      to: sid,
      targetSocketId: sid,
      candidate: event.candidate,
      from: mySocketId.value,
    })
  }

  pc.ontrack = (event) => {
    let stream = remoteStreams.get(sid)
    if (!stream) {
      stream = new MediaStream()
      remoteStreams.set(sid, stream)
    }

    if (event.streams?.[0]) {
      event.streams[0].getTracks().forEach((track) => {
        const exists = stream.getTracks().some((t) => t.id === track.id)
        if (!exists) stream.addTrack(track)
      })
    } else if (event.track) {
      const exists = stream.getTracks().some((t) => t.id === event.track.id)
      if (!exists) stream.addTrack(event.track)
    }

    const el = remoteVideoRefs.get(sid)
    if (el) {
      el.srcObject = stream
      el.muted = false
      el.volume = speakerEnabled.value ? 1 : 0.2
      el.play?.().catch(() => {})
    }

    attachSpeakerAnalysis(sid, stream)
    peerStatus.value = { ...peerStatus.value, [sid]: "Receiving media" }
  }

  pc.onconnectionstatechange = () => {
    const st = pc.connectionState || "unknown"
    peerConnectionState.value = { ...peerConnectionState.value, [sid]: st }
    peerStatus.value = { ...peerStatus.value, [sid]: st }

    if (st === "failed") retryPeer(sid)
    if (["closed"].includes(st)) cleanupPeer(sid)
  }

  pc.oniceconnectionstatechange = () => {
    const st = pc.iceConnectionState || "unknown"
    peerStatus.value = { ...peerStatus.value, [sid]: st }

    if (["failed", "disconnected"].includes(st)) {
      retryPeer(sid)
    }
  }

  pc.onnegotiationneeded = async () => {
    try {
      if (!socketConnected.value || !joinedRoom.value) return
      await negotiateWithPeer(sid)
    } catch (err) {
      console.warn("negotiationneeded failed", err)
    }
  }

  peerConnections.set(sid, pc)
  return pc
}

async function negotiateWithPeer(socketId) {
  const sid = String(socketId)
  const pc = buildPeerConnection(sid)
  if (!pc) return

  try {
    makingOffer.set(sid, true)

    const offer = await pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: roomKind.value === "video",
      voiceActivityDetection: true,
    })

    if (pc.signalingState !== "stable") return

    await pc.setLocalDescription(offer)

    socket.value.emit("callroom:webrtc:offer", {
      roomId: roomId.value,
      to: sid,
      targetSocketId: sid,
      offer: pc.localDescription,
      from: mySocketId.value,
    })

    peerStatus.value = { ...peerStatus.value, [sid]: "Offer sent" }
  } catch (err) {
    console.error("negotiateWithPeer error:", err)
  } finally {
    makingOffer.set(sid, false)
  }
}

async function applyPeerQualityProfile(socketId = null) {
  const entries = socketId
    ? [[String(socketId), peerConnections.get(String(socketId))]]
    : Array.from(peerConnections.entries())

  for (const [, pc] of entries) {
    if (!pc) continue
    for (const sender of pc.getSenders()) {
      if (!sender?.track) continue
      try {
        const params = sender.getParameters() || {}
        if (!params.encodings) params.encodings = [{}]

        if (sender.track.kind === "video") {
          params.degradationPreference = lowDataMode.value ? "maintain-framerate" : "balanced"
          params.encodings[0].maxBitrate = lowDataMode.value ? 180000 : 550000
          params.encodings[0].maxFramerate = lowDataMode.value ? 12 : 22
          params.encodings[0].scaleResolutionDownBy = lowDataMode.value ? 1.35 : 1
        }

        if (sender.track.kind === "audio") {
          params.encodings[0].maxBitrate = lowDataMode.value ? 24000 : 40000
        }

        await sender.setParameters(params)
      } catch {}
    }
  }
}

async function replaceOutgoingTracks() {
  const audioTrack = getActiveAudioTrack()
  const videoTrack = roomKind.value === "video" ? getActiveVideoTrack() : null

  for (const [sid, pc] of peerConnections.entries()) {
    const senders = pc.getSenders()

    const audioSender = senders.find((s) => s.track?.kind === "audio")
    const videoSender = senders.find((s) => s.track?.kind === "video")

    if (audioSender && audioTrack) {
      await audioSender.replaceTrack(audioTrack)
    } else if (!audioSender && audioTrack) {
      pc.addTrack(audioTrack, getCurrentSendStream())
    }

    if (roomKind.value === "video") {
      if (videoSender && videoTrack) {
        await videoSender.replaceTrack(videoTrack)
      } else if (!videoSender && videoTrack) {
        pc.addTrack(videoTrack, getCurrentSendStream())
      } else if (videoSender && !videoTrack) {
        await videoSender.replaceTrack(null)
      }
    }

    await applyPeerQualityProfile(sid)
  }
}

async function handleIncomingOffer(payload) {
  const sid = String(
    payload?.fromSocketId ||
    payload?.socketId ||
    payload?.senderSocketId ||
    payload?.from ||
    ""
  )
  const offer = payload?.offer || payload?.sdp
  if (!sid || !offer) return

  const pc = buildPeerConnection(sid)
  const polite = peerMeta.get(sid)?.polite ?? false
  const isMaking = makingOffer.get(sid) || false
  const offerCollision = isMaking || pc.signalingState !== "stable"

  ignoreOffer.set(sid, !polite && offerCollision)
  if (ignoreOffer.get(sid)) return

  try {
    if (offerCollision) {
      await Promise.all([
        pc.setLocalDescription({ type: "rollback" }),
        pc.setRemoteDescription(new RTCSessionDescription(offer)),
      ])
    } else {
      await pc.setRemoteDescription(new RTCSessionDescription(offer))
    }

    await flushPendingIce(sid)

    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)

    socket.value.emit("callroom:webrtc:answer", {
      roomId: roomId.value,
      to: sid,
      targetSocketId: sid,
      answer: pc.localDescription,
      from: mySocketId.value,
    })

    peerStatus.value = { ...peerStatus.value, [sid]: "Answer sent" }
  } catch (err) {
    console.error("handleIncomingOffer error:", err)
  }
}

async function handleIncomingAnswer(payload) {
  const sid = String(
    payload?.fromSocketId ||
    payload?.socketId ||
    payload?.senderSocketId ||
    payload?.from ||
    ""
  )
  const answer = payload?.answer || payload?.sdp
  if (!sid || !answer) return

  const pc = peerConnections.get(sid)
  if (!pc) return
  if (pc.signalingState !== "have-local-offer") return

  try {
    isSettingRemoteAnswerPending.set(sid, true)
    await pc.setRemoteDescription(new RTCSessionDescription(answer))
    await flushPendingIce(sid)
    peerStatus.value = { ...peerStatus.value, [sid]: "Connected" }
  } catch (err) {
    console.error("handleIncomingAnswer error:", err)
  } finally {
    isSettingRemoteAnswerPending.set(sid, false)
  }
}

async function handleIncomingIce(payload) {
  const sid = String(
    payload?.fromSocketId ||
    payload?.socketId ||
    payload?.senderSocketId ||
    payload?.from ||
    ""
  )
  const candidate = payload?.candidate || payload?.ice
  if (!sid || !candidate) return

  const pc = peerConnections.get(sid)
  if (!pc || !pc.remoteDescription) {
    ensurePendingCandidateList(sid).push(candidate)
    return
  }

  try {
    await pc.addIceCandidate(new RTCIceCandidate(candidate))
  } catch (err) {
    if (!ignoreOffer.get(sid)) {
      console.warn("handleIncomingIce failed", sid, err)
    }
  }
}

function cleanupPeer(socketId) {
  const sid = String(socketId)
  const pc = peerConnections.get(sid)
  try { pc?.close?.() } catch {}
  peerConnections.delete(sid)

  const stream = remoteStreams.get(sid)
  try { stream?.getTracks?.().forEach((t) => t.stop()) } catch {}
  remoteStreams.delete(sid)
  remoteVideoRefs.delete(sid)
  pendingIceCandidates.delete(sid)
  makingOffer.delete(sid)
  ignoreOffer.delete(sid)
  isSettingRemoteAnswerPending.delete(sid)
  peerMeta.delete(sid)
  detachSpeakerAnalysis(sid)

  const nextStatus = { ...peerStatus.value }
  delete nextStatus[sid]
  peerStatus.value = nextStatus

  const nextPcState = { ...peerConnectionState.value }
  delete nextPcState[sid]
  peerConnectionState.value = nextPcState
}

async function retryPeer(socketId) {
  const sid = String(socketId)
  const pc = peerConnections.get(sid)
  if (!pc) return

  try {
    const offer = await pc.createOffer({ iceRestart: true })
    await pc.setLocalDescription(offer)

    socket.value.emit("callroom:webrtc:offer", {
      roomId: roomId.value,
      to: sid,
      targetSocketId: sid,
      offer: pc.localDescription,
      from: mySocketId.value,
    })

    peerStatus.value = { ...peerStatus.value, [sid]: "Repairing..." }
  } catch (err) {
    console.warn("retryPeer failed", sid, err)
  }
}

async function forceReconnectPeers() {
  for (const sid of peerConnections.keys()) {
    await retryPeer(sid)
  }
  setNotice("Peer repair started.")
}

/* =========================
   SCREEN SHARE
========================= */
async function startScreenShare() {
  if (roomKind.value !== "video") return
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: true,
    })

    screenStream.value = stream
    screenSharing.value = true

    const videoTrack = stream.getVideoTracks?.()[0]
    if (videoTrack) {
      videoTrack.onended = async () => {
        await stopScreenShare()
      }
    }

    updateLocalPreview()
    await replaceOutgoingTracks()

    for (const sid of peerConnections.keys()) {
      await negotiateWithPeer(sid)
    }

    setNotice("Screen sharing started.")
  } catch (err) {
    console.warn("startScreenShare failed", err)
    setError("Screen share failed.")
  }
}

async function stopScreenShare() {
  try { screenStream.value?.getTracks?.().forEach((t) => t.stop()) } catch {}
  screenStream.value = null
  screenSharing.value = false

  updateLocalPreview()
  await replaceOutgoingTracks()

  for (const sid of peerConnections.keys()) {
    await negotiateWithPeer(sid)
  }

  setNotice("Screen sharing stopped.")
}

async function toggleScreenShare() {
  if (screenSharing.value) await stopScreenShare()
  else await startScreenShare()
}

/* =========================
   UI ACTIONS
========================= */
async function toggleMic() {
  if (!localStream.value) return
  micEnabled.value = !micEnabled.value
  localStream.value.getAudioTracks().forEach((track) => {
    track.enabled = micEnabled.value
  })
  emitMediaState()
  setNotice(micEnabled.value ? "Mic on." : "Mic muted.")
}

async function toggleCamera() {
  if (roomKind.value !== "video" || !localStream.value) return
  camEnabled.value = !camEnabled.value
  localStream.value.getVideoTracks().forEach((track) => {
    track.enabled = camEnabled.value
  })
  emitMediaState()
  for (const sid of peerConnections.keys()) {
    await negotiateWithPeer(sid)
  }
  setNotice(camEnabled.value ? "Camera on." : "Camera off.")
}

function toggleSpeaker() {
  speakerEnabled.value = !speakerEnabled.value
  refreshRemoteVideoAudio()
  setNotice(speakerEnabled.value ? "Speaker on." : "Speaker lower.")
}

async function toggleLowDataMode() {
  lowDataMode.value = !lowDataMode.value

  if (cameraStream.value?.getVideoTracks?.()[0]) {
    try {
      await cameraStream.value.getVideoTracks()[0].applyConstraints({
        width: lowDataMode.value ? { ideal: 640, max: 960 } : { ideal: 960, max: 1280 },
        height: lowDataMode.value ? { ideal: 360, max: 540 } : { ideal: 540, max: 720 },
        frameRate: lowDataMode.value ? { ideal: 12, max: 18 } : { ideal: 20, max: 24 },
      })
    } catch {}
  }

  await applyPeerQualityProfile()
  setNotice(lowDataMode.value ? "Low data mode enabled." : "Balanced HD enabled.")
}

/* =========================
   ROOM ACTIONS
========================= */
async function refreshRoomState() {
  if (!socket.value || !roomId.value) return

  socket.value.emit("callroom:get", { roomId: roomId.value }, (res) => {
    const room = res?.room
    if (!room) return
    roomName.value = room.name || roomName.value
    roomKind.value = room.kind || roomKind.value
    safeReplaceRoomUsers(room.users || room.participants || [])
    setNotice("Room state refreshed.")
  })
}

async function joinExistingRoom() {
  if (!socket.value || !roomId.value) {
    setError("Missing room id.")
    return
  }

  await ensureLocalTracksReady()
  updateLocalPreview()

  socket.value.emit("callroom:join", { roomId: roomId.value }, async (res) => {
    if (res?.error) {
      setError(res.error)
      return
    }

    const room = res?.room
    if (room) {
      roomName.value = room.name || roomName.value
      roomKind.value = room.kind || roomKind.value
      safeReplaceRoomUsers(room.users || room.participants || [])
    }

    joinedRoom.value = true
    emitMediaState()
    startSessionTimer()
    startSpeakerLoop()

    await nextTick()
    for (const p of remoteParticipants.value) {
      buildPeerConnection(p.socketId)
      await negotiateWithPeer(p.socketId)
    }
  })
}

async function createRoomIfNeeded() {
  if (roomId.value) return

  await ensureLocalTracksReady()
  updateLocalPreview()

  socket.value.emit(
    "callroom:create",
    {
      name: route.query.name || `${currentUsername()}'s ${roomKind.value === "video" ? "Video" : "Audio"} Room`,
      kind: roomKind.value,
    },
    (res) => {
      if (res?.error) {
        setError(res.error)
        return
      }

      const room = res?.room
      if (room?.roomId) {
        router.replace({
          path: "/roomcall",
          query: {
            roomId: room.roomId,
            kind: room.kind || roomKind.value,
            name: room.name || "",
          },
        })
      }
    }
  )
}

function emitMediaState() {
  if (!socket.value || !roomId.value || !joinedRoom.value) return
  socket.value.emit("callroom:media-state", {
    roomId: roomId.value,
    micOn: micEnabled.value,
    camOn: roomKind.value === "video" ? (screenSharing.value || camEnabled.value) : false,
  })
}

async function leaveRoom() {
  try {
    if (screenSharing.value) await stopScreenShare()
  } catch {}

  if (socket.value && roomId.value) {
    socket.value.emit("callroom:leave", { roomId: roomId.value })
  }

  cleanupAll()
  router.push("/dashboard")
}

/* =========================
   COPY HELPERS
========================= */
async function copyInvite() {
  const url = `${window.location.origin}/roomcall?roomId=${encodeURIComponent(roomId.value)}&kind=${encodeURIComponent(roomKind.value)}&name=${encodeURIComponent(roomName.value || "")}`
  try {
    await navigator.clipboard.writeText(url)
    setNotice("Invite link copied.")
  } catch {
    setError("Could not copy invite.")
  }
}

async function copyRoomId() {
  try {
    await navigator.clipboard.writeText(roomId.value)
    setNotice("Room ID copied.")
  } catch {
    setError("Could not copy room ID.")
  }
}

async function copyDiagnostics() {
  const payload = {
    roomId: roomId.value,
    roomName: roomName.value,
    roomKind: roomKind.value,
    joinedRoom: joinedRoom.value,
    socketConnected: socketConnected.value,
    mySocketId: mySocketId.value,
    participantCount: participantCount.value,
    remoteParticipants: remoteParticipants.value.map((p) => ({
      socketId: p.socketId,
      userId: p.userId,
      displayName: p.displayName || p.username || "",
      state: peerConnectionState.value[p.socketId] || "",
    })),
    micEnabled: micEnabled.value,
    camEnabled: camEnabled.value,
    screenSharing: screenSharing.value,
    lowDataMode: lowDataMode.value,
    turnReady: turnReady.value,
  }

  try {
    await navigator.clipboard.writeText(JSON.stringify(payload, null, 2))
    setNotice("Diagnostics copied.")
  } catch {
    setError("Could not copy diagnostics.")
  }
}

/* =========================
   SOCKET EVENTS
========================= */
function wireSocketEvents() {
  socket.value.on("connect", () => {
    socketConnected.value = true
    mySocketId.value = socket.value.id || ""

    if (me?.id) {
      socket.value.emit("register-user", {
        id: String(me.id),
        username: currentUsername(),
      })
    }

    if (roomId.value && !joinedRoom.value) {
      joinExistingRoom().catch(() => {})
    }
  })

  socket.value.on("disconnect", () => {
    socketConnected.value = false
    joinedRoom.value = false
  })

  socket.value.on("callroom:created", ({ roomId: createdRoomId, room }) => {
    if (!createdRoomId) return
    router.replace({
      path: "/roomcall",
      query: {
        roomId: createdRoomId,
        kind: room?.kind || roomKind.value,
        name: room?.name || roomName.value || "",
      },
    })
  })

  socket.value.on("callroom:state", async (payload) => {
    roomName.value = payload?.name || roomName.value
    roomKind.value = payload?.kind || roomKind.value
    safeReplaceRoomUsers(payload?.users || payload?.participants || [])
    joinedRoom.value = true

    await nextTick()
    for (const p of remoteParticipants.value) {
      buildPeerConnection(p.socketId)
    }
  })

  socket.value.on("callroom:user-joined", async ({ user }) => {
    mergeUserIntoRoom(user)
    if (user?.socketId && String(user.socketId) !== String(mySocketId.value)) {
      buildPeerConnection(user.socketId)
      await negotiateWithPeer(user.socketId)
    }
  })

  socket.value.on("callroom:peer-joined", async ({ user, socketId }) => {
    const sid = user?.socketId || socketId
    if (!sid || String(sid) === String(mySocketId.value)) return
    if (user) mergeUserIntoRoom(user)
    buildPeerConnection(sid)
    await negotiateWithPeer(sid)
  })

  socket.value.on("callroom:user-left", ({ socketId }) => {
    cleanupPeer(socketId)
    roomUsers.value = roomUsers.value.filter((u) => String(u.socketId) !== String(socketId))
    if (focusedTileId.value === String(socketId)) focusedTileId.value = ""
  })

  socket.value.on("callroom:peer-left", ({ socketId }) => {
    cleanupPeer(socketId)
    roomUsers.value = roomUsers.value.filter((u) => String(u.socketId) !== String(socketId))
    if (focusedTileId.value === String(socketId)) focusedTileId.value = ""
  })

  socket.value.on("callroom:webrtc:offer", async (payload) => {
    await handleIncomingOffer(payload)
  })

  socket.value.on("callroom:webrtc:answer", async (payload) => {
    await handleIncomingAnswer(payload)
  })

  socket.value.on("callroom:webrtc:ice", async (payload) => {
    await handleIncomingIce(payload)
  })

  socket.value.on("callroom:error", ({ message }) => {
    setError(message || "Room call error.")
  })
}

/* =========================
   CLEANUP
========================= */
function cleanupAll() {
  stopSessionTimer()
  stopSpeakerLoop()

  try { localStream.value?.getTracks?.().forEach((t) => t.stop()) } catch {}
  try { cameraStream.value?.getTracks?.().forEach((t) => t.stop()) } catch {}
  try { screenStream.value?.getTracks?.().forEach((t) => t.stop()) } catch {}

  localStream.value = null
  cameraStream.value = null
  screenStream.value = null

  if (localVideoRef.value) localVideoRef.value.srcObject = null

  for (const sid of Array.from(peerConnections.keys())) {
    cleanupPeer(sid)
  }

  joinedRoom.value = false
  roomUsers.value = []
  mySocketId.value = ""
}

/* =========================
   LIFECYCLE
========================= */
onMounted(async () => {
  await loadTurnServers()
  await ensureLocalTracksReady()
  updateLocalPreview()

  socket.value = io(API_BASE, {
    transports: ["websocket"],
    auth: { token },
  })

  wireSocketEvents()

  if (!roomId.value) {
    await createRoomIfNeeded()
  } else {
    startSessionTimer()
  }

  startSpeakerLoop()
})

onBeforeUnmount(() => {
  try { socket.value?.off("connect") } catch {}
  try { socket.value?.off("disconnect") } catch {}
  try { socket.value?.off("callroom:created") } catch {}
  try { socket.value?.off("callroom:state") } catch {}
  try { socket.value?.off("callroom:user-joined") } catch {}
  try { socket.value?.off("callroom:peer-joined") } catch {}
  try { socket.value?.off("callroom:user-left") } catch {}
  try { socket.value?.off("callroom:peer-left") } catch {}
  try { socket.value?.off("callroom:webrtc:offer") } catch {}
  try { socket.value?.off("callroom:webrtc:answer") } catch {}
  try { socket.value?.off("callroom:webrtc:ice") } catch {}
  try { socket.value?.off("callroom:error") } catch {}

  try {
    if (socket.value && roomId.value && joinedRoom.value) {
      socket.value.emit("callroom:leave", { roomId: roomId.value })
    }
  } catch {}

  try { socket.value?.disconnect?.() } catch {}

  cleanupAll()
})
</script>

<style scoped>
.roomcall-page {
  --glass: rgba(12, 16, 28, 0.54);
  --glass-border: rgba(255,255,255,0.1);
  --text: #fff;
  --muted: rgba(255,255,255,0.72);
  --soft: rgba(255,255,255,0.06);
  --danger: linear-gradient(135deg, #ff375f, #ff1744);
  min-height: 100vh;
  color: var(--text);
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(900px 500px at 10% 0%, rgba(123,125,255,0.22), transparent 60%),
    radial-gradient(760px 420px at 90% 0%, rgba(255,66,133,0.16), transparent 60%),
    radial-gradient(720px 420px at 50% 100%, rgba(0,184,255,0.12), transparent 60%),
    linear-gradient(180deg, #071126 0%, #08162d 48%, #071222 100%);
  padding: calc(env(safe-area-inset-top, 0px) + 14px) 14px calc(env(safe-area-inset-bottom, 0px) + 96px);
}

.bg-layer {
  position: absolute;
  border-radius: 999px;
  filter: blur(52px);
  pointer-events: none;
}
.bg1 {
  width: 320px;
  height: 320px;
  left: -50px;
  top: 60px;
  background: rgba(120, 92, 255, 0.2);
}
.bg2 {
  width: 280px;
  height: 280px;
  right: -60px;
  top: 160px;
  background: rgba(255, 72, 128, 0.18);
}
.bg3 {
  width: 280px;
  height: 280px;
  left: 35%;
  bottom: 40px;
  background: rgba(35, 206, 255, 0.14);
}

.glassy {
  background: var(--glass);
  border: 1px solid var(--glass-border);
  backdrop-filter: blur(22px);
  -webkit-backdrop-filter: blur(22px);
  box-shadow:
    0 14px 44px rgba(0,0,0,0.28),
    inset 0 1px 0 rgba(255,255,255,0.06);
}

.topbar,
.hero,
.presence-strip,
.stage-toolbar,
.magic-toolbar,
.panel,
.bottomBar {
  position: relative;
  z-index: 2;
  border-radius: 24px;
}

.topbar {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  padding: 12px 14px;
  margin-bottom: 12px;
}

.top-left,
.top-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.chip,
.magicChip,
.btn,
.toolBtn,
.control,
.fab {
  border: 0;
  cursor: pointer;
  color: white;
  font-weight: 800;
  transition: transform .16s ease, background .16s ease, opacity .16s ease;
}

.chip:hover,
.magicChip:hover,
.btn:hover,
.toolBtn:hover,
.control:hover,
.fab:hover {
  transform: translateY(-1px);
}

.chip {
  padding: 10px 14px;
  border-radius: 14px;
  background: rgba(255,255,255,0.08);
}
.chip.ghost {
  background: rgba(255,255,255,0.06);
}
.chip.danger {
  background: var(--danger);
}
.miniChip {
  font-size: 12px;
  padding: 9px 12px;
}

.room-pill {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 16px;
  background: rgba(255,255,255,0.06);
}

.live-dot {
  width: 11px;
  height: 11px;
  border-radius: 999px;
  background: #25ff96;
  box-shadow: 0 0 14px rgba(37,255,150,0.55);
}

.room-pill-title {
  font-weight: 900;
}
.room-pill-sub {
  font-size: 12px;
  color: var(--muted);
  margin-top: 2px;
}

.hero {
  display: grid;
  grid-template-columns: 1.4fr .85fr;
  gap: 16px;
  padding: 18px;
  margin-bottom: 12px;
}

.eyebrow {
  font-size: 12px;
  letter-spacing: .14em;
  color: #f6b5d0;
  font-weight: 800;
}

.hero-title {
  margin: 8px 0 6px;
  font-size: 34px;
  line-height: 1;
}

.hero-sub {
  color: var(--muted);
  font-size: 14px;
  line-height: 1.5;
}

.hero-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

.badge {
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(255,255,255,0.08);
  font-size: 12px;
}
.badge.ok {
  background: rgba(36,255,158,0.12);
  color: #9ef7ce;
}
.badge.bad {
  background: rgba(255,92,120,0.14);
  color: #ffc4d0;
}
.badge.accent {
  background: linear-gradient(135deg, rgba(255,75,125,0.3), rgba(123,125,255,0.26));
}

.hero-right {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.hero-stat {
  border-radius: 22px;
  padding: 16px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.08);
}
.hero-num {
  font-size: 24px;
  font-weight: 900;
}
.hero-lab {
  margin-top: 6px;
  font-size: 12px;
  color: var(--muted);
}

.presence-strip {
  padding: 14px;
  margin-bottom: 14px;
}

.strip-head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.strip-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.panel-title {
  font-size: 15px;
  font-weight: 900;
}

.presence-list {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 2px;
  scrollbar-width: none;
}
.presence-list::-webkit-scrollbar {
  display: none;
}

.presenceCard {
  min-width: 220px;
  padding: 12px;
  border-radius: 18px;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.06);
  color: white;
  display: flex;
  gap: 12px;
  align-items: center;
  text-align: left;
}
.presenceCard.self {
  background: linear-gradient(135deg, rgba(255,75,125,0.22), rgba(123,125,255,0.18));
}

.presenceAvatar,
.avatar {
  width: 44px;
  height: 44px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  font-weight: 900;
  background: linear-gradient(135deg, #ff4b7d, #7b7dff);
}
.presenceAvatar.alt,
.avatar.alt {
  background: linear-gradient(135deg, #5e87ff, #24d0ff);
}
.presenceAvatar.speaking,
.avatar.speaking {
  box-shadow: 0 0 0 4px rgba(38,255,163,0.16), 0 0 18px rgba(38,255,163,0.34);
}

.presenceMeta,
.tile-meta,
.person-meta {
  min-width: 0;
}
.presenceName,
.tile-name,
.person-name {
  font-weight: 800;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.presenceSub,
.tile-sub,
.person-sub,
.panel-sub {
  color: var(--muted);
  font-size: 12px;
  margin-top: 4px;
}

.main {
  display: grid;
  grid-template-columns: 1.4fr .88fr;
  gap: 14px;
  position: relative;
  z-index: 2;
}

.stage-wrap {
  min-width: 0;
}

.stage-toolbar,
.magic-toolbar {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
  padding: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.stage-left,
.stage-right,
.magic-left,
.magic-right {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.control,
.magicBtn,
.magicChip,
.toolBtn {
  padding: 10px 14px;
  border-radius: 14px;
  background: rgba(255,255,255,0.08);
  font-size: 13px;
}
.control.active,
.fab.on {
  background: linear-gradient(135deg, rgba(255,75,125,0.34), rgba(123,125,255,0.28));
}
.control.ghost {
  background: rgba(255,255,255,0.06);
}

.video-stage {
  display: grid;
  gap: 12px;
}

.grid-one {
  grid-template-columns: 1fr;
}
.grid-two {
  grid-template-columns: 1fr 1fr;
}
.grid-four {
  grid-template-columns: repeat(2, 1fr);
}
.grid-many {
  grid-template-columns: repeat(3, 1fr);
}
.grid-focus {
  grid-template-columns: 1fr;
}

.tile {
  min-height: 260px;
  border-radius: 28px;
  padding: 12px;
  overflow: hidden;
  position: relative;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
}
.tile.big {
  min-height: 460px;
}
.tile.compact {
  min-height: 210px;
}
.tile.speaking {
  box-shadow:
    0 0 0 1px rgba(255,255,255,0.14),
    0 0 0 4px rgba(36,255,162,0.14),
    0 16px 42px rgba(0,0,0,0.24);
}
.tile.dominant {
  box-shadow:
    0 0 0 1px rgba(255,255,255,0.16),
    0 0 0 5px rgba(255,75,125,0.14),
    0 18px 48px rgba(0,0,0,0.28);
}

.tile-head {
  position: absolute;
  top: 12px;
  left: 12px;
  right: 12px;
  z-index: 2;
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
}

.tile-user {
  display: flex;
  gap: 10px;
  align-items: center;
  min-width: 0;
}

.tile-pills {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.pill {
  padding: 7px 10px;
  border-radius: 999px;
  background: rgba(0,0,0,0.34);
  font-size: 11px;
}
.pill.off {
  background: rgba(255,82,122,0.18);
  color: #ffd0db;
}
.ghostState {
  color: #dbe7ff;
}

.media-wrap {
  min-height: 236px;
  height: 100%;
  position: relative;
}
.media {
  width: 100%;
  height: 100%;
  min-height: 236px;
  object-fit: cover;
  border-radius: 22px;
  background: #05070d;
}
.media.mirrored {
  transform: scaleX(-1);
}

.audio-room-card {
  height: 100%;
  min-height: 236px;
  border-radius: 22px;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 10px;
  background:
    radial-gradient(circle at 50% 20%, rgba(255,255,255,0.08), transparent 50%),
    rgba(8, 12, 22, 0.72);
}
.audio-room-avatar {
  width: 92px;
  height: 92px;
  border-radius: 28px;
  display: grid;
  place-items: center;
  font-size: 34px;
  font-weight: 900;
  background: linear-gradient(135deg, #ff4b7d, #7b7dff);
}
.audio-room-name {
  font-size: 24px;
  font-weight: 900;
}
.audio-room-sub {
  color: var(--muted);
  font-size: 14px;
}

.corner-status {
  position: absolute;
  right: 16px;
  bottom: 16px;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(0,0,0,0.38);
  font-size: 11px;
  font-weight: 800;
}
.corner-status.remote {
  color: #dbe7ff;
}

.speaker-ring {
  position: absolute;
  inset: 0;
  border-radius: 22px;
  box-shadow: 0 0 0 3px rgba(38,255,163,0.18), inset 0 0 40px rgba(38,255,163,0.08);
  pointer-events: none;
}

.me-tag {
  display: inline-block;
  margin-left: 6px;
  font-size: 11px;
  padding: 4px 7px;
  border-radius: 999px;
  background: rgba(255,255,255,0.12);
  color: #fff;
  vertical-align: middle;
}

.empty-state {
  padding: 28px;
  border-radius: 28px;
  text-align: center;
}
.empty-emoji {
  font-size: 42px;
}
.empty-title {
  margin-top: 10px;
  font-size: 24px;
  font-weight: 900;
}
.empty-sub {
  margin-top: 8px;
  color: var(--muted);
}
.empty-actions {
  margin-top: 16px;
  display: flex;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
}

.btn {
  padding: 12px 16px;
  border-radius: 16px;
}
.btn-primary {
  background: linear-gradient(135deg, #ff4b7d, #7b7dff);
}
.ghostBtn {
  background: rgba(255,255,255,0.08);
}

.side {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.side.closed {
  display: none;
}

.panel {
  padding: 14px;
}
.panel-head {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
  margin-bottom: 12px;
}

.people-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.person-card {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 12px;
  border-radius: 18px;
  background: rgba(255,255,255,0.06);
}
.person-card.self {
  background: linear-gradient(135deg, rgba(255,75,125,0.18), rgba(123,125,255,0.14));
}

.avatar.big {
  width: 50px;
  height: 50px;
  border-radius: 18px;
}

.status-dot {
  width: 10px;
  height: 10px;
  display: inline-block;
  border-radius: 999px;
  background: rgba(255,255,255,0.24);
  margin-right: 6px;
}
.status-dot.on {
  background: #27ff9f;
  box-shadow: 0 0 10px rgba(39,255,159,0.55);
}

.tools-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.toolBtn {
  background: rgba(255,255,255,0.07);
  text-align: left;
}

.hint {
  color: #dce8ff;
}
.alert {
  color: #ffc3cf;
}

.diag-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.diag-row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  font-size: 13px;
}
.diag-row span {
  color: var(--muted);
}
.diag-row strong {
  text-align: right;
  word-break: break-word;
}

.bottomBar {
  position: fixed;
  left: 14px;
  right: 14px;
  bottom: calc(env(safe-area-inset-bottom, 0px) + 12px);
  z-index: 10;
  display: flex;
  justify-content: center;
  gap: 10px;
  padding: 12px;
}

.fab {
  width: 56px;
  height: 56px;
  border-radius: 18px;
  background: rgba(255,255,255,0.08);
  font-size: 22px;
}
.fab.off {
  opacity: 0.7;
}
.fab.end {
  background: linear-gradient(135deg, #ff375f, #ff1744);
}

.reaction-burst {
  position: fixed;
  inset: auto 50% 140px auto;
  transform: translateX(50%);
  font-size: 64px;
  z-index: 30;
  pointer-events: none;
}

.pop-reaction-enter-active,
.pop-reaction-leave-active {
  transition: all .24s ease;
}
.pop-reaction-enter-from,
.pop-reaction-leave-to {
  opacity: 0;
  transform: translateX(50%) scale(.7);
}

@media (max-width: 1100px) {
  .hero,
  .main {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 820px) {
  .grid-many,
  .grid-four,
  .grid-two {
    grid-template-columns: 1fr;
  }

  .tile.big {
    min-height: 320px;
  }

  .tools-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 700px) {
  .roomcall-page {
    padding: calc(env(safe-area-inset-top, 0px) + 10px) 10px calc(env(safe-area-inset-bottom, 0px) + 104px);
  }

  .topbar,
  .hero,
  .presence-strip,
  .stage-toolbar,
  .magic-toolbar,
  .panel,
  .bottomBar {
    border-radius: 20px;
  }

  .hero-title {
    font-size: 28px;
  }

  .tile {
    min-height: 220px;
    border-radius: 24px;
  }

  .media,
  .audio-room-card {
    min-height: 200px;
    border-radius: 18px;
  }

  .audio-room-avatar {
    width: 74px;
    height: 74px;
    border-radius: 24px;
    font-size: 28px;
  }

  .bottomBar {
    left: 10px;
    right: 10px;
    justify-content: flex-start;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .bottomBar::-webkit-scrollbar {
    display: none;
  }

  .fab {
    flex: 0 0 auto;
  }
}
</style>