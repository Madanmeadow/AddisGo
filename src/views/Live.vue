<template>
  <Layout>
    <div class="live-page" :class="{ theaterMode, focusChat }">
      <div class="bg bg1"></div>
      <div class="bg bg2"></div>
      <div class="bg bg3"></div>
      <div class="mesh"></div>

      <header class="topbar glassy">
        <div class="top-left">
          <button class="icon-btn" @click="leaveLive" aria-label="Back">←</button>

          <div class="meta">
            <div class="title">🔴 Pulse Live</div>
            <div class="sub">{{ modeLabel }} • {{ liveId }}</div>
          </div>
        </div>

        <div class="top-right">
          <span class="pill viewerPill">👀 {{ viewerCount }} viewer{{ viewerCount === 1 ? "" : "s" }}</span>
          <span class="pill" :class="socketConnected ? 'ok' : 'bad'">
            {{ socketConnected ? "Realtime Connected" : "Realtime Offline" }}
          </span>
          <span class="pill soft">{{ qualityLabel }}</span>
        </div>
      </header>

      <section class="hero glassy">
        <div class="hero-left">
          <div class="hero-kicker">LIVE ROOM</div>
          <div class="hero-title">{{ isHost ? "You are live now" : "Watching live" }}</div>
          <div class="hero-sub">
            {{
              isHost
                ? "Run your stream from a brighter control deck, approve mic requests, and keep the room moving."
                : "Watch the stage, join the chat, request mic access, and stay connected even when the stream is warming up."
            }}
          </div>

          <div class="hero-pills">
            <span class="badge accent">{{ modeLabel }}</span>
            <span class="badge">{{ localStream ? "Media Ready" : "No Local Media" }}</span>
            <span class="badge">{{ remoteReadyLabel }}</span>
            <span class="badge">{{ canSpeak ? "Mic Approved" : "Listener" }}</span>
            <span class="badge">{{ theaterMode ? "Theater" : "Standard" }}</span>
          </div>
        </div>

        <div class="hero-right">
          <div class="stat">
            <div class="stat-num">{{ viewerCount }}</div>
            <div class="stat-lab">Viewers</div>
          </div>
          <div class="stat">
            <div class="stat-num">{{ micRequests.length }}</div>
            <div class="stat-lab">Mic Requests</div>
          </div>
          <div class="stat">
            <div class="stat-num">{{ chat.length }}</div>
            <div class="stat-lab">Messages</div>
          </div>
          <div class="stat">
            <div class="stat-num">{{ streamStateLabel }}</div>
            <div class="stat-lab">State</div>
          </div>
        </div>
      </section>

      <section class="quick-strip glassy">
        <div class="quick-status">
          <span class="signal-dot" :class="{ on: socketConnected }"></span>
          <span>{{ statusText }}</span>
        </div>

        <div class="quick-tools">
          <button class="mini-action" @click="copyLiveId">Copy ID</button>
          <button class="mini-action" @click="shareLive">Invite</button>
          <button class="mini-action" @click="refreshPresence">Refresh</button>
          <button class="mini-action" @click="toggleFocusChat">
            {{ focusChat ? "Hide Chat Focus" : "Focus Chat" }}
          </button>
          <button class="mini-action" @click="toggleTheater">
            {{ theaterMode ? "Normal View" : "Theater" }}
          </button>
        </div>
      </section>

      <main class="live-layout">
        <section class="stage-panel glassy">
          <div class="stage-shell">
            <video
              v-if="isHost && !showLocalPlaceholder"
              ref="localVideo"
              autoplay
              playsinline
              muted
              class="main-video"
            ></video>

            <video
              v-if="!isHost && !showRemotePlaceholder"
              ref="remoteVideo"
              autoplay
              playsinline
              class="main-video"
            ></video>

            <div
              v-if="(isHost && showLocalPlaceholder) || (!isHost && showRemotePlaceholder)"
              class="placeholder"
            >
              <div class="avatar-big">{{ stageInitial }}</div>
              <div class="placeholder-title">{{ isHost ? "Your live stage" : "Live stage" }}</div>
              <div class="placeholder-sub">
                {{ placeholderText }}
              </div>

              <div v-if="!isHost && !remoteStream" class="placeholder-actions">
                <button class="placeholder-btn" @click="refreshPresence">Retry stream</button>
                <button class="placeholder-btn ghost" @click="shareLive">Copy invite</button>
              </div>
            </div>

            <div class="stage-top">
              <div class="live-badge">
                <span class="dot"></span>
                LIVE
              </div>

              <div class="stage-top-right">
                <span class="mini-chip">{{ isHost ? "Host" : "Viewer" }}</span>
                <span class="mini-chip">{{ qualityLabel }}</span>
                <span class="mini-chip">{{ remoteReadyLabel }}</span>
              </div>
            </div>

            <div class="stage-bottom">
              <div class="stage-status">
                <span class="signal-dot" :class="{ on: socketConnected }"></span>
                <span>{{ statusText }}</span>
              </div>

              <div class="stage-actions">
                <button class="mini-action" @click="goDashboard">Dashboard</button>
                <button class="mini-action danger" v-if="isHost" @click="endLive">End Live</button>
                <button class="mini-action danger" v-else @click="leaveLive">Leave</button>
              </div>
            </div>
          </div>

          <div v-if="!isHost && localStream && canSpeak" class="mini-preview">
            <div>
              <div class="mini-preview-title">Your mic is live</div>
              <div class="mini-preview-sub">{{ micMuted ? "Muted" : "Speaking enabled" }}</div>
            </div>
            <span class="badge accent small">Speaker mode</span>
          </div>
        </section>

        <aside class="side-column">
          <section class="controls glassy">
            <div class="panel-head">
              <div class="panel-title">🎛 Live Controls</div>
              <span class="count-pill">{{ isHost ? "Host Deck" : "Viewer Deck" }}</span>
            </div>

            <div class="controls-grid">
              <button
                v-if="!isHost"
                class="control-btn primary"
                @click="requestMic"
                :disabled="micRequestPending || canSpeak"
              >
                {{ canSpeak ? "Mic Approved" : micRequestPending ? "Requested" : "Request Mic" }}
              </button>

              <button
                class="control-btn"
                @click="toggleMute"
                :disabled="!localStream"
              >
                {{ micMuted ? "Unmute" : "Mute" }}
              </button>

              <button
                v-if="isHost"
                class="control-btn"
                @click="toggleCamera"
                :disabled="!localStream"
              >
                {{ cameraOff ? "Camera On" : "Camera Off" }}
              </button>

              <button
                v-if="isHost"
                class="control-btn"
                @click="switchCamera"
                :disabled="!localStream || switchingCamera"
              >
                {{ switchingCamera ? "Switching..." : "Switch Cam" }}
              </button>

              <button class="control-btn" @click="copyLiveId">Copy Live ID</button>
              <button class="control-btn" @click="shareLive">Invite</button>
              <button class="control-btn" @click="refreshPresence">Refresh</button>
              <button class="control-btn" @click="toggleTheater">
                {{ theaterMode ? "Normal View" : "Theater" }}
              </button>
              <button class="control-btn ghost" @click="goDashboard">Dashboard</button>
              <button class="control-btn ghost" @click="leaveLive">Leave</button>
            </div>
          </section>

          <section v-if="isHost" class="host-panel glassy">
            <div class="panel-head">
              <div class="panel-title">🎙 Mic Requests</div>
              <span class="count-pill">{{ micRequests.length }}</span>
            </div>

            <div v-if="micRequests.length === 0" class="panel-empty">
              No mic requests yet.
            </div>

            <div v-for="req in micRequests" :key="req.fromUserId" class="req-row">
              <div class="req-left">
                <div class="req-avatar">{{ getInitial(req.fromName || "U") }}</div>
                <div>
                  <div class="req-name">{{ req.fromName || "User" }}</div>
                  <div class="req-sub">Wants to speak on your live</div>
                </div>
              </div>

              <div class="row-actions">
                <button class="approve" @click="approveMic(req)">Approve</button>
                <button class="deny" @click="denyMic(req)">Deny</button>
              </div>
            </div>
          </section>

          <section class="chat-shell glassy">
            <div class="chat-head">
              <div class="chat-title">💬 Live Chat</div>
              <div class="chat-tools">
                <span class="chat-pill">{{ chat.length }} messages</span>
                <button class="clear-btn" @click="clearChatLocal">Clear Local</button>
              </div>
            </div>

            <div ref="chatListEl" class="messages">
              <div v-if="chat.length === 0" class="chat-empty">
                No messages yet. Start the conversation.
              </div>

              <div v-for="(msg, i) in chat" :key="i" class="msg">
                <div class="msg-avatar">{{ getInitial(msg.from?.username || msg.fromName || "A") }}</div>

                <div class="msg-body">
                  <div class="msg-top">
                    <strong>{{ msg.from?.username || msg.fromName || "Anon" }}</strong>
                    <span class="msg-time">{{ formatTime(msg.createdAt || msg.created_at) }}</span>
                  </div>
                  <div class="msg-text">{{ msg.message }}</div>
                </div>
              </div>
            </div>

            <form class="composer" @submit.prevent="sendChat">
              <input
                v-model="chatText"
                placeholder="Say something..."
                maxlength="400"
              />
              <button type="submit">Send</button>
            </form>
          </section>
        </aside>
      </main>
    </div>
  </Layout>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, computed, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import Layout from "../components/Layout.vue"
