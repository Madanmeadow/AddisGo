<template>
  <Layout>
    <div class="live-page">
      <div class="bg bg1"></div>
      <div class="bg bg2"></div>
      <div class="bg bg3"></div>

      <!-- TOPBAR -->
      <header class="topbar glassy">
        <div class="top-left">
          <button class="icon-btn" @click="leaveLive">←</button>

          <div class="meta">
            <div class="title">🔴 Pulse Live</div>
            <div class="sub">
              {{ modeLabel }} • {{ liveId }}
            </div>
          </div>
        </div>

        <div class="top-right">
          <span class="pill">
            👀 {{ viewerCount }} viewer{{ viewerCount === 1 ? "" : "s" }}
          </span>
          <span class="pill" :class="{ on: socketConnected }">
            {{ socketConnected ? "Realtime" : "Offline" }}
          </span>
        </div>
      </header>

      <!-- QUICK STATUS -->
      <section class="hero glassy">
        <div class="hero-left">
          <div class="hero-kicker">LIVE ROOM</div>
          <div class="hero-title">
            {{ isHost ? "You are live now" : "Watching live" }}
          </div>
          <div class="hero-sub">
            {{
              isHost
                ? "Go live, chat, approve mic requests, and manage your stream from one place."
                : "Watch the stream, chat, request mic, and join the energy in real time."
            }}
          </div>

          <div class="hero-pills">
            <span class="badge accent">{{ modeLabel }}</span>
            <span class="badge">{{ localStream ? "Media Ready" : "No Media" }}</span>
            <span class="badge">{{ remoteReadyLabel }}</span>
            <span class="badge">{{ canSpeak ? "Mic Approved" : "Listener" }}</span>
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

      <!-- MAIN STAGE -->
      <section class="stage-wrap">
        <div class="stage glassy">
          <!-- HOST VIDEO -->
          <video
            v-if="isHost && !showLocalPlaceholder"
            ref="localVideo"
            autoplay
            playsinline
            muted
            class="main-video"
          ></video>

          <!-- VIEWER VIDEO -->
          <video
            v-if="!isHost && !showRemotePlaceholder"
            ref="remoteVideo"
            autoplay
            playsinline
            class="main-video"
          ></video>

          <!-- PLACEHOLDER -->
          <div
            v-if="(isHost && showLocalPlaceholder) || (!isHost && showRemotePlaceholder)"
            class="placeholder"
          >
            <div class="avatar-big">
              {{ stageInitial }}
            </div>
            <div class="placeholder-title">
              {{ isHost ? "Your live stage" : "Live stage" }}
            </div>
            <div class="placeholder-sub">
              {{
                isHost
                  ? (cameraOff ? "Camera is off" : "Preparing your stream...")
                  : "Waiting for host video..."
              }}
            </div>
          </div>

          <!-- STAGE OVERLAY -->
          <div class="stage-top">
            <div class="live-badge">
              <span class="dot"></span>
              LIVE
            </div>

            <div class="stage-top-right">
              <span class="mini-chip">{{ isHost ? "Host" : "Viewer" }}</span>
              <span class="mini-chip">{{ qualityLabel }}</span>
            </div>
          </div>

          <div class="stage-bottom">
            <div class="stage-status">
              <span class="signal-dot" :class="{ on: socketConnected }"></span>
              <span>{{ statusText }}</span>
            </div>

            <div class="stage-actions">
              <button class="mini-action" @click="copyLiveId">Copy ID</button>
              <button class="mini-action" @click="shareLive">Share</button>
              <button class="mini-action" @click="toggleFocusChat">
                {{ focusChat ? "Hide Chat" : "Show Chat" }}
              </button>
            </div>
          </div>
        </div>

        <!-- LOCAL MINI PREVIEW FOR VIEWER MIC MODE -->
        <div v-if="!isHost && localStream && canSpeak" class="mini-preview glassy">
          <div class="mini-preview-title">Your mic is live</div>
          <div class="mini-preview-sub">
            {{ micMuted ? "Muted" : "Speaking enabled" }}
          </div>
        </div>
      </section>

      <!-- CONTROL STRIPS -->
      <section class="controls-wrap">
        <div class="controls glassy">
          <div class="controls-title">Live Controls</div>

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
              v-if="isHost"
              class="control-btn danger"
              @click="endLive"
            >
              End Live
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

            <button class="control-btn" @click="copyLiveId">
              Copy Live ID
            </button>

            <button class="control-btn" @click="shareLive">
              Invite
            </button>

            <button class="control-btn" @click="refreshPresence">
              Refresh
            </button>

            <button class="control-btn" @click="toggleTheater">
              {{ theaterMode ? "Normal View" : "Theater" }}
            </button>

            <button class="control-btn ghost" @click="goDashboard">
              Dashboard
            </button>

            <button class="control-btn ghost" @click="leaveLive">
              Leave
            </button>
          </div>
        </div>

        <!-- HOST MIC REQUEST PANEL -->
        <div v-if="isHost" class="host-panel glassy">
          <div class="panel-head">
            <div class="panel-title">🎙 Mic Requests</div>
            <span class="count-pill">{{ micRequests.length }}</span>
          </div>

          <div v-if="micRequests.length === 0" class="panel-empty">
            No mic requests yet.
          </div>

          <div
            v-for="req in micRequests"
            :key="req.fromUserId"
            class="req-row"
          >
            <div class="req-left">
              <div class="req-avatar">
                {{ getInitial(req.fromName || "U") }}
              </div>
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
        </div>
      </section>

      <!-- CHAT -->
      <section class="chat-shell glassy" :class="{ focusChat }">
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
            <div class="msg-avatar">
              {{ getInitial(msg.from?.username || msg.fromName || "A") }}
            </div>

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
    </div>
  </Layout>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, computed } from "vue"
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
const mode = String(route.query.mode || "viewer")
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

