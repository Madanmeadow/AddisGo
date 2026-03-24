<template>
  <Layout>
    <div
      class="call-page"
      :class="{
        audioMode: isAudioOnly,
        connected: inCall,
        reconnecting: isRecoveringState,
        compactUi: compactUi,
      }"
    >
      <div class="bg bg1"></div>
      <div class="bg bg2"></div>
      <div class="bg bg3"></div>

      <transition name="fadeUp">
        <div v-if="incomingCall && !inCall" class="incoming-overlay">
          <div class="incoming-card">
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
              <span class="meta-pill">Secure RTC</span>
              <span class="meta-pill">{{ socketConnected ? "Online" : "Offline" }}</span>
            </div>

            <div class="incoming-actions">
              <button class="btn reject" @click="rejectIncoming">Decline</button>
              <button class="btn accept" @click="acceptIncoming">Answer</button>
            </div>
          </div>
        </div>
      </transition>

      <header class="topbar">
        <button class="icon-btn" @click="goBack" aria-label="Back">←</button>

        <div class="title-wrap">
          <div class="call-title">{{ callModeLabel }}</div>
          <div class="call-subtitle">
            {{ callPartnerName }}
            <span v-if="inCall && callSeconds > 0"> • {{ formattedDuration }}</span>
          </div>
        </div>

        <div class="topbar-actions">
          <button class="mini-icon-btn" @click="toggleUiDensity" :aria-label="compactUi ? 'Expand controls' : 'Compact controls'">
            {{ compactUi ? "▣" : "▢" }}
          </button>
          <span class="status-pill" :class="statusPillClass">{{ connectionLabel }}</span>
        </div>
      </header>

      <section class="quick-strip glassy">
        <div class="quick-left">
          <span class="signal-dot" :class="{ on: socketConnected }"></span>
          <span class="quick-text">{{ socketConnected ? "Realtime Connected" : "Realtime Offline" }}</span>
        </div>

        <div class="quick-right">
          <span class="mini-pill">{{ isAudioOnly ? "Audio" : "Video" }}</span>
          <span class="mini-pill">{{ qualityLabel }}</span>
          <span class="mini-pill">{{ remoteTrackSummary }}</span>
        </div>
      </section>

      <section class="call-hero glassy" v-if="!compactUi">
        <div class="hero-main">
          <div class="hero-kicker">DIRECT CALL</div>
          <h1 class="hero-title">{{ callPartnerName }}</h1>
          <div class="hero-sub">
            {{ isAudioOnly ? "Crystal audio call." : "Video call with safer reconnect, cleaner controls, and stronger mobile layout." }}
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
            <span class="hero-badge accent">⏱ {{ formattedDuration }}</span>
          </div>
        </div>

        <div class="hero-mini">
          <div class="mini-stat">
            <div class="mini-num">{{ inCall ? "LIVE" : "IDLE" }}</div>
            <div class="mini-lab">State</div>
          </div>
          <div class="mini-stat">
            <div class="mini-num">{{ micMuted ? "OFF" : "ON" }}</div>
            <div class="mini-lab">Mic</div>
          </div>
          <div class="mini-stat">
            <div class="mini-num">{{ isAudioOnly ? "AUDIO" : (cameraOff ? "OFF" : "ON") }}</div>
            <div class="mini-lab">Camera</div>
          </div>
          <div class="mini-stat">
            <div class="mini-num">{{ speakerEnabled ? "ON" : "LOW" }}</div>
            <div class="mini-lab">Speaker</div>
          </div>
        </div>
      </section>

      <main class="call-stage" :class="{ audioOnly: isAudioOnly, focusedRemote: focusRemote }">
        <section
          class="video-card remote-card"
          :class="{ activeCard: focusRemote, speaking: remoteSpeaking, reconnecting: isRecoveringState }"
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
              {{
                remoteVideoOff
                  ? "Camera off"
                  : remoteAudioOnly
                    ? "Audio only"
                    : "Waiting for video..."
              }}
            </div>
          </div>

          <div class="video-bottom-state">
            <span class="state-dot" :class="{ on: !!remoteStream }"></span>
            <span>{{ peerStateLabel }}</span>
          </div>
        </section>

        <section
          class="video-card local-card"
          :class="{ activeCard: !focusRemote, speaking: localSpeaking, collapsed: compactUi && !isAudioOnly }"
          @click="focusRemote = false"
        >
          <div class="video-topbar">
            <div class="video-label">You</div>
            <div class="video-chip-row">
              <span class="video-chip">{{ micMuted ? "Muted" : "Mic Live" }}</span>
              <span v-if="!isAudioOnly" class="video-chip">{{ cameraOff ? "Cam Off" : "Cam On" }}</span>
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

      <section class="tools-strip glassy" v-if="!compactUi">
        <div class="tools-col">
          <div class="tools-title">Connection</div>
          <div class="tools-pills">
            <span class="tool-pill">{{ connectionLabel }}</span>
            <span class="tool-pill">{{ qualityLabel }}</span>
            <span class="tool-pill">{{ pcConnectionStateLabel }}</span>
          </div>
        </div>

        <div class="tools-col">
          <div class="tools-title">Media</div>
          <div class="tools-pills">
            <span class="tool-pill">{{ localMediaLabel }}</span>
            <span class="tool-pill">{{ remoteTrackSummary }}</span>
            <span class="tool-pill">{{ currentFacingMode }}</span>
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

        <button class="control-btn" @click="recoverMedia" :disabled="recoveringMedia || !navigatorOnline">
          {{ recoveringMedia ? "Recovering…" : "Recover" }}
        </button>

        <button class="control-btn" @click="copyCallDiagnostics">Debug</button>

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
import Layout from "../components/Layout.vue"
import socket, { refreshSocketAuth } from "../socket"

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

