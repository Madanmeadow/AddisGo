<template>
  <Layout>
    <div class="call-page">
      <div class="bg"></div>

      <!-- Incoming Call Modal -->
      <div v-if="incomingCall && !inCall" class="incoming-overlay">
        <div class="incoming-card">
          <div class="incoming-avatar">{{ callerInitial }}</div>

          <div class="incoming-text">
            <h2>{{ incomingCall.fromName || "Incoming Call" }}</h2>
            <p>{{ incomingCall.kind === "audio" ? "Audio call" : "Video call" }}</p>
          </div>

          <div class="incoming-actions">
            <button class="btn reject" @click="rejectIncoming">Decline</button>
            <button class="btn accept" @click="acceptIncoming">Answer</button>
          </div>
        </div>
      </div>

      <!-- Top Bar -->
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
          <span class="status-pill" :class="{ live: inCall }">{{ connectionLabel }}</span>
        </div>
      </header>

      <!-- Video Area -->
      <main class="call-stage" :class="{ audioOnly: isAudioOnly }">
        <!-- Remote -->
        <section class="video-card remote-card">
          <div class="video-label">Remote</div>

          <video
            v-show="!isAudioOnly && !showRemotePlaceholder"
            ref="remoteVideo"
            class="video-el"
            playsinline
            autoplay
          ></video>

          <div v-if="showRemotePlaceholder" class="video-placeholder">
            <div class="avatar-big">{{ remoteInitial }}</div>
            <div class="placeholder-name">{{ callPartnerName }}</div>
            <div class="placeholder-sub">
              {{ remoteVideoOff ? "Camera off" : remoteAudioOnly ? "Audio only" : "Waiting for video..." }}
            </div>
          </div>
        </section>

        <!-- Local -->
        <section class="video-card local-card">
          <div class="video-label">You</div>

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
        </section>
      </main>

      <!-- Controls -->
      <footer class="controls">
        <button
          class="control-btn"
          :class="{ off: micMuted }"
          @click="toggleMic"
          :disabled="!localStream"
        >
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

        <button
          class="control-btn"
          @click="recoverMedia"
          :disabled="recoveringMedia"
        >
          {{ recoveringMedia ? "Recovering…" : "Recover" }}
        </button>

        <button
          class="control-btn"
          @click="minimizeCurrentCall"
          :disabled="!inCall"
        >
          Minimize
        </button>

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
import { useCallOverlay } from "../composables/useCallOverlay"

const route = useRoute()
const router = useRouter()

/* =========================
   CONFIG
========================= */
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

/* =========================
   ROUTE / STATE
========================= */
const roomId = ref(route.query.roomId || "")
const kind = ref(route.query.kind || "video")
const mode = ref(route.query.mode || route.query.role || "caller")
const toUserId = ref(route.query.toUserId || "")
const initialPartnerName = ref(route.query.name || "User")

const socket = ref(null)
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

const hasRemoteDescription = ref(false)
const cleaningUp = ref(false)
const hasJoinedRoom = ref(false)
const madeOffer = ref(false)
const requestSent = ref(false)
const reconnectAttempted = ref(false)
const negotiationBusy = ref(false)
const makingOffer = ref(false)

const statusText = ref("Ready")
const hostUserId = ref("")
const isCaller = ref(mode.value === "caller")

const pendingCandidates = []

const callStartedAt = ref(null)
const callSeconds = ref(0)
let callTimer = null

const remoteAudioOnly = ref(false)
const remoteVideoOff = ref(false)

let statsTimer = null

const {
  syncCallOverlay,
  minimizeCall,
  resetOverlay,
} = useCallOverlay()

/* =========================
   COMPUTED
========================= */
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
  const track = remoteStream.value?.getVideoTracks?.()?.[0]
  return !track || track.readyState !== "live" || !track.enabled
})

