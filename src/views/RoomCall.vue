<!-- src/views/RoomCall.vue -->
<template>
  <Layout>
    <div class="roomCallPage">
      <div class="bg-orb orb1"></div>
      <div class="bg-orb orb2"></div>
      <div class="bg-orb orb3"></div>

      <!-- TOP -->
      <header class="topbar glassy">
        <div class="left">
          <button class="iconBtn" @click="goBack">←</button>

          <div class="titleWrap">
            <div class="titleRow">
              <h1>{{ roomName }}</h1>
              <span class="kindPill" :class="{ video: roomKind === 'video' }">
                {{ roomKind === "video" ? "🎥 Video Room" : "🎙 Audio Room" }}
              </span>
            </div>

            <div class="sub">
              Room ID: {{ roomId || "—" }}
              <span v-if="joined"> • {{ participantCount }} inside</span>
              <span v-if="statusText"> • {{ statusText }}</span>
            </div>
          </div>
        </div>

        <div class="right">
          <button class="chip" @click="copyRoomLink">🔗 Share</button>
          <button class="chip ghost" @click="refreshRoom">↻ Refresh</button>
        </div>
      </header>

      <!-- INFO STRIP -->
      <section class="infoStrip">
        <div class="miniCard glassy">
          <div class="miniLabel">You</div>
          <div class="miniValue">{{ myName }}</div>
        </div>

        <div class="miniCard glassy">
          <div class="miniLabel">Participants</div>
          <div class="miniValue">{{ participantCount }}</div>
        </div>

        <div class="miniCard glassy">
          <div class="miniLabel">Connection</div>
          <div class="miniValue">{{ socketConnected ? "Connected" : "Reconnecting..." }}</div>
        </div>

        <div class="miniCard glassy">
          <div class="miniLabel">Mode</div>
          <div class="miniValue">{{ roomKind === "video" ? "Video" : "Audio" }}</div>
        </div>
      </section>

      <!-- MAIN -->
      <main class="main">
        <section class="stageWrap">
          <!-- PARTICIPANT SIDEBAR -->
          <aside class="participants glassy">
            <div class="panelHead">
              <div class="panelTitle">👥 Participants</div>
            </div>

            <div v-if="participants.length === 0" class="empty">
              No one here yet.
            </div>

            <div v-else class="participantList">
              <div
                v-for="p in participants"
                :key="p.userId"
                class="participantItem"
                :class="{ me: isMe(p.userId) }"
              >
                <div class="avatar">
                  {{ getInitial(p.name || p.username || p.userId) }}
                </div>

                <div class="meta">
                  <div class="nameRow">
                    <span class="name">{{ p.name || p.username || `User ${p.userId}` }}</span>
                    <span v-if="isMe(p.userId)" class="mePill">You</span>
                    <span v-if="p.isHost" class="hostPill">Host</span>
                  </div>

                  <div class="subRow">
                    <span class="stateDot" :class="{ on: p.connected !== false }"></span>
                    <span>{{ p.connected === false ? "Reconnecting" : "Connected" }}</span>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <!-- VIDEO GRID -->
          <section class="videoArea">
            <div class="grid" :class="gridClass">
              <!-- LOCAL -->
              <article class="videoCard glassy localCard">
                <div class="cardTop">
                  <div class="cardLabel">You</div>
                  <div class="statePills">
                    <span class="miniPill" :class="{ off: micMuted }">
                      {{ micMuted ? "Mic Off" : "Mic On" }}
                    </span>
                    <span v-if="roomKind === 'video'" class="miniPill" :class="{ off: cameraOff }">
                      {{ cameraOff ? "Cam Off" : "Cam On" }}
                    </span>
                  </div>
                </div>

                <video
                  v-if="roomKind === 'video' && !showLocalPlaceholder"
                  ref="localVideo"
                  class="videoEl localSelf"
                  autoplay
                  playsinline
                  muted
                ></video>

                <div v-else class="placeholder">
                  <div class="bigAvatar">{{ getInitial(myName) }}</div>
                  <div class="placeholderName">{{ myName }}</div>
                </div>
              </article>

              <!-- REMOTES -->
              <article
                v-for="peer in remotePeers"
                :key="peer.userId"
                class="videoCard glassy"
              >
                <div class="cardTop">
                  <div class="cardLabel">
                    {{ peer.name || peer.username || `User ${peer.userId}` }}
                  </div>

                  <div class="statePills">
                    <span v-if="peer.isHost" class="miniPill host">Host</span>
                    <span class="miniPill ok">{{ peer.connectionState || "connected" }}</span>
                  </div>
                </div>

                <video
                  v-if="roomKind === 'video' && peer.stream && hasRemoteVideo(peer.userId)"
                  :ref="(el) => setRemoteVideoRef(peer.userId, el)"
                  class="videoEl"
                  autoplay
                  playsinline
                ></video>

                <div v-else class="placeholder">
                  <div class="bigAvatar">
                    {{ getInitial(peer.name || peer.username || peer.userId) }}
                  </div>
                  <div class="placeholderName">
                    {{ peer.name || peer.username || `User ${peer.userId}` }}
                  </div>
                </div>
              </article>
            </div>

            <div v-if="joined && participants.length <= 1" class="waiting glassy">
              Waiting for others to join this room…
            </div>
          </section>
        </section>
      </main>

      <!-- CONTROLS -->
      <footer class="controls glassy">
        <button class="controlBtn" :class="{ off: micMuted }" @click="toggleMic" :disabled="!localStream">
          {{ micMuted ? "🎙 Off" : "🎙 Mic" }}
        </button>

        <button
          v-if="roomKind === 'video'"
          class="controlBtn"
          :class="{ off: cameraOff }"
          @click="toggleCamera"
          :disabled="!localStream"
        >
          {{ cameraOff ? "📷 Off" : "📷 Camera" }}
        </button>

        <button
          v-if="roomKind === 'video'"
          class="controlBtn"
          @click="switchCamera"
          :disabled="!localStream || switchingCamera"
        >
          {{ switchingCamera ? "Switching…" : "🔄 Switch" }}
        </button>

        <button class="controlBtn ghost" @click="copyRoomLink">
          🔗 Invite
        </button>

        <button v-if="!joined" class="controlBtn primary" @click="joinRoom" :disabled="joining">
          {{ joining ? "Joining…" : "Join Room" }}
        </button>

        <button v-else class="controlBtn danger" @click="leaveRoom">
          End / Leave
        </button>
      </footer>
    </div>
  </Layout>