const roomId = ref(route.query.roomId || "")
const kind = ref(route.query.kind || "video")
const mode = ref(route.query.mode || route.query.role || "caller")
const toUserId = ref(route.query.toUserId || route.query.userId || "")
const initialPartnerName = ref(route.query.name || "User")

const pc = ref(null)
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
const focusRemote = ref(true)
const compactUi = ref(window.innerWidth <= 640)
const navigatorOnline = ref(typeof navigator !== "undefined" ? navigator.onLine : true)

const hasRemoteDescription = ref(false)
const cleaningUp = ref(false)
const requestSent = ref(false)
const reconnectAttempted = ref(false)
const negotiationBusy = ref(false)
const makingOffer = ref(false)
const socketConnected = ref(socket.connected)

const statusText = ref("Ready")
const hostUserId = ref("")
const isCaller = ref(mode.value === "caller")

const pendingCandidates = []
let healthCheckTimer = null
let reconnectDebounce = null

const callStartedAt = ref(null)
const callSeconds = ref(0)
let callTimer = null

const remoteAudioOnly = ref(false)
const remoteVideoOff = ref(false)
const localSpeaking = ref(false)
const remoteSpeaking = ref(false)

let statsTimer = null
let localAudioMonitor = null
let remoteAudioMonitor = null
let audioContext = null

const isAudioOnly = computed(() => kind.value === "audio")

const callPartnerName = computed(() => {
  if (incomingCall.value?.fromName) return incomingCall.value.fromName
  return initialPartnerName.value || "User"
})

const callModeLabel = computed(() => {
  if (incomingCall.value && !inCall.value) return "Incoming Call"
  return isAudioOnly.value ? "Audio Call" : "Video Call"
})

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

const myInitial = computed(() => {
  const name = me?.display_name || me?.username || "Y"
  return String(name).trim().charAt(0).toUpperCase() || "Y"
})

const remoteInitial = computed(() => {
  const name = callPartnerName.value || "U"
  return String(name).trim().charAt(0).toUpperCase() || "U"
})

const callerInitial = computed(() => {
  const name = incomingCall.value?.fromName || "C"
  return String(name).trim().charAt(0).toUpperCase() || "C"
})

const statusPillClass = computed(() => ({
  live: inCall.value && !isRecoveringState.value,
  warn: isRecoveringState.value,
  bad: !socketConnected.value || !navigatorOnline.value,
}))

const isRecoveringState = computed(() =>
  ["Recovering...", "Recovering media...", "Reconnecting...", "Connecting...", "Answering...", "Joining..."]
    .includes(statusText.value)
)

const remoteTrackSummary = computed(() => {
  if (!remoteStream.value) return "No remote"
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

const peerStateLabel = computed(() => {
  if (!pc.value) return "No peer"
  return pc.value.connectionState || pc.value.iceConnectionState || "Waiting"
})

const pcConnectionStateLabel = computed(() => {
  if (!pc.value) return "No peer"
  return pc.value.connectionState || "Unknown"
})

const qualityLabel = computed(() => {
  if (!pc.value) return "Idle"
  const state = pc.value.connectionState
  if (state === "connected") return "Strong"
  if (state === "connecting") return "Linking"
  if (state === "disconnected") return "Weak"
  if (state === "failed") return "Repairing"
  return "Standby"
})

function toggleUiDensity() {
  compactUi.value = !compactUi.value
}

function getMyUserId() {
  return String(me?.id || "")
}

function isOfferOwner() {
  const myUserId = getMyUserId()
  return hostUserId.value ? hostUserId.value === myUserId : isCaller.value
}

function safePlay(videoEl) {
  if (!videoEl) return
  videoEl.play?.().catch(() => {})
}

function authHeaders(json = false) {
  const h = {}
  if (json) h["Content-Type"] = "application/json"
  if (token) h["Authorization"] = `Bearer ${token}`
  return h
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

function stopMonitor(refObj) {
  try { refObj?.source?.disconnect?.() } catch {}
  try { refObj?.analyser?.disconnect?.() } catch {}
}

function createSpeakingMonitor(stream, type = "local") {
  if (!stream?.getAudioTracks?.().length) return null
  try {
    ensureAudioContext()
    if (!audioContext) return null

    const source = audioContext.createMediaStreamSource(stream)
    const analyser = audioContext.createAnalyser()
    analyser.fftSize = 256
    analyser.smoothingTimeConstant = 0.82
    const data = new Uint8Array(analyser.frequencyBinCount)
    source.connect(analyser)

    return { source, analyser, data, type }
  } catch (err) {
    console.warn("createSpeakingMonitor failed", type, err)
    return null
  }
}

function setStatus(text) {
  statusText.value = text
}

function queueRecover(reason = "") {
  if (reconnectDebounce) clearTimeout(reconnectDebounce)
  reconnectDebounce = setTimeout(() => {
    maybeRecoverConnection(reason)
  }, 300)
}

function bindSocketEvents() {
  socketConnected.value = socket.connected

  socket.on("connect", async () => {
    socketConnected.value = true
    if (token) refreshSocketAuth()

    if (roomId.value && inCall.value) {
      try {
        joinCallRoom()
        await maybeRecoverConnection("socket reconnect")
      } catch (err) {
        console.error("socket reconnect recovery error", err)
      }
    }
  })

  socket.on("disconnect", () => {
    socketConnected.value = false
    if (inCall.value) setStatus("Reconnecting...")
  })

  socket.on("call:ringing", (data = {}) => {
    if (data.roomId) roomId.value = String(data.roomId)
    if (data.kind) kind.value = data.kind
    setStatus("Ringing...")
  })

  socket.on("call:status", ({ calleeOnline } = {}) => {
    setStatus(calleeOnline ? "Calling..." : "Queued")
  })

  socket.on("call:incoming", (data = {}) => {
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
    setStatus("Incoming")
  })

  socket.on("call:accepted", async (data = {}) => {
    if (data.roomId) roomId.value = String(data.roomId)
    if (data.kind) kind.value = data.kind
    if (data.hostUserId) hostUserId.value = String(data.hostUserId)

    setStatus("Accepted")

    await ensureLocalMedia()
    joinCallRoom()
  })

  socket.on("call:peer-joined", async () => {
    if (!pc.value) await createPeerConnection()
  })

  socket.on("call:ready", async (data = {}) => {
    if (data.roomId) roomId.value = String(data.roomId)
    if (data.kind) kind.value = data.kind
    if (data.hostUserId) hostUserId.value = String(data.hostUserId)

    setStatus("Connecting...")

    if (!pc.value) await createPeerConnection()
    if (isOfferOwner() && !makingOffer.value) await createAndSendOffer(false)
  })

  socket.on("call:webrtc:offer", async ({ roomId: incomingRoomId, offer, from } = {}) => {
    try {
      if (incomingRoomId) roomId.value = String(incomingRoomId)
      setStatus("Answering...")

      if (!pc.value) await createPeerConnection()

      const offerCollision = offer && makingOffer.value
      const polite = !isOfferOwner()
      if (offerCollision && !polite) return

      await pc.value.setRemoteDescription(new RTCSessionDescription(offer))
      hasRemoteDescription.value = true
      await flushPendingIceCandidates()

      const answer = await pc.value.createAnswer()
      await pc.value.setLocalDescription(answer)

      socket.emit("call:webrtc:answer", {
        roomId: roomId.value,
        answer: pc.value.localDescription,
        to: from,
      })
    } catch (err) {
      console.error("call:webrtc:offer error", err)
    }
  })

  socket.on("call:webrtc:answer", async ({ answer } = {}) => {
    try {
      if (!pc.value) return
      await pc.value.setRemoteDescription(new RTCSessionDescription(answer))
      hasRemoteDescription.value = true
      await flushPendingIceCandidates()
      setStatus("Connected")
      markCallStarted()
    } catch (err) {
      console.error("call:webrtc:answer error", err)
    }
  })

  socket.on("call:webrtc:ice", async ({ candidate } = {}) => {
    try {
      if (!candidate || !pc.value) return
      if (hasRemoteDescription.value && pc.value.remoteDescription) {
        await pc.value.addIceCandidate(new RTCIceCandidate(candidate))
      } else {
        pendingCandidates.push(candidate)
      }
    } catch (err) {
      console.error("call:webrtc:ice error", err)
    }
  })

  socket.on("call:ended", () => {
    setStatus("Call ended")
    cleanupAll()
    router.back()
  })

  socket.on("call:error", ({ message } = {}) => {
    setStatus(message || "Error")
  })

  socket.on("call:busy", ({ message } = {}) => {
    setStatus(message || "Busy")
  })
}

async function getIceServers() {
  try {
    const res = await fetch(`${API_BASE}/api/turn`, { headers: authHeaders(false) })
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data?.iceServers) && data.iceServers.length) return data.iceServers
    }
  } catch {}

  return [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ]
}

