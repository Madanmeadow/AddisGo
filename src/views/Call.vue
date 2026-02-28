<template>
  <div class="call-page">
    <!-- Top bar -->
    <header class="topbar">
      <div class="brand">
        <div class="dot"></div>
        <div class="title">AddisGo Call</div>
        <div class="sub">Room: <span class="mono">{{ roomId }}</span></div>
      </div>

      <div class="status">
        <span class="pill" :class="statusClass">{{ statusText }}</span>
      </div>
    </header>

    <!-- Audio unlock overlay (needed on iOS / Chrome autoplay policy) -->
    <div v-if="needsSoundUnlock" class="overlay">
      <div class="card">
        <div class="h">🔊 Enable Sound</div>
        <div class="p">
          Your browser blocks ringtone until you tap once.
          Tap below to enable ringtone + call audio.
        </div>
        <button class="btn primary" @click="unlockSound">Tap to Enable Sound</button>
        <button class="btn ghost" @click="skipSound">Skip</button>
      </div>
    </div>

    <!-- Main -->
    <main class="main">
      <!-- Remote -->
      <section class="stage">
        <div class="stage-inner">
          <video
            v-if="showRemoteVideo"
            ref="remoteVideoEl"
            class="video remote"
            autoplay
            playsinline
          ></video>

          <div v-else class="remote-placeholder">
            <div class="avatar">👤</div>
            <div class="who">
              <div class="label">Remote</div>
              <div class="mono">{{ remoteLabel }}</div>
            </div>
          </div>

          <!-- Local preview (only if video) -->
          <video
            v-if="showLocalVideo"
            ref="localVideoEl"
            class="video local"
            muted
            autoplay
            playsinline
          ></video>
        </div>

        <!-- Incoming controls -->
        <div v-if="isIncoming && !accepted && !ended" class="incoming-bar">
          <div class="incoming-text">
            📞 Incoming {{ kind }} call…
          </div>
          <div class="incoming-actions">
            <button class="btn danger" @click="reject">Reject</button>
            <button class="btn primary" @click="accept">Accept</button>
          </div>
        </div>

        <!-- Active controls -->
        <div v-else class="controls">
          <button class="btn" :class="{ danger: micMuted }" @click="toggleMic">
            {{ micMuted ? "Unmute" : "Mute" }}
          </button>

          <button v-if="kind === 'video'" class="btn" :class="{ danger: camOff }" @click="toggleCam">
            {{ camOff ? "Camera On" : "Camera Off" }}
          </button>

          <button class="btn danger" @click="endCall">End Call</button>
        </div>
      </section>

      <!-- Debug / info (helpful while testing) -->
      <aside class="side">
        <div class="panel">
          <div class="panel-title">Connection</div>
          <div class="row"><span>ICE:</span><span class="mono">{{ iceMode }}</span></div>
          <div class="row"><span>Peers:</span><span class="mono">{{ peersCount }}</span></div>
          <div class="row"><span>Socket:</span><span class="mono">{{ socketIdShort }}</span></div>
        </div>

        <div class="panel">
          <div class="panel-title">Tips</div>
          <ul class="tips">
            <li>If ringtone doesn’t play, tap “Enable Sound” once.</li>
            <li>On iPhone, keep screen awake (low power mode can pause audio).</li>
            <li>TURN is optional; STUN-only still works in many networks.</li>
          </ul>
        </div>
      </aside>
    </main>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue"
import { useRoute, useRouter } from "vue-router"
import { io } from "socket.io-client"

const route = useRoute()
const router = useRouter()

/* =========================
   CONFIG
========================= */
const apiUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:5000"

/**
 * We try to reuse an existing global socket if you already set one elsewhere.
 * Otherwise we create one here (safe fallback).
 */
function getSocket() {
  if (window.__ADDISGO_SOCKET__) return window.__ADDISGO_SOCKET__
  const s = io(apiUrl, { transports: ["websocket"], withCredentials: true })
  window.__ADDISGO_SOCKET__ = s
  return s
}