import socket, { refreshSocketAuth } from "../socket"

const route = useRoute()
const router = useRouter()

const me = (() => {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}")
  } catch {
    return {}
  }
})()

const liveId = String(route.query.liveId || `live-${Date.now()}`)
const rawMode = String(route.query.mode || "watch").toLowerCase()
const mode = rawMode === "viewer" ? "watch" : rawMode
const isHost = mode === "host"
const modeLabel = isHost ? "Hosting" : "Watching"

const localVideo = ref(null)
const remoteVideo = ref(null)
const chatListEl = ref(null)

const viewerCount = ref(0)
const chat = ref([])
const chatText = ref("")
const micRequests = ref([])
const canSpeak = ref(false)
const micRequestPending = ref(false)
const socketConnected = ref(socket.connected)
const statusText = ref(isHost ? "Preparing your live..." : "Joining live...")
const cameraOff = ref(false)
const micMuted = ref(false)
const switchingCamera = ref(false)
const theaterMode = ref(false)
const focusChat = ref(false)
const currentFacingMode = ref("user")
const rejoinTimer = ref(null)

const pc = ref(null)
const localStream = ref(null)
const remoteStream = ref(null)
const hostSocketId = ref(null)
let pendingCandidates = []

const stageInitial = computed(() => {
  const name = isHost ? me?.username || me?.name || "Y" : "L"
  return String(name).trim().charAt(0).toUpperCase() || "L"
})

