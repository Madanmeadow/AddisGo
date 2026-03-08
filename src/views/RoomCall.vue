<template>
  <Layout>
    <div class="roomPage">
      <header class="topbar">
        <button class="btn" @click="leaveRoom">← Leave</button>

        <div class="meta">
          <div class="title">{{ roomName || "Call Room" }}</div>
          <div class="sub">
            {{ roomKind === "video" ? "Video Room" : "Audio Room" }}
            • {{ participants.length }} participant{{ participants.length === 1 ? "" : "s" }}
          </div>
        </div>

        <span class="pill">{{ connectionText }}</span>
      </header>

      <main class="stage" :class="{ audioOnly: roomKind === 'audio' }">
        <div
          v-for="p in participants"
          :key="p.userId"
          class="tile"
        >
          <div class="tileTop">
            <div class="name">
              {{ p.username }}
              <span v-if="p.isHost" class="host">HOST</span>
            </div>
            <div class="icons">
              <span>{{ p.micOn ? "🎙" : "🔇" }}</span>
              <span v-if="roomKind === 'video'">{{ p.camOn ? "🎥" : "📷 off" }}</span>
            </div>
          </div>

          <video
            v-if="roomKind === 'video' && remoteStreams[p.userId]"
            class="video"
            autoplay
            playsinline
            :ref="(el) => bindRemoteVideo(el, p.userId)"
          ></video>

          <video
            v-else-if="roomKind === 'video' && meId === p.userId"
            class="video"
            autoplay
            playsinline
            muted
            ref="localVideo"
          ></video>

          <div v-else class="avatarBox">
            <div class="avatar">{{ (p.username || "U")[0]?.toUpperCase() }}</div>
          </div>
        </div>
      </main>

      <footer class="controls">
        <button class="btn" :class="{ warn: micMuted }" @click="toggleMic">
          {{ micMuted ? "Mic Off" : "Mic" }}
        </button>

        <button
          v-if="roomKind === 'video'"
          class="btn"
          :class="{ warn: camOff }"
          @click="toggleCamera"
        >
          {{ camOff ? "Camera Off" : "Camera" }}
        </button>

        <button class="btn danger" @click="leaveRoom">Leave Room</button>
      </footer>
    </div>
  </Layout>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from "vue"
import { useRoute, useRouter } from "vue-router"
import Layout from "../components/Layout.vue"
import { createSocket } from "../api/socket"

const route = useRoute()
const router = useRouter()

const roomId = String(route.query.roomId || "")
const me = (() => {
  try { return JSON.parse(localStorage.getItem("user") || "{}") } catch { return {} }
})()
const meId = String(me?.id || "")

let socket = null
const pcs = new Map()

const localStream = ref(null)
const localVideo = ref(null)
const remoteStreams = ref({})
const remoteVideoRefs = ref({})

const participants = ref([])
const roomName = ref("")
const roomKind = ref("audio")
const connectionText = ref("Connecting...")

const micMuted = ref(false)
const camOff = ref(false)

function bindRemoteVideo(el, userId) {
  if (!el) return
  remoteVideoRefs.value[userId] = el
  const stream = remoteStreams.value[userId]
  if (stream) {
    el.srcObject = stream
    el.play?.().catch(() => {})
  }
}

async function getLocalMedia() {
  if (localStream.value) return localStream.value

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
    video: roomKind.value === "video"
      ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 24, max: 30 },
          facingMode: "user",
        }
      : false,
  })

  localStream.value = stream

  if (localVideo.value && roomKind.value === "video") {
    localVideo.value.srcObject = stream
    localVideo.value.play?.().catch(() => {})
  }

  return stream
}

async function getIceServers() {
  const apiUrl = (import.meta.env.VITE_API_URL || "").trim()
  try {
    const res = await fetch(`${apiUrl}/api/turn`)
    const data = await res.json()
    if (Array.isArray(data?.iceServers) && data.iceServers.length) return data.iceServers
  } catch {}
  return [{ urls: "stun:stun.l.google.com:19302" }]
}

async function ensurePeerConnection(peerSocketId, peerUserId) {
  if (pcs.has(peerSocketId)) return pcs.get(peerSocketId)

  const pc = new RTCPeerConnection({
    iceServers: await getIceServers(),
    iceCandidatePoolSize: 10,
  })

  const stream = await getLocalMedia()
  stream.getTracks().forEach((track) => pc.addTrack(track, stream))

  pc.onicecandidate = (event) => {
    if (!event.candidate) return
    socket?.emit("callroom:webrtc:ice", {
      roomId,
      to: peerSocketId,
      candidate: event.candidate,
    })
  }

  pc.ontrack = (event) => {
    const stream = event.streams?.[0]
    if (!stream) return

    remoteStreams.value = {
      ...remoteStreams.value,
      [peerUserId]: stream,
    }

    const el = remoteVideoRefs.value[peerUserId]
    if (el) {
      el.srcObject = stream
      el.play?.().catch(() => {})
    }
  }

  pcs.set(peerSocketId, pc)
  return pc
}

async function callPeer(peerSocketId, peerUserId) {
  const pc = await ensurePeerConnection(peerSocketId, peerUserId)

  const offer = await pc.createOffer({
    offerToReceiveAudio: true,
    offerToReceiveVideo: roomKind.value === "video",
  })

  await pc.setLocalDescription(offer)

  socket?.emit("callroom:webrtc:offer", {
    roomId,
    to: peerSocketId,
    offer: pc.localDescription,
  })
}

function syncMediaState() {
  socket?.emit("callroom:media-state", {
    roomId,
    micOn: !micMuted.value,
    camOn: roomKind.value === "video" ? !camOff.value : false,
  })
}

