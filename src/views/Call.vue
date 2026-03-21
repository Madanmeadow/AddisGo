<!-- src/views/Call.vue -->
<template>
  <Layout>
    <div
      class="call-page"
      :class="{
        audioMode: isAudioOnly,
        connected: inCall,
        reconnecting: isRecoveringState,
      }"
    >
      <div class="bg bg1"></div>
      <div class="bg bg2"></div>
      <div class="bg bg3"></div>

      <transition name="fadeUp">
        <div v-if="incomingCall && !inCall" class="incoming-overlay">
          <div class="incoming-card glassy">
            <div class="incoming-top">
              <div class="incoming-live-dot"></div>
              <div class="incoming-small">PULSE CALL</div>
            </div>

            <div class="incoming-avatar">{{ callerInitial }}</div>

            <div class="incoming-text">
              <h2>{{ incomingCall.fromName || "Incoming Call" }}</h2>
              <p>{{ incomingCall.kind === "audio" ? "Audio call" : "Video call" }}</p>
            </div>

            <div class="incoming-meta">
              <span class="meta-pill">{{ incomingCall.kind === "audio" ? "Audio" : "Video" }}</span>
              <span class="meta-pill">{{ turnReady ? "TURN Ready" : "STUN Only" }}</span>
            </div>

            <div class="incoming-actions">
              <button class="btn reject" @click="rejectIncoming">Decline</button>
              <button class="btn accept" @click="acceptIncoming">Answer</button>
            </div>
          </div>
        </div>
      </transition>

      <header class="topbar glassy">
        <button class="icon-btn" @click="goBack" aria-label="Back">←</button>

        <div class="title-wrap">
          <div class="call-title">{{ callModeLabel }}</div>
          <div class="call-subtitle">
            {{ callPartnerName }}
            <span v-if="inCall && callSeconds > 0"> • {{ formattedDuration }}</span>
          </div>
        </div>

        <div class="topbar-actions">
          <span class="status-pill" :class="statusPillClass">{{ connectionLabel }}</span>
        </div>
      </header>

      <section class="dynamic-strip glassy">
        <div class="dynamic-left">
          <div class="signal-wrap">
            <span class="signal-dot" :class="{ on: socketConnected }"></span>
            <span class="dynamic-text">{{ socketConnected ? "Realtime Connected" : "Realtime Offline" }}</span>
          </div>
        </div>

        <div class="dynamic-center">
          <button class="dyn-btn" @click="recoverMedia" :disabled="recoveringMedia">
            {{ recoveringMedia ? "Recovering…" : "Recover" }}
          </button>

          <button class="dyn-btn" @click="toggleSpeaker">
            {{ speakerEnabled ? "Speaker On" : "Speaker Low" }}
          </button>

          <button class="dyn-btn" @click="toggleLowDataMode">
            {{ lowDataMode ? "Low Data On" : "Balanced HD" }}
          </button>

          <button class="dyn-btn" @click="copyCallDiagnostics">Copy Debug</button>
        </div>

        <div class="dynamic-right">
          <span class="mini-pill">{{ isAudioOnly ? "Audio" : "Video" }}</span>
          <span class="mini-pill">{{ qualityLabel }}</span>
          <span class="mini-pill">{{ lowDataMode ? "Low Data" : "Balanced HD" }}</span>
          <span class="mini-pill">{{ remoteTrackSummary }}</span>
        </div>
      </section>

      <section class="call-hero glassy">
        <div class="hero-left">
          <div class="hero-kicker">PULSE DIRECT CALL</div>
          <h1 class="hero-title">{{ callPartnerName }}</h1>
          <div class="hero-sub">
            {{
              isAudioOnly
                ? "Crystal audio call with recovery, smart reconnect, and low-data fallback."
                : "Video call with stronger peer recovery, camera switching, low-data protection, and faster connect."
            }}
          </div>

          <div class="hero-badges">
            <span class="hero-badge" :class="{ ok: socketConnected, bad: !socketConnected }">
              {{ socketConnected ? "Socket OK" : "Socket Lost" }}
            </span>
            <span class="hero-badge" :class="{ ok: !!localStream, bad: !localStream }">
              {{ localStream ? "Local Media" : "No Media" }}
            </span>
            <span class="hero-badge" :class="{ ok: !!remoteStream, bad: !remoteStream && inCall }">
              {{ remoteStream ? "Remote Media" : "Waiting Remote" }}
            </span>
            <span class="hero-badge">{{ turnReady ? "TURN Ready" : "STUN Only" }}</span>
            <span class="hero-badge accent">⏱ {{ formattedDuration }}</span>
          </div>
        </div>

        <div class="hero-right">
          <div class="hero-stat">
            <div class="hero-stat-num">{{ inCall ? "LIVE" : "IDLE" }}</div>
            <div class="hero-stat-lab">Call State</div>
          </div>
          <div class="hero-stat">
            <div class="hero-stat-num">{{ micMuted ? "OFF" : "ON" }}</div>
            <div class="hero-stat-lab">Mic</div>
          </div>
          <div class="hero-stat">
            <div class="hero-stat-num">{{ isAudioOnly ? "AUDIO" : (cameraOff ? "OFF" : "ON") }}</div>
            <div class="hero-stat-lab">Camera</div>
          </div>
          <div class="hero-stat">
            <div class="hero-stat-num">{{ speakerEnabled ? "ON" : "LOW" }}</div>
            <div class="hero-stat-lab">Speaker</div>
          </div>
          <div class="hero-stat">
            <div class="hero-stat-num">{{ lowDataMode ? "ON" : "OFF" }}</div>
            <div class="hero-stat-lab">Low Data</div>
          </div>
        </div>
      </section>

      <main class="call-stage" :class="{ audioOnly: isAudioOnly, focusedRemote: focusRemote }">
        <section
          class="video-card remote-card"
          :class="{ activeCard: focusRemote, reconnecting: isRecoveringState }"
          @click="focusRemote = true"
        >
          <div class="video-topbar">
            <div class="video-label">Remote</div>
            <div class="video-chip-row">
              <span class="video-chip">{{ remoteTrackSummary }}</span>
              <span class="video-chip" :class="{ badchip: remoteVideoOff }">
                {{ remoteVideoOff ? "Video Off" : "Video On" }}
              </span>
            </div>
          </div>

          <video
            v-show="!isAudioOnly && !showRemotePlaceholder"
            ref="remoteVideo"
            class="video-el"
            playsinline
            autoplay
          ></video>

          <div v-if="showRemotePlaceholder" class="video-placeholder">
            <div class="avatar-big remote">{{ remoteInitial }}</div>
            <div class="placeholder-name">{{ callPartnerName }}</div>
            <div class="placeholder-sub">
              {{ remoteVideoOff ? "Camera off" : remoteAudioOnly ? "Audio only" : "Waiting for video..." }}
            </div>
          </div>

          <div class="video-bottom-state">
            <span class="state-dot" :class="{ on: !!remoteStream }"></span>
            <span>{{ peerStateLabel }}</span>
          </div>
        </section>

        <section
          class="video-card local-card"
          :class="{ activeCard: !focusRemote }"
          @click="focusRemote = false"
        >
          <div class="video-topbar">
            <div class="video-label">You</div>
            <div class="video-chip-row">
              <span class="video-chip">{{ micMuted ? "Muted" : "Mic Live" }}</span>
              <span class="video-chip" v-if="!isAudioOnly">
                {{ cameraOff ? "Cam Off" : "Cam On" }}
              </span>
            </div>
          </div>

          <video
            v-show="!isAudioOnly && !showLocalPlaceholder"
            ref="localVideo"
            class="video-el local-self"
            playsinline
            autoplay
            muted
          ></video>

          <div v-if="showLocalPlaceholder" class="video-placeholder">
            <div class="avatar-big">{{ myInitial }}</div>
            <div class="placeholder-name">You</div>
            <div class="placeholder-sub">
              {{ cameraOff ? "Camera off" : isAudioOnly ? "Audio only" : "Preparing camera..." }}
            </div>
          </div>

          <div class="video-bottom-state">
            <span class="state-dot" :class="{ on: !!localStream }"></span>
            <span>{{ localMediaLabel }}</span>
          </div>
        </section>
      </main>

      <section class="tools-strip glassy">
        <div class="tools-col">
          <div class="tools-title">Connection</div>
          <div class="tools-pills">
            <span class="tool-pill">{{ connectionLabel }}</span>
            <span class="tool-pill">{{ qualityLabel }}</span>
            <span class="tool-pill">{{ pcConnectionStateLabel }}</span>
            <span class="tool-pill">{{ turnReady ? "TURN" : "STUN" }}</span>
          </div>
        </div>

        <div class="tools-col">
          <div class="tools-title">Media</div>
          <div class="tools-pills">
            <span class="tool-pill">{{ localMediaLabel }}</span>
            <span class="tool-pill">{{ remoteTrackSummary }}</span>
            <span class="tool-pill">{{ currentFacingMode }}</span>
            <span class="tool-pill">{{ lowDataMode ? "Low Data" : "Balanced HD" }}</span>
          </div>
        </div>
      </section>

      <footer class="controls glassy">
        <button class="control-btn" :class="{ off: micMuted }" @click="toggleMic" :disabled="!localStream">
          {{ micMuted ? "Mic Off" : "Mic" }}
        </button>

        <button
          v-if="!isAudioOnly"
          class="control-btn"
          :class="{ off: cameraOff }"
          @click="toggleCamera"
          :disabled="!localStream"
        >
          {{ cameraOff ? "Camera Off" : "Camera" }}
        </button>

        <button
          v-if="!isAudioOnly"
          class="control-btn"
          @click="switchCamera"
          :disabled="!localStream || switchingCamera"
        >
          {{ switchingCamera ? "Switching…" : "Switch" }}
        </button>

        <button class="control-btn" :class="{ off: !speakerEnabled }" @click="toggleSpeaker">
          {{ speakerEnabled ? "Speaker" : "Low" }}
        </button>

        <button class="control-btn" :class="{ off: lowDataMode }" @click="toggleLowDataMode">
          {{ lowDataMode ? "Low Data" : "HD" }}
        </button>

        <button class="control-btn" @click="recoverMedia" :disabled="recoveringMedia">
          {{ recoveringMedia ? "Recovering…" : "Recover" }}
        </button>

        <button class="control-btn" @click="minimizeCurrentCall" :disabled="!inCall">Minimize</button>
        <button class="control-btn danger" @click="endCall">End</button>
      </footer>
    </div>
  </Layout>