const showLocalPlaceholder = computed(() => {
  if (!localStream.value) return true
  if (isAudioOnly.value) return true
  return !localStream.value.getVideoTracks().some(track => track.enabled && track.readyState === "live")
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

/* =========================
   HELPERS
========================= */
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

/* =========================
   OVERLAY SYNC
========================= */
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

/* =========================
   SOCKET
========================= */
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
    console.log("✅ socket connected", socket.value.id)

    if (roomId.value && inCall.value) {
      try {
        joinCallRoom()
        await maybeRecoverConnection("socket reconnect")
      } catch (err) {
        console.error("socket reconnect recovery error", err)
      }
    }
  })

  socket.value.on("disconnect", (reason) => {
    console.log("⚠️ socket disconnected:", reason)
    if (inCall.value) statusText.value = "Reconnecting..."
  })

  socket.value.on("call:ringing", (data = {}) => {
    console.log("📳 call:ringing", data)
    if (data.roomId) roomId.value = String(data.roomId)
    if (data.kind) kind.value = data.kind
    isCaller.value = !!data.isCaller
    statusText.value = "Ringing..."
  })

  socket.value.on("call:status", ({ calleeOnline } = {}) => {
    statusText.value = calleeOnline ? "Calling..." : "Queued"
  })

  socket.value.on("call:incoming", (data = {}) => {
    console.log("📲 call:incoming", data)

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
    console.log("✅ call:accepted", data)

    if (data.roomId) roomId.value = String(data.roomId)
    if (data.kind) kind.value = data.kind
    if (data.hostUserId) hostUserId.value = String(data.hostUserId)

    statusText.value = "Accepted"

    await ensureLocalMedia()
    joinCallRoom()
  })

  socket.value.on("call:peer-joined", async () => {
    console.log("👤 call:peer-joined")
    if (!pc.value) {
      await createPeerConnection()
    }
  })

  socket.value.on("call:ready", async (data = {}) => {
    console.log("🚀 call:ready", data)

    if (data.roomId) roomId.value = String(data.roomId)
    if (data.kind) kind.value = data.kind
    if (data.hostUserId) hostUserId.value = String(data.hostUserId)

    statusText.value = "Connecting..."

    if (!pc.value) {
      await createPeerConnection()
    }

    if (isOfferOwner() && !madeOffer.value) {
      madeOffer.value = true
      await createAndSendOffer(false)
    }
  })

  socket.value.on("call:webrtc:offer", async ({ roomId: incomingRoomId, offer, from } = {}) => {
    console.log("📡 got offer", incomingRoomId, from)

    try {
      if (incomingRoomId) roomId.value = String(incomingRoomId)
      statusText.value = "Answering..."

      if (!pc.value) {
        await createPeerConnection()
      }

      const offerCollision =
        offer &&
        makingOffer.value

      const polite = !isOfferOwner()

      if (offerCollision && !polite) {
        console.log("Ignoring offer collision (impolite peer)")
        return
      }

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
    } catch (err) {
      console.error("call:webrtc:offer error", err)
    }
  })

  socket.value.on("call:webrtc:answer", async ({ answer } = {}) => {
    console.log("📡 got answer")

    try {
      if (!pc.value) return
      await pc.value.setRemoteDescription(new RTCSessionDescription(answer))
      hasRemoteDescription.value = true
      await flushPendingIceCandidates()
      statusText.value = "Connected"
      markCallStarted()
    } catch (err) {
      console.error("call:webrtc:answer error", err)
    }
  })

  socket.value.on("call:webrtc:ice", async ({ candidate } = {}) => {
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

  socket.value.on("call:ended", ({ reason } = {}) => {
    console.log("📴 call ended:", reason)
    statusText.value = "Call ended"
    cleanupAll()
    router.back()
  })

  socket.value.on("call:error", ({ message } = {}) => {
    console.error("call:error", message)
    statusText.value = message || "Error"
  })

  socket.value.on("call:busy", ({ message } = {}) => {
    console.error("call:busy", message)
    statusText.value = message || "Busy"
  })
}

/* =========================
   WEBRTC
========================= */
async function getIceServers() {
  try {
    const res = await fetch(`${API_BASE}/api/turn`, {
      headers: authHeaders(false),
    })

    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data?.iceServers) && data.iceServers.length) {
        return data.iceServers
      }
    }
  } catch {
    console.log("TURN fetch failed, using fallback STUN")
  }

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
        params.encodings[0].scaleResolutionDownBy = 1
      }

      if (sender.track.kind === "audio") {
        params.degradationPreference = "maintain-framerate"
        params.encodings[0].maxBitrate = 64 * 1000
      }

      await sender.setParameters(params)
    } catch (err) {
      console.log("sender parameter skip", err?.message || err)
    }
  }
}