async function applySenderParameters() {
  if (!pc.value) return
  const senders = pc.value.getSenders()

  for (const sender of senders) {
    if (!sender?.track) continue
    try {
      const params = sender.getParameters() || {}
      if (!params.encodings) params.encodings = [{}]

      if (sender.track.kind === "video") {
        params.degradationPreference = "balanced"
        params.encodings[0].maxBitrate = 1200 * 1000
        params.encodings[0].maxFramerate = 30
      }

      if (sender.track.kind === "audio") {
        params.encodings[0].maxBitrate = 64 * 1000
      }

      await sender.setParameters(params)
    } catch {}
  }
}

async function createPeerConnection() {
  if (pc.value) return pc.value

  const iceServers = await getIceServers()
  pc.value = new RTCPeerConnection({ iceServers, iceCandidatePoolSize: 10 })

  if (localStream.value) {
    const senders = pc.value.getSenders()
    localStream.value.getTracks().forEach((track) => {
      const exists = senders.some((s) => s.track && s.track.kind === track.kind)
      if (!exists) pc.value.addTrack(track, localStream.value)
    })
  }

  pc.value.onicecandidate = (event) => {
    if (event.candidate && roomId.value) {
      socket.emit("call:webrtc:ice", { roomId: roomId.value, candidate: event.candidate })
    }
  }

  pc.value.ontrack = (event) => {
    const stream = event.streams?.[0]
    if (!stream) return

    remoteStream.value = stream
    stopMonitor(remoteAudioMonitor)
    remoteAudioMonitor = createSpeakingMonitor(stream, "remote")

    const remoteVideoTrack = stream.getVideoTracks?.()[0]
    const remoteAudioTrack = stream.getAudioTracks?.()[0]

    remoteAudioOnly.value = !remoteVideoTrack
    remoteVideoOff.value = remoteVideoTrack ? !remoteVideoTrack.enabled : true

    if (remoteVideoTrack) {
      remoteVideoTrack.onmute = () => { remoteVideoOff.value = true }
      remoteVideoTrack.onunmute = () => { remoteVideoOff.value = false }
      remoteVideoTrack.onended = () => {
        remoteVideoOff.value = true
        queueRecover("remote video ended")
      }
    }

    if (remoteAudioTrack) {
      remoteAudioTrack.onended = () => {
        queueRecover("remote audio ended")
      }
    }

    if (remoteVideo.value) {
      remoteVideo.value.srcObject = stream
      remoteVideo.value.muted = false
      remoteVideo.value.volume = speakerEnabled.value ? 1 : 0.25
      safePlay(remoteVideo.value)
    }

    setStatus("Connected")
    markCallStarted()
  }

  pc.value.onconnectionstatechange = async () => {
    const state = pc.value?.connectionState

    if (state === "connected") {
      reconnectAttempted.value = false
      setStatus("Connected")
      markCallStarted()
      await applySenderParameters()
      return
    }

    if (state === "connecting") {
      setStatus("Connecting...")
      return
    }

    if (state === "disconnected") {
      setStatus("Reconnecting...")
      queueRecover("connection disconnected")
      return
    }

    if (state === "failed" && !reconnectAttempted.value) {
      reconnectAttempted.value = true
      setStatus("Recovering...")
      await maybeRecoverConnection("connection failed")
      return
    }

    if (state === "closed") setStatus("Closed")
  }

  pc.value.oniceconnectionstatechange = async () => {
    const state = pc.value?.iceConnectionState
    if (state === "failed") {
      setStatus("Recovering...")
      await maybeRecoverConnection("ice failed")
    } else if (state === "disconnected") {
      setStatus("Reconnecting...")
      queueRecover("ice disconnected")
    }
  }

  pc.value.onnegotiationneeded = async () => {
    if (!roomId.value || !isOfferOwner()) return
    if (negotiationBusy.value) return

    try {
      negotiationBusy.value = true
      await createAndSendOffer(false)
    } catch (err) {
      console.error("onnegotiationneeded error", err)
    } finally {
      negotiationBusy.value = false
    }
  }

  await applySenderParameters()
  return pc.value
}

