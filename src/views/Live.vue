<template>
  <div class="page">
    <!-- Top -->
    <header class="top">
      <div class="left">
        <div class="brand">
          <div class="logo">🔴</div>
          <div>
            <div class="title">AddisGo Live</div>
            <div class="sub">
              Live ID:
              <span class="mono">{{ liveId }}</span>
              · Viewers:
              <span class="mono">{{ viewerCount }}</span>
              · Status:
              <span class="mono">{{ modeLabel }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="right">
        <button class="btn ghost" @click="hideChat = !hideChat">
          {{ hideChat ? "Show Chat" : "Hide Chat" }}
        </button>
        <button class="btn primary" @click="shareLive">Share</button>
      </div>
    </header>

    <!-- Stage -->
    <section class="stage">
      <div class="videoWrap">
        <video ref="videoEl" class="video" autoplay playsinline :muted="isHost"></video>
      </div>

      <div class="controls">
        <button class="btn primary" @click="joinOrStart">
          {{ isHost ? "Go Live" : "Join" }}
        </button>

        <button class="btn" @click="leaveLive">Leave</button>

        <button class="btn" :disabled="isHost || !joined" @click="requestMic">
          🎤 Request Mic
        </button>

        <button
          class="btn"
          :disabled="isHost || !joined || !canSpeak || micActive"
          @click="startMic"
        >
          🎙️ Start Mic
        </button>

        <button class="btn danger" :disabled="!micActive" @click="stopMic">
          🛑 Stop Mic
        </button>
      </div>

      <div class="statusbar">
        <span class="pill">ICE: {{ iceNote }}</span>
        <span class="pill">Socket: {{ socketIdShort }}</span>
        <span v-if="!isHost" class="pill" :class="canSpeak ? 'ok' : 'warn'">
          Mic: {{ canSpeak ? "Approved" : "Not approved" }}
        </span>
      </div>

      <!-- Host mic requests -->
      <div v-if="isHost && micRequests.length" class="requests">
        <div class="requestsTitle">🎤 Mic Requests</div>
        <div v-for="r in micRequests" :key="r.fromSocketId" class="reqRow">
          <div class="reqInfo">
            <div class="reqName">{{ r.fromName }}</div>
            <div class="reqMeta mono">user: {{ r.fromUserId }} · socket: {{ r.fromSocketId.slice(0, 8) }}</div>
          </div>
          <div class="reqBtns">
            <button class="btn small primary" @click="approveMic(r)">Approve</button>
            <button class="btn small danger" @click="denyMic(r)">Deny</button>
          </div>
        </div>
      </div>
    </section>

    <!-- Chat -->
    <section class="chat" v-if="!hideChat">
      <div class="chatTitle">Live Chat</div>

      <div class="msgs">
        <div v-for="(m, i) in messages" :key="i" class="msg">
          <span class="name">{{ m.from }}:</span>
          <span class="text">{{ m.text }}</span>
        </div>
      </div>

      <div class="sendRow">
        <input v-model="chatText" class="input" placeholder="Message..." @keydown.enter="sendChat" />
        <button class="btn primary" @click="sendChat">Send</button>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue"
import { io } from "socket.io-client"

/* =========================
   CONFIG
========================= */
const apiUrl = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "")

// reuse global socket if present
function getSocket() {
  if (window.__ADDISGO_SOCKET__) return window.__ADDISGO_SOCKET__
  const s = io(apiUrl, { transports: ["websocket"], withCredentials: true })
  window.__ADDISGO_SOCKET__ = s
  return s
}
const socket = getSocket()

/* =========================
   USER
========================= */
function safeUser() {
  try {
    const u = JSON.parse(localStorage.getItem("user") || "null")
    return u && u.id ? u : null
  } catch {
    return null
  }
}
const user = safeUser()
const userId = user?.id ? String(user.id) : null
const username = user?.username || (userId ? `User${userId}` : "user")

/* =========================
   STATE
========================= */
const hideChat = ref(false)
const videoEl = ref(null)

const liveId = ref(`live-${Math.floor(Math.random() * 9999)}`)
const hostSocketId = ref(null)
const viewerCount = ref(0)

const joined = ref(false)
const isHost = ref(false) // host if you click Go Live; watchers are viewers

const iceServers = ref([{ urls: "stun:stun.l.google.com:19302" }])
const iceNote = ref("STUN only")

/* chat */
const messages = ref([])
const chatText = ref("")