</template>

<script setup>
defineOptions({ name: "Call" })

import { ref, computed, onMounted, onBeforeUnmount, nextTick } from "vue"
import { useRoute, useRouter } from "vue-router"
import { io } from "socket.io-client"
import Layout from "../components/Layout.vue"
import { useCallOverlay } from "../composables/useCallOverlay"

const route = useRoute()
const router = useRouter()

const API_BASE =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_SERVER_URL ||
  "http://localhost:5000"

const token = localStorage.getItem("token") || ""

const me = (() => {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}")
  } catch {
    return {}
  }
})()

const roomId = ref(String(route.query.roomId || ""))
const kind = ref(String(route.query.kind || "video"))
const mode = ref(String(route.query.mode || route.query.role || "caller"))
const toUserId = ref(String(route.query.toUserId || ""))
const initialPartnerName = ref(String(route.query.name || "User"))

const socket = ref(null)
const pc = ref(null)
const turnReady = ref(false)

const localVideo = ref(null)
const remoteVideo = ref(null)
const localStream = ref(null)
const remoteStream = ref(null)

const incomingCall = ref(null)
const inCall = ref(false)

const micMuted = ref(false)
const cameraOff = ref(kind.value === "audio")
const switchingCamera = ref(false)
const recoveringMedia = ref(false)
const currentFacingMode = ref("user")
const speakerEnabled = ref(true)
const lowDataMode = ref(false)
const focusRemote = ref(true)

const hasRemoteDescription = ref(false)
const socketConnected = ref(false)
const hasJoinedRoom = ref(false)
const reconnectAttempted = ref(false)
const makingOffer = ref(false)
const ignoreOffer = ref(false)
const polite = ref(false)

const statusText = ref("Ready")
const hostUserId = ref("")
const negotiationOwnerUserId = ref("")
const isCaller = ref(mode.value === "caller")

const callStartedAt = ref(null)
const callSeconds = ref(0)
let callTimer = null
let statsTimer = null

const pendingCandidates = []

const remoteAudioOnly = ref(false)
const remoteVideoOff = ref(false)

const {
  syncCallOverlay,
  minimizeCall,
  resetOverlay,
} = useCallOverlay()

const isAudioOnly = computed(() => kind.value === "audio")
const callPartnerName = computed(() => incomingCall.value?.fromName || initialPartnerName.value || "User")
const callModeLabel = computed(() =>
  incomingCall.value && !inCall.value
    ? "Incoming Call"
    : isAudioOnly.value
      ? "Audio Call"
      : "Video Call"
)
const connectionLabel = computed(() => statusText.value || "Ready")