async function createAndSendOffer(iceRestart = false) {
  if (!pc.value || !roomId.value) return

  try {
    makingOffer.value = true

    const offer = await pc.value.createOffer({
      iceRestart,
      offerToReceiveAudio: true,
      offerToReceiveVideo: !isAudioOnly.value,
    })

    if (pc.value.signalingState !== "stable" && !iceRestart) return

    await pc.value.setLocalDescription(offer)
    socket.emit("call:webrtc:offer", { roomId: roomId.value, offer: pc.value.localDescription })
  } finally {
    makingOffer.value = false
  }
}

function getAudioConstraints() {
  return {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    channelCount: 1,
    sampleRate: 48000,
    sampleSize: 16,
  }
}

function getVideoConstraints() {
  if (isAudioOnly.value) return false
  return {
    facingMode: currentFacingMode.value,
    width: { ideal: 1280, max: 1280 },
    height: { ideal: 720, max: 720 },
    frameRate: { ideal: 24, max: 30 },
  }
}

async function enhanceLocalTracks(stream) {
  const audioTrack = stream.getAudioTracks?.()[0]
  const videoTrack = stream.getVideoTracks?.()[0]

  if (audioTrack) audioTrack.onended = async () => { await recoverMedia() }
  if (videoTrack) {
    videoTrack.onended = async () => {
      if (!isAudioOnly.value && !cameraOff.value) await recoverMedia()
    }
  }
}

async function ensureLocalMedia(force = false) {
  if (localStream.value && !force) return localStream.value

  if (force && localStream.value) {
    stopStream(localStream.value)
    localStream.value = null
  }

  const constraints = { audio: getAudioConstraints(), video: getVideoConstraints() }
  const stream = await navigator.mediaDevices.getUserMedia(constraints)
  await enhanceLocalTracks(stream)

  localStream.value = stream
  stopMonitor(localAudioMonitor)
  localAudioMonitor = createSpeakingMonitor(stream, "local")

  if (localVideo.value && !isAudioOnly.value) {
    localVideo.value.srcObject = stream
    safePlay(localVideo.value)
  }

  if (pc.value) {
    const senders = pc.value.getSenders()
    for (const track of stream.getTracks()) {
      const sender = senders.find((s) => s.track && s.track.kind === track.kind)
      if (sender) await sender.replaceTrack(track)
      else pc.value.addTrack(track, stream)
    }
    await applySenderParameters()
  }

  return stream
}

async function switchCamera() {
  if (isAudioOnly.value) return
  if (!pc.value || !localStream.value || switchingCamera.value) return

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
      video: {
        facingMode: currentFacingMode.value,
        width: { ideal: 1280, max: 1280 },
        height: { ideal: 720, max: 720 },
        frameRate: { ideal: 24, max: 30 },
      },
    })

    const newVideoTrack = newStream.getVideoTracks()[0]
    if (!newVideoTrack) return

    const videoSender = pc.value.getSenders().find((sender) => sender.track && sender.track.kind === "video")
    if (videoSender) await videoSender.replaceTrack(newVideoTrack)

    const audioTracks = localStream.value.getAudioTracks()
    const oldVideoTracks = localStream.value.getVideoTracks()
    oldVideoTracks.forEach((track) => { try { track.stop() } catch {} })

    localStream.value = new MediaStream([...audioTracks, newVideoTrack])
    await enhanceLocalTracks(localStream.value)
    stopMonitor(localAudioMonitor)
    localAudioMonitor = createSpeakingMonitor(localStream.value, "local")

    if (localVideo.value) {
      localVideo.value.srcObject = localStream.value
      safePlay(localVideo.value)
    }

    cameraOff.value = false
    await applySenderParameters()
    if (isOfferOwner()) await createAndSendOffer(false)
  } catch (err) {
    console.error("switchCamera error", err)
    setStatusBrief("Camera switch failed")
  } finally {
    switchingCamera.value = false
  }
}

async function flushPendingIceCandidates() {
  if (!pc.value || !hasRemoteDescription.value) return

  while (pendingCandidates.length) {
    const candidate = pendingCandidates.shift()
    try {
      await pc.value.addIceCandidate(new RTCIceCandidate(candidate))
    } catch (err) {
      console.error("flush candidate error", err)
    }
  }
}