const streamStateLabel = computed(() => {
  if (isHost && localStream.value) return "LIVE"
  if (!isHost && remoteStream.value) return "LIVE"
  return "WAIT"
})

const qualityLabel = computed(() => {
  if (!pc.value) return "Standby"
  const s = pc.value.connectionState
  if (s === "connected") return "Strong"
  if (s === "connecting") return "Linking"
  if (s === "disconnected") return "Weak"
  if (s === "failed") return "Recovering"
  return "Standby"
})

const showLocalPlaceholder = computed(() => {
  if (!localStream.value) return true
  const videoTrack = localStream.value.getVideoTracks?.()[0]
  if (!videoTrack) return true
  return !videoTrack.enabled || videoTrack.readyState !== "live"
})

const showRemotePlaceholder = computed(() => {
  if (!remoteStream.value) return true
  const videoTrack = remoteStream.value.getVideoTracks?.()[0]
  return !videoTrack || videoTrack.readyState !== "live"
})

const remoteReadyLabel = computed(() => {
  if (isHost) return localStream.value ? "Host Media Ready" : "Host Media Pending"
  return remoteStream.value ? "Stream Ready" : "Waiting for Host"
})

const placeholderText = computed(() => {
  if (isHost) return cameraOff.value ? "Camera is off" : "Preparing your stream..."
  if (!socketConnected.value) return "Realtime connection is offline. Reconnecting..."
  if (hostSocketId.value && !remoteStream.value) return "Connecting to host video..."
  return "Waiting for host video..."
})

function getInitial(name) {
  return String(name || "U").trim().charAt(0).toUpperCase() || "U"
}

function formatTime(v) {
  if (!v) return ""
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

function scrollChatBottom() {
  nextTick(() => {
    if (chatListEl.value) chatListEl.value.scrollTop = chatListEl.value.scrollHeight
  })
}

async function getIceServers() {
  try {
    const base = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "")
    const res = await fetch(`${base}/api/turn`)
    const data = await res.json()
    return data?.iceServers?.length ? data.iceServers : [{ urls: "stun:stun.l.google.com:19302" }]
  } catch {
    return [{ urls: "stun:stun.l.google.com:19302" }]
  }
}