const socket = getSocket()

/* =========================
   STATE
========================= */
const roomId = String(route.params.roomId || route.query.roomId || "")
const kind = ref(String(route.query.kind || "audio")) // "audio" | "video"
const isIncoming = ref(route.query.incoming === "1" || route.query.incoming === "true")

const accepted = ref(false)
const ended = ref(false)

const localStream = ref(null)
const remoteStream = ref(new MediaStream())

const localVideoEl = ref(null)
const remoteVideoEl = ref(null)

const micMuted = ref(false)
const camOff = ref(false)

/* =========================
   SOUND / RINGTONE (WebAudio)
   Browsers block autoplay until user gesture.
========================= */
const needsSoundUnlock = ref(true)
let audioCtx = null
let ringOsc = null
let ringGain = null
let ringTimer = null

async function unlockSound() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    if (audioCtx.state !== "running") await audioCtx.resume()
    needsSoundUnlock.value = false
    // If we are currently supposed to ring, start now.
    if (isIncoming.value && !accepted.value && !ended.value) startRingtone()
  } catch (e) {
    console.error("unlockSound failed", e)
    // keep overlay if it failed
  }
}

function skipSound() {
  needsSoundUnlock.value = false
}

function startRingtone() {
  // Don’t start if user didn’t unlock sound yet
  if (needsSoundUnlock.value) return
  if (!audioCtx) return
  stopRingtone()

  // A simple “ring ring” pattern using oscillator
  ringGain = audioCtx.createGain()
  ringGain.gain.value = 0.0001
  ringGain.connect(audioCtx.destination)

  ringOsc = audioCtx.createOscillator()
  ringOsc.type = "sine"
  ringOsc.frequency.value = 880
  ringOsc.connect(ringGain)
  ringOsc.start()

  let on = false
  ringTimer = setInterval(() => {
    on = !on
    if (!ringGain) return
    ringGain.gain.setTargetAtTime(on ? 0.12 : 0.0001, audioCtx.currentTime, 0.01)
  }, 400)
}

function stopRingtone() {
  if (ringTimer) clearInterval(ringTimer)
  ringTimer = null
  try { ringOsc?.stop() } catch {}
  ringOsc = null
  try { ringGain?.disconnect() } catch {}
  ringGain = null
}

/* =========================
   ICE SERVERS
========================= */
const iceMode = ref("loading…")

async function getIceServers() {
  try {
    const res = await fetch(`${apiUrl}/api/turn`)
    const data = await res.json()
    const servers = data?.iceServers?.length
      ? data.iceServers
      : [{ urls: "stun:stun.l.google.com:19302" }]

    iceMode.value = data?.note || (data?.iceServers?.length ? "TURN/STUN" : "STUN only")
    return servers
  } catch (e) {
    console.error("ICE fetch failed, fallback to STUN", e)
    iceMode.value = "STUN only (fallback)"
    return [{ urls: "stun:stun.l.google.com:19302" }]
  }
}

/* =========================
   WEBRTC (mesh-capable)
========================= */
const pcs = new Map() // peerSocketId -> RTCPeerConnection

const peersCount = computed(() => pcs.size)
const socketIdShort = computed(() => (socket?.id ? socket.id.slice(0, 8) : "…"))

function ensureRemoteStream() {
  if (!remoteStream.value) remoteStream.value = new MediaStream()
}

async function ensureLocalStream() {
  if (localStream.value) return localStream.value

  const wantVideo = kind.value === "video"
  const constraints = wantVideo
    ? { audio: true, video: { facingMode: "user" } }
    : { audio: true, video: false }

  const s = await navigator.mediaDevices.getUserMedia(constraints)
  localStream.value = s

  // attach preview
  if (localVideoEl.value && wantVideo) {
    localVideoEl.value.srcObject = s
  }

  return s
}