const formattedDuration = computed(() => {
  const total = callSeconds.value
  const m = String(Math.floor(total / 60)).padStart(2, "0")
  const s = String(total % 60).padStart(2, "0")
  return `${m}:${s}`
})

const showRemotePlaceholder = computed(() => {
  if (isAudioOnly.value) return true
  const track = remoteStream.value?.getVideoTracks?.()[0]
  return !track || track.readyState !== "live" || !track.enabled
})

const showLocalPlaceholder = computed(() => {
  if (!localStream.value) return true
  if (isAudioOnly.value) return true
  return !localStream.value.getVideoTracks().some((track) => track.enabled && track.readyState === "live")
})

const myInitial = computed(() => String(me?.display_name || me?.username || "Y").trim().charAt(0).toUpperCase() || "Y")
const remoteInitial = computed(() => String(callPartnerName.value || "U").trim().charAt(0).toUpperCase() || "U")
const callerInitial = computed(() => String(incomingCall.value?.fromName || "C").trim().charAt(0).toUpperCase() || "C")

const statusPillClass = computed(() => ({
  live: inCall.value && !isRecoveringState.value,
  warn: isRecoveringState.value,
  bad: !socketConnected.value,
}))

const isRecoveringState = computed(() =>
  ["Recovering...", "Recovering media...", "Reconnecting...", "Connecting..."].includes(statusText.value)
)

const remoteTrackSummary = computed(() => {
  if (!remoteStream.value) return "No remote stream"
  const hasAudio = !!remoteStream.value.getAudioTracks?.().length
  const hasVideo = !!remoteStream.value.getVideoTracks?.().length
  if (hasAudio && hasVideo) return "Audio + Video"
  if (hasAudio) return "Audio only"
  if (hasVideo) return "Video only"
  return "No tracks"
})

const localMediaLabel = computed(() => {
  if (!localStream.value) return "No local media"
  if (isAudioOnly.value) return "Audio ready"
  if (cameraOff.value) return "Camera paused"
  return "Camera ready"
})

const peerStateLabel = computed(() => pc.value?.connectionState || pc.value?.iceConnectionState || "Waiting")
const pcConnectionStateLabel = computed(() => pc.value?.connectionState || "No peer")

const qualityLabel = computed(() => {
  if (!pc.value) return "Idle"
  const state = pc.value.connectionState
  if (state === "connected") return lowDataMode.value ? "Stable" : "Strong"
  if (state === "connecting") return "Linking"
  if (state === "disconnected") return "Weak"
  if (state === "failed") return "Repairing"
  return "Standby"
})

function authHeaders(json = false) {
  const h = {}
  if (json) h["Content-Type"] = "application/json"
  if (token) h["Authorization"] = `Bearer ${token}`
  return h
}

function getMyUserId() {
  return String(me?.id || "")
}

function safePlay(videoEl) {
  videoEl?.play?.().catch(() => {})
}

function setStatusBrief(text) {
  statusText.value = text
  window.clearTimeout(setStatusBrief._t)
  setStatusBrief._t = window.setTimeout(() => {
    if (!inCall.value) return
    statusText.value = pc.value?.connectionState === "connected" ? "Connected" : statusText.value
  }, 1800)
}

function markCallStarted() {
  if (callStartedAt.value) return
  callStartedAt.value = Date.now()
  inCall.value = true
  if (callTimer) window.clearInterval(callTimer)
  callTimer = window.setInterval(() => {
    if (!callStartedAt.value) return
    callSeconds.value = Math.floor((Date.now() - callStartedAt.value) / 1000)
  }, 1000)
}

function stopCallTimer() {
  if (callTimer) {
    window.clearInterval(callTimer)
    callTimer = null
  }
  callStartedAt.value = null
  callSeconds.value = 0
}

function stopStatsMonitor() {
  if (statsTimer) {
    window.clearInterval(statsTimer)
    statsTimer = null
  }
}

function stopStream(stream) {
  try {
    stream?.getTracks?.().forEach((t) => t.stop())
  } catch {}
}

function cleanupPeerConnection() {
  try {
    pc.value?.close?.()
  } catch {}
  pc.value = null
  hasRemoteDescription.value = false
  makingOffer.value = false
  ignoreOffer.value = false
}

function cleanupAll() {
  stopCallTimer()
  stopStatsMonitor()
  cleanupPeerConnection()
  stopStream(localStream.value)
  localStream.value = null
  remoteStream.value = null
  if (localVideo.value) localVideo.value.srcObject = null
  if (remoteVideo.value) remoteVideo.value.srcObject = null
  incomingCall.value = null
  inCall.value = false
  hasJoinedRoom.value = false
  reconnectAttempted.value = false
  statusText.value = "Ready"
  hostUserId.value = ""
  negotiationOwnerUserId.value = ""
  polite.value = false
  pendingCandidates.splice(0, pendingCandidates.length)
}

async function getIceServers() {
  try {
    const res = await fetch(`${API_BASE}/api/turn`, {
      headers: authHeaders(false),
    })
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data?.iceServers) && data.iceServers.length) {
        const allUrls = data.iceServers.flatMap((s) =>
          Array.isArray(s?.urls) ? s.urls : [s?.urls]
        )
        turnReady.value = allUrls.some((u) => String(u || "").includes("turn:"))
        return data.iceServers
      }
    }
  } catch {}
  turnReady.value = false
  return [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ]
}

function getAudioConstraints() {
  return {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    channelCount: 1,
    latency: 0,
  }
}

function getVideoConstraints() {
  if (isAudioOnly.value) return false
  return {
    facingMode: currentFacingMode.value,
    width: lowDataMode.value ? { ideal: 640, max: 960 } : { ideal: 960, max: 1280 },
    height: lowDataMode.value ? { ideal: 360, max: 540 } : { ideal: 540, max: 720 },
    frameRate: lowDataMode.value ? { ideal: 12, max: 18 } : { ideal: 20, max: 24 },
  }
}

async function applySenderParameters() {
  if (!pc.value) return
  for (const sender of pc.value.getSenders()) {
    if (!sender?.track) continue
    try {
      const params = sender.getParameters() || {}
      if (!params.encodings) params.encodings = [{}]

      if (sender.track.kind === "video") {
        params.degradationPreference = lowDataMode.value ? "maintain-framerate" : "balanced"
        params.encodings[0].maxBitrate = lowDataMode.value ? 180 * 1000 : 450 * 1000
        params.encodings[0].maxFramerate = lowDataMode.value ? 12 : 20
        params.encodings[0].scaleResolutionDownBy = lowDataMode.value ? 1.4 : 1
      }

      if (sender.track.kind === "audio") {
        params.encodings[0].maxBitrate = lowDataMode.value ? 24 * 1000 : 40 * 1000
      }

      await sender.setParameters(params)
    } catch {}
  }
}