async function ensurePeer() {
  if (pc.value) return pc.value

  pc.value = new RTCPeerConnection({ iceServers: await getIceServers() })
  remoteStream.value = new MediaStream()

  await nextTick()
  attachRemoteStream()

  pc.value.ontrack = (event) => {
    if (!remoteStream.value) remoteStream.value = new MediaStream()
    event.streams[0].getTracks().forEach((track) => {
      const exists = remoteStream.value.getTracks().some((t) => t.id === track.id)
      if (!exists) remoteStream.value.addTrack(track)
    })
    attachRemoteStream()
    statusText.value = "Connected to live"
  }

  pc.value.onicecandidate = (event) => {
    if (!event.candidate || !hostSocketId.value) return
    socket.emit("webrtc:ice", { liveId, to: hostSocketId.value, candidate: event.candidate })
  }

  pc.value.onconnectionstatechange = () => {
    const s = pc.value?.connectionState || ""
    if (s === "connected") {
      statusText.value = "Connected to live"
      clearRejoinTimer()
    } else if (s === "connecting") {
      statusText.value = "Connecting..."
    } else if (s === "disconnected") {
      statusText.value = "Reconnecting..."
      scheduleViewerRefresh()
    } else if (s === "failed") {
      statusText.value = "Connection weak"
      scheduleViewerRefresh(true)
    }
  }

  return pc.value
}

function attachLocalStream() {
  nextTick(() => {
    if (localVideo.value && localStream.value) {
      localVideo.value.srcObject = localStream.value
      localVideo.value.muted = true
      localVideo.value.play?.().catch(() => {})
    }
  })
}

function attachRemoteStream() {
  nextTick(() => {
    if (remoteVideo.value && remoteStream.value) {
      remoteVideo.value.srcObject = remoteStream.value
      remoteVideo.value.play?.().catch(() => {})
    }
  })
}

async function flushPendingCandidates() {
  if (!pc.value || !pc.value.remoteDescription) return
  while (pendingCandidates.length) {
    const c = pendingCandidates.shift()
    try {
      await pc.value.addIceCandidate(new RTCIceCandidate(c))
    } catch {}
  }
}

async function createHostStream() {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: currentFacingMode.value,
      width: { ideal: 1280, max: 1280 },
      height: { ideal: 720, max: 720 },
      frameRate: { ideal: 24, max: 30 },
    },
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  })

  localStream.value = stream
  attachLocalStream()
  statusText.value = "You are live"
}

async function ensureViewerLocalStream() {
  if (localStream.value) return localStream.value

  const stream = await navigator.mediaDevices.getUserMedia({
    video: false,
    audio: canSpeak.value
      ? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      : false,
  })

  localStream.value = stream
  return stream
}

async function connectViewerToHost() {
  if (!hostSocketId.value) return

  const peer = await ensurePeer()
  const stream = await ensureViewerLocalStream()

  stream.getTracks().forEach((track) => {
    const exists = peer.getSenders().some((s) => s.track && s.track.kind === track.kind)
    if (!exists) peer.addTrack(track, stream)
  })

  const offer = await peer.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true })
  await peer.setLocalDescription(offer)

  socket.emit("webrtc:offer", { liveId, to: hostSocketId.value, offer })
  statusText.value = canSpeak.value ? "Joining with mic..." : "Joining live..."
}

function sendChat() {
  const value = chatText.value.trim()
  if (!value) return
  socket.emit("live:chat", { liveId, message: value })
  chatText.value = ""
}

function clearChatLocal() {
  chat.value = []
}

function requestMic() {
  socket.emit("live:mic:request", { liveId })
  micRequestPending.value = true
}

function approveMic(req) {
  socket.emit("live:mic:approve", { liveId, userId: req.fromUserId })
  micRequests.value = micRequests.value.filter((x) => String(x.fromUserId) !== String(req.fromUserId))
}

function denyMic(req) {
  socket.emit("live:mic:deny", { liveId, userId: req.fromUserId, reason: "Host denied request" })
  micRequests.value = micRequests.value.filter((x) => String(x.fromUserId) !== String(req.fromUserId))
}

function toggleMute() {
  if (!localStream.value) return
  micMuted.value = !micMuted.value
  localStream.value.getAudioTracks().forEach((t) => {
    t.enabled = !micMuted.value
  })
}

function toggleCamera() {
  if (!localStream.value) return
  cameraOff.value = !cameraOff.value
  localStream.value.getVideoTracks().forEach((t) => {
    t.enabled = !cameraOff.value
  })
}