</template>

<script setup>
defineOptions({ name: "RoomCall" })

import { ref, computed, onMounted, onBeforeUnmount, nextTick } from "vue"
import { useRoute, useRouter } from "vue-router"
import Layout from "../components/Layout.vue"
import { createSocket } from "../api/socket"

const route = useRoute()
const router = useRouter()

const token = localStorage.getItem("token") || ""
const me = (() => {
  try { return JSON.parse(localStorage.getItem("user") || "null") } catch { return null }
})()

const roomId = ref(String(route.query.roomId || ""))
const roomName = ref(String(route.query.name || "Call Room"))
const roomKind = ref(String(route.query.kind || "video"))

const socketConnected = ref(false)
const statusText = ref("Ready")
const joining = ref(false)
const joined = ref(false)

const localVideo = ref(null)
const localStream = ref(null)
const localFacingMode = ref("user")
const micMuted = ref(false)
const cameraOff = ref(false)
const switchingCamera = ref(false)

const socketRef = ref(null)
const participants = ref([])

/**
 * pcByUserId:
 * {
 *   [userId]: { pc, stream, name, username, connectionState, isHost }
 * }
 */
const pcByUserId = ref({})
const remoteVideoEls = ref({})

const myUserId = computed(() => String(me?.id || ""))
const myName = computed(() => me?.display_name || me?.username || "You")
const participantCount = computed(() => participants.value.length)

const remotePeers = computed(() =>
  Object.entries(pcByUserId.value).map(([userId, item]) => ({
    userId,
    ...item,
  }))
)

const gridClass = computed(() => {
  const count = 1 + remotePeers.value.length
  if (count <= 1) return "one"
  if (count === 2) return "two"
  if (count <= 4) return "four"
  return "many"
})

