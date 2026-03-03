<template>
  <Layout>
    <div class="callWrap">
      <div class="bg-animated"></div>

      <!-- HEADER -->
      <header class="topbar">
        <button class="chip ghost" @click="goBack">← Back</button>

        <div class="pill">
          <span class="dot" :class="{ on: connected }"></span>
          <span class="t">CALL</span>
          <span class="s">
            {{ kind.toUpperCase() }} • {{ role.toUpperCase() }} • {{ formattedDuration }}
          </span>
        </div>

        <div class="right">
          <button class="chip ghost" @click="toggleMic">
            {{ micMuted ? "🔇 Mic" : "🎙️ Mic" }}
          </button>

          <button
            v-if="kind === 'video'"
            class="chip ghost"
            @click="toggleCam"
          >
            {{ camOff ? "📷 Off" : "📹 Cam" }}
          </button>

          <button class="chip ok" @click="restartIce">
            ♻ Restart ICE
          </button>

          <button class="chip danger" @click="endCall">
            End
          </button>
        </div>
      </header>

      <!-- VIDEO AREA -->
      <main class="grid">
        <section class="card">
          <div class="cardTop">
            <div class="label">REMOTE</div>
            <div class="hint">
              ICE: {{ iceState }} • Conn: {{ connState }} • Net: {{ networkQuality }}
            </div>
          </div>

          <video
            v-if="kind === 'video'"
            ref="remoteVideo"
            class="video"
            autoplay
            playsinline
          ></video>

          <audio v-else ref="remoteAudio" autoplay></audio>
        </section>

        <section class="card">
          <div class="cardTop">
            <div class="label">YOU</div>
          </div>

          <video
            v-if="kind === 'video'"
            ref="localVideo"
            class="video"
            autoplay
            playsinline
            muted
          ></video>

          <div v-else class="audioBox">
            <div class="meIcon">🎙️</div>
            <div class="meText">You</div>
          </div>
        </section>
      </main>
    </div>
  </Layout>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from "vue"
import { useRoute, useRouter } from "vue-router"
import Layout from "../components/Layout.vue"
import { createSocket } from "../api/socket"

const route = useRoute()
const router = useRouter()

const roomId = String(route.query.roomId || "")
const role = String(route.query.role || "caller")
const kind = String(route.query.kind || "video")

const localVideo = ref(null)
const remoteVideo = ref(null)
const remoteAudio = ref(null)

const micMuted = ref(false)
const camOff = ref(false)

const connected = ref(false)
const iceState = ref("new")
const connState = ref("new")
const networkQuality = ref("Unknown")

let socket = null
let pc = null
let localStream = null

/* =============================
   CALL TIMER (SAFE ADD)
============================= */
const callStartedAt = ref(null)
const callDuration = ref(0)
let durationInterval = null

function startTimer() {
  callStartedAt.value = Date.now()
  durationInterval = setInterval(() => {
    callDuration.value = Math.floor((Date.now() - callStartedAt.value) / 1000)
  }, 1000)
}

function stopTimer() {
  clearInterval(durationInterval)
}

const formattedDuration = computed(() => {
  const m = String(Math.floor(callDuration.value / 60)).padStart(2, "0")
  const s = String(callDuration.value % 60).padStart(2, "0")
  return `${m}:${s}`
})

/* =============================
   MEDIA
============================= */
async function getMedia() {
  localStream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: kind === "video"
  })

  if (kind === "video") {
    localVideo.value.srcObject = localStream
  }
}

function toggleMic() {
  micMuted.value = !micMuted.value
  localStream?.getAudioTracks().forEach(t => t.enabled = !micMuted.value)
}

function toggleCam() {
  camOff.value = !camOff.value
  localStream?.getVideoTracks().forEach(t => t.enabled = !camOff.value)
}