let pc = null
let localStream = null
let remoteStream = null
let hostSocketId = null
let pendingCandidates = []

const stageInitial = computed(() => {
  const name = isHost
    ? (me?.username || me?.name || "Y")
    : "L"
  return String(name).trim().charAt(0).toUpperCase() || "L"
})

const streamStateLabel = computed(() => {
  if (isHost && localStream) return "LIVE"
  if (!isHost && remoteStream) return "LIVE"
  return "WAIT"
})

const qualityLabel = computed(() => {
  if (!pc) return "Standby"
  const s = pc.connectionState
  if (s === "connected") return "Strong"
  if (s === "connecting") return "Linking"
  if (s === "disconnected") return "Weak"
  if (s === "failed") return "Recovering"
  return "Standby"
})

const showLocalPlaceholder = computed(() => {
  if (!localStream) return true
  const videoTrack = localStream.getVideoTracks?.()[0]
  if (!videoTrack) return true
  return !videoTrack.enabled || videoTrack.readyState !== "live"
})

const showRemotePlaceholder = computed(() => {
  if (!remoteStream) return true
  const videoTrack = remoteStream.getVideoTracks?.()[0]
  return !videoTrack || videoTrack.readyState !== "live"
})

const remoteReadyLabel = computed(() => {
  if (isHost) {
    return localStream ? "Host Media Ready" : "Host Media Pending"
  }
  return remoteStream ? "Stream Ready" : "Waiting for Host"
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
    if (chatListEl.value) {
      chatListEl.value.scrollTop = chatListEl.value.scrollHeight
    }
  })
}

async function getIceServers() {
  try {
    const base =
      import.meta.env.VITE_API_URL ||
      "http://localhost:5000"

    const res = await fetch(`${base}/api/turn`)
    const data = await res.json()

    return data?.iceServers?.length
      ? data.iceServers
      : [{ urls: "stun:stun.l.google.com:19302" }]
  } catch {
    return [{ urls: "stun:stun.l.google.com:19302" }]
  }
}