async function maybeRecoverConnection() {
  if (!navigatorOnline.value) return

  try {
    if (!pc.value) await createPeerConnection()
    if (isOfferOwner()) await createAndSendOffer(true)
  } catch (err) {
    console.error("maybeRecoverConnection error", err)
  }
}

async function recoverMedia() {
  if (recoveringMedia.value || !navigatorOnline.value) return

  recoveringMedia.value = true
  setStatus("Recovering media...")

  try {
    await ensureLocalMedia(true)
    if (pc.value && isOfferOwner()) await createAndSendOffer(true)
    setStatus("Connected")
  } catch (err) {
    console.error("recoverMedia error", err)
    setStatus("Recovery failed")
  } finally {
    recoveringMedia.value = false
  }
}

function startStatsWatcher() {
  stopStatsWatcher()
  statsTimer = setInterval(async () => {
    if (!pc.value) return
    try {
      const stats = await pc.value.getStats()
      let inboundVideoFound = false
      let inboundAudioFound = false

      stats.forEach((report) => {
        if (report.type === "inbound-rtp" && report.kind === "video") inboundVideoFound = true
        if (report.type === "inbound-rtp" && report.kind === "audio") inboundAudioFound = true
      })

      remoteAudioOnly.value = inboundAudioFound && !inboundVideoFound
      if (!inboundVideoFound && !isAudioOnly.value && inCall.value) remoteVideoOff.value = true

      if (localAudioMonitor?.analyser) {
        const d = localAudioMonitor.data
        localAudioMonitor.analyser.getByteFrequencyData(d)
        let sum = 0
        for (let i = 0; i < d.length; i++) sum += d[i]
        localSpeaking.value = (sum / (d.length * 255)) > 0.08
      }

      if (remoteAudioMonitor?.analyser) {
        const d = remoteAudioMonitor.data
        remoteAudioMonitor.analyser.getByteFrequencyData(d)
        let sum = 0
        for (let i = 0; i < d.length; i++) sum += d[i]
        remoteSpeaking.value = (sum / (d.length * 255)) > 0.08
      }
    } catch {}
  }, 2500)
}

function stopStatsWatcher() {
  if (statsTimer) {
    clearInterval(statsTimer)
    statsTimer = null
  }
}

function startHealthChecks() {
  stopHealthChecks()
  healthCheckTimer = setInterval(async () => {
    if (!inCall.value || !socketConnected.value || !navigatorOnline.value) return
    const connectionState = pc.value?.connectionState
    if (["failed", "disconnected"].includes(connectionState)) await maybeRecoverConnection()
  }, 6000)
}

function stopHealthChecks() {
  if (healthCheckTimer) {
    clearInterval(healthCheckTimer)
    healthCheckTimer = null
  }
}

function setStatusBrief(text) {
  const old = statusText.value
  statusText.value = text
  setTimeout(() => {
    if (statusText.value === text && inCall.value) statusText.value = "Connected"
    else if (statusText.value === text) statusText.value = old
  }, 1800)
}

async function requestOutgoingCall() {
  if (!toUserId.value || requestSent.value) return
  requestSent.value = true
  isCaller.value = true
  setStatus("Starting...")

  await ensureLocalMedia()
  socket.emit("call:request", { toUserId: String(toUserId.value), kind: kind.value })
}

function joinCallRoom() {
  if (!roomId.value) return
  socket.emit("call:join", { roomId: roomId.value })
  setStatus("Joining...")
}

function markCallStarted() {
  if (!inCall.value) {
    inCall.value = true
    callStartedAt.value = Date.now()
  }

  if (callTimer) clearInterval(callTimer)
  callTimer = setInterval(() => {
    if (!callStartedAt.value) return
    callSeconds.value = Math.floor((Date.now() - callStartedAt.value) / 1000)
  }, 1000)

  startStatsWatcher()
  startHealthChecks()
}

async function acceptIncoming() {
  try {
    if (!incomingCall.value) return

    roomId.value = String(incomingCall.value.roomId)
    kind.value = incomingCall.value.kind || "video"
    mode.value = "receiver"
    isCaller.value = false
    hostUserId.value = String(incomingCall.value.fromUserId || "")
    setStatus("Accepted")

    await ensureLocalMedia()
    socket.emit("call:accept", { roomId: roomId.value })
    joinCallRoom()
    incomingCall.value = null
  } catch (err) {
    console.error("acceptIncoming error", err)
    alert("Could not answer the call.")
  }
}

function rejectIncoming() {
  if (!incomingCall.value) return
  socket.emit("call:reject", { roomId: incomingCall.value.roomId })
  incomingCall.value = null
  setStatus("Declined")
}

function toggleMic() {
  if (!localStream.value) return
  const audioTracks = localStream.value.getAudioTracks()
  if (!audioTracks.length) return
  micMuted.value = !micMuted.value
  audioTracks.forEach((track) => { track.enabled = !micMuted.value })
}

async function toggleCamera() {
  if (!localStream.value) return
  const videoTracks = localStream.value.getVideoTracks()
  if (!videoTracks.length) return
  cameraOff.value = !cameraOff.value
  videoTracks.forEach((track) => { track.enabled = !cameraOff.value })
  if (pc.value && isOfferOwner()) await createAndSendOffer(false)
}

function toggleSpeaker() {
  speakerEnabled.value = !speakerEnabled.value
  if (remoteVideo.value) {
    remoteVideo.value.muted = false
    remoteVideo.value.volume = speakerEnabled.value ? 1 : 0.25
  }
}

function minimizeCurrentCall() {
  router.push("/dashboard")
}

function endCall() {
  if (roomId.value) socket.emit("call:end", { roomId: roomId.value })
  cleanupAll()
  router.back()
}

function goBack() {
  if (inCall.value) {
    minimizeCurrentCall()
    return
  }
  if (roomId.value) {
    endCall()
    return
  }
  router.back()
}