async function createPeerConnection() {
  const iceServers = await getIceServers()

  pc.value = new RTCPeerConnection({
    iceServers,
    iceCandidatePoolSize: 10,
  })

  if (localStream.value) {
    const senders = pc.value.getSenders()
    localStream.value.getTracks().forEach((track) => {
      const exists = senders.some((s) => s.track && s.track.kind === track.kind)
      if (!exists) {
        pc.value.addTrack(track, localStream.value)
      }
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
    const remoteAudioTrack = stream.getAudioTracks?.()[0]

    remoteAudioOnly.value = !remoteVideoTrack
    remoteVideoOff.value = remoteVideoTrack ? !remoteVideoTrack.enabled : true

    if (remoteVideoTrack) {
      remoteVideoTrack.onmute = () => {
        remoteVideoOff.value = true
      }
      remoteVideoTrack.onunmute = () => {
        remoteVideoOff.value = false
      }
      remoteVideoTrack.onended = async () => {
        remoteVideoOff.value = true
        await maybeRecoverConnection("remote video ended")
      }
    }

    if (remoteAudioTrack) {
      remoteAudioTrack.onended = async () => {
        await maybeRecoverConnection("remote audio ended")
      }
    }

    if (remoteVideo.value) {
      remoteVideo.value.srcObject = stream
      safePlay(remoteVideo.value)
    }

    statusText.value = "Connected"
    markCallStarted()
  }

  pc.value.onconnectionstatechange = async () => {
    const state = pc.value?.connectionState
    console.log("pc.connectionState =", state)

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
      return
    }

    if (state === "closed") {
      statusText.value = "Closed"
    }
  }

  pc.value.oniceconnectionstatechange = async () => {
    const state = pc.value?.iceConnectionState
    console.log("pc.iceConnectionState =", state)

    if (state === "failed") {
      statusText.value = "Recovering..."
      await maybeRecoverConnection("ice failed")
    } else if (state === "disconnected") {
      statusText.value = "Reconnecting..."
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

    if (pc.value.signalingState !== "stable" && !iceRestart) {
      console.log("Skipping offer because signalingState is not stable")
      return
    }

    await pc.value.setLocalDescription(offer)

    socket.value.emit("call:webrtc:offer", {
      roomId: roomId.value,
      offer: pc.value.localDescription,
    })
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

  if (audioTrack) {
    audioTrack.onended = async () => {
      console.log("Local audio track ended, recovering...")
      await recoverMedia()
    }
  }

  if (videoTrack) {
    videoTrack.onended = async () => {
      console.log("Local video track ended, recovering...")
      if (!isAudioOnly.value && !cameraOff.value) {
        await recoverMedia()
      }
    }

    try {
      await videoTrack.applyConstraints({
        width: { ideal: 1280, max: 1280 },
        height: { ideal: 720, max: 720 },
        frameRate: { ideal: 24, max: 30 },
      })
    } catch (err) {
      console.log("video applyConstraints skip", err?.message || err)
    }
  }
}

async function ensureLocalMedia(force = false) {
  if (localStream.value && !force) return localStream.value

  if (force && localStream.value) {
    stopStream(localStream.value)
    localStream.value = null
  }

  const constraints = {
    audio: getAudioConstraints(),
    video: getVideoConstraints(),
  }

  const stream = await navigator.mediaDevices.getUserMedia(constraints)
  await enhanceLocalTracks(stream)

  localStream.value = stream

  if (localVideo.value && !isAudioOnly.value) {
    localVideo.value.srcObject = stream
    safePlay(localVideo.value)
  }

  if (pc.value) {
    const senders = pc.value.getSenders()

    for (const track of stream.getTracks()) {
      const sender = senders.find((s) => s.track && s.track.kind === track.kind)
      if (sender) {
        await sender.replaceTrack(track)
      } else {
        pc.value.addTrack(track, stream)
      }
    }

    await applySenderParameters()
  }

  return stream
}

async function switchCamera() {
  if (isAudioOnly.value) return
  if (!pc.value || !localStream.value) return
  if (switchingCamera.value) return

  switchingCamera.value = true

  try {
    const devices = await navigator.mediaDevices.enumerateDevices()
    const cameras = devices.filter((d) => d.kind === "videoinput")

    if (cameras.length < 2) {
      console.log("Only one camera found")
      return
    }

    currentFacingMode.value =
      currentFacingMode.value === "user" ? "environment" : "user"

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

    const videoSender = pc.value
      .getSenders()
      .find((sender) => sender.track && sender.track.kind === "video")

    if (videoSender) {
      await videoSender.replaceTrack(newVideoTrack)
    }

    const audioTracks = localStream.value.getAudioTracks()
    const oldVideoTracks = localStream.value.getVideoTracks()

    oldVideoTracks.forEach((track) => {
      try {
        track.stop()
      } catch {}
    })

    localStream.value = new MediaStream([...audioTracks, newVideoTrack])
    await enhanceLocalTracks(localStream.value)

    if (localVideo.value) {
      localVideo.value.srcObject = localStream.value
      safePlay(localVideo.value)
    }

    cameraOff.value = false
    await applySenderParameters()

    if (isOfferOwner()) {
      await createAndSendOffer(false)
    }
  } catch (err) {
    console.error("switchCamera error", err)
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

async function maybeRecoverConnection(reason = "") {
  try {
    console.log("Recovering connection because:", reason)

    if (!pc.value) {
      await createPeerConnection()
    }

    if (isOfferOwner()) {
      await createAndSendOffer(true)
    }
  } catch (err) {
    console.error("maybeRecoverConnection error", err)
  }
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
  } catch (err) {
    console.error("recoverMedia error", err)
    statusText.value = "Recovery failed"
  } finally {
    recoveringMedia.value = false
  }
}

async function startStatsWatcher() {
  stopStatsWatcher()

  statsTimer = setInterval(async () => {
    if (!pc.value) return

    try {
      const stats = await pc.value.getStats()
      let inboundVideoFound = false
      let inboundAudioFound = false

      stats.forEach((report) => {
        if (report.type === "inbound-rtp" && report.kind === "video") {
          inboundVideoFound = true
        }
        if (report.type === "inbound-rtp" && report.kind === "audio") {
          inboundAudioFound = true
        }
      })

      remoteAudioOnly.value = inboundAudioFound && !inboundVideoFound
      if (!inboundVideoFound && !isAudioOnly.value && inCall.value) {
        remoteVideoOff.value = true
      }
    } catch (err) {
      console.log("stats watcher skip", err?.message || err)
    }
  }, 4000)
}

function stopStatsWatcher() {
  if (statsTimer) {
    clearInterval(statsTimer)
    statsTimer = null
  }
}

/* =========================
   CALL FLOW
========================= */
async function requestOutgoingCall() {
  if (!socket.value) return
  if (!toUserId.value) return
  if (requestSent.value) return

  requestSent.value = true
  isCaller.value = true
  statusText.value = "Starting..."

  await ensureLocalMedia()

  socket.value.emit("call:request", {
    toUserId: String(toUserId.value),
    kind: kind.value,
  })
}

function joinCallRoom() {
  if (!roomId.value) return
  socket.value?.emit("call:join", { roomId: roomId.value })
  hasJoinedRoom.value = true
  statusText.value = "Joining..."
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
}

async function acceptIncoming() {
  try {
    if (!incomingCall.value) return

    roomId.value = String(incomingCall.value.roomId)
    kind.value = incomingCall.value.kind || "video"
    mode.value = "receiver"
    isCaller.value = false
    hostUserId.value = String(incomingCall.value.fromUserId || "")
    statusText.value = "Accepted"

    await ensureLocalMedia()

    socket.value?.emit("call:accept", {
      roomId: roomId.value,
    })

    joinCallRoom()
    incomingCall.value = null
  } catch (err) {
    console.error("acceptIncoming error", err)
    alert("Could not answer the call.")
  }
}

function rejectIncoming() {
  if (!incomingCall.value) return

  socket.value?.emit("call:reject", {
    roomId: incomingCall.value.roomId,
  })

  incomingCall.value = null
  statusText.value = "Declined"
}

/* =========================
   CONTROLS
========================= */
function toggleMic() {
  if (!localStream.value) return
  const audioTracks = localStream.value.getAudioTracks()
  if (!audioTracks.length) return

  micMuted.value = !micMuted.value
  audioTracks.forEach(track => {
    track.enabled = !micMuted.value
  })
}

async function toggleCamera() {
  if (!localStream.value) return
  const videoTracks = localStream.value.getVideoTracks()
  if (!videoTracks.length) return

  cameraOff.value = !cameraOff.value
  videoTracks.forEach(track => {
    track.enabled = !cameraOff.value
  })

  if (pc.value && isOfferOwner()) {
    await createAndSendOffer(false)
  }
}

function minimizeCurrentCall() {
  if (!inCall.value) {
    router.back()
    return
  }

  minimizeCall()
  router.push("/dashboard")
}

function endCall() {
  if (roomId.value) {
    socket.value?.emit("call:end", {
      roomId: roomId.value,
    })
  }

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

/* =========================
   CLEANUP
========================= */
function stopStream(stream) {
  if (!stream) return
  stream.getTracks().forEach(track => {
    try {
      track.stop()
    } catch {}
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

  incomingCall.value = null
  inCall.value = false
  callStartedAt.value = null
  callSeconds.value = 0
  micMuted.value = false
  cameraOff.value = kind.value === "audio"
  switchingCamera.value = false
  recoveringMedia.value = false
  statusText.value = "Ready"
  hasJoinedRoom.value = false
  madeOffer.value = false
  requestSent.value = false
  reconnectAttempted.value = false
  currentFacingMode.value = "user"
  remoteAudioOnly.value = false
  remoteVideoOff.value = false
  negotiationBusy.value = false
  makingOffer.value = false

  resetOverlay()

  cleaningUp.value = false
}

/* =========================
   GLOBAL EVENTS
========================= */
function onOverlayEndCall() {
  endCall()
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

      await maybeRecoverConnection("tab visible")
    } catch (err) {
      console.error("visibility recovery error", err)
    }
  }
}

/* =========================
   LIFECYCLE
========================= */
onMounted(async () => {
  try {
    window.addEventListener("pulse:end-call", onOverlayEndCall)
    document.addEventListener("visibilitychange", onVisibilityChange)

    createSocket()
    await nextTick()

    if (mode.value === "caller") {
      await ensureLocalMedia()

      if (toUserId.value) {
        await requestOutgoingCall()
      } else if (roomId.value) {
        statusText.value = "Waiting..."
      }
    }
  } catch (err) {
    console.error("Call mount error", err)
    alert("Unable to start call. Check camera/mic permissions.")
  }
})

onBeforeUnmount(() => {
  window.removeEventListener("pulse:end-call", onOverlayEndCall)
  document.removeEventListener("visibilitychange", onVisibilityChange)

  cleanupAll()

  if (socket.value) {
    socket.value.off("connect")
    socket.value.off("disconnect")
    socket.value.off("call:ringing")
    socket.value.off("call:status")
    socket.value.off("call:incoming")
    socket.value.off("call:accepted")
    socket.value.off("call:peer-joined")
    socket.value.off("call:ready")
    socket.value.off("call:webrtc:offer")
    socket.value.off("call:webrtc:answer")
    socket.value.off("call:webrtc:ice")
    socket.value.off("call:ended")
    socket.value.off("call:error")
    socket.value.off("call:busy")
    socket.value.disconnect()
    socket.value = null
  }
})
</script>

<style scoped>
.call-page {
  position: relative;
  min-height: 100vh;
  color: #fff;
  overflow: hidden;
  background:
    radial-gradient(circle at top left, rgba(255, 80, 120, 0.16), transparent 28%),
    radial-gradient(circle at top right, rgba(100, 160, 255, 0.15), transparent 24%),
    linear-gradient(180deg, #071120 0%, #08101d 38%, #040914 100%);
}

.bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(circle at 20% 20%, rgba(255, 70, 70, 0.08), transparent 20%),
    radial-gradient(circle at 80% 25%, rgba(100, 140, 255, 0.10), transparent 18%),
    radial-gradient(circle at 50% 80%, rgba(255, 255, 255, 0.03), transparent 18%);
  filter: blur(8px);
}

.topbar {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: calc(env(safe-area-inset-top) + 14px) 16px 14px;
}

.icon-btn {
  border: 0;
  color: #fff;
  cursor: pointer;
  font-size: 20px;
  width: 42px;
  height: 42px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(10px);
}

.title-wrap {
  flex: 1;
  min-width: 0;
}

.call-title {
  font-size: 18px;
  font-weight: 800;
  letter-spacing: 0.2px;
}

.call-subtitle {
  opacity: 0.82;
  margin-top: 2px;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.topbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-pill {
  padding: 8px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.10);
  backdrop-filter: blur(10px);
}

.status-pill.live {
  background: rgba(30, 180, 90, 0.22);
}

.call-stage {
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  padding: 8px 16px 120px;
}

.call-stage.audioOnly {
  grid-template-columns: 1fr;
}

.video-card {
  position: relative;
  min-height: 56vh;
  border-radius: 24px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow:
    0 10px 40px rgba(0, 0, 0, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(14px);
}

.remote-card {
  min-height: 62vh;
}

.local-card {
  min-height: 62vh;
}

.video-label {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 3;
  padding: 7px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
  background: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(8px);
}

.video-el {
  width: 100%;
  height: 100%;
  object-fit: cover;
  background: #050814;
}

.local-self {
  transform: scaleX(-1);
}

.video-placeholder {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 10px;
  background:
    radial-gradient(circle at 50% 20%, rgba(255, 255, 255, 0.08), transparent 24%),
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
  box-shadow: 0 10px 30px rgba(0,0,0,0.25);
}

.placeholder-name {
  font-size: 16px;
  font-weight: 700;
  opacity: 0.92;
}

.placeholder-sub {
  font-size: 13px;
  opacity: 0.72;
}

.controls {
  position: fixed;
  left: 0;
  right: 0;
  bottom: calc(env(safe-area-inset-bottom) + 18px);
  z-index: 5;
  display: flex;
  justify-content: center;
  gap: 10px;
  padding: 0 14px;
  flex-wrap: wrap;
}

.control-btn {
  border: 0;
  min-width: 88px;
  height: 52px;
  padding: 0 16px;
  color: #fff;
  cursor: pointer;
  font-weight: 800;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(14px);
  box-shadow: 0 10px 28px rgba(0,0,0,0.22);
}

.control-btn.off {
  background: rgba(255, 160, 0, 0.22);
}

.control-btn.danger {
  background: linear-gradient(135deg, #ff3d57, #d5153a);
}

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
  width: min(92vw, 380px);
  border-radius: 28px;
  padding: 26px 22px;
  text-align: center;
  background:
    linear-gradient(180deg, rgba(20, 27, 45, 0.96), rgba(9, 14, 28, 0.96));
  border: 1px solid rgba(255,255,255,0.08);
  box-shadow: 0 20px 60px rgba(0,0,0,0.35);
}

.incoming-avatar {
  width: 92px;
  height: 92px;
  border-radius: 999px;
  margin: 0 auto 16px;
  display: grid;
  place-items: center;
  font-size: 34px;
  font-weight: 900;
  background: linear-gradient(135deg, #ff5478, #617bff);
}

.incoming-text h2 {
  margin: 0;
  font-size: 22px;
  font-weight: 900;
}

.incoming-text p {
  margin: 8px 0 0;
  opacity: 0.8;
  font-size: 14px;
}

.incoming-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 22px;
}

.btn {
  border: 0;
  min-width: 120px;
  height: 48px;
  border-radius: 16px;
  font-weight: 800;
  color: #fff;
}

.btn.reject {
  background: linear-gradient(135deg, #5a6478, #414959);
}

.btn.accept {
  background: linear-gradient(135deg, #19c46b, #119753);
}

@media (max-width: 860px) {
  .call-stage {
    grid-template-columns: 1fr;
  }

  .remote-card {
    min-height: 46vh;
  }

  .local-card {
    min-height: 30vh;
  }
}

@media (max-width: 640px) {
  .topbar {
    padding-left: 12px;
    padding-right: 12px;
  }

  .call-stage {
    gap: 10px;
    padding: 6px 12px 128px;
  }

  .video-card {
    border-radius: 20px;
  }

  .control-btn {
    min-width: 82px;
    height: 48px;
    padding: 0 12px;
    border-radius: 16px;
    font-size: 13px;
  }

  .call-title {
    font-size: 16px;
  }

  .call-subtitle {
    font-size: 12px;
  }
}
</style>