async function ensurePeer() {
  if (pc) return pc

  pc = new RTCPeerConnection({
    iceServers: await getIceServers(),
  })

  remoteStream = new MediaStream()

  if (remoteVideo.value) {
    remoteVideo.value.srcObject = remoteStream
  }

  pc.ontrack = (event) => {
    event.streams[0].getTracks().forEach((track) => {
      const exists = remoteStream.getTracks().some((t) => t.id === track.id)
      if (!exists) remoteStream.addTrack(track)
    })

    if (remoteVideo.value) {
      remoteVideo.value.srcObject = remoteStream
      remoteVideo.value.play?.().catch(() => {})
    }

    statusText.value = "Connected to live"
  }

  pc.onicecandidate = (event) => {
    if (!event.candidate || !hostSocketId) return

    socket.emit("webrtc:ice", {
      liveId,
      to: hostSocketId,
      candidate: event.candidate,
    })
  }

  pc.onconnectionstatechange = () => {
    const s = pc?.connectionState || ""
    if (s === "connected") statusText.value = "Connected to live"
    else if (s === "connecting") statusText.value = "Connecting..."
    else if (s === "disconnected") statusText.value = "Reconnecting..."
    else if (s === "failed") statusText.value = "Connection weak"
  }

  return pc
}

async function flushPendingCandidates() {
  if (!pc || !pc.remoteDescription) return

  while (pendingCandidates.length) {
    const c = pendingCandidates.shift()
    try {
      await pc.addIceCandidate(new RTCIceCandidate(c))
    } catch {}
  }
}