async function copyCallDiagnostics() {
  const diag = {
    roomId: roomId.value,
    kind: kind.value,
    mode: mode.value,
    toUserId: toUserId.value,
    partner: callPartnerName.value,
    socketConnected: socketConnected.value,
    navigatorOnline: navigatorOnline.value,
    status: statusText.value,
    inCall: inCall.value,
    localStream: !!localStream.value,
    remoteStream: !!remoteStream.value,
    micMuted: micMuted.value,
    cameraOff: cameraOff.value,
    speakerEnabled: speakerEnabled.value,
    compactUi: compactUi.value,
    connectionState: pc.value?.connectionState || "",
    iceConnectionState: pc.value?.iceConnectionState || "",
    signalingState: pc.value?.signalingState || "",
    currentFacingMode: currentFacingMode.value,
    remoteAudioOnly: remoteAudioOnly.value,
    remoteVideoOff: remoteVideoOff.value,
    duration: formattedDuration.value,
    at: new Date().toISOString(),
  }

  try {
    await navigator.clipboard.writeText(JSON.stringify(diag, null, 2))
    setStatusBrief("Diagnostics copied")
  } catch {
    alert(JSON.stringify(diag, null, 2))
  }
}

function stopStream(stream) {
  if (!stream) return
  stream.getTracks().forEach((track) => {
    try { track.stop() } catch {}
  })
}

function cleanupPeer() {
  if (pc.value) {
    try {
      pc.value.ontrack = null
      pc.value.onicecandidate = null
      pc.value.onconnectionstatechange = null
      pc.value.oniceconnectionstatechange = null
      pc.value.onnegotiationneeded = null
      pc.value.close()
    } catch {}
    pc.value = null
  }

  hasRemoteDescription.value = false
  pendingCandidates.length = 0
}

function cleanupAll() {
  if (cleaningUp.value) return
  cleaningUp.value = true

  stopStatsWatcher()
  stopHealthChecks()
  if (reconnectDebounce) clearTimeout(reconnectDebounce)

  if (callTimer) {
    clearInterval(callTimer)
    callTimer = null
  }

  stopStream(localStream.value)
  localStream.value = null
  remoteStream.value = null

  if (localVideo.value) localVideo.value.srcObject = null
  if (remoteVideo.value) remoteVideo.value.srcObject = null

  cleanupPeer()
  stopMonitor(localAudioMonitor)
  stopMonitor(remoteAudioMonitor)
  localAudioMonitor = null
  remoteAudioMonitor = null

  incomingCall.value = null
  inCall.value = false
  callStartedAt.value = null
  callSeconds.value = 0
  micMuted.value = false
  cameraOff.value = kind.value === "audio"
  switchingCamera.value = false
  recoveringMedia.value = false
  statusText.value = "Ready"
  requestSent.value = false
  reconnectAttempted.value = false
  currentFacingMode.value = "user"
  remoteAudioOnly.value = false
  remoteVideoOff.value = false
  negotiationBusy.value = false
  makingOffer.value = false
  localSpeaking.value = false
  remoteSpeaking.value = false

  cleaningUp.value = false
}

async function onVisibilityChange() {
  if (document.visibilityState === "visible" && inCall.value) {
    try {
      if (localVideo.value && localStream.value && !isAudioOnly.value) {
        localVideo.value.srcObject = localStream.value
        safePlay(localVideo.value)
      }
      if (remoteVideo.value && remoteStream.value && !isAudioOnly.value) {
        remoteVideo.value.srcObject = remoteStream.value
        safePlay(remoteVideo.value)
      }
      await maybeRecoverConnection()
    } catch (err) {
      console.error("visibility recovery error", err)
    }
  }
}

function onResize() {
  if (window.innerWidth <= 640) compactUi.value = true
}

function onNetworkOnline() {
  navigatorOnline.value = true
  if (inCall.value) queueRecover("network online")
}

function onNetworkOffline() {
  navigatorOnline.value = false
  if (inCall.value) setStatus("Reconnecting...")
}

function unbindSocketEvents() {
  socket.off("connect")
  socket.off("disconnect")
  socket.off("call:ringing")
  socket.off("call:status")
  socket.off("call:incoming")
  socket.off("call:accepted")
  socket.off("call:peer-joined")
  socket.off("call:ready")
  socket.off("call:webrtc:offer")
  socket.off("call:webrtc:answer")
  socket.off("call:webrtc:ice")
  socket.off("call:ended")
  socket.off("call:error")
  socket.off("call:busy")
}

watch(() => socket.connected, (v) => { socketConnected.value = v }, { immediate: true })
watch(() => route.query.kind, (v) => {
  if (v) kind.value = String(v)
})

onMounted(async () => {
  try {
    refreshSocketAuth()
    bindSocketEvents()
    await nextTick()

    if (mode.value === "caller") {
      await ensureLocalMedia()
      if (toUserId.value) await requestOutgoingCall()
      else if (roomId.value) setStatus("Waiting...")
    }
  } catch (err) {
    console.error("Call mount error", err)
    alert("Unable to start call. Check camera/mic permissions.")
  }

  document.addEventListener("visibilitychange", onVisibilityChange)
  window.addEventListener("resize", onResize)
  window.addEventListener("online", onNetworkOnline)
  window.addEventListener("offline", onNetworkOffline)
})

onBeforeUnmount(() => {
  document.removeEventListener("visibilitychange", onVisibilityChange)
  window.removeEventListener("resize", onResize)
  window.removeEventListener("online", onNetworkOnline)
  window.removeEventListener("offline", onNetworkOffline)
  unbindSocketEvents()
  cleanupAll()
  try { audioContext?.close?.() } catch {}
  audioContext = null
})
</script>