async function enhanceLocalTracks(stream) {
  const videoTrack = stream.getVideoTracks?.()[0]
  if (videoTrack) {
    try {
      await videoTrack.applyConstraints(getVideoConstraints())
    } catch {}
    videoTrack.onended = async () => {
      if (!cameraOff.value && !isAudioOnly.value) {
        await recoverMedia()
      }
    }
  }

  const audioTrack = stream.getAudioTracks?.()[0]
  if (audioTrack) {
    audioTrack.onended = async () => {
      await recoverMedia()
    }
  }
}

async function ensureLocalMedia(force = false) {
  if (localStream.value && !force) return localStream.value

  if (force && localStream.value) {
    stopStream(localStream.value)
    localStream.value = null
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: getAudioConstraints(),
    video: getVideoConstraints(),
  })

  await enhanceLocalTracks(stream)
  localStream.value = stream

  const audioTrack = stream.getAudioTracks?.()[0]
  const videoTrack = stream.getVideoTracks?.()[0]
  micMuted.value = audioTrack ? !audioTrack.enabled : false
  cameraOff.value = isAudioOnly.value ? true : !(videoTrack && videoTrack.enabled)

  if (localVideo.value && !isAudioOnly.value) {
    localVideo.value.srcObject = stream
    localVideo.value.muted = true
    localVideo.value.playsInline = true
    safePlay(localVideo.value)
  }

  if (pc.value) {
    const senders = pc.value.getSenders()
    for (const track of stream.getTracks()) {
      const sender = senders.find((s) => s.track?.kind === track.kind)
      if (sender) await sender.replaceTrack(track)
      else pc.value.addTrack(track, stream)
    }
    await applySenderParameters()
  }

  return stream
}

async function flushPendingIceCandidates() {
  if (!pc.value || !hasRemoteDescription.value) return
  while (pendingCandidates.length) {
    const candidate = pendingCandidates.shift()
    try {
      await pc.value.addIceCandidate(new RTCIceCandidate(candidate))
    } catch {}
  }
}

async function monitorStats() {
  stopStatsMonitor()
  statsTimer = window.setInterval(async () => {
    if (!pc.value) return
    try {
      const stats = await pc.value.getStats()
      let weak = false

      stats.forEach((r) => {
        if (r.type === "inbound-rtp" && r.kind === "video") {
          const total = (r.packetsReceived || 0) + (r.packetsLost || 0)
          const lossRate = total > 0 ? (r.packetsLost || 0) / total : 0
          if (lossRate > 0.09) weak = true
        }
      })

      if (weak && !lowDataMode.value) {
        lowDataMode.value = true
        await applySenderParameters()
        setStatusBrief("Low data mode auto enabled")
      }
    } catch {}
  }, 4000)
}

async function createPeerConnection() {
  if (pc.value) return pc.value

  const iceServers = await getIceServers()

  pc.value = new RTCPeerConnection({
    iceServers,
    iceCandidatePoolSize: 20,
    bundlePolicy: "max-bundle",
    rtcpMuxPolicy: "require",
    iceTransportPolicy: "all",
    sdpSemantics: "unified-plan",
  })

  if (localStream.value) {
    const senders = pc.value.getSenders()
    localStream.value.getTracks().forEach((track) => {
      const exists = senders.some((s) => s.track?.kind === track.kind)
      if (!exists) pc.value.addTrack(track, localStream.value)
    })
  }

  pc.value.onicecandidate = (event) => {
    if (event.candidate && roomId.value) {
      socket.value?.emit("call:webrtc:ice", {
        roomId: roomId.value,
        candidate: event.candidate,
      })
    }
  }

  pc.value.ontrack = (event) => {
    const stream = event.streams?.[0]
    if (!stream) return

    remoteStream.value = stream

    const remoteVideoTrack = stream.getVideoTracks?.()[0]
    remoteAudioOnly.value = !remoteVideoTrack
    remoteVideoOff.value = remoteVideoTrack ? !remoteVideoTrack.enabled : true

    if (remoteVideoTrack) {
      remoteVideoTrack.onmute = () => {
        remoteVideoOff.value = true
      }
      remoteVideoTrack.onunmute = () => {
        remoteVideoOff.value = false
      }
    }

    if (remoteVideo.value) {
      remoteVideo.value.srcObject = stream
      remoteVideo.value.playsInline = true
      remoteVideo.value.autoplay = true
      remoteVideo.value.muted = false
      remoteVideo.value.volume = speakerEnabled.value ? 1 : 0.25
      requestAnimationFrame(() => {
        safePlay(remoteVideo.value)
      })
    }

    statusText.value = "Connected"
    markCallStarted()
    monitorStats()
  }

  pc.value.onconnectionstatechange = async () => {
    const state = pc.value?.connectionState
    if (state === "connected") {
      reconnectAttempted.value = false
      statusText.value = "Connected"
      markCallStarted()
      await applySenderParameters()
      monitorStats()
      return
    }
    if (state === "connecting") {
      statusText.value = "Connecting..."
      return
    }
    if (state === "disconnected") {
      statusText.value = "Reconnecting..."
      return
    }
    if (state === "failed" && !reconnectAttempted.value) {
      reconnectAttempted.value = true
      statusText.value = "Recovering..."
      await maybeRecoverConnection("connection failed")
    }
  }

  pc.value.oniceconnectionstatechange = async () => {
    const state = pc.value?.iceConnectionState
    if (state === "failed") {
      statusText.value = "Recovering..."
      await maybeRecoverConnection("ice failed")
    } else if (state === "disconnected") {
      statusText.value = "Reconnecting..."
    }
  }

  pc.value.onnegotiationneeded = async () => {
    if (!roomId.value || !isOfferOwner() || makingOffer.value) return
    try {
      await createAndSendOffer(false)
    } catch {}
  }

  await applySenderParameters()
  return pc.value
}

function isOfferOwner() {
  const myUserId = getMyUserId()
  return negotiationOwnerUserId.value
    ? negotiationOwnerUserId.value === myUserId
    : hostUserId.value
      ? hostUserId.value === myUserId
      : isCaller.value
}