async function createHostStream() {
  localStream = await navigator.mediaDevices.getUserMedia({
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

  if (localVideo.value) {
    localVideo.value.srcObject = localStream
    localVideo.value.play?.().catch(() => {})
  }
}

async function connectViewerToHost() {
  if (!hostSocketId) return

  const peer = await ensurePeer()

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

  localStream = stream

  stream.getTracks().forEach((track) => {
    const exists = peer.getSenders().some((s) => s.track && s.track.kind === track.kind)
    if (!exists) peer.addTrack(track, stream)
  })

  const offer = await peer.createOffer({
    offerToReceiveAudio: true,
    offerToReceiveVideo: true,
  })

  await peer.setLocalDescription(offer)

  socket.emit("webrtc:offer", {
    liveId,
    to: hostSocketId,
    offer,
  })

  statusText.value = canSpeak.value ? "Joining with mic..." : "Joining live..."
}

function sendChat() {
  const value = chatText.value.trim()
  if (!value) return

  socket.emit("live:chat", {
    liveId,
    message: value,
  })

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
  socket.emit("live:mic:approve", {
    liveId,
    userId: req.fromUserId,
  })

  micRequests.value = micRequests.value.filter(
    (x) => String(x.fromUserId) !== String(req.fromUserId)
  )
}

function denyMic(req) {
  socket.emit("live:mic:deny", {
    liveId,
    userId: req.fromUserId,
    reason: "Host denied request",
  })

  micRequests.value = micRequests.value.filter(
    (x) => String(x.fromUserId) !== String(req.fromUserId)
  )
}

async function toggleMute() {
  if (!localStream) return
  micMuted.value = !micMuted.value
  localStream.getAudioTracks().forEach((t) => {
    t.enabled = !micMuted.value
  })
}

async function toggleCamera() {
  if (!localStream) return
  cameraOff.value = !cameraOff.value
  localStream.getVideoTracks().forEach((t) => {
    t.enabled = !cameraOff.value
  })
}

async function switchCamera() {
  if (!isHost || !localStream || switchingCamera.value) return

  switchingCamera.value = true
  try {
    currentFacingMode.value =
      currentFacingMode.value === "user" ? "environment" : "user"

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

    const oldTrack = localStream.getVideoTracks()[0]
    if (oldTrack) {
      try { oldTrack.stop() } catch {}
    }

    const audioTracks = localStream.getAudioTracks()
    localStream = new MediaStream([...audioTracks, newTrack])

    if (localVideo.value) {
      localVideo.value.srcObject = localStream
      localVideo.value.play?.().catch(() => {})
    }

    if (pc) {
      const sender = pc.getSenders().find((s) => s.track && s.track.kind === "video")
      if (sender) {
        await sender.replaceTrack(newTrack)
      }
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
  } else {
    socket.emit("live:join", { liveId })
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
    setTimeout(() => {
      if (statusText.value === "Live ID copied") {
        statusText.value = isHost ? "You are live" : "Watching live"
      }
    }, 1600)
  } catch {
    alert(liveId)
  }
}

async function shareLive() {
  const url = `${window.location.origin}/live?mode=viewer&liveId=${encodeURIComponent(liveId)}`
  const text = `Join my Pulse live: ${url}`

  try {
    if (navigator.share) {
      await navigator.share({
        title: "Join my Pulse live",
        text,
        url,
      })
      return
    }

    await navigator.clipboard.writeText(url)
    statusText.value = "Invite link copied"
    setTimeout(() => {
      if (statusText.value === "Invite link copied") {
        statusText.value = isHost ? "You are live" : "Watching live"
      }
    }, 1600)
  } catch {}
}

function goDashboard() {
  router.push("/dashboard")
}

function leaveLive() {
  socket.emit("live:leave", { liveId })
  cleanup()
  document.body.style.overflow = ""
  router.back()
}

function endLive() {
  socket.emit("live:end", { liveId })
  cleanup()
  document.body.style.overflow = ""
  router.back()
}

function cleanup() {
  if (localStream) {
    localStream.getTracks().forEach((t) => {
      try { t.stop() } catch {}
    })
    localStream = null
  }

  if (remoteStream) {
    remoteStream.getTracks().forEach((t) => {
      try { t.stop() } catch {}
    })
    remoteStream = null
  }

  if (pc) {
    try { pc.close() } catch {}
    pc = null
  }

  pendingCandidates = []

  if (localVideo.value) localVideo.value.srcObject = null
  if (remoteVideo.value) remoteVideo.value.srcObject = null
}

async function onLiveHost(payload) {
  hostSocketId = payload?.hostSocketId || null

  if (!isHost && hostSocketId) {
    await connectViewerToHost()
  }
}

function onLivePresence(payload) {
  viewerCount.value = Number(payload?.viewerCount || 0)
}

function onLiveChat(payload) {
  chat.value.push({
    ...payload,
    createdAt: payload?.createdAt || payload?.created_at || new Date().toISOString(),
  })
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
    cleanup()
    await connectViewerToHost()
  }
}

async function onOffer({ offer, from }) {
  if (!isHost) return

  hostSocketId = from
  const peer = await ensurePeer()

  if (!localStream) {
    await createHostStream()
  }

  localStream.getTracks().forEach((track) => {
    const already = peer.getSenders().some((s) => s.track === track)
    if (!already) peer.addTrack(track, localStream)
  })

  await peer.setRemoteDescription(new RTCSessionDescription(offer))
  await flushPendingCandidates()

  const answer = await peer.createAnswer()
  await peer.setLocalDescription(answer)

  socket.emit("webrtc:answer", {
    liveId,
    to: from,
    answer,
  })
}

async function onAnswer({ answer }) {
  if (!pc) return
  await pc.setRemoteDescription(new RTCSessionDescription(answer))
  await flushPendingCandidates()
}

async function onIce({ candidate }) {
  if (!pc || !candidate) return

  if (pc.remoteDescription) {
    await pc.addIceCandidate(new RTCIceCandidate(candidate))
  } else {
    pendingCandidates.push(candidate)
  }
}

function onLiveEnded() {
  cleanup()
  document.body.style.overflow = ""
  router.back()
}

function onSocketConnect() {
  socketConnected.value = true
}

function onSocketDisconnect() {
  socketConnected.value = false
}

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
  }
})

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
  color: white;
  padding: 14px 14px 110px;
  background:
    radial-gradient(circle at top left, rgba(255, 72, 72, 0.16), transparent 24%),
    radial-gradient(circle at top right, rgba(0, 210, 255, 0.14), transparent 22%),
    linear-gradient(180deg, #07111f 0%, #08111b 45%, #040914 100%);
  overflow-x: hidden;
}

.bg {
  position: fixed;
  inset: 0;
  pointer-events: none;
  filter: blur(14px);
}
.bg1 {
  background: radial-gradient(circle at 20% 20%, rgba(255, 0, 98, 0.08), transparent 20%);
}
.bg2 {
  background: radial-gradient(circle at 80% 25%, rgba(0, 180, 255, 0.10), transparent 20%);
}
.bg3 {
  background: radial-gradient(circle at 50% 78%, rgba(255, 255, 255, 0.04), transparent 22%);
}

.glassy {
  background: rgba(255,255,255,0.07);
  border: 1px solid rgba(255,255,255,0.08);
  backdrop-filter: blur(18px);
  box-shadow: 0 18px 50px rgba(0,0,0,0.24);
}