function toggleMic() {
  if (!localStream.value) return
  micMuted.value = !micMuted.value
  localStream.value.getAudioTracks().forEach((t) => {
    t.enabled = !micMuted.value
  })
  syncMediaState()
}

function toggleCamera() {
  if (!localStream.value) return
  camOff.value = !camOff.value
  localStream.value.getVideoTracks().forEach((t) => {
    t.enabled = !camOff.value
  })
  syncMediaState()
}

function leaveRoom() {
  socket?.emit("callroom:leave", { roomId })
  cleanupAll()
  router.push("/call-rooms")
}

function cleanupAll() {
  try {
    localStream.value?.getTracks?.().forEach((t) => t.stop())
  } catch {}

  pcs.forEach((pc) => {
    try { pc.close() } catch {}
  })
  pcs.clear()

  localStream.value = null
  remoteStreams.value = {}
}

onMounted(async () => {
  socket = createSocket()

  socket.on("connect", async () => {
    connectionText.value = "Connected"
    socket.safeEmitPresence?.()
    await getLocalMedia()
    socket.emit("callroom:join", { roomId })
  })

  socket.on("callroom:state", async (state) => {
    roomName.value = state?.name || "Call Room"
    roomKind.value = state?.kind === "video" ? "video" : "audio"
    participants.value = Array.isArray(state?.participants) ? state.participants : []

    await nextTick()

    for (const p of participants.value) {
      if (String(p.userId) === meId) continue
      if (!p.socketId) continue
      if (!pcs.has(p.socketId)) {
        await callPeer(p.socketId, String(p.userId))
      }
    }
  })

  socket.on("callroom:peer-joined", async ({ socketId, userId }) => {
    if (!socketId || !userId) return
    if (String(userId) === meId) return
    await callPeer(String(socketId), String(userId))
  })

  socket.on("callroom:peer-left", ({ userId, socketId }) => {
    if (socketId && pcs.has(String(socketId))) {
      try { pcs.get(String(socketId)).close() } catch {}
      pcs.delete(String(socketId))
    }

    if (userId) {
      const copy = { ...remoteStreams.value }
      delete copy[String(userId)]
      remoteStreams.value = copy
    }
  })

  socket.on("callroom:webrtc:offer", async ({ from, offer }) => {
    if (!from || !offer) return

    const p = participants.value.find((x) => String(x.socketId) === String(from))
    const peerUserId = String(p?.userId || from)

    const pc = await ensurePeerConnection(String(from), peerUserId)
    await pc.setRemoteDescription(new RTCSessionDescription(offer))

    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)

    socket.emit("callroom:webrtc:answer", {
      roomId,
      to: String(from),
      answer: pc.localDescription,
    })
  })

  socket.on("callroom:webrtc:answer", async ({ from, answer }) => {
    if (!from || !answer) return
    const pc = pcs.get(String(from))
    if (!pc) return
    await pc.setRemoteDescription(new RTCSessionDescription(answer))
  })

  socket.on("callroom:webrtc:ice", async ({ from, candidate }) => {
    if (!from || !candidate) return
    const pc = pcs.get(String(from))
    if (!pc) return
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate))
    } catch {}
  })

  socket.on("callroom:error", ({ message }) => {
    alert(message || "Call room error")
  })
})

onBeforeUnmount(() => {
  cleanupAll()
  try { socket?.cleanupPulseSocket?.() } catch {}
  socket = null
})
</script>

<style scoped>
.roomPage {
  min-height: 100vh;
  color: white;
  padding: 14px;
  background:
    radial-gradient(circle at top left, rgba(255,80,120,.16), transparent 26%),
    radial-gradient(circle at top right, rgba(90,140,255,.14), transparent 24%),
    linear-gradient(180deg, #08101d, #091424 45%, #060c16);
}

.topbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}

.meta {
  flex: 1;
  min-width: 0;
}

.title {
  font-size: 22px;
  font-weight: 900;
}

.sub {
  opacity: .76;
  margin-top: 4px;
}

.pill {
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(255,255,255,.10);
}

.stage {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.stage.audioOnly {
  grid-template-columns: repeat(3, 1fr);
}

.tile {
  min-height: 260px;
  border-radius: 22px;
  overflow: hidden;
  background: rgba(255,255,255,.08);
  border: 1px solid rgba(255,255,255,.12);
  backdrop-filter: blur(14px);
  position: relative;
}

.tileTop {
  position: absolute;
  inset: 12px 12px auto 12px;
  z-index: 3;
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.name {
  font-weight: 900;
  background: rgba(0,0,0,.30);
  padding: 8px 10px;
  border-radius: 999px;
}

.host {
  margin-left: 8px;
  font-size: 11px;
  color: #ffd166;
}

.icons {
  display: flex;
  gap: 8px;
  background: rgba(0,0,0,.30);
  padding: 8px 10px;
  border-radius: 999px;
}

.video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  background: #000;
}

.avatarBox {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
}

.avatar {
  width: 90px;
  height: 90px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 34px;
  font-weight: 900;
  background: linear-gradient(135deg, #ff5478, #617bff);
}

.controls {
  position: fixed;
  left: 0;
  right: 0;
  bottom: calc(env(safe-area-inset-bottom) + 16px);
  display: flex;
  justify-content: center;
  gap: 10px;
}

.btn {
  border: 0;
  color: white;
  cursor: pointer;
  border-radius: 999px;
  padding: 12px 16px;
  background: rgba(255,255,255,.12);
}

.btn.warn {
  background: rgba(255,180,60,.20);
}

.btn.danger {
  background: linear-gradient(135deg, #ff3d57, #d5153a);
}

@media (max-width: 860px) {
  .stage,
  .stage.audioOnly {
    grid-template-columns: 1fr;
  }
}
</style>