async function createAndSendOffer(iceRestart = false) {
  if (!pc.value || !socket.value || !roomId.value) return
  try {
    makingOffer.value = true

    const offer = await pc.value.createOffer({
      iceRestart,
      offerToReceiveAudio: true,
      offerToReceiveVideo: !isAudioOnly.value,
      voiceActivityDetection: true,
    })

    if (pc.value.signalingState !== "stable" && !iceRestart) return

    await pc.value.setLocalDescription(offer)

    socket.value.emit("call:webrtc:offer", {
      roomId: roomId.value,
      offer: pc.value.localDescription,
      restartIce: iceRestart,
    })
  } finally {
    makingOffer.value = false
  }
}

async function maybeRecoverConnection() {
  try {
    if (!pc.value) await createPeerConnection()
    if (isOfferOwner()) {
      await createAndSendOffer(true)
    }
  } catch {}
}

function joinCallRoom() {
  if (!socket.value || !roomId.value || hasJoinedRoom.value) return

  socket.value.emit("call:join", { roomId: roomId.value }, (ack) => {
    if (ack?.hostUserId) hostUserId.value = String(ack.hostUserId)
    if (ack?.negotiationOwnerUserId) {
      negotiationOwnerUserId.value = String(ack.negotiationOwnerUserId)
      polite.value = getMyUserId() !== negotiationOwnerUserId.value
    }
  })

  hasJoinedRoom.value = true
}

async function recoverMedia() {
  if (recoveringMedia.value) return
  recoveringMedia.value = true
  statusText.value = "Recovering media..."
  try {
    await ensureLocalMedia(true)
    if (!pc.value) await createPeerConnection()
    if (pc.value && isOfferOwner()) {
      await createAndSendOffer(true)
    }
    statusText.value = "Connected"
  } catch {
    statusText.value = "Media error"
  } finally {
    recoveringMedia.value = false
  }
}

async function switchCamera() {
  if (isAudioOnly.value || !pc.value || !localStream.value || switchingCamera.value) return
  switchingCamera.value = true
  try {
    const devices = await navigator.mediaDevices.enumerateDevices()
    const cameras = devices.filter((d) => d.kind === "videoinput")
    if (cameras.length < 2) {
      setStatusBrief("Only one camera found")
      return
    }

    currentFacingMode.value = currentFacingMode.value === "user" ? "environment" : "user"

    const newStream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: getVideoConstraints(),
    })

    const newVideoTrack = newStream.getVideoTracks?.()[0]
    if (!newVideoTrack) return

    const videoSender = pc.value.getSenders().find((sender) => sender.track?.kind === "video")
    if (videoSender) await videoSender.replaceTrack(newVideoTrack)

    const audioTracks = localStream.value.getAudioTracks()
    localStream.value.getVideoTracks().forEach((track) => {
      try { track.stop() } catch {}
    })
    localStream.value = new MediaStream([...audioTracks, newVideoTrack])

    if (localVideo.value) {
      localVideo.value.srcObject = localStream.value
      safePlay(localVideo.value)
    }

    cameraOff.value = false
    await applySenderParameters()

    if (isOfferOwner()) await createAndSendOffer(false)
  } catch {
    setStatusBrief("Camera switch failed")
  } finally {
    switchingCamera.value = false
  }
}

function toggleMic() {
  if (!localStream.value) return
  micMuted.value = !micMuted.value
  localStream.value.getAudioTracks().forEach((track) => {
    track.enabled = !micMuted.value
  })
  setStatusBrief(micMuted.value ? "Mic muted" : "Mic live")
}

async function toggleCamera() {
  if (isAudioOnly.value || !localStream.value) return
  cameraOff.value = !cameraOff.value
  localStream.value.getVideoTracks().forEach((track) => {
    track.enabled = !cameraOff.value
  })
  if (pc.value && isOfferOwner()) await createAndSendOffer(false)
  setStatusBrief(cameraOff.value ? "Camera paused" : "Camera live")
}

function toggleSpeaker() {
  speakerEnabled.value = !speakerEnabled.value
  if (remoteVideo.value) remoteVideo.value.volume = speakerEnabled.value ? 1 : 0.25
  setStatusBrief(speakerEnabled.value ? "Speaker on" : "Speaker lower")
}

async function toggleLowDataMode() {
  lowDataMode.value = !lowDataMode.value
  setStatusBrief(lowDataMode.value ? "Low data mode enabled" : "Balanced HD enabled")
  try {
    const track = localStream.value?.getVideoTracks?.()[0]
    if (track) await track.applyConstraints(getVideoConstraints())
    await applySenderParameters()
    if (pc.value && isOfferOwner()) await createAndSendOffer(false)
  } catch {}
}

function copyCallDiagnostics() {
  const payload = {
    roomId: roomId.value,
    kind: kind.value,
    hostUserId: hostUserId.value,
    negotiationOwnerUserId: negotiationOwnerUserId.value,
    socketConnected: socketConnected.value,
    inCall: inCall.value,
    pcState: pc.value?.connectionState || "",
    iceState: pc.value?.iceConnectionState || "",
    turnReady: turnReady.value,
    lowDataMode: lowDataMode.value,
    localMedia: !!localStream.value,
    remoteMedia: !!remoteStream.value,
  }

  navigator.clipboard?.writeText(JSON.stringify(payload, null, 2)).catch(() => {})
  setStatusBrief("Diagnostics copied")
}

function minimizeCurrentCall() {
  syncCallOverlay({
    roomId: roomId.value,
    kind: kind.value,
    name: callPartnerName.value,
    inCall: inCall.value,
    muted: micMuted.value,
    cameraOff: cameraOff.value,
    duration: formattedDuration.value,
  })
  minimizeCall()
}

async function acceptIncoming() {
  if (!incomingCall.value) return

  roomId.value = String(incomingCall.value.roomId || roomId.value || "")
  kind.value = String(incomingCall.value.kind || kind.value || "video")
  initialPartnerName.value = incomingCall.value.fromName || initialPartnerName.value
  hostUserId.value = String(incomingCall.value.hostUserId || incomingCall.value.fromUserId || "")

  statusText.value = "Connecting..."

  try {
    await ensureLocalMedia()
    await createPeerConnection()

    socket.value.emit("call:accept", { roomId: roomId.value })
    joinCallRoom()

    incomingCall.value = null
  } catch {
    statusText.value = "Media error"
  }
}

function rejectIncoming() {
  if (!incomingCall.value?.roomId) {
    incomingCall.value = null
    return
  }
  socket.value?.emit("call:reject", { roomId: incomingCall.value.roomId })
  incomingCall.value = null
  statusText.value = "Ready"
}

async function startOutgoingCall() {
  if (!toUserId.value) return
  statusText.value = "Calling..."
  try {
    await ensureLocalMedia()
    socket.value.emit("call:request", {
      toUserId: toUserId.value,
      kind: kind.value,
    })
  } catch {
    statusText.value = "Media error"
  }
}

