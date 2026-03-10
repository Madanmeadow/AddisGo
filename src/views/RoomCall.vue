<!-- src/views/RoomCall.vue -->
<template>
  <div class="roomcall-page">
    <div class="bg-layer bg1"></div>
    <div class="bg-layer bg2"></div>
    <div class="bg-layer bg3"></div>

    <!-- TOPBAR -->
    <header class="topbar glassy">
      <div class="top-left">
        <button class="chip ghost" @click="goBack">← Back</button>

        <div class="room-pill">
          <span class="live-dot"></span>
          <div class="room-pill-meta">
            <div class="room-pill-title">{{ roomName }}</div>
            <div class="room-pill-sub">
              {{ roomKindLabel }} • {{ participantCount }} participant{{ participantCount === 1 ? "" : "s" }}
            </div>
          </div>
        </div>
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

    <!-- HERO -->
    <section class="hero glassy">
      <div class="hero-left">
        <div class="eyebrow">ADDISGO ROOM CALL</div>
        <h1 class="hero-title">{{ roomName }}</h1>
        <div class="hero-sub">
          {{ roomKindLabel }} room with camera, mic, screen share, invite link, reconnect recovery, and stronger WebRTC signaling.
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
      </div>
    </section>

    <main class="main">
      <!-- STAGE -->
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
          </div>

          <div class="stage-right">
            <button class="control ghost" @click="focusTile('local')">Focus Me</button>
            <button class="control ghost" @click="clearFocus">Show All</button>
            <button class="control ghost" @click="forceReconnectPeers">Repair Peers</button>
          </div>
        </div>

        <div class="video-stage" :class="{ focused: !!focusedTileId }">
          <!-- LOCAL -->
          <article
            v-if="!focusedTileId || focusedTileId === 'local'"
            class="tile selfTile glassy"
            :class="{ big: focusedTileId === 'local' }"
            @click="focusTile('local')"
          >
            <div class="tile-head">
              <div class="tile-user">
                <span class="avatar">{{ myInitial }}</span>
                <div class="tile-meta">
                  <div class="tile-name">{{ myName }} <span class="me-tag">You</span></div>
                  <div class="tile-sub">
                    {{ screenSharing ? "Screen sharing" : (roomKind === "video" ? "Local camera" : "Local audio") }}
                  </div>
                </div>
              </div>

              <div class="tile-pills">
                <span class="pill" :class="{ off: !micEnabled }">{{ micEnabled ? "Mic" : "Muted" }}</span>
                <span v-if="roomKind === 'video'" class="pill" :class="{ off: !camEnabled && !screenSharing }">
                  {{ screenSharing ? "Screen" : (camEnabled ? "Cam" : "Cam Off") }}
                </span>
              </div>
            </div>

            <div class="media-wrap">
              <video
                v-if="roomKind === 'video' || screenSharing"
                ref="localVideoRef"
                class="media"
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
            </div>
          </article>

          <!-- REMOTE -->
          <article
            v-for="p in visibleRemoteParticipants"
            :key="p.socketId"
            class="tile remoteTile glassy"
            :class="{ big: focusedTileId === p.socketId }"
            @click="focusTile(p.socketId)"
          >
            <div class="tile-head">
              <div class="tile-user">
                <span class="avatar alt">{{ getInitialName(p.displayName || p.username || p.userId) }}</span>
                <div class="tile-meta">
                  <div class="tile-name">{{ p.displayName || p.username || `User #${p.userId || "?"}` }}</div>
                  <div class="tile-sub">
                    {{ peerStatus[p.socketId] || "Connected" }}
                  </div>
                </div>
              </div>

              <div class="tile-pills">
                <span class="pill">{{ roomKind === "video" ? "Video" : "Audio" }}</span>
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
                <div class="audio-room-name">{{ p.displayName || p.username || `User #${p.userId || "?"}` }}</div>
                <div class="audio-room-sub">Audio participant</div>
              </div>

              <div class="corner-status remote">
                {{ peerConnectionState[p.socketId] || "online" }}
              </div>
            </div>
          </article>

          <!-- EMPTY -->
          <div
            v-if="visibleRemoteParticipants.length === 0 && (!focusedTileId || focusedTileId === 'local')"
            class="empty-state glassy"
          >
            <div class="empty-emoji">✨</div>
            <div class="empty-title">Room is ready</div>
            <div class="empty-sub">Share the invite link so others can join your AddisGo room call.</div>

            <div class="empty-actions">
              <button class="btn btn-primary" @click="copyInvite">Copy Invite</button>
              <button class="btn ghostBtn" @click="refreshRoomState">Refresh</button>
            </div>
          </div>
        </div>
      </section>

      <!-- SIDE PANEL -->
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
                <div class="person-name">{{ myName }} <span class="me-tag">You</span></div>
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
              <div class="avatar big alt">{{ getInitialName(p.displayName || p.username || p.userId) }}</div>
              <div class="person-meta">
                <div class="person-name">{{ p.displayName || p.username || `User #${p.userId || "?"}` }}</div>
                <div class="person-sub">
                  <span class="status-dot on"></span>
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
            <button class="toolBtn" @click="refreshRoomState">🔄 Refresh State</button>
            <button class="toolBtn" @click="toggleMic">{{ micEnabled ? "🔇 Mute Mic" : "🎙 Unmute" }}</button>
            <button class="toolBtn" :disabled="roomKind !== 'video'" @click="toggleCamera">
              {{ camEnabled ? "🚫 Stop Camera" : "📷 Start Camera" }}
            </button>
            <button class="toolBtn" :disabled="roomKind !== 'video'" @click="toggleScreenShare">
              {{ screenSharing ? "🖥 Stop Share" : "🖥 Share Screen" }}
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
            <div class="diag-row">
              <span>Room ID</span>
              <strong>{{ roomId }}</strong>
            </div>
            <div class="diag-row">
              <span>Kind</span>
              <strong>{{ roomKindLabel }}</strong>
            </div>
            <div class="diag-row">
              <span>Socket</span>
              <strong>{{ socketConnected ? "Connected" : "Disconnected" }}</strong>
            </div>
            <div class="diag-row">
              <span>Joined</span>
              <strong>{{ joinedRoom ? "Yes" : "No" }}</strong>
            </div>
            <div class="diag-row">
              <span>Peers</span>
              <strong>{{ remoteParticipants.length }}</strong>
            </div>
            <div class="diag-row">
              <span>Mic</span>
              <strong>{{ micEnabled ? "On" : "Off" }}</strong>
            </div>
            <div class="diag-row">
              <span>Cam</span>
              <strong>{{ roomKind === "video" ? (camEnabled ? "On" : "Off") : "Audio Room" }}</strong>
            </div>
            <div class="diag-row">
              <span>Screen</span>
              <strong>{{ screenSharing ? "Sharing" : "Off" }}</strong>
            </div>
            <div class="diag-row">
              <span>TURN</span>
              <strong>{{ turnReady ? "Ready" : "No" }}</strong>
            </div>
          </div>
        </section>
      </aside>
    </main>

    <!-- BOTTOM BAR -->
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
      <button class="fab invite" @click="forceReconnectPeers">🛠</button>
      <button class="fab end" @click="leaveRoom">❌</button>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onBeforeUnmount } from "vue"