.topbar,
.hero,
.stage-wrap,
.controls-wrap,
.chat-shell {
  position: relative;
  z-index: 2;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px;
  border-radius: 22px;
}

.top-left,
.top-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.icon-btn {
  border: 0;
  width: 42px;
  height: 42px;
  border-radius: 14px;
  background: rgba(255,255,255,0.10);
  color: #fff;
  font-size: 18px;
  cursor: pointer;
}

.title {
  font-weight: 900;
  font-size: 18px;
}

.sub {
  opacity: 0.75;
  font-size: 13px;
  margin-top: 2px;
}

.pill {
  padding: 9px 12px;
  border-radius: 999px;
  background: rgba(255,255,255,0.08);
  font-size: 12px;
  font-weight: 800;
}

.pill.on {
  background: rgba(28,231,131,0.16);
  color: #a6f4c7;
}

.hero {
  margin-top: 14px;
  padding: 18px;
  border-radius: 24px;
  display: grid;
  grid-template-columns: 1.15fr 0.85fr;
  gap: 18px;
}

.hero-kicker {
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.16em;
  opacity: 0.72;
}

.hero-title {
  font-size: clamp(28px, 4vw, 42px);
  font-weight: 900;
  line-height: 1.02;
  margin-top: 8px;
}

.hero-sub {
  margin-top: 10px;
  opacity: 0.82;
  line-height: 1.5;
}

.hero-pills {
  margin-top: 14px;
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

.badge.accent {
  background: linear-gradient(135deg, rgba(255,72,72,0.22), rgba(124,58,237,0.22));
}

.hero-right {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.stat {
  padding: 16px 12px;
  border-radius: 18px;
  background: rgba(255,255,255,0.06);
  text-align: center;
}

.stat-num {
  font-size: 22px;
  font-weight: 900;
}

.stat-lab {
  margin-top: 6px;
  font-size: 12px;
  opacity: 0.74;
  font-weight: 700;
}

.stage-wrap {
  margin-top: 14px;
}

.stage {
  position: relative;
  overflow: hidden;
  border-radius: 26px;
  min-height: 58vh;
  background: #000;
}

.main-video {
  width: 100%;
  min-height: 58vh;
  object-fit: cover;
  background: #03060e;
}

.placeholder {
  min-height: 58vh;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 10px;
  background:
    radial-gradient(circle at 50% 20%, rgba(255,255,255,0.08), transparent 24%),
    linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.02));
}

.avatar-big {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #ff4d6d, #6d5dfc);
  font-size: 38px;
  font-weight: 900;
}

.placeholder-title {
  font-size: 18px;
  font-weight: 900;
}

.placeholder-sub {
  opacity: 0.72;
  font-size: 13px;
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

.stage-top {
  top: 14px;
}

.stage-bottom {
  bottom: 14px;
  flex-wrap: wrap;
}

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
  box-shadow: 0 0 20px rgba(255, 66, 66, 0.14);
}

.dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #ff4d6d;
  box-shadow: 0 0 12px #ff4d6d;
}

.stage-top-right,
.stage-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.mini-chip,
.mini-action {
  padding: 8px 11px;
  border-radius: 999px;
  background: rgba(0,0,0,0.34);
  color: #fff;
  font-size: 11px;
  font-weight: 800;
  border: 0;
}

.stage-status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  border-radius: 999px;
  background: rgba(0,0,0,0.34);
  font-size: 12px;
  font-weight: 700;
}

.signal-dot {
  width: 9px;
  height: 9px;
  border-radius: 999px;
  background: #6b7280;
}
.signal-dot.on {
  background: #1ce783;
  box-shadow: 0 0 12px #1ce783;
}

.mini-preview {
  margin-top: 10px;
  border-radius: 18px;
  padding: 12px 14px;
}

.mini-preview-title {
  font-weight: 900;
}

.mini-preview-sub {
  margin-top: 4px;
  opacity: 0.74;
  font-size: 13px;
}

.controls-wrap {
  margin-top: 14px;
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 14px;
}

.controls,
.host-panel,
.chat-shell {
  border-radius: 22px;
  padding: 14px;
}