function endCall() {
  if (roomId.value) {
    socket.value?.emit("call:end", { roomId: roomId.value })
  }
  cleanupAll()
  resetOverlay()
  router.push("/dashboard")
}

function goBack() {
  if (inCall.value) {
    minimizeCurrentCall()
    router.push("/dashboard")
    return
  }
  router.push("/dashboard")
}

function wireSocketEvents() {
  socket.value.on("connect", () => {
    socketConnected.value = true
    statusText.value = inCall.value ? "Connected" : "Ready"

    if (getMyUserId()) {
      socket.value.emit("register-user", {
        id: getMyUserId(),
        username: me?.username || me?.display_name || me?.name || "User",
      })
    }
  })

  socket.value.on("disconnect", () => {
    socketConnected.value = false
    statusText.value = "Realtime Offline"
  })

  socket.value.on("call:incoming", async (payload) => {
    incomingCall.value = payload || null
    roomId.value = String(payload?.roomId || "")
    kind.value = String(payload?.kind || "video")
    initialPartnerName.value = payload?.fromName || initialPartnerName.value
    hostUserId.value = String(payload?.hostUserId || payload?.fromUserId || "")
    statusText.value = "Incoming Call"
  })

  socket.value.on("call:ringing", ({ roomId: rid }) => {
    if (rid) roomId.value = String(rid)
    statusText.value = "Ringing..."
  })

  socket.value.on("call:status", ({ calleeOnline }) => {
    statusText.value = calleeOnline ? "Ringing..." : "Queued / Offline"
  })

  socket.value.on("call:busy", () => {
    statusText.value = "User busy"
  })

  socket.value.on("call:error", ({ message }) => {
    statusText.value = message || "Call error"
  })

  socket.value.on("call:accepted", async ({ roomId: rid, kind: callKind, hostUserId: host, negotiationOwnerUserId: owner }) => {
    if (rid) roomId.value = String(rid)
    if (callKind) kind.value = String(callKind)
    if (host) hostUserId.value = String(host)
    if (owner) {
      negotiationOwnerUserId.value = String(owner)
      polite.value = getMyUserId() !== negotiationOwnerUserId.value
    }

    statusText.value = "Connecting..."

    if (!localStream.value) await ensureLocalMedia()
    if (!pc.value) await createPeerConnection()
    joinCallRoom()
  })

  socket.value.on("call:joined", async ({ roomId: rid, kind: callKind, hostUserId: host, negotiationOwnerUserId: owner }) => {
    if (rid) roomId.value = String(rid)
    if (callKind) kind.value = String(callKind)
    if (host) hostUserId.value = String(host)
    if (owner) {
      negotiationOwnerUserId.value = String(owner)
      polite.value = getMyUserId() !== negotiationOwnerUserId.value
    }

    if (!pc.value) {
      await createPeerConnection()
    }
  })

  socket.value.on("call:ready", async ({ roomId: rid, kind: callKind, hostUserId: host, negotiationOwnerUserId: owner }) => {
    if (rid) roomId.value = String(rid)
    if (callKind) kind.value = String(callKind)
    if (host) hostUserId.value = String(host)
    if (owner) {
      negotiationOwnerUserId.value = String(owner)
      polite.value = getMyUserId() !== negotiationOwnerUserId.value
    }

    statusText.value = "Connecting..."

    if (!localStream.value) await ensureLocalMedia()
    if (!pc.value) await createPeerConnection()

    if (isOfferOwner() && pc.value?.signalingState === "stable") {
      await createAndSendOffer(false)
    }
  })

  socket.value.on("call:renegotiate:owner", ({ negotiationOwnerUserId: owner }) => {
    negotiationOwnerUserId.value = String(owner || "")
    polite.value = getMyUserId() !== negotiationOwnerUserId.value
  })

  socket.value.on("call:webrtc:offer", async ({ offer }) => {
    if (!pc.value) await createPeerConnection()
    if (!pc.value || !offer) return

    const offerCollision =
      makingOffer.value || pc.value.signalingState !== "stable"

    ignoreOffer.value = !polite.value && offerCollision
    if (ignoreOffer.value) return

    try {
      if (offerCollision) {
        await Promise.all([
          pc.value.setLocalDescription({ type: "rollback" }),
          pc.value.setRemoteDescription(new RTCSessionDescription(offer)),
        ])
      } else {
        await pc.value.setRemoteDescription(new RTCSessionDescription(offer))
      }

      hasRemoteDescription.value = true
      await flushPendingIceCandidates()

      const answer = await pc.value.createAnswer()
      await pc.value.setLocalDescription(answer)

      socket.value.emit("call:webrtc:answer", {
        roomId: roomId.value,
        answer: pc.value.localDescription,
      })
    } catch (e) {
      console.error("offer handler failed:", e)
    }
  })

  socket.value.on("call:webrtc:answer", async ({ answer }) => {
    if (!pc.value || !answer) return
    if (pc.value.signalingState !== "have-local-offer") return

    try {
      await pc.value.setRemoteDescription(new RTCSessionDescription(answer))
      hasRemoteDescription.value = true
      await flushPendingIceCandidates()
    } catch (e) {
      console.error("answer handler failed:", e)
    }
  })

  socket.value.on("call:webrtc:ice", async ({ candidate }) => {
    if (!candidate || !pc.value) return
    try {
      if (!hasRemoteDescription.value) {
        pendingCandidates.push(candidate)
        return
      }
      await pc.value.addIceCandidate(new RTCIceCandidate(candidate))
    } catch (e) {
      if (!ignoreOffer.value) {
        console.error("addIceCandidate failed:", e)
      }
    }
  })

  socket.value.on("call:peer-left", () => {
    statusText.value = "Peer left"
    remoteStream.value = null
    if (remoteVideo.value) remoteVideo.value.srcObject = null
  })

  socket.value.on("call:ended", () => {
    cleanupAll()
    resetOverlay()
    router.push("/dashboard")
  })
}

onMounted(async () => {
  socket.value = io(API_BASE, {
    transports: ["websocket"],
    auth: { token },
  })

  wireSocketEvents()

  await nextTick()

  if (localVideo.value && localStream.value) {
    localVideo.value.srcObject = localStream.value
    safePlay(localVideo.value)
  }

  if (mode.value === "callee" && roomId.value) {
    statusText.value = "Waiting to answer..."
  } else if (mode.value === "caller" && toUserId.value) {
    await startOutgoingCall()
  }
})