const showLocalPlaceholder = computed(() => {
  if (!localStream.value) return true
  if (roomKind.value !== "video") return true
  const tracks = localStream.value.getVideoTracks()
  return !tracks.length || !tracks.some((t) => t.enabled && t.readyState === "live")
})

function getInitial(value) {
  return String(value || "U").trim().charAt(0).toUpperCase() || "U"
}

function isMe(userId) {
  return String(userId) === myUserId.value
}

function setRemoteVideoRef(userId, el) {
  if (!el) return
  remoteVideoEls.value = { ...remoteVideoEls.value, [String(userId)]: el }

  const peer = pcByUserId.value[String(userId)]
  if (peer?.stream) {
    el.srcObject = peer.stream
    el.play?.().catch(() => {})
  }
}

function hasRemoteVideo(userId) {
  const peer = pcByUserId.value[String(userId)]
  const track = peer?.stream?.getVideoTracks?.()?.[0]
  return !!track && track.readyState === "live"
}

/* =========================
   SOCKET
========================= */
function wireSocket() {
  const socket = createSocket()
  socketRef.value = socket

  socket.on("connect", () => {
    socketConnected.value = true
    statusText.value = joined.value ? "Connected" : "Ready"
  })

  socket.on("disconnect", () => {
    socketConnected.value = false
    statusText.value = "Reconnecting..."
  })

  socket.on("callroom:error", ({ message } = {}) => {
    statusText.value = message || "Room error"
  })

  socket.on("callroom:state", async (payload = {}) => {
    if (payload.roomId) roomId.value = String(payload.roomId)
    if (payload.name) roomName.value = payload.name
    if (payload.kind) roomKind.value = payload.kind

    participants.value = Array.isArray(payload.participants) ? payload.participants : []
    joined.value = true
    joining.value = false
    statusText.value = "Joined"

    const otherUsers = participants.value.filter((p) => String(p.userId) !== myUserId.value)

    for (const p of otherUsers) {
      await ensurePeerConnection(String(p.userId), p)

      // Offer from current user to any peer not yet connected if I joined after
      if (!pcByUserId.value[String(p.userId)]?.remoteDescriptionSet) {
        await makeOfferTo(String(p.userId))
      }
    }
  })

  socket.on("callroom:user-joined", async (payload = {}) => {
    const userId = String(payload.userId || "")
    if (!userId || userId === myUserId.value) return

    upsertParticipant(payload)
    statusText.value = `${payload.name || "Someone"} joined`

    await ensurePeerConnection(userId, payload)
    await makeOfferTo(userId)
  })

  socket.on("callroom:user-left", ({ userId } = {}) => {
    const uid = String(userId || "")
    if (!uid) return

    participants.value = participants.value.filter((p) => String(p.userId) !== uid)
    cleanupPeer(uid)
    statusText.value = "Participant left"
  })

  socket.on("callroom:webrtc:offer", async ({ fromUserId, offer, meta } = {}) => {
    const uid = String(fromUserId || "")
    if (!uid || !offer) return

    await ensurePeerConnection(uid, meta || {})
    const item = pcByUserId.value[uid]
    if (!item?.pc) return

    try {
      await item.pc.setRemoteDescription(new RTCSessionDescription(offer))
      item.remoteDescriptionSet = true

      const answer = await item.pc.createAnswer()
      await item.pc.setLocalDescription(answer)

      socket.emit("callroom:webrtc:answer", {
        roomId: roomId.value,
        toUserId: uid,
        answer: item.pc.localDescription,
      })
    } catch (err) {
      console.error("room offer error", err)
    }
  })

  socket.on("callroom:webrtc:answer", async ({ fromUserId, answer } = {}) => {
    const uid = String(fromUserId || "")
    if (!uid || !answer) return

    const item = pcByUserId.value[uid]
    if (!item?.pc) return

    try {
      await item.pc.setRemoteDescription(new RTCSessionDescription(answer))
      item.remoteDescriptionSet = true
    } catch (err) {
      console.error("room answer error", err)
    }
  })

  socket.on("callroom:webrtc:ice", async ({ fromUserId, candidate } = {}) => {
    const uid = String(fromUserId || "")
    if (!uid || !candidate) return

    const item = pcByUserId.value[uid]
    if (!item?.pc) return

    try {
      await item.pc.addIceCandidate(new RTCIceCandidate(candidate))
    } catch (err) {
      console.error("room ice error", err)
    }
  })
}