async function switchCamera() {
  if (!isHost || !localStream.value || switchingCamera.value) return

  switchingCamera.value = true
  try {
    currentFacingMode.value = currentFacingMode.value === "user" ? "environment" : "user"
    const newStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: currentFacingMode.value,
        width: { ideal: 1280, max: 1280 },
        height: { ideal: 720, max: 720 },
        frameRate: { ideal: 24, max: 30 },
      },
      audio: false,
    })

    const newTrack = newStream.getVideoTracks()[0]
    if (!newTrack) return

    const oldTrack = localStream.value.getVideoTracks()[0]
    if (oldTrack) {
      try { oldTrack.stop() } catch {}
    }

    const audioTracks = localStream.value.getAudioTracks()
    localStream.value = new MediaStream([...audioTracks, newTrack])
    attachLocalStream()

    if (pc.value) {
      const sender = pc.value.getSenders().find((s) => s.track && s.track.kind === "video")
      if (sender) await sender.replaceTrack(newTrack)
    }

    cameraOff.value = false
  } catch (e) {
    console.error("switchCamera error", e)
  } finally {
    switchingCamera.value = false
  }
}

function refreshPresence() {
  if (isHost) {
    socket.emit("live:create", { liveId })
    statusText.value = "Refreshing your live..."
  } else {
    socket.emit("live:join", { liveId })
    statusText.value = "Refreshing stream..."
  }
}

function toggleTheater() {
  theaterMode.value = !theaterMode.value
  document.body.style.overflow = theaterMode.value ? "hidden" : ""
}

function toggleFocusChat() {
  focusChat.value = !focusChat.value
}

async function copyLiveId() {
  try {
    await navigator.clipboard.writeText(liveId)
    statusText.value = "Live ID copied"
    resetStatusSoon()
  } catch {
    alert(liveId)
  }
}

async function shareLive() {
  const url = `${window.location.origin}/live?mode=watch&liveId=${encodeURIComponent(liveId)}`
  const text = `Join my Pulse live: ${url}`

  try {
    if (navigator.share) {
      await navigator.share({ title: "Join my Pulse live", text, url })
      return
    }

    await navigator.clipboard.writeText(url)
    statusText.value = "Invite link copied"
    resetStatusSoon()
  } catch {}
}

function resetStatusSoon() {
  setTimeout(() => {
    if (statusText.value === "Live ID copied" || statusText.value === "Invite link copied") {
      statusText.value = isHost ? "You are live" : "Watching live"
    }
  }, 1600)
}

function goDashboard() {
  cleanup()
  document.body.style.overflow = ""
  router.replace("/dashboard")
}

function leaveLive() {
  socket.emit("live:leave", { liveId })
  cleanup()
  document.body.style.overflow = ""
  router.replace("/dashboard")
}

function endLive() {
  socket.emit("live:end", { liveId })
  cleanup()
  document.body.style.overflow = ""
  router.replace("/dashboard")
}

function clearRejoinTimer() {
  if (rejoinTimer.value) {
    clearTimeout(rejoinTimer.value)
    rejoinTimer.value = null
  }
}

function scheduleViewerRefresh(force = false) {
  if (isHost) return
  if (rejoinTimer.value && !force) return
  clearRejoinTimer()
  rejoinTimer.value = setTimeout(async () => {
    rejoinTimer.value = null
    try {
      if (pc.value) {
        try { pc.value.close() } catch {}
        pc.value = null
      }
      remoteStream.value = null
      pendingCandidates = []
      refreshPresence()
      if (hostSocketId.value) await connectViewerToHost()
    } catch {}
  }, force ? 700 : 1200)
}

function cleanup() {
  clearRejoinTimer()

  if (localStream.value) {
    localStream.value.getTracks().forEach((t) => {
      try { t.stop() } catch {}
    })
    localStream.value = null
  }

  if (remoteStream.value) {
    remoteStream.value.getTracks().forEach((t) => {
      try { t.stop() } catch {}
    })
    remoteStream.value = null
  }

  if (pc.value) {
    try { pc.value.close() } catch {}
    pc.value = null
  }

  hostSocketId.value = null
  pendingCandidates = []

  if (localVideo.value) localVideo.value.srcObject = null
  if (remoteVideo.value) remoteVideo.value.srcObject = null
}

async function onLiveHost(payload) {
  hostSocketId.value = payload?.hostSocketId || null;

  if (!isHost && hostSocketId.value) {
    console.log("🎯 Found host:", hostSocketId.value);

    // Force reconnect cleanly
    if (pc.value) {
      try { pc.value.close(); } catch {}
      pc.value = null;
    }

    remoteStream.value = null;

    await connectViewerToHost();
  }
}


function onLivePresence(payload) {
  viewerCount.value = Number(payload?.viewerCount || 0)
}

function onLiveChat(payload) {
  chat.value.push({ ...payload, createdAt: payload?.createdAt || payload?.created_at || new Date().toISOString() })
  scrollChatBottom()
}

function onMicRequested(payload) {
  if (!isHost) return
  micRequests.value.unshift(payload)
}