/* =============================
   WEBRTC
============================= */
async function buildPeer() {
  pc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
  })

  pc.onicecandidate = e => {
    if (e.candidate) {
      socket.emit("call:webrtc:ice", { roomId, candidate: e.candidate })
    }
  }

  pc.ontrack = e => {
    const stream = e.streams[0]

    if (kind === "video") {
      remoteVideo.value.srcObject = stream
    } else {
      remoteAudio.value.srcObject = stream
    }

    startTimer()
  }

  pc.oniceconnectionstatechange = () => {
    iceState.value = pc.iceConnectionState
  }

  pc.onconnectionstatechange = () => {
    connState.value = pc.connectionState

    if (pc.connectionState === "connected") {
      monitorNetwork()
    }
  }

  localStream.getTracks().forEach(track =>
    pc.addTrack(track, localStream)
  )
}

/* =============================
   SIGNALING (MATCH YOUR SERVER)
============================= */
function initSocket() {
  socket = createSocket()

  socket.on("connect", async () => {
    connected.value = true
    socket.emit("call:join", { roomId, role, kind })

    await getMedia()
    await buildPeer()

    if (role === "caller") {
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      socket.emit("call:webrtc:offer", { roomId, offer })
    }
  })

  socket.on("call:webrtc:offer", async ({ offer }) => {
    if (!offer) return

    await pc.setRemoteDescription(new RTCSessionDescription(offer))

    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)

    socket.emit("call:webrtc:answer", { roomId, answer })
  })

  socket.on("call:webrtc:answer", async ({ answer }) => {
    if (!answer) return
    await pc.setRemoteDescription(new RTCSessionDescription(answer))
  })

  socket.on("call:webrtc:ice", async ({ candidate }) => {
    if (candidate) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate))
      } catch {}
    }
  })

  socket.on("call:ended", () => {
    endCall(true)
  })
}

/* =============================
   NETWORK QUALITY
============================= */
async function monitorNetwork() {
  if (!pc) return

  setInterval(async () => {
    const stats = await pc.getStats()
    stats.forEach(report => {
      if (report.type === "candidate-pair" && report.state === "succeeded") {
        const rtt = report.currentRoundTripTime || 0

        if (rtt < 0.1) networkQuality.value = "Excellent"
        else if (rtt < 0.3) networkQuality.value = "Good"
        else if (rtt < 0.6) networkQuality.value = "Weak"
        else networkQuality.value = "Poor"
      }
    })
  }, 3000)
}

/* =============================
   CONTROLS
============================= */
function restartIce() {
  if (!pc) return

  pc.createOffer({ iceRestart: true })
    .then(offer => pc.setLocalDescription(offer))
    .then(() => {
      socket.emit("call:webrtc:offer", {
        roomId,
        offer: pc.localDescription
      })
    })
}

function goBack() {
  endCall()
  router.push("/dashboard")
}

function endCall(fromRemote = false) {
  stopTimer()

  if (!fromRemote) {
    socket.emit("call:end", { roomId })
  }

  try { pc?.close() } catch {}
  try { localStream?.getTracks().forEach(t => t.stop()) } catch {}
  try { socket?.disconnect() } catch {}

  router.push("/dashboard")
}

onMounted(() => {
  if (!roomId) return
  initSocket()
})

onBeforeUnmount(() => {
  endCall(true)
})
</script>

<style scoped>
.callWrap { min-height:100vh; background:#0b1220; color:#fff; }
.topbar { display:flex; justify-content:space-between; padding:12px; }
.grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; padding:12px; }
.card { background:rgba(255,255,255,.08); border-radius:16px; padding:12px; }
.video { width:100%; border-radius:12px; background:#000; }
.audioBox { display:flex; flex-direction:column; align-items:center; justify-content:center; height:300px; }
.chip { padding:8px 14px; border-radius:999px; background:#222; color:#fff; border:none; }
.chip.ghost { background:#333; }
.chip.ok { background:#1f7a3a; }
.chip.danger { background:#a11; }
.dot { width:8px; height:8px; border-radius:50%; background:#555; display:inline-block; }
.dot.on { background:#0f0; }
</style>