/* =========================
   MEDIA
========================= */
async function ensureLocalMedia() {
  if (localStream.value) return localStream.value

  const constraints = {
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
    video:
      roomKind.value === "video"
        ? {
            facingMode: localFacingMode.value,
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 24, max: 30 },
          }
        : false,
  }

  const stream = await navigator.mediaDevices.getUserMedia(constraints)
  localStream.value = stream

  if (roomKind.value === "video" && localVideo.value) {
    localVideo.value.srcObject = stream
    localVideo.value.play?.().catch(() => {})
  }

  return stream
}

async function switchCamera() {
  if (roomKind.value !== "video") return
  if (!localStream.value || switchingCamera.value) return

  switchingCamera.value = true

  try {
    localFacingMode.value = localFacingMode.value === "user" ? "environment" : "user"

    const newStream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: localFacingMode.value,
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 24, max: 30 },
      },
    })

    const newVideoTrack = newStream.getVideoTracks()[0]
    if (!newVideoTrack) return

    // replace for all peers
    for (const userId of Object.keys(pcByUserId.value)) {
      const sender = pcByUserId.value[userId]?.pc
        ?.getSenders()
        ?.find((s) => s.track?.kind === "video")
      if (sender) await sender.replaceTrack(newVideoTrack)
    }

    const audioTracks = localStream.value.getAudioTracks()
    localStream.value.getVideoTracks().forEach((t) => {
      try { t.stop() } catch {}
    })

    localStream.value = new MediaStream([...audioTracks, newVideoTrack])

    if (localVideo.value) {
      localVideo.value.srcObject = localStream.value
      localVideo.value.play?.().catch(() => {})
    }

    cameraOff.value = false
  } catch (err) {
    console.error("switch camera error", err)
  } finally {
    switchingCamera.value = false
  }
}

function toggleMic() {
  if (!localStream.value) return
  micMuted.value = !micMuted.value
  localStream.value.getAudioTracks().forEach((t) => {
    t.enabled = !micMuted.value
  })
}

function toggleCamera() {
  if (!localStream.value || roomKind.value !== "video") return
  cameraOff.value = !cameraOff.value
  localStream.value.getVideoTracks().forEach((t) => {
    t.enabled = !cameraOff.value
  })
}

/* =========================
   WEBRTC
========================= */
async function getIceServers() {
  const apiUrl = (import.meta.env.VITE_API_URL || "").trim()
  try {
    const res = await fetch(`${apiUrl}/api/turn`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    const data = await res.json()
    if (Array.isArray(data?.iceServers) && data.iceServers.length) {
      return data.iceServers
    }
  } catch {}

  return [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ]
}

function upsertParticipant(payload) {
  const uid = String(payload.userId || "")
  if (!uid) return

  const existing = participants.value.find((p) => String(p.userId) === uid)
  if (existing) {
    Object.assign(existing, payload)
    participants.value = [...participants.value]
  } else {
    participants.value = [...participants.value, payload]
  }
}

async function ensurePeerConnection(userId, meta = {}) {
  const uid = String(userId)
  if (!uid || uid === myUserId.value) return

  if (pcByUserId.value[uid]?.pc) return pcByUserId.value[uid]

  const iceServers = await getIceServers()
  const pc = new RTCPeerConnection({
    iceServers,
    iceCandidatePoolSize: 10,
  })

  const peerItem = {
    pc,
    stream: null,
    name: meta.name || meta.username || `User ${uid}`,
    username: meta.username || "",
    isHost: !!meta.isHost,
    connectionState: "connecting",
    remoteDescriptionSet: false,
  }

  if (localStream.value) {
    localStream.value.getTracks().forEach((track) => {
      pc.addTrack(track, localStream.value)
    })
  }

  pc.onicecandidate = (event) => {
    if (!event.candidate) return
    socketRef.value?.emit("callroom:webrtc:ice", {
      roomId: roomId.value,
      toUserId: uid,
      candidate: event.candidate,
    })
  }

  pc.ontrack = (event) => {
    const stream = event.streams?.[0]
    if (!stream) return

    peerItem.stream = stream
    pcByUserId.value = { ...pcByUserId.value, [uid]: { ...peerItem } }

    nextTick(() => {
      const el = remoteVideoEls.value[uid]
      if (el) {
        el.srcObject = stream
        el.play?.().catch(() => {})
      }
    })
  }

  pc.onconnectionstatechange = () => {
    peerItem.connectionState = pc.connectionState || "connecting"
    pcByUserId.value = { ...pcByUserId.value, [uid]: { ...peerItem } }
  }

  pcByUserId.value = { ...pcByUserId.value, [uid]: peerItem }
  return peerItem
}

async function makeOfferTo(userId) {
  const uid = String(userId)
  const item = pcByUserId.value[uid]
  if (!item?.pc) return

  try {
    const offer = await item.pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: roomKind.value === "video",
    })
    await item.pc.setLocalDescription(offer)

    socketRef.value?.emit("callroom:webrtc:offer", {
      roomId: roomId.value,
      toUserId: uid,
      offer: item.pc.localDescription,
      meta: {
        userId: myUserId.value,
        name: myName.value,
      },
    })
  } catch (err) {
    console.error("make offer error", err)
  }
}