/* =========================
   MIC REQUESTS + MIC STATE
========================= */
const micRequests = ref([]) // host sees list
const canSpeak = ref(false) // viewer approved?
const micActive = ref(false) // viewer started mic?

/* =========================
   WEBRTC MAPS
   hostVideoPeers: host -> each viewer (video+audio of host)
   viewerPC: viewer -> host (receiving host stream)
   micPC: viewer -> host (audio only, uplink)
   hostMicPeers: host receiving mic from viewers
========================= */
const hostVideoPeers = new Map() // viewerSocketId -> RTCPeerConnection
let viewerPC = null // viewer receiving host stream

let localHostStream = null // host camera+mic
let micStream = null // viewer mic-only
let micPC = null // viewer mic uplink

const hostMicPeers = new Map() // viewerSocketId -> RTCPeerConnection
const micAudioEls = new Map() // viewerSocketId -> HTMLAudioElement

/* =========================
   UI
========================= */
const modeLabel = computed(() => {
  if (!joined.value) return "idle"
  return isHost.value ? "hosting" : "watching"
})
const socketIdShort = computed(() => (socket?.id ? socket.id.slice(0, 8) : "…"))

function shareLive() {
  const url = `${window.location.origin}/live?liveId=${encodeURIComponent(liveId.value)}`
  navigator.clipboard?.writeText(url).catch(() => {})
  alert("Live link copied:\n" + url)
}

/* =========================
   ICE (TURN/STUN)
========================= */
async function loadIceServers() {
  try {
    const r = await fetch(`${apiUrl}/api/turn`)
    const data = await r.json()
    iceServers.value = data?.iceServers?.length
      ? data.iceServers
      : [{ urls: "stun:stun.l.google.com:19302" }]
    iceNote.value = data?.note || (data?.iceServers?.length ? "TURN/STUN" : "STUN only")
  } catch (e) {
    console.warn("ICE fetch failed, fallback STUN", e)
    iceServers.value = [{ urls: "stun:stun.l.google.com:19302" }]
    iceNote.value = "STUN only (fallback)"
  }
}

/* =========================
   LIVE JOIN/CREATE
========================= */
async function joinOrStart() {
  if (!joined.value) {
    await loadIceServers()

    // register presence for user rooms (needed for mic approval events)
    if (userId) {
      socket.emit("user:online", { userId })
      socket.emit("register-user", { id: userId, username })
    }

    joined.value = true
  }

  if (isHost.value) {
    // already host; no-op
    return
  }

  // If you press Go Live (host)
  if (!isHost.value && confirm("Go Live as Host? OK = Host, Cancel = Viewer")) {
    isHost.value = true
    await startHost()
  } else {
    isHost.value = false
    await joinAsViewer()
  }
}

async function startHost() {
  // get local camera+mic
  localHostStream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: { facingMode: "user" },
  })

  if (videoEl.value) {
    videoEl.value.srcObject = localHostStream
  }

  // tell server we are host
  socket.emit("live:create", { liveId: liveId.value })
}

async function joinAsViewer() {
  // viewer joins room and waits for host offer
  socket.emit("live:join", { liveId: liveId.value })
}

/* leave */
function leaveLive() {
  stopMic()
  cleanupViewerPC()
  cleanupHostPeers()

  if (isHost.value) socket.emit("live:end", { liveId: liveId.value })

  joined.value = false
  isHost.value = false
  viewerCount.value = 0
  hostSocketId.value = null
  canSpeak.value = false
  micRequests.value = []

  // stop host cam
  try { localHostStream?.getTracks()?.forEach(t => t.stop()) } catch {}
  localHostStream = null
  if (videoEl.value) videoEl.value.srcObject = null
}

/* =========================
   CHAT (room-based simple)
========================= */
function sendChat() {
  const t = chatText.value.trim()
  if (!t) return
  socket.emit("send-message", { room: `live:${liveId.value}`, from: username, text: t })
  chatText.value = ""
}

/* =========================
   MIC REQUEST FLOW
========================= */
function requestMic() {
  if (!joined.value || isHost.value) return
  socket.emit("live:mic:request", { liveId: liveId.value })
}

function approveMic(req) {
  // host approves viewer
  socket.emit("live:mic:approve", {
    liveId: liveId.value,
    userId: req.fromUserId,
    socketId: req.fromSocketId,
  })
  // remove request from list
  micRequests.value = micRequests.value.filter((x) => x.fromSocketId !== req.fromSocketId)
}

