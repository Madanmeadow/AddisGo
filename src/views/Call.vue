<!-- src/views/Call.vue -->
<template>
  <Layout>
    <div class="call-page" :class="{ audioMode: isAudioOnly, connected: inCall, reconnecting: isRecoveringState }">
      <div class="bg bg1"></div>
      <div class="bg bg2"></div>
      <div class="bg bg3"></div>

      <transition name="fadeUp">
        <div v-if="incomingCall && !inCall" class="incoming-overlay">
          <div class="incoming-card glassy">
            <div class="incoming-top">
              <div class="incoming-live-dot"></div>
              <div class="incoming-small">ADDISGO CALL</div>
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
          <div class="hero-kicker">ADDISGO DIRECT CALL</div>
          <h1 class="hero-title">{{ callPartnerName }}</h1>
          <div class="hero-sub">
            {{ isAudioOnly ? "Crystal audio call with recovery and low-data fallback." : "Video call with smart recovery, reconnect logic, camera switching, and low-data protection." }}
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
              <span class="video-chip" :class="{ badchip: remoteVideoOff }">{{ remoteVideoOff ? "Video Off" : "Video On" }}</span>
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
              <span class="video-chip" v-if="!isAudioOnly">{{ cameraOff ? "Cam Off" : "Cam On" }}</span>
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
            <div class="placeholder-sub">{{ cameraOff ? "Camera off" : isAudioOnly ? "Audio only" : "Preparing camera..." }}</div>
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

      <footer class="controls">
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

import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from "vue"
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
  try { return JSON.parse(localStorage.getItem("user") || "{}") } catch { return {} }
})()

const roomId = ref(route.query.roomId || "")
const kind = ref(route.query.kind || "video")
const mode = ref(route.query.mode || route.query.role || "caller")
const toUserId = ref(route.query.toUserId || "")
const initialPartnerName = ref(route.query.name || "User")

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
const madeOffer = ref(false)
const reconnectAttempted = ref(false)
const makingOffer = ref(false)
const negotiationBusy = ref(false)
const socketConnected = ref(false)
const hasJoinedRoom = ref(false)

const statusText = ref("Ready")
const hostUserId = ref("")
const isCaller = ref(mode.value === "caller")

const pendingCandidates = []
let callTimer = null
const callStartedAt = ref(null)
const callSeconds = ref(0)

const remoteAudioOnly = ref(false)
const remoteVideoOff = ref(false)

const {
  syncCallOverlay,
  minimizeCall,
  resetOverlay,
} = useCallOverlay()

const isAudioOnly = computed(() => kind.value === "audio")
const callPartnerName = computed(() => incomingCall.value?.fromName || initialPartnerName.value || "User")
const callModeLabel = computed(() => incomingCall.value && !inCall.value ? "Incoming Call" : (isAudioOnly.value ? "Audio Call" : "Video Call"))
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

function getMyUserId() {
  return String(me?.id || "")
}

function isOfferOwner() {
  const myUserId = getMyUserId()
  return hostUserId.value ? hostUserId.value === myUserId : isCaller.value
}

function safePlay(videoEl) {
  videoEl?.play?.().catch(() => {})
}