<style scoped>
.call-page {
  position: relative;
  min-height: 100vh;
  color: #fff;
  overflow-x: hidden;
  padding-bottom: 112px;
  background:
    radial-gradient(circle at top left, rgba(255, 80, 120, 0.16), transparent 28%),
    radial-gradient(circle at top right, rgba(100, 160, 255, 0.15), transparent 24%),
    linear-gradient(180deg, #071120 0%, #08101d 38%, #040914 100%);
}

.bg {
  position: fixed;
  inset: 0;
  pointer-events: none;
  filter: blur(8px);
}
.bg1 { background: radial-gradient(circle at 20% 20%, rgba(255, 70, 70, 0.08), transparent 20%); }
.bg2 { background: radial-gradient(circle at 80% 25%, rgba(100, 140, 255, 0.10), transparent 18%); }
.bg3 { background: radial-gradient(circle at 50% 80%, rgba(255, 255, 255, 0.03), transparent 18%); }

.topbar,
.quick-strip,
.call-hero,
.tools-strip,
.call-stage { position: relative; z-index: 2; }

.topbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: calc(env(safe-area-inset-top) + 14px) 16px 14px;
}

.icon-btn,
.mini-icon-btn {
  border: 0;
  color: #fff;
  cursor: pointer;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(10px);
}
.icon-btn {
  font-size: 20px;
  width: 42px;
  height: 42px;
}
.mini-icon-btn {
  width: 38px;
  height: 38px;
  font-size: 16px;
}

.title-wrap { flex: 1; min-width: 0; }
.call-title { font-size: 18px; font-weight: 800; }
.call-subtitle {
  opacity: 0.82;
  margin-top: 2px;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.topbar-actions { display: flex; align-items: center; gap: 8px; }

.status-pill {
  padding: 8px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.10);
  backdrop-filter: blur(10px);
}
.status-pill.live { background: rgba(30, 180, 90, 0.22); }
.status-pill.warn { background: rgba(255, 170, 0, 0.20); }
.status-pill.bad { background: rgba(255, 90, 90, 0.18); }

.glassy {
  background: rgba(255,255,255,0.075);
  border: 1px solid rgba(255,255,255,0.08);
  box-shadow: 0 20px 60px rgba(0,0,0,0.25);
  backdrop-filter: blur(18px);
}

.quick-strip {
  margin: 0 16px 14px;
  padding: 12px 14px;
  border-radius: 20px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}
.quick-left, .quick-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.signal-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: #ff4d6d;
}
.signal-dot.on {
  background: #1ce783;
  box-shadow: 0 0 14px #1ce783;
}
.quick-text { font-size: 12px; opacity: 0.82; }
.mini-pill {
  padding: 7px 10px;
  border-radius: 999px;
  background: rgba(255,255,255,0.10);
  font-size: 12px;
  font-weight: 800;
}