function denyMic(req) {
  socket.emit("live:mic:deny", {
    liveId: liveId.value,
    userId: req.fromUserId,
    socketId: req.fromSocketId,
    reason: "Host denied",
  })
  micRequests.value = micRequests.value.filter((x) => x.fromSocketId !== req.fromSocketId)
}

/* =========================
   VIEWER MIC UPLINK (Start/Stop Mic)
========================= */
async function startMic() {
  if (isHost.value) return
  if (!joined.value) return
  if (!canSpeak.value) return alert("Wait for host approval first.")
  if (!hostSocketId.value) return alert("Host not ready yet.")

  if (micActive.value) return
  micActive.value = true

  // iPhone requires user gesture => this is triggered by button, good.
  micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })

  micPC = new RTCPeerConnection({ iceServers: iceServers.value })

  // send track
  micStream.getTracks().forEach((t) => micPC.addTrack(t, micStream))

  micPC.onicecandidate = (e) => {
    if (e.candidate) {
      socket.emit("webrtc:ice", {
        liveId: liveId.value,
        to: hostSocketId.value,
        candidate: e.candidate,
        kind: "mic",
      })
    }
  }

  const offer = await micPC.createOffer()
  await micPC.setLocalDescription(offer)

  socket.emit("webrtc:offer", {
    liveId: liveId.value,
    to: hostSocketId.value,
    offer: micPC.localDescription,
    kind: "mic",
  })
}

function stopMic() {
  micActive.value = false

  try { micStream?.getTracks()?.forEach((t) => t.stop()) } catch {}
  micStream = null

  try { micPC?.close() } catch {}
  micPC = null
}

/* =========================
   HOST: create peer for viewer (host->viewer)
========================= */
function addLocalTracksTo(pc) {
  if (!localHostStream) return
  localHostStream.getTracks().forEach((t) => pc.addTrack(t, localHostStream))
}

async function createPeerForViewer(viewerSocketId) {
  const pc = new RTCPeerConnection({ iceServers: iceServers.value })

  pc.onicecandidate = (e) => {
    if (e.candidate) {
      socket.emit("webrtc:ice", {
        liveId: liveId.value,
        to: viewerSocketId,
        candidate: e.candidate,
        kind: "live", // ✅ host video flow
      })
    }
  }

  addLocalTracksTo(pc)
  hostVideoPeers.set(viewerSocketId, pc)

  const offer = await pc.createOffer()
  await pc.setLocalDescription(offer)

  socket.emit("webrtc:offer", {
    liveId: liveId.value,
    to: viewerSocketId,
    offer: pc.localDescription,
    kind: "live", // ✅ host video flow
  })
}

/* =========================
   VIEWER: handle host offer (host->viewer)
========================= */
async function ensureViewerPC(hostSid) {
  if (viewerPC) return viewerPC

  viewerPC = new RTCPeerConnection({ iceServers: iceServers.value })

  viewerPC.ontrack = (ev) => {
    // viewer receives host stream
    const stream = ev.streams?.[0]
    if (stream && videoEl.value) {
      videoEl.value.srcObject = stream
    }
  }

  viewerPC.onicecandidate = (e) => {
    if (e.candidate) {
      socket.emit("webrtc:ice", {
        liveId: liveId.value,
        to: hostSid,
        candidate: e.candidate,
        kind: "live",
      })
    }
  }

  return viewerPC
}

/* =========================
   HOST: receive MIC offer and play audio
========================= */
async function handleMicOffer(fromSid, offer) {
  const pc = new RTCPeerConnection({ iceServers: iceServers.value })
  hostMicPeers.set(fromSid, pc)

  pc.onicecandidate = (e) => {
    if (e.candidate) {
      socket.emit("webrtc:ice", {
        liveId: liveId.value,
        to: fromSid,
        candidate: e.candidate,
        kind: "mic",
      })
    }
  }

  pc.ontrack = (ev) => {
    // play speaker audio on host
    const stream = ev.streams?.[0]
    if (!stream) return

    // create or reuse audio element
    let el = micAudioEls.get(fromSid)
    if (!el) {
      el = document.createElement("audio")
      el.autoplay = true
      el.playsInline = true
      document.body.appendChild(el)
      micAudioEls.set(fromSid, el)
    }
    el.srcObject = stream
  }

  await pc.setRemoteDescription(offer)
  const answer = await pc.createAnswer()
  await pc.setLocalDescription(answer)

  socket.emit("webrtc:answer", {
    liveId: liveId.value,
    to: fromSid,
    answer: pc.localDescription,
    kind: "mic",
  })
}