function authHeaders(json = false) {
  const h = {}
  if (json) h["Content-Type"] = "application/json"
  if (token) h["Authorization"] = `Bearer ${token}`
  return h
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

function stopStream(stream) {
  try { stream?.getTracks?.().forEach((t) => t.stop()) } catch {}
}

function cleanupPeerConnection() {
  try { pc.value?.getSenders?.().forEach((s) => s.track && s.track.stop && s.track.stop()) } catch {}
  try { pc.value?.close?.() } catch {}
  pc.value = null
  hasRemoteDescription.value = false
}

function cleanupAll() {
  stopCallTimer()
  cleanupPeerConnection()
  stopStream(localStream.value)
  localStream.value = null
  remoteStream.value = null
  if (localVideo.value) localVideo.value.srcObject = null
  if (remoteVideo.value) remoteVideo.value.srcObject = null
  incomingCall.value = null
  inCall.value = false
  madeOffer.value = false
  hasJoinedRoom.value = false
  statusText.value = "Ready"
}

async function getIceServers() {
  try {
    const res = await fetch(`${API_BASE}/api/turn`, {
      headers: authHeaders(false),
    })
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data?.iceServers) && data.iceServers.length) {
        turnReady.value = data.iceServers.some((s) => String(s?.urls || "").includes("turn:"))
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
    sampleRate: 48000,
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
    try { await videoTrack.applyConstraints(getVideoConstraints()) } catch {}
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

  if (localVideo.value && !isAudioOnly.value) {
    localVideo.value.srcObject = stream
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

async function createPeerConnection() {
  const iceServers = await getIceServers()
  pc.value = new RTCPeerConnection({
    iceServers,
    iceCandidatePoolSize: 10,
    bundlePolicy: "max-bundle",
    rtcpMuxPolicy: "require",
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
      remoteVideoTrack.onmute = () => { remoteVideoOff.value = true }
      remoteVideoTrack.onunmute = () => { remoteVideoOff.value = false }
    }

    if (remoteVideo.value) {
      remoteVideo.value.srcObject = stream
      remoteVideo.value.muted = false
      remoteVideo.value.volume = speakerEnabled.value ? 1 : 0.25
      safePlay(remoteVideo.value)
    }

    statusText.value = "Connected"
    markCallStarted()
  }

  pc.value.onconnectionstatechange = async () => {
    const state = pc.value?.connectionState
    if (state === "connected") {
      reconnectAttempted.value = false
      statusText.value = "Connected"
      markCallStarted()
      await applySenderParameters()
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
    if (!roomId.value || !isOfferOwner() || negotiationBusy.value) return
    try {
      negotiationBusy.value = true
      await createAndSendOffer(false)
    } finally {
      negotiationBusy.value = false
    }
  }

  await applySenderParameters()
}

async function createAndSendOffer(iceRestart = false) {
  if (!pc.value || !socket.value || !roomId.value) return
  try {
    makingOffer.value = true
    const offer = await pc.value.createOffer({
      iceRestart,
      offerToReceiveAudio: true,
      offerToReceiveVideo: !isAudioOnly.value,
    })

    if (pc.value.signalingState !== "stable" && !iceRestart) return
    await pc.value.setLocalDescription(offer)

    socket.value.emit("call:webrtc:offer", {
      roomId: roomId.value,
      offer: pc.value.localDescription,
    })
  } finally {
    makingOffer.value = false
  }
}

async function maybeRecoverConnection() {
  try {
    if (!pc.value) await createPeerConnection()
    if (isOfferOwner()) await createAndSendOffer(true)
  } catch {}
}

function joinCallRoom() {
  if (!socket.value || !roomId.value || hasJoinedRoom.value) return
  socket.value.emit("call:join", {
    roomId: roomId.value,
    kind: kind.value,
    toUserId: toUserId.value || "",
    name: callPartnerName.value,
  })
  hasJoinedRoom.value = true
}

async function recoverMedia() {
  if (recoveringMedia.value) return
  recoveringMedia.value = true
  statusText.value = "Recovering media..."
  try {
    await ensureLocalMedia(true)
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
    localStream.value.getVideoTracks().forEach((track) => { try { track.stop() } catch {} })
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
  localStream.value.getAudioTracks().forEach((track) => { track.enabled = !micMuted.value })
  setStatusBrief(micMuted.value ? "Mic muted" : "Mic live")
}

async function toggleCamera() {
  if (isAudioOnly.value || !localStream.value) return
  cameraOff.value = !cameraOff.value
  localStream.value.getVideoTracks().forEach((track) => { track.enabled = !cameraOff.value })
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
  } catch {}
  await applySenderParameters()
  if (pc.value && isOfferOwner()) await createAndSendOffer(true)
}

function copyCallDiagnostics() {
  const diag = [
    `roomId=${roomId.value}`,
    `kind=${kind.value}`,
    `socketConnected=${socketConnected.value}`,
    `status=${statusText.value}`,
    `pcState=${pc.value?.connectionState || "none"}`,
    `iceState=${pc.value?.iceConnectionState || "none"}`,
    `lowData=${lowDataMode.value}`,
    `turnReady=${turnReady.value}`,
    `remote=${remoteTrackSummary.value}`,
  ].join("\n")

  navigator.clipboard?.writeText(diag).catch(() => {})
  setStatusBrief("Diagnostics copied")
}

function setStatusBrief(text = "") {
  statusText.value = text
  window.clearTimeout(setStatusBrief._t)
  setStatusBrief._t = window.setTimeout(() => {
    if (!inCall.value && !incomingCall.value) statusText.value = "Ready"
    else if (inCall.value) statusText.value = "Connected"
  }, 1200)
}

function minimizeCurrentCall() {
  minimizeCall()
  router.push("/dashboard")
}

async function acceptIncoming() {
  if (!incomingCall.value || !socket.value) return

  roomId.value = incomingCall.value.roomId
  kind.value = incomingCall.value.kind || "video"
  initialPartnerName.value = incomingCall.value.fromName || "Caller"
  await ensureLocalMedia()

  socket.value.emit("call:accept", {
    roomId: roomId.value,
    kind: kind.value,
    fromUserId: incomingCall.value.fromUserId,
  })

  joinCallRoom()
  statusText.value = "Accepted"
}

function rejectIncoming() {
  if (!incomingCall.value || !socket.value) return
  socket.value.emit("call:reject", {
    roomId: incomingCall.value.roomId,
    fromUserId: incomingCall.value.fromUserId,
  })
  incomingCall.value = null
  statusText.value = "Declined"
}

function endCall() {
  try {
    socket.value?.emit("call:end", { roomId: roomId.value })
  } catch {}
  cleanupAll()
  goBack()
}

function goBack() {
  router.push("/dashboard")
}

function createSocket() {
  socket.value = io(API_BASE, {
    transports: ["websocket", "polling"],
    auth: token ? { token } : undefined,
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: 30,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
  })

  socket.value.on("connect", async () => {
    socketConnected.value = true

    if (roomId.value && inCall.value) {
      joinCallRoom()
      await maybeRecoverConnection()
    }
  })

  socket.value.on("disconnect", () => {
    socketConnected.value = false
    if (inCall.value) statusText.value = "Reconnecting..."
  })

  socket.value.on("call:ringing", (data = {}) => {
    if (data.roomId) roomId.value = String(data.roomId)
    if (data.kind) kind.value = data.kind
    isCaller.value = !!data.isCaller
    statusText.value = "Ringing..."
  })

  socket.value.on("call:status", ({ calleeOnline } = {}) => {
    statusText.value = calleeOnline ? "Calling..." : "Queued"
  })

  socket.value.on("call:incoming", (data = {}) => {
    incomingCall.value = {
      roomId: String(data.roomId || ""),
      fromUserId: String(data.fromUserId || ""),
      fromName: data.fromName || "Caller",
      kind: data.kind || "video",
    }
    roomId.value = String(data.roomId || "")
    kind.value = data.kind || "video"
    initialPartnerName.value = data.fromName || "Caller"
    hostUserId.value = String(data.hostUserId || data.fromUserId || "")
    mode.value = "receiver"
    isCaller.value = false
    statusText.value = "Incoming"
  })

  socket.value.on("call:accepted", async (data = {}) => {
    if (data.roomId) roomId.value = String(data.roomId)
    if (data.kind) kind.value = data.kind
    if (data.hostUserId) hostUserId.value = String(data.hostUserId)
    statusText.value = "Accepted"
    await ensureLocalMedia()
    joinCallRoom()
  })

  socket.value.on("call:peer-joined", async () => {
    if (!pc.value) await createPeerConnection()
  })

  socket.value.on("call:ready", async (data = {}) => {
    if (data.roomId) roomId.value = String(data.roomId)
    if (data.kind) kind.value = data.kind
    if (data.hostUserId) hostUserId.value = String(data.hostUserId)

    statusText.value = "Connecting..."
    if (!pc.value) await createPeerConnection()

    if (isOfferOwner() && !madeOffer.value) {
      madeOffer.value = true
      await createAndSendOffer(false)
    }
  })

  socket.value.on("call:webrtc:offer", async ({ roomId: incomingRoomId, offer, from } = {}) => {
    try {
      if (incomingRoomId) roomId.value = String(incomingRoomId)
      statusText.value = "Answering..."

      if (!pc.value) await createPeerConnection()

      const offerCollision = offer && makingOffer.value
      const polite = !isOfferOwner()
      if (offerCollision && !polite) return

      await pc.value.setRemoteDescription(new RTCSessionDescription(offer))
      hasRemoteDescription.value = true
      await flushPendingIceCandidates()

      const answer = await pc.value.createAnswer()
      await pc.value.setLocalDescription(answer)

      socket.value?.emit("call:webrtc:answer", {
        roomId: roomId.value,
        answer: pc.value.localDescription,
        to: from,
      })
    } catch {}
  })

  socket.value.on("call:webrtc:answer", async ({ answer } = {}) => {
    try {
      if (!pc.value) return
      await pc.value.setRemoteDescription(new RTCSessionDescription(answer))
      hasRemoteDescription.value = true
      await flushPendingIceCandidates()
      statusText.value = "Connected"
      markCallStarted()
    } catch {}
  })

  socket.value.on("call:webrtc:ice", async ({ candidate } = {}) => {
    try {
      if (!candidate || !pc.value) return
      if (hasRemoteDescription.value && pc.value.remoteDescription) {
        await pc.value.addIceCandidate(new RTCIceCandidate(candidate))
      } else {
        pendingCandidates.push(candidate)
      }
    } catch {}
  })

  socket.value.on("call:ended", () => {
    statusText.value = "Call ended"
    cleanupAll()
    router.push("/dashboard")
  })

  socket.value.on("call:error", ({ message } = {}) => {
    statusText.value = message || "Error"
  })

  socket.value.on("call:busy", ({ message } = {}) => {
    statusText.value = message || "Busy"
  })
}

function handleVisibilityChange() {
  if (document.hidden && inCall.value && !lowDataMode.value) {
    lowDataMode.value = true
    applySenderParameters().catch(() => {})
  }
}

watch(
  [inCall, roomId, kind, statusText, localStream, remoteStream, callPartnerName],
  () => {
    syncCallOverlay({
      inCall: inCall.value,
      roomId: roomId.value,
      kind: kind.value,
      partnerName: callPartnerName.value,
      statusText: statusText.value,
      localStream: localStream.value,
      remoteStream: remoteStream.value,
      expandPath: "/call",
      expandQuery: {
        roomId: roomId.value,
        mode: mode.value,
        role: mode.value,
        kind: kind.value,
        toUserId: toUserId.value,
        name: callPartnerName.value,
      },
    })
  },
  { immediate: true }
)

onMounted(async () => {
  if (!token) {
    router.replace("/login")
    return
  }

  document.addEventListener("visibilitychange", handleVisibilityChange)
  createSocket()

  if (roomId.value && mode.value === "caller" && toUserId.value) {
    await ensureLocalMedia()
    socket.value.emit("call:start", {
      roomId: roomId.value,
      kind: kind.value,
      toUserId: toUserId.value,
      to: toUserId.value,
      fromName: me?.display_name || me?.username || "User",
      name: initialPartnerName.value,
    })
    statusText.value = "Calling..."
  }

  await nextTick()
  if (localVideo.value && localStream.value && !isAudioOnly.value) {
    localVideo.value.srcObject = localStream.value
    safePlay(localVideo.value)
  }
})

onBeforeUnmount(() => {
  try { socket.value?.emit("call:leave", { roomId: roomId.value }) } catch {}
  try { socket.value?.disconnect?.() } catch {}
  document.removeEventListener("visibilitychange", handleVisibilityChange)
  cleanupAll()
  resetOverlay()
})
</script>

<style scoped>
.call-page {
  position: relative;
  min-height: 100vh;
  color: #fff;
  padding-bottom: 120px;
  background:
    radial-gradient(1200px 700px at 15% 0%, rgba(255, 69, 124, 0.18), transparent 60%),
    radial-gradient(1200px 700px at 85% 10%, rgba(91, 140, 255, 0.18), transparent 60%),
    linear-gradient(180deg, #08111f 0%, #091320 46%, #060d19 100%);
  overflow-x: hidden;
}

.bg {
  position: fixed;
  border-radius: 999px;
  filter: blur(90px);
  pointer-events: none;
  opacity: 0.32;
}
.bg1 { width: 280px; height: 280px; left: -50px; top: 40px; background: rgba(255, 82, 120, 0.30); }
.bg2 { width: 320px; height: 320px; right: -70px; top: 120px; background: rgba(85, 130, 255, 0.28); }
.bg3 { width: 260px; height: 260px; left: 20%; bottom: 40px; background: rgba(0, 255, 200, 0.12); }

.glassy {
  position: relative;
  z-index: 2;
  background: rgba(255,255,255,0.07);
  border: 1px solid rgba(255,255,255,0.10);
  backdrop-filter: blur(18px);
  box-shadow: 0 12px 40px rgba(0,0,0,0.24), inset 0 1px 0 rgba(255,255,255,0.05);
}

.incoming-overlay {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: grid;
  place-items: center;
  background: rgba(4, 10, 20, 0.55);
  padding: 18px;
}
.incoming-card {
  width: min(420px, 100%);
  border-radius: 32px;
  padding: 22px;
  text-align: center;
}
.incoming-top {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 18px;
}
.incoming-live-dot,
.signal-dot,
.state-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: rgba(255,255,255,0.22);
}
.incoming-live-dot { background: #ff4d7a; box-shadow: 0 0 18px rgba(255,77,122,0.75); }
.signal-dot.on,
.state-dot.on { background: #33d28d; box-shadow: 0 0 18px rgba(51,210,141,0.75); }
.incoming-small { font-size: 12px; letter-spacing: 0.16em; opacity: 0.85; }
.incoming-avatar, .avatar-big {
  width: 100px;
  height: 100px;
  border-radius: 28px;
  margin: 0 auto 16px;
  display: grid;
  place-items: center;
  font-size: 44px;
  font-weight: 900;
  background: linear-gradient(135deg, #ff2a6d, #7e7bff);
  box-shadow: 0 18px 60px rgba(140, 110, 255, 0.32);
}
.avatar-big { width: 88px; height: 88px; font-size: 36px; }
.avatar-big.remote { background: linear-gradient(135deg, #3d4eff, #34d2b2); }
.incoming-text h2 { margin: 0; font-size: 28px; }
.incoming-text p { margin: 8px 0 0; opacity: 0.8; }
.incoming-meta, .hero-badges, .tools-pills, .video-chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.incoming-meta { justify-content: center; margin: 16px 0 18px; }
.meta-pill, .hero-badge, .tool-pill, .video-chip, .mini-pill {
  padding: 9px 12px;
  border-radius: 999px;
  font-size: 12px;
  border: 1px solid rgba(255,255,255,0.10);
  background: rgba(255,255,255,0.06);
}
.hero-badge.ok { border-color: rgba(54, 210, 141, 0.28); }
.hero-badge.bad, .video-chip.badchip { border-color: rgba(255, 88, 120, 0.28); }
.hero-badge.accent { background: linear-gradient(135deg, rgba(255,42,109,0.22), rgba(126,123,255,0.22)); }

.btn, .dyn-btn, .control-btn, .icon-btn {
  border: 0;
  color: #fff;
  cursor: pointer;
  transition: transform 0.18s ease, opacity 0.18s ease, background 0.18s ease;
}
.btn:hover, .dyn-btn:hover, .control-btn:hover, .icon-btn:hover { transform: translateY(-1px); }
.btn {
  min-height: 48px;
  padding: 0 18px;
  border-radius: 18px;
  font-weight: 800;
}
.reject, .danger { background: rgba(150, 19, 56, 0.78); }
.accept, .btn.accept { background: linear-gradient(135deg, #34d28d, #27c0ff); }
.incoming-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

.topbar {
  position: sticky;
  top: 12px;
  z-index: 30;
  display: flex;
  align-items: center;
  gap: 14px;
  margin: 12px 16px 0;
  padding: 12px 16px;
  border-radius: 24px;
}
.icon-btn {
  width: 46px;
  height: 46px;
  border-radius: 16px;
  background: rgba(255,255,255,0.08);
}
.title-wrap { flex: 1; min-width: 0; }
.call-title { font-size: 18px; font-weight: 900; }
.call-subtitle { opacity: 0.8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.status-pill {
  padding: 10px 14px;
  border-radius: 999px;
  background: rgba(255,255,255,0.07);
  border: 1px solid rgba(255,255,255,0.10);
  font-size: 12px;
  font-weight: 800;
}
.status-pill.live { border-color: rgba(51,210,141,0.30); }
.status-pill.warn { border-color: rgba(255,191,71,0.30); }
.status-pill.bad { border-color: rgba(255,88,120,0.30); }

.dynamic-strip, .call-hero, .tools-strip {
  margin: 14px 16px 0;
  padding: 16px;
  border-radius: 24px;
}
.dynamic-strip, .tools-strip {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
}
.dynamic-center { display: flex; gap: 10px; flex-wrap: wrap; }
.dyn-btn {
  min-height: 42px;
  padding: 0 14px;
  border-radius: 14px;
  background: rgba(255,255,255,0.08);
}
.dynamic-text { font-size: 14px; opacity: 0.88; }

.call-hero {
  display: grid;
  gap: 18px;
  grid-template-columns: 1.4fr 0.9fr;
}
.hero-kicker {
  font-size: 12px;
  letter-spacing: 0.16em;
  opacity: 0.82;
  margin-bottom: 8px;
}
.hero-title {
  margin: 0;
  font-size: clamp(30px, 4vw, 52px);
  line-height: 1.03;
}
.hero-sub { margin-top: 10px; opacity: 0.82; max-width: 800px; }
.hero-badges { margin-top: 18px; }
.hero-right {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
.hero-stat {
  border-radius: 22px;
  padding: 16px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.08);
}
.hero-stat-num { font-size: 28px; font-weight: 900; }
.hero-stat-lab { opacity: 0.72; margin-top: 4px; }

.call-stage {
  position: relative;
  z-index: 2;
  display: grid;
  gap: 14px;
  grid-template-columns: 1.25fr 0.75fr;
  padding: 16px 16px 0;
}
.call-stage.audioOnly { grid-template-columns: 1fr 0.8fr; }
.video-card {
  position: relative;
  min-height: 54vh;
  border-radius: 28px;
  overflow: hidden;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.09);
}
.video-card.activeCard { box-shadow: 0 18px 70px rgba(90, 132, 255, 0.22); }
.video-card.reconnecting { box-shadow: 0 18px 70px rgba(255, 191, 71, 0.12); }
.video-topbar,
.video-bottom-state {
  position: absolute;
  left: 14px;
  right: 14px;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.video-topbar { top: 14px; }
.video-bottom-state { bottom: 14px; opacity: 0.82; }
.video-label { font-size: 12px; letter-spacing: 0.14em; opacity: 0.84; }
.video-el {
  width: 100%;
  height: 100%;
  object-fit: cover;
  background: #040811;
}
.video-el.local-self { transform: scaleX(-1); }
.video-placeholder {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  text-align: center;
  padding: 24px;
}
.placeholder-name { font-size: 22px; font-weight: 900; }
.placeholder-sub { margin-top: 8px; opacity: 0.76; }

.tools-strip { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.tools-title { font-size: 12px; letter-spacing: 0.14em; opacity: 0.8; margin-bottom: 10px; }

.controls {
  position: fixed;
  left: 50%;
  bottom: 14px;
  z-index: 40;
  transform: translateX(-50%);
  width: calc(100vw - 24px);
  max-width: 980px;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  padding: 14px;
  border-radius: 26px;
  background: rgba(10, 16, 30, 0.72);
  backdrop-filter: blur(18px);
  border: 1px solid rgba(255,255,255,0.09);
}
.control-btn {
  min-width: 90px;
  height: 50px;
  padding: 0 14px;
  border-radius: 16px;
  background: rgba(255,255,255,0.08);
  font-weight: 800;
}
.control-btn.off { opacity: 0.8; }
.control-btn.danger { background: linear-gradient(135deg, #ea385c, #a40f5f); }

.fadeUp-enter-active, .fadeUp-leave-active { transition: all 0.26s ease; }
.fadeUp-enter-from, .fadeUp-leave-to { opacity: 0; transform: translateY(18px) scale(0.98); }

@media (max-width: 980px) {
  .call-hero, .tools-strip, .call-stage { grid-template-columns: 1fr; }
  .video-card { min-height: 40vh; }
}
@media (max-width: 640px) {
  .topbar { margin-left: 12px; margin-right: 12px; padding: 12px; }
  .dynamic-strip, .call-hero, .tools-strip { margin-left: 12px; margin-right: 12px; border-radius: 22px; }
  .call-stage { gap: 10px; padding: 0 12px 128px; }
  .video-card { border-radius: 22px; min-height: 32vh; }
  .control-btn { min-width: 82px; height: 48px; padding: 0 12px; font-size: 13px; }
  .call-title { font-size: 16px; }
  .call-subtitle { font-size: 12px; }
}
</style>