.call-hero {
  margin: 0 16px 14px;
  padding: 18px;
  border-radius: 24px;
  display: grid;
  grid-template-columns: 1.15fr 0.85fr;
  gap: 18px;
}
.hero-kicker { font-size: 11px; letter-spacing: 0.16em; font-weight: 900; opacity: 0.72; }
.hero-title { margin: 8px 0 8px; font-size: clamp(26px, 4vw, 40px); line-height: 1.02; }
.hero-sub { opacity: 0.82; line-height: 1.5; }
.hero-badges { margin-top: 14px; display: flex; gap: 10px; flex-wrap: wrap; }
.hero-badge {
  padding: 8px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
  background: rgba(255,255,255,0.08);
}
.hero-badge.ok { background: rgba(28,231,131,0.16); color: #9cf1c3; }
.hero-badge.bad { background: rgba(255,77,109,0.16); color: #ffb4c1; }
.hero-badge.accent { background: linear-gradient(135deg, rgba(0,210,255,0.20), rgba(124,58,237,0.22)); }
.hero-mini { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
.mini-stat {
  border-radius: 18px;
  background: rgba(255,255,255,0.06);
  padding: 16px 12px;
  text-align: center;
}
.mini-num { font-size: 22px; font-weight: 900; }
.mini-lab { font-size: 12px; opacity: 0.72; margin-top: 6px; }

.call-stage {
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 14px;
  padding: 0 16px 14px;
}
.call-stage.audioOnly { grid-template-columns: 1fr; }

.video-card {
  position: relative;
  min-height: 56vh;
  border-radius: 24px;
  overflow: hidden;
  background: rgba(255,255,255,0.07);
  border: 1px solid rgba(255,255,255,0.08);
  box-shadow: 0 10px 40px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.05);
}
.video-card.activeCard { border-color: rgba(0,210,255,0.18); }
.video-card.speaking {
  box-shadow: 0 18px 52px rgba(0,0,0,0.28), 0 0 0 1px rgba(28,231,131,0.14), 0 0 26px rgba(28,231,131,0.10);
}
.video-card.reconnecting { border-color: rgba(255,170,0,0.22); }
.remote-card, .local-card { min-height: 62vh; }
.local-card.collapsed { min-height: 32vh; }

.video-topbar {
  position: absolute;
  top: 12px;
  left: 12px;
  right: 12px;
  z-index: 4;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.video-label,
.video-chip {
  padding: 7px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  background: rgba(0, 0, 0, 0.35);
}
.video-label { font-size: 12px; }
.video-chip-row { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
.video-chip.badchip { background: rgba(255,77,109,0.22); }
.video-el { width: 100%; height: 100%; object-fit: cover; background: #050814; }
.local-self { transform: scaleX(-1); }

.video-placeholder {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 10px;
  background:
    radial-gradient(circle at 50% 20%, rgba(255,255,255,0.08), transparent 24%),
    linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02));
}
.avatar-big {
  width: 92px;
  height: 92px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 36px;
  font-weight: 900;
  background: linear-gradient(135deg, rgba(255,90,120,0.95), rgba(120,120,255,0.95));
}
.avatar-big.remote { background: linear-gradient(135deg, rgba(0,210,255,0.95), rgba(124,58,237,0.95)); }
.placeholder-name { font-size: 16px; font-weight: 700; opacity: 0.92; }
.placeholder-sub { font-size: 13px; opacity: 0.72; }
.video-bottom-state {
  position: absolute;
  left: 12px;
  bottom: 12px;
  z-index: 4;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  border-radius: 999px;
  background: rgba(0,0,0,0.36);
  font-size: 12px;
  font-weight: 700;
}
.state-dot {
  width: 9px;
  height: 9px;
  border-radius: 999px;
  background: rgba(255,255,255,0.35);
}
.state-dot.on { background: #1ce783; box-shadow: 0 0 12px #1ce783; }

.tools-strip {
  margin: 0 16px 16px;
  padding: 14px;
  border-radius: 20px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
.tools-title {
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.12em;
  opacity: 0.72;
  margin-bottom: 10px;
}
.tools-pills { display: flex; flex-wrap: wrap; gap: 10px; }
.tool-pill {
  padding: 8px 11px;
  border-radius: 999px;
  background: rgba(255,255,255,0.08);
  font-size: 12px;
  font-weight: 800;
}

.controls {
  position: fixed;
  left: 0;
  right: 0;
  bottom: calc(env(safe-area-inset-bottom) + 12px);
  z-index: 6;
  display: flex;
  justify-content: center;
  gap: 10px;
  padding: 0 14px;
  flex-wrap: wrap;
}
.control-btn {
  border: 0;
  min-width: 84px;
  height: 50px;
  padding: 0 14px;
  color: #fff;
  cursor: pointer;
  font-weight: 800;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.12);
  box-shadow: 0 10px 28px rgba(0,0,0,0.22);
}
.control-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.control-btn.off { background: rgba(255, 160, 0, 0.22); }
.control-btn.danger { background: linear-gradient(135deg, #ff3d57, #d5153a); }

.incoming-overlay {
  position: fixed;
  inset: 0;
  z-index: 30;
  background: rgba(2, 7, 18, 0.72);
  display: grid;
  place-items: center;
  padding: 20px;
  backdrop-filter: blur(14px);
}
.incoming-card {
  width: min(92vw, 400px);
  border-radius: 28px;
  padding: 26px 22px;
  text-align: center;
  background: linear-gradient(180deg, rgba(20, 27, 45, 0.96), rgba(9, 14, 28, 0.96));
  border: 1px solid rgba(255,255,255,0.08);
  box-shadow: 0 20px 60px rgba(0,0,0,0.35);
}
.incoming-top { display: flex; justify-content: center; align-items: center; gap: 8px; }
.incoming-live-dot {
  width: 9px;
  height: 9px;
  border-radius: 999px;
  background: #1ce783;
  box-shadow: 0 0 12px #1ce783;
}
.incoming-small { font-size: 11px; font-weight: 900; letter-spacing: 0.14em; opacity: 0.72; }
.incoming-avatar {
  width: 92px;
  height: 92px;
  border-radius: 999px;
  margin: 16px auto;
  display: grid;
  place-items: center;
  font-size: 34px;
  font-weight: 900;
  background: linear-gradient(135deg, #ff5478, #617bff);
}
.incoming-text h2 { margin: 0; font-size: 22px; font-weight: 900; }
.incoming-text p { margin: 8px 0 0; opacity: 0.8; font-size: 14px; }
.incoming-meta { margin-top: 14px; display: flex; justify-content: center; gap: 10px; flex-wrap: wrap; }
.meta-pill {
  padding: 8px 11px;
  border-radius: 999px;
  background: rgba(255,255,255,0.08);
  font-size: 12px;
  font-weight: 800;
}
.incoming-actions { display: flex; justify-content: center; gap: 12px; margin-top: 22px; }
.btn {
  border: 0;
  min-width: 120px;
  height: 48px;
  border-radius: 16px;
  font-weight: 800;
  color: #fff;
}
.btn.reject { background: linear-gradient(135deg, #5a6478, #414959); }
.btn.accept { background: linear-gradient(135deg, #19c46b, #119753); }

.fadeUp-enter-active,
.fadeUp-leave-active { transition: all 0.26s ease; }
.fadeUp-enter-from,
.fadeUp-leave-to { opacity: 0; transform: translateY(12px); }

@media (max-width: 980px) {
  .call-hero,
  .tools-strip,
  .call-stage {
    grid-template-columns: 1fr;
  }

  .remote-card,
  .local-card {
    min-height: 48vh;
  }
}

@media (max-width: 640px) {
  .topbar {
    gap: 10px;
    padding: calc(env(safe-area-inset-top) + 12px) 12px 12px;
  }

  .call-title { font-size: 16px; }
  .call-subtitle { font-size: 12px; }

  .quick-strip,
  .call-hero,
  .tools-strip,
  .call-stage {
    margin-left: 12px;
    margin-right: 12px;
    padding-left: 12px;
    padding-right: 12px;
  }

  .call-stage {
    padding-top: 0;
    padding-bottom: 12px;
  }

  .video-card,
  .remote-card,
  .local-card {
    min-height: 38vh;
    border-radius: 20px;
  }

  .compactUi .local-card {
    min-height: 24vh;
  }

  .controls {
    gap: 8px;
    padding: 0 10px;
    bottom: calc(env(safe-area-inset-bottom) + 8px);
  }

  .control-btn {
    flex: 1 1 calc(50% - 8px);
    min-width: 0;
    height: 48px;
    border-radius: 14px;
    font-size: 13px;
  }

  .incoming-card {
    width: 100%;
    border-radius: 22px;
    padding: 22px 18px;
  }

  .btn {
    min-width: 0;
    flex: 1 1 0;
  }
}
</style>