/* =========================
   ROOM FLOW
========================= */
async function refreshRoom() {
  if (!roomId.value) return
  socketRef.value?.emit("callroom:get", { roomId: roomId.value })
}

async function joinRoom() {
  if (!roomId.value) {
    alert("Missing roomId")
    return
  }

  joining.value = true
  statusText.value = "Getting media..."

  try {
    await ensureLocalMedia()
    statusText.value = "Joining..."
    socketRef.value?.emit("callroom:join", { roomId: roomId.value })
  } catch (err) {
    console.error("joinRoom error", err)
    joining.value = false
    statusText.value = "Could not join"
    alert("Camera/mic permission failed.")
  }
}

function leaveRoom() {
  if (roomId.value) {
    socketRef.value?.emit("callroom:leave", { roomId: roomId.value })
  }
  cleanupAll()
  router.push("/dashboard")
}

function goBack() {
  leaveRoom()
}

async function copyRoomLink() {
  const url = `${window.location.origin}/#/room-call?roomId=${encodeURIComponent(roomId.value)}`
  try {
    await navigator.clipboard.writeText(url)
    statusText.value = "Room link copied"
  } catch {
    alert(url)
  }
}

/* =========================
   CLEANUP
========================= */
function cleanupPeer(userId) {
  const uid = String(userId)
  const item = pcByUserId.value[uid]
  if (item?.pc) {
    try { item.pc.close() } catch {}
  }

  const next = { ...pcByUserId.value }
  delete next[uid]
  pcByUserId.value = next

  const refs = { ...remoteVideoEls.value }
  delete refs[uid]
  remoteVideoEls.value = refs
}

function cleanupAll() {
  Object.keys(pcByUserId.value).forEach((uid) => cleanupPeer(uid))

  if (localStream.value) {
    localStream.value.getTracks().forEach((t) => {
      try { t.stop() } catch {}
    })
  }

  if (localVideo.value) localVideo.value.srcObject = null

  localStream.value = null
  participants.value = []
  joined.value = false
  joining.value = false
  micMuted.value = false
  cameraOff.value = false
  statusText.value = "Left room"
}

/* =========================
   LIFECYCLE
========================= */
onMounted(async () => {
  wireSocket()
  await nextTick()

  if (roomId.value) {
    refreshRoom()
    await joinRoom()
  } else {
    statusText.value = "Missing room id"
  }
})