async function createPC(peerSocketId, iceServers) {
  if (pcs.has(peerSocketId)) return pcs.get(peerSocketId)

  const pc = new RTCPeerConnection({ iceServers })
  pcs.set(peerSocketId, pc)

  // local tracks
  const s = await ensureLocalStream()
  for (const track of s.getTracks()) pc.addTrack(track, s)

  // remote tracks
  pc.ontrack = (ev) => {
    ensureRemoteStream()
    ev.streams?.[0]?.getTracks()?.forEach((t) => {
      // avoid duplicates
      const exists = remoteStream.value.getTracks().some(x => x.id === t.id)
      if (!exists) remoteStream.value.addTrack(t)
    })

    if (remoteVideoEl.value) {
      remoteVideoEl.value.srcObject = remoteStream.value
    }
  }

  // ICE candidates
  pc.onicecandidate = (ev) => {
    if (!ev.candidate) return
    socket.emit("call:webrtc:ice", { roomId, candidate: ev.candidate, to: peerSocketId })
  }

  // cleanup on close
  pc.onconnectionstatechange = () => {
    const st = pc.connectionState
    if (st === "failed" || st === "disconnected" || st === "closed") {
      // we keep it simple; you can be more aggressive later
    }
  }

  return pc
}

/* =========================
   CALL FLOW
========================= */
const statusText = computed(() => {
  if (ended.value) return "Ended"
  if (isIncoming.value && !accepted.value) return "Incoming…"
  if (!accepted.value) return "Connecting…"
  return "In Call"
})

const statusClass = computed(() => {
  if (ended.value) return "danger"
  if (isIncoming.value && !accepted.value) return "warn"
  if (!accepted.value) return "warn"
  return "ok"
})

const showLocalVideo = computed(() => kind.value === "video" && !camOff.value)
const showRemoteVideo = computed(() => kind.value === "video")
const remoteLabel = computed(() => "Connected peer(s)")

async function accept() {
  // user gesture: unlock sound automatically if still locked
  if (needsSoundUnlock.value) await unlockSound()
  stopRingtone()

  accepted.value = true
  socket.emit("call:accept", { roomId })
  // join the call room (required for peer events)
  socket.emit("call:join", { roomId })
}

function reject() {
  stopRingtone()
  ended.value = true
  socket.emit("call:reject", { roomId })
  // go back to dashboard
  router.push("/dashboard").catch(() => {})
}

function endCall() {
  stopRingtone()
  ended.value = true
  socket.emit("call:end", { roomId })
  cleanup()
  router.push("/dashboard").catch(() => {})
}

/* =========================
   MEDIA TOGGLES
========================= */
function toggleMic() {
  if (!localStream.value) return
  micMuted.value = !micMuted.value
  localStream.value.getAudioTracks().forEach((t) => (t.enabled = !micMuted.value))
}

function toggleCam() {
  if (!localStream.value) return
  camOff.value = !camOff.value
  localStream.value.getVideoTracks().forEach((t) => (t.enabled = !camOff.value))
}

/* =========================
   SOCKET EVENTS
========================= */
let iceServersCache = null

function onIncoming(payload) {
  // If this Call.vue page is open for that room, show accept/reject here.
  if (!payload?.roomId) return
  if (String(payload.roomId) !== roomId) return

  kind.value = payload.kind || kind.value
  isIncoming.value = true
  accepted.value = false
  ended.value = false

  // Start ringtone (if allowed)
  startRingtone()
}

function onRing() {
  // server says ring; if we are callee and incoming -> ring
  if (isIncoming.value && !accepted.value && !ended.value) startRingtone()
}

function onStopRing() {
  stopRingtone()
}

function onAccepted() {
  stopRingtone()
  accepted.value = true
  // auto-join if not already
  socket.emit("call:join", { roomId })
}

function onEnded() {
  stopRingtone()
  ended.value = true
  cleanup()
}