/* =========================
   CLEANUP
========================= */
function cleanupHostPeers() {
  for (const pc of hostVideoPeers.values()) {
    try { pc.close() } catch {}
  }
  hostVideoPeers.clear()

  for (const pc of hostMicPeers.values()) {
    try { pc.close() } catch {}
  }
  hostMicPeers.clear()

  for (const el of micAudioEls.values()) {
    try { el.pause() } catch {}
    try { el.remove() } catch {}
  }
  micAudioEls.clear()
}

function cleanupViewerPC() {
  try { viewerPC?.close() } catch {}
  viewerPC = null
}

/* =========================
   SOCKET LISTENERS
========================= */
function setupSocket() {
  // Join live room for chat
  socket.emit("join-room", `live:${liveId.value}`)

  socket.on("receive-message", (msg) => {
    if (msg?.room && String(msg.room) !== `live:${liveId.value}`) return
    messages.value.push({ from: msg.from || "user", text: msg.text || "" })
    if (messages.value.length > 200) messages.value.shift()
  })

  socket.on("live:host", ({ hostSocketId: sid }) => {
    hostSocketId.value = sid
  })

  socket.on("live:presence", ({ viewerCount: n }) => {
    viewerCount.value = n || 0
  })

  socket.on("live:viewer-joined", async ({ viewerSocketId }) => {
    // only host gets this event
    if (!isHost.value) return
    if (!viewerSocketId) return
    await createPeerForViewer(viewerSocketId)
  })

  // ✅ MIC REQUEST arrives to host
  socket.on("live:mic:requested", (payload) => {
    if (!isHost.value) return
    // avoid duplicates
    const exists = micRequests.value.some((x) => x.fromSocketId === payload.fromSocketId)
    if (!exists) micRequests.value.push(payload)
  })

  // ✅ viewer gets approval
  socket.on("live:mic:approved", ({ liveId: lid }) => {
    if (String(lid) !== String(liveId.value)) return
    canSpeak.value = true
    alert("✅ Host approved your mic. Now tap Start Mic.")
  })

  socket.on("live:mic:denied", ({ liveId: lid, reason }) => {
    if (String(lid) !== String(liveId.value)) return
    canSpeak.value = false
    alert(`❌ Mic denied: ${reason || "denied"}`)
  })

  // WebRTC: offer
  socket.on("webrtc:offer", async ({ liveId: lid, from, offer, kind }) => {
    if (String(lid) !== String(liveId.value)) return
    if (!from || !offer) return

    // ✅ MIC offer (viewer -> host)
    if (kind === "mic" && isHost.value) {
      await handleMicOffer(from, offer)
      return
    }

    // ✅ LIVE offer (host -> viewer)
    if (kind === "live" && !isHost.value) {
      hostSocketId.value = from
      const pc = await ensureViewerPC(from)
      await pc.setRemoteDescription(offer)
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)

      socket.emit("webrtc:answer", {
        liveId: liveId.value,
        to: from,
        answer: pc.localDescription,
        kind: "live",
      })
      return
    }
  })

  // WebRTC: answer
  socket.on("webrtc:answer", async ({ liveId: lid, from, answer, kind }) => {
    if (String(lid) !== String(liveId.value)) return
    if (!from || !answer) return

    if (kind === "live" && isHost.value) {
      const pc = hostVideoPeers.get(from)
      if (!pc) return
      await pc.setRemoteDescription(answer)
      return
    }

    if (kind === "mic" && !isHost.value) {
      // viewer micPC gets answer from host
      if (!micPC) return
      await micPC.setRemoteDescription(answer)
      return
    }
  })

  // WebRTC: ICE
  socket.on("webrtc:ice", async ({ liveId: lid, from, candidate, kind }) => {
    if (String(lid) !== String(liveId.value)) return
    if (!from || !candidate) return

    try {
      if (kind === "live") {
        if (isHost.value) {
          const pc = hostVideoPeers.get(from)
          if (pc) await pc.addIceCandidate(candidate)
        } else {
          if (viewerPC) await viewerPC.addIceCandidate(candidate)
        }
        return
      }

      if (kind === "mic") {
        if (isHost.value) {
          const pc = hostMicPeers.get(from)
          if (pc) await pc.addIceCandidate(candidate)
        } else {
          if (micPC) await micPC.addIceCandidate(candidate)
        }
        return
      }
    } catch (e) {
      console.warn("ICE add failed", e)
    }
  })
}