.controls-title,
.panel-title,
.chat-title {
  font-weight: 900;
  font-size: 16px;
}

.controls-grid {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.control-btn {
  border: 0;
  border-radius: 16px;
  min-height: 48px;
  padding: 12px 14px;
  background: rgba(255,255,255,0.08);
  color: #fff;
  font-weight: 800;
  cursor: pointer;
}

.control-btn.primary {
  background: linear-gradient(135deg, #22c55e, #16a34a);
}

.control-btn.danger {
  background: linear-gradient(135deg, #ff4d6d, #dc2626);
}

.control-btn.ghost {
  background: rgba(255,255,255,0.05);
}

.control-btn:disabled {
  opacity: 0.55;
  cursor: default;
}

.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.count-pill,
.chat-pill {
  padding: 8px 10px;
  border-radius: 999px;
  background: rgba(255,255,255,0.08);
  font-size: 12px;
  font-weight: 800;
}

.panel-empty,
.chat-empty {
  margin-top: 12px;
  padding: 14px;
  border-radius: 16px;
  background: rgba(255,255,255,0.05);
  opacity: 0.78;
}

.req-row {
  margin-top: 10px;
  padding: 12px;
  border-radius: 16px;
  background: rgba(255,255,255,0.05);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.req-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.req-avatar {
  width: 40px;
  height: 40px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #0ea5e9, #7c3aed);
  font-weight: 900;
}

.req-name {
  font-weight: 800;
}

.req-sub {
  font-size: 12px;
  opacity: 0.72;
  margin-top: 2px;
}

.row-actions {
  display: flex;
  gap: 8px;
}

.approve,
.deny,
.clear-btn {
  border: 0;
  border-radius: 12px;
  padding: 10px 12px;
  font-weight: 800;
  color: #fff;
}

.approve {
  background: #16a34a;
}

.deny {
  background: #dc2626;
}

.chat-head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.chat-tools {
  display: flex;
  gap: 8px;
  align-items: center;
}

.clear-btn {
  background: rgba(255,255,255,0.08);
}

.messages {
  margin-top: 12px;
  max-height: 280px;
  overflow: auto;
  padding-right: 4px;
}

.msg {
  display: flex;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}

.msg-avatar {
  width: 34px;
  height: 34px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: rgba(255,255,255,0.08);
  font-weight: 900;
  flex: 0 0 auto;
}

.msg-body {
  min-width: 0;
  flex: 1;
}

.msg-top {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.msg-time {
  font-size: 11px;
  opacity: 0.6;
}

.msg-text {
  margin-top: 4px;
  line-height: 1.45;
  word-break: break-word;
}

.composer {
  display: flex;
  gap: 10px;
  margin-top: 12px;
}

.composer input {
  flex: 1;
  border: 0;
  border-radius: 16px;
  padding: 14px 14px;
  outline: none;
}

.composer button {
  border: 0;
  border-radius: 16px;
  padding: 0 18px;
  background: #22c55e;
  color: #fff;
  font-weight: 800;
}

.chat-shell.focusChat .messages {
  max-height: 52vh;
}

@media (max-width: 980px) {
  .hero,
  .controls-wrap {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .live-page {
    padding: 12px 12px 106px;
  }

  .topbar,
  .hero,
  .controls,
  .host-panel,
  .chat-shell {
    border-radius: 18px;
  }

  .hero-title {
    font-size: 28px;
  }

  .hero-right {
    grid-template-columns: repeat(2, 1fr);
  }

  .controls-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .stage,
  .main-video,
  .placeholder {
    min-height: 42vh;
  }

  .req-row {
    align-items: flex-start;
    flex-direction: column;
  }

  .row-actions {
    width: 100%;
  }

  .approve,
  .deny {
    flex: 1;
  }
}

@media (max-width: 520px) {
  .topbar {
    flex-direction: column;
    align-items: stretch;
  }

  .top-left,
  .top-right {
    justify-content: space-between;
  }

  .controls-grid {
    grid-template-columns: 1fr;
  }

  .hero-right {
    grid-template-columns: 1fr 1fr;
  }

  .stage-top,
  .stage-bottom {
    left: 10px;
    right: 10px;
  }
}
</style>