async function onMicStatus(payload) {
  canSpeak.value = !!payload?.canSpeak
  micRequestPending.value = false

  if (canSpeak.value && !isHost) {
    if (localStream.value) {
      localStream.value.getTracks().forEach((t) => {
        try { t.stop() } catch {}
      })
      localStream.value = null
    }
    await connectViewerToHost()
  }
}

async function onOffer({ offer, from }) {
  if (!isHost) return

  hostSocketId.value = from
  const peer = await ensurePeer()

  if (!localStream.value) await createHostStream()

  localStream.value.getTracks().forEach((track) => {
    const already = peer.getSenders().some((s) => s.track === track)
    if (!already) peer.addTrack(track, localStream.value)
  })

  await peer.setRemoteDescription(new RTCSessionDescription(offer))
  await flushPendingCandidates()

  const answer = await peer.createAnswer()
  await peer.setLocalDescription(answer)

  socket.emit("webrtc:answer", { liveId, to: from, answer })
}

async function onAnswer({ answer }) {
  if (!pc.value) return
  await pc.value.setRemoteDescription(new RTCSessionDescription(answer))
  await flushPendingCandidates()
}

async function onIce({ candidate }) {
  if (!pc.value || !candidate) return
  if (pc.value.remoteDescription) {
    await pc.value.addIceCandidate(new RTCIceCandidate(candidate))
  } else {
    pendingCandidates.push(candidate)
  }
}

function onLiveEnded() {
  cleanup()
  document.body.style.overflow = ""
  router.replace("/dashboard")
}

function onSocketConnect() {
  socketConnected.value = true
  if (!isHost && !remoteStream.value) scheduleViewerRefresh(true)
}

function onSocketDisconnect() {
  socketConnected.value = false
}

watch(focusChat, () => scrollChatBottom())