onBeforeUnmount(() => {
  try { socket.value?.off("connect") } catch {}
  try { socket.value?.off("disconnect") } catch {}
  try { socket.value?.off("call:incoming") } catch {}
  try { socket.value?.off("call:ringing") } catch {}
  try { socket.value?.off("call:status") } catch {}
  try { socket.value?.off("call:busy") } catch {}
  try { socket.value?.off("call:error") } catch {}
  try { socket.value?.off("call:accepted") } catch {}
  try { socket.value?.off("call:joined") } catch {}
  try { socket.value?.off("call:ready") } catch {}
  try { socket.value?.off("call:renegotiate:owner") } catch {}
  try { socket.value?.off("call:webrtc:offer") } catch {}
  try { socket.value?.off("call:webrtc:answer") } catch {}
  try { socket.value?.off("call:webrtc:ice") } catch {}
  try { socket.value?.off("call:peer-left") } catch {}
  try { socket.value?.off("call:ended") } catch {}
  try { socket.value?.disconnect?.() } catch {}

  cleanupAll()
})
</script>

<style scoped>
.call-page {
  --bg1: rgba(82, 47, 255, 0.28);
  --bg2: rgba(255, 64, 129, 0.18);
  --bg3: rgba(0, 180, 255, 0.16);
  --glass: rgba(13, 16, 30, 0.54);
  --glass-border: rgba(255, 255, 255, 0.12);
  --text: #fff;
  --muted: rgba(255, 255, 255, 0.72);
  --soft: rgba(255, 255, 255, 0.08);
  --danger: linear-gradient(135deg, #ff3b7a, #ff1744);
  --accent: linear-gradient(135deg, #ff4b7d, #7b7dff);
  min-height: 100vh;
  position: relative;
  color: var(--text);
  overflow: hidden;
  padding: calc(env(safe-area-inset-top, 0px) + 14px) 14px calc(env(safe-area-inset-bottom, 0px) + 96px);
  background:
    radial-gradient(900px 480px at 10% 0%, var(--bg1), transparent 60%),
    radial-gradient(760px 420px at 90% 0%, var(--bg2), transparent 60%),
    radial-gradient(720px 420px at 50% 100%, var(--bg3), transparent 60%),
    linear-gradient(180deg, #071126 0%, #08162e 48%, #071222 100%);
}

.bg {
  position: absolute;
  inset: auto;
  border-radius: 999px;
  filter: blur(48px);
  opacity: 0.6;
  pointer-events: none;
}
.bg1 { width: 280px; height: 280px; left: -40px; top: 60px; background: rgba(135, 85, 255, 0.28); }
.bg2 { width: 280px; height: 280px; right: -60px; top: 160px; background: rgba(255, 66, 133, 0.2); }
.bg3 { width: 280px; height: 280px; left: 30%; bottom: 80px; background: rgba(0, 184, 255, 0.18); }

.glassy {
  background: var(--glass);
  border: 1px solid var(--glass-border);
  box-shadow:
    0 12px 40px rgba(0, 0, 0, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(22px);
  -webkit-backdrop-filter: blur(22px);
}

.topbar,
.dynamic-strip,
.call-hero,
.tools-strip,
.controls {
  position: relative;
  z-index: 2;
  border-radius: 24px;
}

.topbar {
  display: grid;
  grid-template-columns: 56px 1fr auto;
  gap: 12px;
  align-items: center;
  padding: 12px 14px;
  margin-bottom: 12px;
}

.icon-btn {
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: 16px;
  color: white;
  background: rgba(255,255,255,0.08);
  cursor: pointer;
  font-size: 20px;
}

.title-wrap {
  min-width: 0;
}

.call-title {
  font-size: 18px;
  font-weight: 800;
  letter-spacing: 0.02em;
}

.call-subtitle {
  color: var(--muted);
  font-size: 13px;
  margin-top: 2px;
}

.topbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-pill {
  padding: 10px 14px;
  border-radius: 999px;
  background: rgba(255,255,255,0.08);
  font-size: 12px;
  font-weight: 700;
}

.status-pill.live {
  background: rgba(35, 211, 147, 0.18);
  color: #9ff4cf;
}

.status-pill.warn {
  background: rgba(255, 193, 7, 0.18);
  color: #ffe89a;
}

.status-pill.bad {
  background: rgba(255, 88, 120, 0.18);
  color: #ffb1c1;
}

.dynamic-strip {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 10px;
  align-items: center;
  padding: 12px 14px;
  margin-bottom: 12px;
}

.dynamic-left,
.dynamic-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.dynamic-center {
  display: flex;
  gap: 8px;
  justify-content: center;
  flex-wrap: wrap;
}

.signal-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.signal-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: rgba(255,255,255,0.2);
}
.signal-dot.on {
  background: #2effa8;
  box-shadow: 0 0 12px rgba(46,255,168,0.6);
}

.dynamic-text {
  color: var(--muted);
  font-size: 13px;
}

.dyn-btn,
.control-btn,
.btn {
  border: 0;
  cursor: pointer;
  color: #fff;
  font-weight: 800;
  transition: transform 0.16s ease, opacity 0.16s ease, background 0.16s ease;
}
.dyn-btn:hover,
.control-btn:hover,
.btn:hover,
.icon-btn:hover {
  transform: translateY(-1px);
}

.dyn-btn {
  padding: 10px 14px;
  border-radius: 14px;
  background: rgba(255,255,255,0.08);
  font-size: 12px;
}

.mini-pill,
.meta-pill,
.video-chip,
.tool-pill,
.hero-badge {
  border-radius: 999px;
  font-size: 12px;
  padding: 8px 12px;
  background: rgba(255,255,255,0.08);
  color: white;
}

.call-hero {
  display: grid;
  grid-template-columns: 1.4fr .9fr;
  gap: 16px;
  padding: 18px;
  margin-bottom: 14px;
}

.hero-kicker {
  font-size: 12px;
  letter-spacing: .14em;
  color: #f7b0c3;
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
  margin-top: 14px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.hero-badge.ok { background: rgba(46,255,168,0.12); color: #a8f7d3; }
.hero-badge.bad { background: rgba(255,78,120,0.16); color: #ffc0cf; }
.hero-badge.accent { background: linear-gradient(135deg, rgba(255,75,125,0.32), rgba(123,125,255,0.3)); }

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

.hero-stat-num {
  font-size: 24px;
  font-weight: 900;
}

.hero-stat-lab {
  margin-top: 6px;
  font-size: 12px;
  color: var(--muted);
}

.call-stage {
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: 1.3fr .85fr;
  gap: 14px;
  margin-bottom: 14px;
}

.call-stage.audioOnly {
  grid-template-columns: 1fr 1fr;
}

.video-card {
  min-height: 340px;
  border-radius: 28px;
  padding: 12px;
  position: relative;
  overflow: hidden;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  box-shadow: 0 18px 48px rgba(0,0,0,0.28);
}

.video-card.activeCard {
  box-shadow:
    0 0 0 1px rgba(255,255,255,0.14),
    0 0 0 4px rgba(255,75,125,0.12),
    0 18px 48px rgba(0,0,0,0.32);
}

.video-topbar {
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

.video-label {
  font-size: 14px;
  font-weight: 800;
  color: rgba(255,255,255,0.92);
}

.video-chip-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.badchip {
  background: rgba(255,80,120,0.16);
  color: #ffd0da;
}

.video-el {
  width: 100%;
  height: 100%;
  min-height: 316px;
  object-fit: cover;
  border-radius: 22px;
  background: #05070d;
}

.local-self {
  transform: scaleX(-1);
}

.video-placeholder {
  min-height: 316px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 10px;
  border-radius: 22px;
  background:
    radial-gradient(circle at 50% 20%, rgba(255,255,255,0.08), transparent 50%),
    rgba(8, 12, 22, 0.72);
}

.avatar-big {
  width: 92px;
  height: 92px;
  border-radius: 28px;
  display: grid;
  place-items: center;
  font-size: 34px;
  font-weight: 900;
  background: linear-gradient(135deg, #ff4b7d, #7b7dff);
  box-shadow: 0 12px 30px rgba(255,75,125,0.3);
}
.avatar-big.remote {
  background: linear-gradient(135deg, #6d84ff, #2ec5ff);
}

.placeholder-name {
  font-size: 24px;
  font-weight: 900;
}
.placeholder-sub {
  font-size: 14px;
  color: var(--muted);
}

.video-bottom-state {
  position: absolute;
  left: 18px;
  bottom: 18px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(0,0,0,0.34);
  font-size: 12px;
  color: white;
}

.state-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: rgba(255,255,255,0.24);
}
.state-dot.on {
  background: #28ff9e;
  box-shadow: 0 0 12px rgba(40,255,158,0.55);
}

.tools-strip {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  padding: 14px;
  margin-bottom: 16px;
}

.tools-col {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.tools-title {
  font-size: 13px;
  font-weight: 800;
  color: var(--muted);
}

.tools-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.controls {
  position: fixed;
  left: 14px;
  right: 14px;
  bottom: calc(env(safe-area-inset-bottom, 0px) + 12px);
  z-index: 10;
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: center;
  padding: 12px;
}

.control-btn {
  min-width: 88px;
  padding: 14px 16px;
  border-radius: 20px;
  background: rgba(255,255,255,0.08);
  font-size: 15px;
}

.control-btn.off {
  background: rgba(255,255,255,0.05);
  color: rgba(255,255,255,0.72);
}

.control-btn.danger {
  background: var(--danger);
  min-width: 98px;
  box-shadow: 0 10px 30px rgba(255,23,68,0.3);
}

.incoming-overlay {
  position: fixed;
  inset: 0;
  z-index: 20;
  background: rgba(4, 8, 16, 0.66);
  display: grid;
  place-items: center;
  padding: 20px;
}

.incoming-card {
  width: min(420px, 100%);
  border-radius: 28px;
  padding: 22px;
  text-align: center;
}

.incoming-top {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--muted);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: .08em;
}

.incoming-live-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: #28ff9e;
  box-shadow: 0 0 14px rgba(40,255,158,0.55);
}

.incoming-avatar {
  width: 96px;
  height: 96px;
  margin: 18px auto 16px;
  border-radius: 28px;
  display: grid;
  place-items: center;
  font-size: 36px;
  font-weight: 900;
  background: linear-gradient(135deg, #ff4b7d, #7b7dff);
}

.incoming-text h2 {
  margin: 0;
  font-size: 28px;
}
.incoming-text p {
  margin: 8px 0 0;
  color: var(--muted);
}

.incoming-meta {
  margin-top: 14px;
  display: flex;
  gap: 8px;
  justify-content: center;
  flex-wrap: wrap;
}

.incoming-actions {
  margin-top: 20px;
  display: flex;
  gap: 12px;
}

.btn {
  flex: 1;
  padding: 14px 18px;
  border-radius: 18px;
  font-size: 15px;
}

.btn.reject {
  background: rgba(255,255,255,0.08);
}
.btn.accept {
  background: linear-gradient(135deg, #ff4b7d, #7b7dff);
}

.fadeUp-enter-active,
.fadeUp-leave-active {
  transition: all .24s ease;
}
.fadeUp-enter-from,
.fadeUp-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

@media (max-width: 980px) {
  .dynamic-strip,
  .call-hero,
  .tools-strip,
  .call-stage {
    grid-template-columns: 1fr;
  }

  .dynamic-strip {
    gap: 12px;
  }

  .dynamic-left,
  .dynamic-center,
  .dynamic-right {
    justify-content: center;
  }

  .hero-title {
    font-size: 28px;
  }

  .video-card {
    min-height: 280px;
  }

  .video-el,
  .video-placeholder {
    min-height: 256px;
  }
}

@media (max-width: 700px) {
  .call-page {
    padding: calc(env(safe-area-inset-top, 0px) + 10px) 10px calc(env(safe-area-inset-bottom, 0px) + 108px);
  }

  .topbar {
    grid-template-columns: 46px 1fr auto;
    padding: 10px 12px;
  }

  .icon-btn {
    width: 40px;
    height: 40px;
    border-radius: 14px;
  }

  .call-title {
    font-size: 16px;
  }

  .call-subtitle {
    font-size: 12px;
  }

  .call-hero {
    padding: 14px;
  }

  .hero-right {
    grid-template-columns: repeat(2, 1fr);
  }

  .video-card {
    min-height: 230px;
    border-radius: 24px;
  }

  .video-el,
  .video-placeholder {
    min-height: 210px;
    border-radius: 18px;
  }

  .avatar-big {
    width: 78px;
    height: 78px;
    border-radius: 24px;
    font-size: 28px;
  }

  .controls {
    left: 10px;
    right: 10px;
    bottom: calc(env(safe-area-inset-bottom, 0px) + 10px);
    overflow-x: auto;
    justify-content: flex-start;
    scrollbar-width: none;
  }

  .controls::-webkit-scrollbar {
    display: none;
  }

  .control-btn {
    min-width: 84px;
    padding: 13px 14px;
    border-radius: 18px;
    font-size: 14px;
    flex: 0 0 auto;
  }
}
</style>