import { useRoute, useRouter } from "vue-router"
import { createSocket } from "../api/socket"

const route = useRoute()
const router = useRouter()
const apiUrl = (import.meta.env.VITE_API_URL || "").trim()
const token = localStorage.getItem("token") || ""

const me = (() => {
  try { return JSON.parse(localStorage.getItem("user") || "null") } catch { return null }
})()

/* =========================
   ROOM / ROUTE
========================= */
const roomId = computed(() => String(route.query.roomId || "").trim())
const roomName = ref("")
const roomKind = ref("video")
const joinedRoom = ref(false)
const sidePanelOpen = ref(true)
const focusedTileId = ref("")
const notice = ref("")
const errorText = ref("")

const roomKindLabel = computed(() => roomKind.value === "audio" ? "Audio Room" : "Video Room")
const myName = computed(() => me?.display_name || me?.username || me?.name || me?.email || "You")
const myInitial = computed(() => getInitialName(myName.value))

/* =========================
   SOCKET
========================= */
let socket = null
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
const camEnabled = ref(true)
const screenSharing = ref(false)
const speakerEnabled = ref(true)

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
   HELPERS
========================= */
function getInitialName(v) {
  return String(v || "U").trim().charAt(0).toUpperCase() || "U"
}

function togglePanel() {
  sidePanelOpen.value = !sidePanelOpen.value
}

function goBack() {
  router.push("/dashboard")
}

function focusTile(id) {
  focusedTileId.value = id
}