async function onPeerJoined({ peerSocketId }) {
  if (!peerSocketId) return
  if (!iceServersCache) iceServersCache = await getIceServers()

  // Existing peers create offer to the newcomer (mesh)
  const pc = await createPC(peerSocketId, iceServersCache)
  const offer = await pc.createOffer()
  await pc.setLocalDescription(offer)

  socket.emit("call:webrtc:offer", { roomId, offer, to: peerSocketId })
}

async function onOffer({ offer, from }) {
  if (!offer || !from) return
  if (!iceServersCache) iceServersCache = await getIceServers()

  const pc = await createPC(from, iceServersCache)
  await pc.setRemoteDescription(offer)

  const answer = await pc.createAnswer()
  await pc.setLocalDescription(answer)

  socket.emit("call:webrtc:answer", { roomId, answer, to: from })
}

async function onAnswer({ answer, from }) {
  if (!answer || !from) return
  const pc = pcs.get(from)
  if (!pc) return
  await pc.setRemoteDescription(answer)
}

async function onIce({ candidate, from }) {
  if (!candidate || !from) return
  const pc = pcs.get(from)
  if (!pc) return
  try {
    await pc.addIceCandidate(candidate)
  } catch (e) {
    console.warn("addIceCandidate failed", e)
  }
}

/* =========================
   CLEANUP
========================= */
function cleanup() {
  // close pcs
  for (const pc of pcs.values()) {
    try { pc.close() } catch {}
  }
  pcs.clear()

  // stop tracks
  try {
    localStream.value?.getTracks()?.forEach((t) => t.stop())
  } catch {}
  localStream.value = null

  try {
    remoteStream.value?.getTracks()?.forEach((t) => t.stop())
  } catch {}
  remoteStream.value = new MediaStream()

  stopRingtone()
}

onMounted(async () => {
  if (!roomId) {
    router.push("/dashboard").catch(() => {})
    return
  }

  // We show “Enable Sound” overlay first (safe default)
  // But if user already interacted earlier, they can dismiss it quickly.
  // If you hate this overlay later, we can auto-hide when audioCtx already running.

  // Make sure user is registered online (your server listens to these)
  const userRaw = localStorage.getItem("user")
  let user = null
  try { user = userRaw ? JSON.parse(userRaw) : null } catch {}
  const userId = user?.id

  if (userId) {
    socket.emit("user:online", { userId })
    socket.emit("register-user", { id: userId, username: user?.username })
  }

  // cache ICE
  iceServersCache = await getIceServers()

  // Attach remote stream
  if (remoteVideoEl.value) remoteVideoEl.value.srcObject = remoteStream.value

  // If THIS page is opened for outgoing call, we immediately join.
  // If incoming, we wait for Accept button.
  if (!isIncoming.value) {
    accepted.value = true
    socket.emit("call:join", { roomId })
    // ensure local stream starts so we can negotiate when peer joins
    await ensureLocalStream()
  } else {
    // incoming: start ringtone if possible
    startRingtone()
  }

  // listeners
  socket.on("call:incoming", onIncoming)
  socket.on("call:ring", onRing)
  socket.on("call:ringing", onRing)
  socket.on("call:stopRing", onStopRing)
  socket.on("call:accepted", onAccepted)
  socket.on("call:ended", onEnded)

  socket.on("call:peer-joined", onPeerJoined)
  socket.on("call:webrtc:offer", onOffer)
  socket.on("call:webrtc:answer", onAnswer)
  socket.on("call:webrtc:ice", onIce)
})

onBeforeUnmount(() => {
  try {
    socket.off("call:incoming", onIncoming)
    socket.off("call:ring", onRing)
    socket.off("call:ringing", onRing)
    socket.off("call:stopRing", onStopRing)
    socket.off("call:accepted", onAccepted)
    socket.off("call:ended", onEnded)

    socket.off("call:peer-joined", onPeerJoined)
    socket.off("call:webrtc:offer", onOffer)
    socket.off("call:webrtc:answer", onAnswer)
    socket.off("call:webrtc:ice", onIce)
  } catch {}

  cleanup()
})
</script>