onMounted(async () => {
  // allow opening live by query
  const params = new URLSearchParams(window.location.search)
  const qLiveId = params.get("liveId")
  if (qLiveId) liveId.value = qLiveId

  setupSocket()

  // ask current host list
  socket.emit("get-live-list")
})

onBeforeUnmount(() => {
  try {
    socket.off("receive-message")
    socket.off("live:host")
    socket.off("live:presence")
    socket.off("live:viewer-joined")
    socket.off("live:mic:requested")
    socket.off("live:mic:approved")
    socket.off("live:mic:denied")
    socket.off("webrtc:offer")
    socket.off("webrtc:answer")
    socket.off("webrtc:ice")
  } catch {}

  leaveLive()
})
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: radial-gradient(1200px 800px at 20% 0%, #1b2a4a 0%, #0b0f1a 55%, #070911 100%);
  color: #e9eefc;
  font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial;
  padding-bottom: 20px;
}

.top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(255,255,255,.08);
  background: rgba(10, 14, 26, 0.55);
  backdrop-filter: blur(10px);
}

.brand { display: flex; gap: 12px; align-items: center; }
.logo { font-size: 22px; }
.title { font-weight: 900; }
.sub { font-size: 12px; opacity: .85; margin-top: 2px; }
.mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }

.stage {
  margin: 14px;
  border-radius: 20px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.04);
  overflow: hidden;
}

.videoWrap {
  aspect-ratio: 16/10;
  background: #000;
}

.video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.controls {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
  padding: 14px;
  border-top: 1px solid rgba(255,255,255,.08);
  background: rgba(0,0,0,.20);
}

.statusbar {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
  padding: 10px 14px 14px;
}

.pill {
  font-size: 12px;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.15);
  background: rgba(255,255,255,.06);
}
.pill.ok { border-color: rgba(62,240,138,.35); }
.pill.warn { border-color: rgba(255,215,0,.35); }

.btn {
  border: 1px solid rgba(255,255,255,.16);
  background: rgba(255,255,255,.08);
  color: #fff;
  padding: 10px 14px;
  border-radius: 14px;
  cursor: pointer;
  font-weight: 800;
}
.btn:disabled { opacity: .45; cursor: not-allowed; }

.btn.primary {
  background: linear-gradient(135deg, rgba(62,240,138,.9), rgba(34,170,255,.75));
  border-color: rgba(62,240,138,.35);
  color: #04110a;
}

.btn.ghost { background: transparent; }
.btn.danger {
  background: linear-gradient(135deg, rgba(255,80,80,.95), rgba(255,140,80,.7));
  border-color: rgba(255,80,80,.35);
}

.btn.small { padding: 8px 10px; border-radius: 12px; font-weight: 900; }

.requests {
  margin: 0 14px 14px;
  border: 1px solid rgba(255,255,255,.10);
  border-radius: 18px;
  background: rgba(255,255,255,.04);
  overflow: hidden;
}
.requestsTitle {
  padding: 10px 12px;
  font-weight: 900;
  border-bottom: 1px solid rgba(255,255,255,.08);
}
.reqRow {
  display: flex;
  gap: 10px;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  border-top: 1px solid rgba(255,255,255,.06);
}
.reqName { font-weight: 900; }
.reqMeta { font-size: 12px; opacity: .8; }
.reqBtns { display: flex; gap: 8px; }

.chat {
  margin: 14px;
  border-radius: 20px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.04);
  overflow: hidden;
}
.chatTitle {
  padding: 12px 14px;
  font-weight: 900;
  border-bottom: 1px solid rgba(255,255,255,.08);
}
.msgs {
  padding: 12px 14px;
  max-height: 240px;
  overflow: auto;
}
.msg { margin: 6px 0; }
.name { font-weight: 900; margin-right: 6px; }
.text { opacity: .92; }

.sendRow {
  display: flex;
  gap: 10px;
  padding: 12px 14px;
  border-top: 1px solid rgba(255,255,255,.08);
}
.input {
  flex: 1;
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,.14);
  background: rgba(0,0,0,.20);
  color: #fff;
}
</style>