function clearFocus() {
  focusedTileId.value = ""
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
    ? users.map((u) => ({
        userId: u?.userId ? String(u.userId) : "",
        socketId: u?.socketId ? String(u.socketId) : "",
        displayName: u?.displayName || u?.username || u?.name || "",
        username: u?.username || "",
        kind: u?.kind || roomKind.value || "video",
      })).filter((u) => u.socketId)
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

/* =========================
   TURN
========================= */
async function loadTurnServers() {
  try {
    const res = await fetch(`${apiUrl}/api/turn`)
    const data = await res.json()

    if (res.ok && data?.ok && Array.isArray(data?.iceServers) && data.iceServers.length) {
      rtcIceServers.value = data.iceServers
      turnReady.value = true
      return
    }
  } catch {}

  turnReady.value = false
}

function getRtcConfig() {
  return { iceServers: rtcIceServers.value }
}

/* =========================
   LOCAL MEDIA
========================= */
async function initLocalMedia() {
  try {
    errorText.value = ""

    const wantsVideo = roomKind.value === "video"
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: wantsVideo,
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
  if (stream) localVideoRef.value.srcObject = stream
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

function buildPeerConnection(targetSocketId) {
  const sid = String(targetSocketId)
  if (peerConnections.has(sid)) return peerConnections.get(sid)

  const pc = new RTCPeerConnection(getRtcConfig())
  peerMeta.set(sid, { polite: isPolitePeer(sid) })
  makingOffer.set(sid, false)
  ignoreOffer.set(sid, false)
  isSettingRemoteAnswerPending.set(sid, false)

  const sendStream = getCurrentSendStream() || localStream.value
  if (sendStream) {
    sendStream.getTracks().forEach((track) => {
      pc.addTrack(track, sendStream)
    })
  }

  pc.onicecandidate = (event) => {
    if (!event.candidate || !socket) return

    socket.emit("callroom:webrtc:ice", {
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
    }

    peerStatus.value = { ...peerStatus.value, [sid]: "Receiving media" }
  }

  pc.onconnectionstatechange = () => {
    const st = pc.connectionState || "unknown"
    peerConnectionState.value = { ...peerConnectionState.value, [sid]: st }
    peerStatus.value = { ...peerStatus.value, [sid]: st }

    if (st === "failed") {
      retryPeer(sid)
    }

    if (["closed"].includes(st)) {
      cleanupPeer(sid)
    }
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

    const offer = await pc.createOffer()
    if (pc.signalingState !== "stable") return

    await pc.setLocalDescription(offer)

    socket.emit("callroom:webrtc:offer", {
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

async function replaceOutgoingTracks() {
  const audioTrack = getActiveAudioTrack()
  const videoTrack = roomKind.value === "video" ? getActiveVideoTrack() : null

  for (const [sid, pc] of peerConnections.entries()) {
    const senders = pc.getSenders()

    const audioSender = senders.find((s) => s.track?.kind === "audio")
    const videoSender = senders.find((s) => s.track?.kind === "video")

    try {
      if (audioSender && audioTrack) {
        await audioSender.replaceTrack(audioTrack)
      } else if (!audioSender && audioTrack) {
        const stream = getCurrentSendStream() || localStream.value
        if (stream) pc.addTrack(audioTrack, stream)
      }
    } catch (err) {
      console.warn("replace audio failed", err)
    }

    try {
      if (videoSender && videoTrack) {
        await videoSender.replaceTrack(videoTrack)
      } else if (videoSender && !videoTrack) {
        await videoSender.replaceTrack(null)
      } else if (!videoSender && videoTrack) {
        const stream = getCurrentSendStream() || localStream.value
        if (stream) pc.addTrack(videoTrack, stream)
      }
    } catch (err) {
      console.warn("replace video failed", err)
    }

    try {
      await negotiateWithPeer(sid)
    } catch {}
  }

  updateLocalPreview()
}

async function handleOfferPayload(payload = {}) {
  const rid = String(payload?.roomId || "")
  if (rid && rid !== roomId.value) return

  const from = String(
    payload?.from ||
    payload?.fromSocketId ||
    payload?.socketId ||
    payload?.senderSocketId ||
    ""
  )

  const offer = payload?.offer || payload?.sdp || null
  if (!from || !offer) return

  await ensureLocalTracksReady()
  const pc = buildPeerConnection(from)
  const polite = !!peerMeta.get(from)?.polite

  const offerCollision =
    offer.type === "offer" &&
    (makingOffer.get(from) || pc.signalingState !== "stable")

  ignoreOffer.set(from, !polite && offerCollision)
  if (ignoreOffer.get(from)) {
    return
  }

  try {
    if (offerCollision) {
      await Promise.all([
        pc.setLocalDescription({ type: "rollback" }),
        pc.setRemoteDescription(new RTCSessionDescription(offer)),
      ])
    } else {
      await pc.setRemoteDescription(new RTCSessionDescription(offer))
    }

    const queued = pendingIceCandidates.get(from) || []
    for (const c of queued) {
      try { await pc.addIceCandidate(new RTCIceCandidate(c)) } catch {}
    }
    pendingIceCandidates.delete(from)

    await pc.setLocalDescription(await pc.createAnswer())

    socket.emit("callroom:webrtc:answer", {
      roomId: roomId.value,
      to: from,
      targetSocketId: from,
      answer: pc.localDescription,
      from: mySocketId.value,
    })

    peerStatus.value = { ...peerStatus.value, [from]: "Answered" }
  } catch (err) {
    console.error("handleOfferPayload error:", err)
    setError("Failed to answer incoming room offer.")
  }
}

async function handleAnswerPayload(payload = {}) {
  const rid = String(payload?.roomId || "")
  if (rid && rid !== roomId.value) return

  const from = String(
    payload?.from ||
    payload?.fromSocketId ||
    payload?.socketId ||
    payload?.senderSocketId ||
    ""
  )

  const answer = payload?.answer || payload?.sdp || null
  if (!from || !answer) return

  const pc = peerConnections.get(from)
  if (!pc) return

  try {
    isSettingRemoteAnswerPending.set(from, true)
    await pc.setRemoteDescription(new RTCSessionDescription(answer))
    isSettingRemoteAnswerPending.set(from, false)

    const queued = pendingIceCandidates.get(from) || []
    for (const c of queued) {
      try { await pc.addIceCandidate(new RTCIceCandidate(c)) } catch {}
    }
    pendingIceCandidates.delete(from)

    peerStatus.value = { ...peerStatus.value, [from]: "Connected" }
  } catch (err) {
    console.error("handleAnswerPayload error:", err)
  } finally {
    isSettingRemoteAnswerPending.set(from, false)
  }
}

async function handleIcePayload(payload = {}) {
  const rid = String(payload?.roomId || "")
  if (rid && rid !== roomId.value) return

  const from = String(
    payload?.from ||
    payload?.fromSocketId ||
    payload?.socketId ||
    payload?.senderSocketId ||
    ""
  )

  const candidate = payload?.candidate || payload?.ice || null
  if (!from || !candidate) return
  if (ignoreOffer.get(from)) return

  const pc = peerConnections.get(from)
  if (!pc || !pc.remoteDescription) {
    const queued = pendingIceCandidates.get(from) || []
    queued.push(candidate)
    pendingIceCandidates.set(from, queued)
    return
  }

  try {
    await pc.addIceCandidate(new RTCIceCandidate(candidate))
  } catch (err) {
    console.warn("addIceCandidate failed", err)
  }
}

function cleanupPeer(socketId) {
  const sid = String(socketId)
  const pc = peerConnections.get(sid)

  if (pc) {
    try {
      pc.onicecandidate = null
      pc.ontrack = null
      pc.onnegotiationneeded = null
      pc.close()
    } catch {}
  }

  peerConnections.delete(sid)
  remoteStreams.delete(sid)
  pendingIceCandidates.delete(sid)
  makingOffer.delete(sid)
  ignoreOffer.delete(sid)
  isSettingRemoteAnswerPending.delete(sid)
  peerMeta.delete(sid)

  const el = remoteVideoRefs.get(sid)
  if (el) {
    try { el.srcObject = null } catch {}
  }
  remoteVideoRefs.delete(sid)

  const statusCopy = { ...peerStatus.value }
  delete statusCopy[sid]
  peerStatus.value = statusCopy

  const connCopy = { ...peerConnectionState.value }
  delete connCopy[sid]
  peerConnectionState.value = connCopy
}

async function retryPeer(socketId) {
  const sid = String(socketId)
  if (!sid || sid === String(mySocketId.value)) return

  cleanupPeer(sid)
  await nextTick()

  buildPeerConnection(sid)
  setTimeout(async () => {
    try {
      await negotiateWithPeer(sid)
    } catch {}
  }, 250)
}

async function forceReconnectPeers() {
  for (const p of remoteParticipants.value) {
    await retryPeer(p.socketId)
  }
  setNotice("Peer repair started.")
}

/* =========================
   SCREEN SHARE
========================= */
async function startScreenShare() {
  if (roomKind.value !== "video") {
    setError("Screen share is available in video rooms.")
    return
  }

  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: true,
    })

    screenStream.value = stream
    screenSharing.value = true

    const track = stream.getVideoTracks?.()[0]
    if (track) {
      track.onended = async () => {
        await stopScreenShare()
      }
    }

    updateLocalPreview()
    await replaceOutgoingTracks()
    setNotice("Screen sharing started.")
  } catch (err) {
    console.error("startScreenShare error:", err)
    setError("Screen sharing failed.")
  }
}

async function stopScreenShare() {
  try {
    screenStream.value?.getTracks?.().forEach((t) => t.stop())
  } catch {}

  screenStream.value = null
  screenSharing.value = false
  updateLocalPreview()
  await replaceOutgoingTracks()
  setNotice("Screen sharing stopped.")
}

async function toggleScreenShare() {
  if (screenSharing.value) await stopScreenShare()
  else await startScreenShare()
}

/* =========================
   CONTROLS
========================= */
function toggleMic() {
  const track = getActiveAudioTrack() || localStream.value?.getAudioTracks?.()[0]
  if (!track) return
  micEnabled.value = !micEnabled.value
  track.enabled = micEnabled.value
}

function toggleCamera() {
  if (roomKind.value !== "video") return
  const track = localStream.value?.getVideoTracks?.()[0]
  if (!track) return
  camEnabled.value = !camEnabled.value
  track.enabled = camEnabled.value
}

function toggleSpeaker() {
  speakerEnabled.value = !speakerEnabled.value
  refreshRemoteVideoAudio()
}

async function copyInvite() {
  const url = `${window.location.origin}/room-call?roomId=${encodeURIComponent(roomId.value)}`
  try {
    await navigator.clipboard.writeText(url)
    setNotice("Invite link copied.")
  } catch {
    window.prompt("Copy room link:", url)
  }
}

async function copyDiagnostics() {
  const diag = {
    roomId: roomId.value,
    roomName: roomName.value,
    roomKind: roomKind.value,
    socketConnected: socketConnected.value,
    joinedRoom: joinedRoom.value,
    mySocketId: mySocketId.value,
    participantCount: participantCount.value,
    remoteParticipants: remoteParticipants.value.map((p) => ({
      socketId: p.socketId,
      userId: p.userId,
      displayName: p.displayName,
      state: peerConnectionState.value[p.socketId] || "",
      status: peerStatus.value[p.socketId] || "",
    })),
    micEnabled: micEnabled.value,
    camEnabled: camEnabled.value,
    screenSharing: screenSharing.value,
    turnReady: turnReady.value,
    at: new Date().toISOString(),
  }

  try {
    await navigator.clipboard.writeText(JSON.stringify(diag, null, 2))
    setNotice("Diagnostics copied.")
  } catch {
    window.alert(JSON.stringify(diag, null, 2))
  }
}

/* =========================
   ROOM FLOW
========================= */
async function refreshRoomState() {
  if (!socket || !roomId.value) return

  socket.emit("callroom:get", { roomId: roomId.value }, (res) => {
    if (res?.error) {
      setError(res.error)
      return
    }

    const room = res?.room || res || {}
    if (room?.name) roomName.value = String(room.name)
    if (room?.kind) roomKind.value = room.kind === "audio" ? "audio" : "video"
    if (Array.isArray(room?.users)) safeReplaceRoomUsers(room.users)
  })
}

async function joinRoom() {
  if (!roomId.value) {
    setError("Missing roomId in URL.")
    return
  }

  try {
    await ensureLocalTracksReady()

    socket.emit("callroom:join", { roomId: roomId.value }, async (res) => {
      if (res?.error) {
        setError(res.error || "Could not join room.")
        return
      }

      joinedRoom.value = true

      const room = res?.room || {}
      roomName.value = String(room?.name || roomId.value)
      roomKind.value = room?.kind === "audio" ? "audio" : "video"

      safeReplaceRoomUsers(room?.users || [])

      await nextTick()
      updateLocalPreview()

      for (const user of roomUsers.value) {
        const sid = String(user.socketId || "")
        if (!sid || sid === String(mySocketId.value)) continue
        buildPeerConnection(sid)
      }

      setTimeout(async () => {
        for (const user of roomUsers.value) {
          const sid = String(user.socketId || "")
          if (!sid || sid === String(mySocketId.value)) continue
          await negotiateWithPeer(sid)
        }
      }, 200)

      setNotice("Joined room.")
    })
  } catch {}
}

function scheduleSocketReconnect() {
  if (reconnectTimer) return
  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = null
    try {
      socket?.connect?.()
    } catch {}
  }, 1200)
}

function leaveRoom() {
  try {
    socket?.emit("callroom:leave", { roomId: roomId.value })
  } catch {}
  cleanupAll()
  router.push("/dashboard")
}

function cleanupAll() {
  joinedRoom.value = false

  for (const id of Array.from(peerConnections.keys())) {
    cleanupPeer(id)
  }

  try { localStream.value?.getTracks?.().forEach((t) => t.stop()) } catch {}
  try { cameraStream.value?.getTracks?.().forEach((t) => t.stop()) } catch {}
  try { screenStream.value?.getTracks?.().forEach((t) => t.stop()) } catch {}

  localStream.value = null
  cameraStream.value = null
  screenStream.value = null
  screenSharing.value = false

  if (localVideoRef.value) {
    try { localVideoRef.value.srcObject = null } catch {}
  }

  roomUsers.value = []
}

/* =========================
   SOCKET LISTENERS
========================= */
function attachSocketListeners() {
  socket.on("connect", async () => {
    socketConnected.value = true
    mySocketId.value = String(socket.id || "")

    try {
      if (me?.id) {
        socket.emit("user:online", { userId: String(me.id), username: currentUsername() })
        socket.emit("register-user", { id: String(me.id), username: currentUsername() })
      }
    } catch {}

    await refreshRoomState()
    await joinRoom()
  })

  socket.on("disconnect", () => {
    socketConnected.value = false
    joinedRoom.value = false
    scheduleSocketReconnect()
  })

  socket.on("callroom:state", async (payload = {}) => {
    const rid = String(payload?.roomId || "")
    if (rid && rid !== roomId.value) return

    if (payload?.name) roomName.value = String(payload.name)
    if (payload?.kind) roomKind.value = payload.kind === "audio" ? "audio" : "video"

    safeReplaceRoomUsers(payload?.users || [])

    for (const user of roomUsers.value) {
      const sid = String(user.socketId || "")
      if (!sid || sid === String(mySocketId.value)) continue
      buildPeerConnection(sid)
    }

    setTimeout(async () => {
      for (const user of roomUsers.value) {
        const sid = String(user.socketId || "")
        if (!sid || sid === String(mySocketId.value)) continue
        if (!peerConnections.has(sid)) continue
        await negotiateWithPeer(sid)
      }
    }, 200)
  })

  socket.on("callroom:user-joined", async ({ roomId: rid, user } = {}) => {
    if (String(rid || "") !== roomId.value) return
    if (!user?.socketId) return

    const sid = String(user.socketId)
    if (sid === String(mySocketId.value)) return

    mergeUserIntoRoom(user)
    buildPeerConnection(sid)

    setTimeout(async () => {
      if (!peerConnections.has(sid)) return
      await negotiateWithPeer(sid)
    }, 250)

    setNotice("A participant joined.")
  })

  socket.on("callroom:user-left", ({ roomId: rid, socketId } = {}) => {
    if (String(rid || "") !== roomId.value) return

    const sid = String(socketId || "")
    if (!sid) return

    roomUsers.value = roomUsers.value.filter((u) => String(u.socketId) !== sid)

    if (focusedTileId.value === sid) focusedTileId.value = ""
    cleanupPeer(sid)
    setNotice("A participant left.")
  })

  socket.on("callroom:webrtc:offer", handleOfferPayload)
  socket.on("callroom:webrtc:answer", handleAnswerPayload)
  socket.on("callroom:webrtc:ice", handleIcePayload)

  socket.on("callroom:error", ({ message } = {}) => {
    setError(message || "Room call error.")
  })
}

/* =========================
   LIFECYCLE
========================= */
onMounted(async () => {
  if (!token) {
    router.push("/login")
    return
  }

  if (!roomId.value) {
    setError("No roomId provided.")
    return
  }

  await loadTurnServers()

  socket = createSocket()
  attachSocketListeners()
})

onBeforeUnmount(() => {
  try {
    socket?.emit("callroom:leave", { roomId: roomId.value })
  } catch {}

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

  if (reconnectTimer) {
    window.clearTimeout(reconnectTimer)
    reconnectTimer = null
  }

  cleanupAll()
  socket = null
})
</script>

<style scoped>
.roomcall-page {
  min-height: 100vh;
  color: #f7fbff;
  background:
    radial-gradient(circle at top left, rgba(83, 143, 255, 0.22), transparent 28%),
    radial-gradient(circle at top right, rgba(255, 65, 120, 0.18), transparent 24%),
    radial-gradient(circle at bottom center, rgba(16, 221, 180, 0.14), transparent 28%),
    #08111f;
  position: relative;
  overflow-x: hidden;
  padding: 18px 18px 110px;
}

.bg-layer {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.bg1 {
  background: radial-gradient(circle at 20% 10%, rgba(255,255,255,0.05), transparent 25%);
  animation: floatA 14s ease-in-out infinite alternate;
}
.bg2 {
  background: radial-gradient(circle at 80% 20%, rgba(0, 212, 255, 0.07), transparent 22%);
  animation: floatB 16s ease-in-out infinite alternate;
}
.bg3 {
  background: radial-gradient(circle at 55% 80%, rgba(124, 58, 237, 0.08), transparent 24%);
  animation: floatC 18s ease-in-out infinite alternate;
}

@keyframes floatA {
  from { transform: translateY(0) scale(1); }
  to { transform: translateY(-18px) scale(1.03); }
}
@keyframes floatB {
  from { transform: translateX(0) scale(1); }
  to { transform: translateX(16px) scale(1.04); }
}
@keyframes floatC {
  from { transform: translateY(0) translateX(0); }
  to { transform: translateY(10px) translateX(-12px); }
}

.glassy {
  background: rgba(255,255,255,0.075);
  border: 1px solid rgba(255,255,255,0.08);
  box-shadow: 0 20px 60px rgba(0,0,0,0.25);
  backdrop-filter: blur(18px);
}

.topbar,
.hero,
.stage-toolbar,
.panel,
.bottomBar {
  position: relative;
  z-index: 2;
  border-radius: 24px;
}

.topbar {
  padding: 14px 16px;
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.top-left,
.top-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.chip,
.control,
.btn,
.toolBtn,
.fab {
  border: none;
  color: #fff;
  cursor: pointer;
  transition: 0.18s ease;
}

.chip {
  padding: 11px 14px;
  border-radius: 999px;
  background: rgba(255,255,255,0.11);
  font-weight: 800;
}

.chip:hover,
.control:hover,
.btn:hover,
.toolBtn:hover,
.fab:hover {
  transform: translateY(-1px);
}

.chip.ghost {
  background: rgba(255,255,255,0.08);
}

.chip.danger {
  background: linear-gradient(135deg, #ff4d6d, #d90429);
}

.room-pill {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 18px;
  background: rgba(255,255,255,0.08);
}

.live-dot {
  width: 11px;
  height: 11px;
  border-radius: 999px;
  background: #1ce783;
  box-shadow: 0 0 14px #1ce783;
}

.room-pill-title {
  font-weight: 900;
  font-size: 15px;
}

.room-pill-sub {
  opacity: 0.75;
  font-size: 12px;
}

.hero {
  padding: 22px;
  display: grid;
  grid-template-columns: 1.3fr 0.7fr;
  gap: 20px;
  margin-bottom: 16px;
}

.eyebrow {
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.18em;
  opacity: 0.7;
}

.hero-title {
  margin: 8px 0 10px;
  font-size: clamp(28px, 4vw, 44px);
  line-height: 1.02;
}

.hero-sub {
  max-width: 760px;
  opacity: 0.82;
  line-height: 1.55;
}

.hero-badges {
  margin-top: 16px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.badge {
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(255,255,255,0.08);
  font-size: 12px;
  font-weight: 800;
}

.badge.ok {
  background: rgba(28,231,131,0.16);
  color: #92ffc8;
}

.badge.bad {
  background: rgba(255,77,109,0.16);
  color: #ff9aaa;
}

.hero-right {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  align-content: start;
}

.hero-stat {
  border-radius: 20px;
  background: rgba(255,255,255,0.07);
  padding: 18px 14px;
  text-align: center;
}

.hero-num {
  font-size: 24px;
  font-weight: 900;
}

.hero-lab {
  font-size: 12px;
  opacity: 0.72;
  margin-top: 6px;
}

.main {
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: 1.5fr 0.7fr;
  gap: 16px;
}

.stage-wrap {
  min-width: 0;
}

.stage-toolbar {
  padding: 14px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}

.stage-left,
.stage-right {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.control {
  border-radius: 16px;
  padding: 12px 14px;
  background: rgba(255,255,255,0.1);
  font-weight: 800;
}

.control.active {
  background: linear-gradient(135deg, rgba(0,210,255,0.24), rgba(124,58,237,0.24));
}

.control.ghost {
  background: rgba(255,255,255,0.07);
}

.control:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.video-stage {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
}

.video-stage.focused {
  grid-template-columns: 1fr;
}

.tile {
  border-radius: 26px;
  overflow: hidden;
  padding: 14px;
  min-height: 260px;
  display: flex;
  flex-direction: column;
}

.tile.big {
  min-height: 520px;
}

.tile-head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
  margin-bottom: 12px;
}

.tile-user {
  display: flex;
  gap: 12px;
  align-items: center;
  min-width: 0;
}

.tile-meta {
  min-width: 0;
}

.tile-name {
  font-weight: 900;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tile-sub {
  font-size: 12px;
  opacity: 0.72;
  margin-top: 3px;
}

.avatar {
  width: 38px;
  height: 38px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  font-weight: 900;
  background: linear-gradient(135deg, #00d2ff, #7c3aed);
  flex: 0 0 auto;
}

.avatar.alt {
  background: linear-gradient(135deg, #ff7a18, #ff416c);
}

.avatar.big {
  width: 46px;
  height: 46px;
}

.me-tag {
  font-size: 11px;
  font-weight: 900;
  background: rgba(255,255,255,0.12);
  padding: 4px 8px;
  border-radius: 999px;
  margin-left: 6px;
}

.tile-pills {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.pill {
  padding: 7px 10px;
  border-radius: 999px;
  background: rgba(255,255,255,0.1);
  font-size: 11px;
  font-weight: 900;
}

.pill.off {
  background: rgba(255,77,109,0.18);
  color: #ffb4c1;
}

.media-wrap {
  position: relative;
  flex: 1;
  min-height: 0;
}

.media {
  width: 100%;
  height: 100%;
  min-height: 220px;
  max-height: 72vh;
  border-radius: 22px;
  object-fit: cover;
  background: #02060c;
}

.audio-room-card {
  min-height: 220px;
  height: 100%;
  border-radius: 22px;
  display: grid;
  place-items: center;
  text-align: center;
  background:
    radial-gradient(circle at 50% 20%, rgba(0,210,255,0.18), transparent 30%),
    linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02));
  padding: 20px;
}

.audio-room-avatar {
  width: 96px;
  height: 96px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  font-size: 34px;
  font-weight: 900;
  background: linear-gradient(135deg, #00d2ff, #7c3aed);
  margin: 0 auto 14px;
}

.audio-room-name {
  font-size: 20px;
  font-weight: 900;
}

.audio-room-sub {
  opacity: 0.72;
  margin-top: 8px;
}

.corner-status {
  position: absolute;
  right: 12px;
  bottom: 12px;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(0,0,0,0.45);
  font-size: 11px;
  font-weight: 900;
}

.corner-status.remote {
  text-transform: capitalize;
}

.empty-state {
  border-radius: 24px;
  padding: 34px 20px;
  text-align: center;
  min-height: 260px;
  display: grid;
  place-items: center;
}

.empty-emoji {
  font-size: 44px;
}

.empty-title {
  margin-top: 10px;
  font-size: 22px;
  font-weight: 900;
}

.empty-sub {
  opacity: 0.75;
  margin-top: 8px;
  max-width: 520px;
}

.empty-actions {
  margin-top: 16px;
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
}

.btn {
  padding: 12px 16px;
  border-radius: 14px;
  font-weight: 900;
  background: rgba(255,255,255,0.12);
}

.btn.btn-primary {
  background: linear-gradient(135deg, #00d2ff, #7c3aed);
}

.btn.ghostBtn {
  background: rgba(255,255,255,0.08);
}

.side {
  min-width: 0;
  display: grid;
  gap: 16px;
  align-content: start;
  transition: 0.2s ease;
}

.side.closed {
  display: none;
}

.panel {
  border-radius: 24px;
  padding: 16px;
}

.panel-head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: baseline;
  margin-bottom: 14px;
}

.panel-title {
  font-size: 18px;
  font-weight: 900;
}

.panel-sub {
  font-size: 12px;
  opacity: 0.72;
}

.people-list {
  display: grid;
  gap: 10px;
}

.person-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 18px;
  background: rgba(255,255,255,0.06);
}

.person-card.self {
  background: rgba(0,210,255,0.08);
}

.person-meta {
  min-width: 0;
}

.person-name {
  font-weight: 900;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.person-sub {
  display: flex;
  align-items: center;
  gap: 8px;
  opacity: 0.72;
  font-size: 12px;
  margin-top: 3px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #6b7280;
}

.status-dot.on {
  background: #1ce783;
  box-shadow: 0 0 10px #1ce783;
}

.tools-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.toolBtn {
  padding: 12px 10px;
  border-radius: 16px;
  background: rgba(255,255,255,0.08);
  font-weight: 800;
}

.diag-list {
  display: grid;
  gap: 10px;
}

.diag-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 14px;
  background: rgba(255,255,255,0.05);
  font-size: 13px;
}

.diag-row span {
  opacity: 0.72;
}

.hint,
.alert {
  padding: 11px 12px;
  border-radius: 14px;
  font-size: 13px;
}

.hint {
  background: rgba(255,255,255,0.07);
}

.alert {
  background: rgba(255,77,109,0.12);
  color: #ffc4cf;
}

.mt10 {
  margin-top: 10px;
}

.bottomBar {
  position: fixed;
  left: 50%;
  bottom: 16px;
  transform: translateX(-50%);
  width: min(92vw, 680px);
  padding: 12px;
  border-radius: 999px;
  display: flex;
  justify-content: center;
  gap: 10px;
  z-index: 5;
}

.fab {
  width: 54px;
  height: 54px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: rgba(255,255,255,0.1);
  font-size: 22px;
}

.fab.mute.off,
.fab.cam.off {
  background: rgba(255,77,109,0.18);
}

.fab.share.on {
  background: linear-gradient(135deg, #00d2ff, #7c3aed);
}

.fab.end {
  background: linear-gradient(135deg, #ff4d6d, #d90429);
}

@media (max-width: 1100px) {
  .main {
    grid-template-columns: 1fr;
  }

  .side {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 820px) {
  .hero {
    grid-template-columns: 1fr;
  }

  .hero-right {
    grid-template-columns: repeat(3, 1fr);
  }

  .tools-grid {
    grid-template-columns: 1fr 1fr;
  }

  .stage-toolbar {
    flex-direction: column;
    align-items: stretch;
  }
}

@media (max-width: 640px) {
  .roomcall-page {
    padding: 12px 12px 100px;
  }

  .topbar,
  .hero,
  .panel,
  .stage-toolbar {
    border-radius: 20px;
  }

  .hero-right {
    grid-template-columns: repeat(2, 1fr);
  }

  .video-stage {
    grid-template-columns: 1fr;
  }

  .tile.big {
    min-height: 340px;
  }

  .tools-grid {
    grid-template-columns: 1fr;
  }

  .bottomBar {
    width: calc(100vw - 20px);
    gap: 8px;
  }

  .fab {
    width: 50px;
    height: 50px;
    font-size: 20px;
  }
}
</style>