onBeforeUnmount(() => {
  try {
    if (roomId.value && joined.value) {
      socketRef.value?.emit("callroom:leave", { roomId: roomId.value })
    }
  } catch {}

  cleanupAll()

  try {
    socketRef.value?.off("connect")
    socketRef.value?.off("disconnect")
    socketRef.value?.off("callroom:error")
    socketRef.value?.off("callroom:state")
    socketRef.value?.off("callroom:user-joined")
    socketRef.value?.off("callroom:user-left")
    socketRef.value?.off("callroom:webrtc:offer")
    socketRef.value?.off("callroom:webrtc:answer")
    socketRef.value?.off("callroom:webrtc:ice")
    socketRef.value?.cleanupPulseSocket?.()
  } catch {}
})
</script>

<style scoped>
.roomCallPage {
  position: relative;
  min-height: 100vh;
  color: white;
  overflow: hidden;
  padding-bottom: 110px;
  background:
    radial-gradient(1200px 700px at 20% 0%, rgba(255,75,43,0.16), transparent),
    radial-gradient(1000px 700px at 80% 20%, rgba(255,65,108,0.16), transparent),
    radial-gradient(800px 600px at 50% 100%, rgba(124,58,237,0.12), transparent),
    linear-gradient(180deg, #09111f 0%, #0b1220 45%, #07101d 100%);
}

.bg-orb {
  position: fixed;
  border-radius: 999px;
  filter: blur(80px);
  pointer-events: none;
  opacity: 0.35;
  z-index: 0;
}
.orb1 {
  width: 280px;
  height: 280px;
  left: -40px;
  top: 60px;
  background: rgba(255, 90, 120, 0.42);
}
.orb2 {
  width: 300px;
  height: 300px;
  right: -40px;
  top: 200px;
  background: rgba(91, 140, 255, 0.34);
}
.orb3 {
  width: 220px;
  height: 220px;
  left: 30%;
  bottom: 80px;
  background: rgba(56, 189, 248, 0.20);
}

.glassy {
  background: rgba(255, 255, 255, 0.075);
  border: 1px solid rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(14px);
  box-shadow:
    0 12px 40px rgba(0, 0, 0, 0.26),
    inset 0 1px 0 rgba(255,255,255,0.04);
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  padding: 14px 16px;
  margin: 12px 16px 0;
  border-radius: 20px;
}

.left, .right {
  display: flex;
  align-items: center;
  gap: 12px;
}
.right {
  flex-wrap: wrap;
}

.iconBtn {
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 14px;
  background: rgba(255,255,255,0.12);
  color: white;
  cursor: pointer;
  font-size: 18px;
}

.titleWrap {
  min-width: 0;
}
.titleRow {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.titleRow h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 950;
}
.sub {
  margin-top: 4px;
  opacity: .78;
  font-size: 13px;
  word-break: break-word;
}

.kindPill {
  padding: 7px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 900;
  background: rgba(255,255,255,0.10);
  border: 1px solid rgba(255,255,255,0.14);
}
.kindPill.video {
  background: rgba(255,75,43,0.14);
  border-color: rgba(255,75,43,0.25);
}

.chip {
  border: none;
  border-radius: 999px;
  padding: 10px 14px;
  cursor: pointer;
  background: rgba(255,255,255,0.12);
  color: white;
}
.chip.ghost {
  background: rgba(255,255,255,0.08);
}

.infoStrip {
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  padding: 16px;
}
.miniCard {
  border-radius: 18px;
  padding: 14px;
}
.miniLabel {
  font-size: 12px;
  opacity: .72;
}
.miniValue {
  margin-top: 4px;
  font-size: 16px;
  font-weight: 900;
}

.main {
  position: relative;
  z-index: 2;
  padding: 0 16px 16px;
}

.stageWrap {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 14px;
}

.participants {
  border-radius: 20px;
  padding: 14px;
  min-height: 60vh;
}

.panelHead {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.panelTitle {
  font-weight: 950;
}

.empty {
  opacity: .75;
  padding: 10px 0;
}

.participantList {
  display: grid;
  gap: 10px;
}

.participantItem {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 10px;
  border-radius: 16px;
  background: rgba(0,0,0,0.24);
  border: 1px solid rgba(255,255,255,0.08);
}
.participantItem.me {
  border-color: rgba(255,75,43,0.25);
}

.avatar {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  font-weight: 950;
  background: linear-gradient(135deg, rgba(255,65,108,0.7), rgba(91,140,255,0.7));
}

.meta {
  min-width: 0;
  flex: 1;
}
.nameRow {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.name {
  font-weight: 900;
}
.mePill,
.hostPill {
  font-size: 11px;
  font-weight: 900;
  padding: 4px 8px;
  border-radius: 999px;
}
.mePill {
  background: rgba(255,255,255,0.10);
}
.hostPill {
  background: rgba(255,75,43,0.16);
  border: 1px solid rgba(255,75,43,0.26);
}
.subRow {
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  opacity: .75;
}
.stateDot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255,255,255,0.35);
}
.stateDot.on {
  background: #00e676;
}

.videoArea {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.grid {
  display: grid;
  gap: 14px;
}
.grid.one {
  grid-template-columns: 1fr;
}
.grid.two {
  grid-template-columns: repeat(2, 1fr);
}
.grid.four {
  grid-template-columns: repeat(2, 1fr);
}
.grid.many {
  grid-template-columns: repeat(3, 1fr);
}

.videoCard {
  position: relative;
  border-radius: 24px;
  overflow: hidden;
  min-height: 280px;
  padding: 0;
}
.localCard {
  border-color: rgba(255,75,43,0.20);
}

.cardTop {
  position: absolute;
  top: 12px;
  left: 12px;
  right: 12px;
  z-index: 3;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}
.cardLabel {
  padding: 8px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 900;
  background: rgba(0,0,0,0.35);
  backdrop-filter: blur(8px);
}
.statePills {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.miniPill {
  padding: 7px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 900;
  background: rgba(0,0,0,0.35);
}
.miniPill.off {
  background: rgba(255, 160, 0, 0.22);
}
.miniPill.ok {
  background: rgba(34,197,94,0.18);
}
.miniPill.host {
  background: rgba(255,75,43,0.18);
}

.videoEl {
  width: 100%;
  height: 100%;
  min-height: 280px;
  object-fit: cover;
  background: #000;
}
.localSelf {
  transform: scaleX(-1);
}

.placeholder {
  display: grid;
  place-items: center;
  align-content: center;
  gap: 12px;
  min-height: 280px;
  background:
    radial-gradient(circle at 50% 20%, rgba(255,255,255,0.07), transparent 24%),
    linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01));
}
.bigAvatar {
  width: 88px;
  height: 88px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 32px;
  font-weight: 950;
  background: linear-gradient(135deg, rgba(255,90,120,0.95), rgba(120,120,255,0.95));
}
.placeholderName {
  font-size: 16px;
  font-weight: 800;
}

.waiting {
  border-radius: 18px;
  padding: 14px;
  opacity: .85;
}

.controls {
  position: fixed;
  left: 16px;
  right: 16px;
  bottom: calc(env(safe-area-inset-bottom) + 16px);
  z-index: 25;
  display: flex;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 12px;
  border-radius: 24px;
}

.controlBtn {
  border: none;
  min-width: 98px;
  height: 50px;
  padding: 0 16px;
  border-radius: 16px;
  color: white;
  font-weight: 900;
  cursor: pointer;
  background: rgba(255,255,255,0.12);
}
.controlBtn.off {
  background: rgba(255, 160, 0, 0.22);
}
.controlBtn.primary {
  background: linear-gradient(45deg, #ff416c, #ff4b2b);
}
.controlBtn.ghost {
  background: rgba(255,255,255,0.08);
}
.controlBtn.danger {
  background: linear-gradient(135deg, #ff3d57, #d5153a);
}

@media (max-width: 980px) {
  .stageWrap {
    grid-template-columns: 1fr;
  }

  .participants {
    min-height: auto;
  }

  .grid.many,
  .grid.four,
  .grid.two {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .topbar {
    margin: 10px 10px 0;
    padding: 12px;
  }

  .infoStrip {
    grid-template-columns: repeat(2, 1fr);
    padding: 10px;
  }

  .main {
    padding: 0 10px 12px;
  }

  .controls {
    left: 10px;
    right: 10px;
  }

  .controlBtn {
    min-width: 88px;
    height: 46px;
    font-size: 13px;
  }
}
</style>