onMounted(async () => {
  refreshSocketAuth()

  socket.on("connect", onSocketConnect)
  socket.on("disconnect", onSocketDisconnect)
  socket.on("live:host", onLiveHost)
  socket.on("live:presence", onLivePresence)
  socket.on("live:chat", onLiveChat)
  socket.on("live:mic:requested", onMicRequested)
  socket.on("live:mic:status", onMicStatus)
  socket.on("webrtc:offer", onOffer)
  socket.on("webrtc:answer", onAnswer)
  socket.on("webrtc:ice", onIce)
  socket.on("live:ended", onLiveEnded)

if (isHost) {
  await createHostStream()
  socket.emit("live:create", { liveId })
  statusText.value = "You are live"
} else {
  socket.emit("live:join", { liveId })
  statusText.value = "Joining live..."

  // ✅ CRITICAL: fallback + auto-connect
  setTimeout(() => {
    if (!hostSocketId.value) {
      console.log("⚠️ Retrying join (no host yet)...");
      socket.emit("live:join", { liveId })
    }

    if (hostSocketId.value && !remoteStream.value) {
      console.log("🔁 Forcing WebRTC connection...");
      connectViewerToHost()
    }
  }, 1500)
}

onBeforeUnmount(() => {
  socket.off("connect", onSocketConnect)
  socket.off("disconnect", onSocketDisconnect)
  socket.off("live:host", onLiveHost)
  socket.off("live:presence", onLivePresence)
  socket.off("live:chat", onLiveChat)
  socket.off("live:mic:requested", onMicRequested)
  socket.off("live:mic:status", onMicStatus)
  socket.off("webrtc:offer", onOffer)
  socket.off("webrtc:answer", onAnswer)
  socket.off("webrtc:ice", onIce)
  socket.off("live:ended", onLiveEnded)

  document.body.style.overflow = ""
  cleanup()
})
</script>

<style scoped>
.live-page {
  position: relative;
  min-height: 100vh;
  color: #f8fbff;
  padding: 14px 14px 110px;
  background:
    radial-gradient(circle at top left, rgba(255, 112, 112, 0.20), transparent 24%),
    radial-gradient(circle at top right, rgba(91, 140, 255, 0.16), transparent 22%),
    radial-gradient(circle at 50% 100%, rgba(255, 255, 255, 0.06), transparent 34%),
    linear-gradient(180deg, #0c1830 0%, #0b1324 46%, #07101c 100%);
  overflow-x: hidden;
}

.mesh {
  position: fixed;
  inset: 0;
  pointer-events: none;
  background-image:
    linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
  background-size: 26px 26px;
  mask-image: radial-gradient(circle at center, black 35%, transparent 90%);
  opacity: 0.35;
}

.bg {
  position: fixed;
  inset: 0;
  pointer-events: none;
  filter: blur(18px);
}

.bg1 {
  background: radial-gradient(circle at 18% 18%, rgba(255, 72, 109, 0.14), transparent 22%);
}

.bg2 {
  background: radial-gradient(circle at 82% 18%, rgba(86, 166, 255, 0.16), transparent 22%);
}

.bg3 {
  background: radial-gradient(circle at 50% 85%, rgba(160, 120, 255, 0.10), transparent 26%);
}

.glassy {
  background: rgba(255, 255, 255, 0.09);
  border: 1px solid rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(18px);
  box-shadow: 0 18px 50px rgba(3, 8, 18, 0.28);
}

.topbar,
.hero,
.quick-strip,
.live-layout {
  position: relative;
  z-index: 2;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px;
  border-radius: 24px;
}

.top-left,
.top-right,
.panel-head,
.chat-head {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.top-right {
  justify-content: flex-end;
}

.icon-btn {
  border: 0;
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: rgba(255,255,255,0.11);
  color: #fff;
  font-size: 18px;
  cursor: pointer;
}

.title {
  font-weight: 900;
  font-size: 18px;
}

.sub {
  opacity: 0.82;
  font-size: 13px;
  margin-top: 2px;
}

.pill,
.badge,
.mini-chip,
.mini-action,
.count-pill,
.chat-pill {
  padding: 9px 12px;
  border-radius: 999px;
  background: rgba(255,255,255,0.10);
  font-size: 12px;
  font-weight: 800;
}

.pill.ok {
  background: rgba(28,231,131,0.16);
  color: #b8f7d7;
}

.pill.bad {
  background: rgba(255,92,122,0.16);
  color: #ffd1da;
}

.pill.soft {
  background: rgba(255,255,255,0.08);
}

.hero {
  margin-top: 14px;
  padding: 20px;
  border-radius: 26px;
  display: grid;
  grid-template-columns: 1.18fr 0.82fr;
  gap: 18px;
}

.hero-kicker {
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.16em;
  opacity: 0.74;
}

.hero-title {
  font-size: clamp(28px, 4vw, 42px);
  font-weight: 900;
  line-height: 1.02;
  margin-top: 8px;
}

.hero-sub {
  margin-top: 10px;
  opacity: 0.86;
  line-height: 1.5;
}

.hero-pills {
  margin-top: 14px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.badge.accent,
.small.accent {
  background: linear-gradient(135deg, rgba(255,88,126,0.28), rgba(86,120,255,0.26));
}

.hero-right {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.stat {
  padding: 16px 12px;
  border-radius: 18px;
  background: rgba(255,255,255,0.08);
  text-align: center;
}

.stat-num {
  font-size: 22px;
  font-weight: 900;
}

.stat-lab {
  margin-top: 6px;
  font-size: 12px;
  opacity: 0.76;
  font-weight: 700;
}

.quick-strip {
  margin-top: 14px;
  border-radius: 22px;
  padding: 12px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.quick-status,
.stage-status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  border-radius: 999px;
  background: rgba(10, 15, 28, 0.36);
  font-size: 12px;
  font-weight: 700;
}

.quick-tools,
.stage-top-right,
.stage-actions,
.controls-grid,
.row-actions,
.chat-tools {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.signal-dot,
.dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
}

.signal-dot {
  background: #79839a;
}

.signal-dot.on {
  background: #1ce783;
  box-shadow: 0 0 12px #1ce783;
}

.dot {
  background: #ff4d6d;
  box-shadow: 0 0 12px #ff4d6d;
}

.live-layout {
  margin-top: 14px;
  display: grid;
  grid-template-columns: minmax(0, 1.18fr) minmax(340px, 0.82fr);
  gap: 14px;
}

.stage-panel,
.controls,
.host-panel,
.chat-shell {
  border-radius: 24px;
  padding: 14px;
}

.stage-shell {
  position: relative;
  overflow: hidden;
  border-radius: 24px;
  min-height: 64vh;
  background:
    radial-gradient(circle at 50% 10%, rgba(255,255,255,0.08), transparent 20%),
    linear-gradient(180deg, #111a2f 0%, #09111f 100%);
}

.main-video {
  width: 100%;
  min-height: 64vh;
  object-fit: cover;
  background: #050913;
}

.placeholder {
  min-height: 64vh;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 10px;
  padding: 24px;
  text-align: center;
  background:
    radial-gradient(circle at 50% 20%, rgba(255,255,255,0.09), transparent 24%),
    linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02));
}

.avatar-big,
.req-avatar,
.msg-avatar {
  display: grid;
  place-items: center;
  font-weight: 900;
}

.avatar-big {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff5d82, #6d5dfc);
  font-size: 38px;
}

.placeholder-title {
  font-size: 18px;
  font-weight: 900;
}

.placeholder-sub {
  max-width: 420px;
  opacity: 0.8;
  line-height: 1.5;
}

.placeholder-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
  margin-top: 8px;
}

.placeholder-btn,
.control-btn,
.approve,
.deny,
.clear-btn,
.composer button {
  border: 0;
  border-radius: 16px;
  min-height: 46px;
  padding: 12px 14px;
  color: #fff;
  font-weight: 800;
  cursor: pointer;
}

.placeholder-btn,
.control-btn {
  background: rgba(255,255,255,0.10);
}

.placeholder-btn.ghost,
.control-btn.ghost {
  background: rgba(255,255,255,0.07);
}

.control-btn.primary,
.approve,
.composer button {
  background: linear-gradient(135deg, #1ece7a, #18a561);
}

.control-btn.danger,
.mini-action.danger,
.deny {
  background: linear-gradient(135deg, #ff4d6d, #dc3858);
}

.stage-top,
.stage-bottom {
  position: absolute;
  left: 14px;
  right: 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  z-index: 4;
}

.stage-top { top: 14px; }
.stage-bottom { bottom: 14px; }

.live-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  border-radius: 999px;
  background: rgba(255, 66, 66, 0.22);
  color: #ffd6dd;
  font-size: 12px;
  font-weight: 900;
}

.mini-preview {
  margin-top: 12px;
  border-radius: 18px;
  padding: 14px;
  background: rgba(255,255,255,0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.mini-preview-title,
.panel-title,
.chat-title {
  font-weight: 900;
  font-size: 16px;
}

.mini-preview-sub,
.req-sub,
.msg-time,
.chat-empty {
  margin-top: 4px;
  opacity: 0.74;
  font-size: 13px;
}

.side-column {
  display: grid;
  gap: 14px;
  align-content: start;
}

.controls-grid {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.panel-empty {
  margin-top: 12px;
  opacity: 0.76;
}

.req-row,
.msg {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.req-row + .req-row {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(255,255,255,0.08);
}

.req-left {
  display: flex;
  gap: 12px;
  align-items: center;
}

.req-avatar,
.msg-avatar {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(255,88,126,0.75), rgba(86,120,255,0.75));
}

.req-name,
.msg-top strong {
  font-weight: 800;
}

.messages {
  margin-top: 12px;
  max-height: 42vh;
  overflow: auto;
  display: grid;
  gap: 10px;
  padding-right: 4px;
}

.msg {
  padding: 10px;
  border-radius: 16px;
  background: rgba(255,255,255,0.06);
}

.msg-body {
  flex: 1;
  min-width: 0;
}

.msg-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.msg-text {
  margin-top: 6px;
  line-height: 1.45;
  word-break: break-word;
}

.composer {
  margin-top: 12px;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
}

.composer input {
  width: 100%;
  border: 1px solid rgba(255,255,255,0.10);
  border-radius: 16px;
  background: rgba(255,255,255,0.08);
  color: #fff;
  min-height: 46px;
  padding: 0 14px;
  outline: none;
}

.composer input::placeholder {
  color: rgba(255,255,255,0.62);
}

@media (max-width: 1080px) {
  .hero,
  .live-layout {
    grid-template-columns: 1fr;
  }

  .stage-shell,
  .main-video,
  .placeholder {
    min-height: 52vh;
  }
}

@media (max-width: 720px) {
  .live-page {
    padding: 10px 10px 96px;
  }

  .topbar,
  .hero,
  .quick-strip,
  .stage-panel,
  .controls,
  .host-panel,
  .chat-shell {
    border-radius: 20px;
    padding: 12px;
  }

  .hero-title {
    font-size: 26px;
  }

  .hero-right {
    grid-template-columns: repeat(2, 1fr);
  }

  .controls-grid {
    grid-template-columns: 1fr 1fr;
  }

  .stage-top,
  .stage-bottom {
    left: 10px;
    right: 10px;
  }

  .stage-shell,
  .main-video,
  .placeholder {
    min-height: 46vh;
  }

  .composer {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 520px) {
  .hero-right,
  .controls-grid {
    grid-template-columns: 1fr;
  }

  .topbar {
    align-items: flex-start;
  }

  .top-right {
    justify-content: flex-start;
  }

  .mini-preview {
    align-items: flex-start;
    flex-direction: column;
  }

  .req-row,
  .msg-top {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>