<style scoped>
.call-page {
  min-height: 100vh;
  background: radial-gradient(1200px 800px at 20% 0%, #1b2a4a 0%, #0b0f1a 55%, #070911 100%);
  color: #e9eefc;
  font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(255,255,255,.08);
  backdrop-filter: blur(10px);
  background: rgba(10, 14, 26, 0.55);
}

.brand { display: flex; align-items: center; gap: 12px; }
.dot {
  width: 10px; height: 10px; border-radius: 999px;
  background: #3ef08a;
  box-shadow: 0 0 20px rgba(62,240,138,.55);
}
.title { font-weight: 800; letter-spacing: .2px; }
.sub { font-size: 12px; opacity: .8; margin-top: 2px; }

.pill {
  font-size: 12px;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.15);
  background: rgba(255,255,255,.06);
}
.pill.ok { border-color: rgba(62,240,138,.35); }
.pill.warn { border-color: rgba(255,215,0,.35); }
.pill.danger { border-color: rgba(255,80,80,.35); }

.main {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 14px;
  padding: 14px;
}
@media (max-width: 920px) {
  .main { grid-template-columns: 1fr; }
}

.stage {
  border: 1px solid rgba(255,255,255,.10);
  border-radius: 18px;
  overflow: hidden;
  background: rgba(255,255,255,.04);
}
.stage-inner {
  position: relative;
  height: min(72vh, 620px);
  display: flex;
  align-items: center;
  justify-content: center;
}
.video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.video.local {
  position: absolute;
  right: 12px;
  bottom: 12px;
  width: 160px;
  height: 220px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,.18);
  box-shadow: 0 16px 40px rgba(0,0,0,.35);
  background: #000;
}

.remote-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  opacity: .95;
}
.avatar { font-size: 52px; }
.who .label { opacity: .7; font-size: 12px; }
.mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }

.controls, .incoming-bar {
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: center;
  padding: 14px;
  border-top: 1px solid rgba(255,255,255,.08);
  background: rgba(0,0,0,.20);
}
.incoming-bar { justify-content: space-between; padding: 14px 16px; }
.incoming-text { font-weight: 700; }
.incoming-actions { display: flex; gap: 10px; }

.btn {
  border: 1px solid rgba(255,255,255,.16);
  background: rgba(255,255,255,.08);
  color: #fff;
  padding: 10px 14px;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 700;
}
.btn:hover { filter: brightness(1.08); }
.btn.primary {
  background: linear-gradient(135deg, rgba(62,240,138,.9), rgba(34,170,255,.75));
  border-color: rgba(62,240,138,.35);
  color: #04110a;
}
.btn.danger {
  background: linear-gradient(135deg, rgba(255,80,80,.95), rgba(255,140,80,.7));
  border-color: rgba(255,80,80,.35);
}
.btn.ghost {
  background: transparent;
}

.side { display: flex; flex-direction: column; gap: 12px; }
.panel {
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.04);
  border-radius: 18px;
  padding: 14px;
}
.panel-title { font-weight: 900; margin-bottom: 10px; }
.row { display: flex; justify-content: space-between; opacity: .9; margin: 6px 0; }
.tips { margin: 0; padding-left: 18px; opacity: .85; }
.tips li { margin: 6px 0; }

.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.55);
  display: grid;
  place-items: center;
  z-index: 50;
}
.overlay .card {
  width: min(520px, 92vw);
  border: 1px solid rgba(255,255,255,.14);
  background: rgba(10, 14, 26, 0.85);
  border-radius: 18px;
  padding: 16px;
  box-shadow: 0 24px 80px rgba(0,0,0,.5);
}
.overlay .h { font-weight: 900; font-size: 18px; }
.overlay .p { opacity: .9; margin: 10px 0 14px; line-height: 1.35; }
</style>