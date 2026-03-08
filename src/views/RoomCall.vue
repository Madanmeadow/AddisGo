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
          <button class="chip ghost" @click="joinRoom" :disabled="joining || !socketConnected || joined">
            {{ joining ? "Joining…" : joined ? "Joined" : "Join" }}
          </button>
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

      <!-- ALERTS -->
      <section v-if="errorText" class="alertBox glassy">
        {{ errorText }}
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
                :key="String(p.userId)"
                class="participantItem"
                :class="{ me: isMe(p.userId) }"
              >
                <div class="avatar">
                  {{ getInitial(p.username || p.userId) }}
                </div>

                <div class="meta">
                  <div class="nameRow">
                    <span class="name">{{ p.username || `User ${p.userId}` }}</span>
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
                :key="peer.socketId"
                class="videoCard glassy"
              >
                <div class="cardTop">
                  <div class="cardLabel">
                    {{ peer.username || `User ${peer.userId}` }}
                  </div>

                  <div class="statePills">
                    <span v-if="peer.isHost" class="miniPill host">Host</span>
                    <span class="miniPill ok">{{ peer.connectionState || "connecting" }}</span>
                  </div>
                </div>

                <video
                  v-if="roomKind === 'video' && peer.stream && hasRemoteVideo(peer.socketId)"
                  :ref="(el) => setRemoteVideoRef(peer.socketId, el)"
                  class="videoEl"
                  autoplay
                  playsinline
                ></video>

                <div v-else class="placeholder">
                  <div class="bigAvatar">
                    {{ getInitial(peer.username || peer.userId) }}
                  </div>
                  <div class="placeholderName">
                    {{ peer.username || `User ${peer.userId}` }}
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
        <button class="controlBtn" :class="{ off: micMuted }" @click="toggleMic" :disabled="!localStream || !joined">
          {{ micMuted ? "🎙 Off" : "🎙 Mic" }}
        </button>

        <button
          v-if="roomKind === 'video'"
          class="controlBtn"
          :class="{ off: cameraOff }"
          @click="toggleCamera"
          :disabled="!localStream || !joined"
        >
          {{ cameraOff ? "📷 Off" : "📷 Camera" }}
        </button>

        <button
          v-if="roomKind === 'video'"
          class="controlBtn"
          @click="switchCamera"
          :disabled="!localStream || switchingCamera || !joined"
        >
          {{ switchingCamera ? "Switching…" : "🔄 Switch" }}
        </button>

        <button class="controlBtn ghost" @click="copyRoomLink">
          🔗 Invite
        </button>

        <button v-if="!joined" class="controlBtn primary" @click="joinRoom" :disabled="joining || !socketConnected">
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
const apiUrl = (import.meta.env.VITE_API_URL || "").trim()

const me = (() => {
  try { return JSON.parse(localStorage.getItem("user") || "null") } catch { return null }
})()

const roomId = ref(String(route.query.roomId || ""))
const roomName = ref(String(route.query.name || "Call Room"))
const roomKind = ref(String(route.query.kind || "video"))

const socketConnected = ref(false)
const statusText = ref("Ready")
const errorText = ref("")
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
 * peersBySocketId:
 * {
 *   [socketId]: {
 *     socketId,
 *     userId,
 *     username,
 *     isHost,
 *     pc,
 *     stream,
 *     connectionState,
 *     remoteDescriptionSet
 *   }
 * }
 */
const peersBySocketId = ref({})
const remoteVideoEls = ref({})

const myUserId = computed(() => String(me?.id || ""))
const myName = computed(() => me?.display_name || me?.username || "You")
const participantCount = computed(() => participants.value.length)

const remotePeers = computed(() =>
  Object.values(peersBySocketId.value).filter((p) => String(p.userId) !== myUserId.value)
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

function setRemoteVideoRef(socketId, el) {
  if (!el) return
  remoteVideoEls.value = { ...remoteVideoEls.value, [String(socketId)]: el }

  const peer = peersBySocketId.value[String(socketId)]
  if (peer?.stream) {
    el.srcObject = peer.stream
    el.play?.().catch(() => {})
  }
}

function hasRemoteVideo(socketId) {
  const peer = peersBySocketId.value[String(socketId)]
  const track = peer?.stream?.getVideoTracks?.()?.[0]
  return !!track && track.readyState === "live"
}

function getParticipantBySocketId(socketId) {
  return participants.value.find((p) => String(p.socketId) === String(socketId)) || null
}

function syncPeersFromParticipants() {
  const next = { ...peersBySocketId.value }

  for (const p of participants.value) {
    const sid = String(p.socketId || "")
    if (!sid) continue

    const old = next[sid]
    next[sid] = {
      socketId: sid,
      userId: String(p.userId || ""),
      username: p.username || `User ${p.userId || "?"}`,
      isHost: !!p.isHost,
      pc: old?.pc || null,
      stream: old?.stream || null,
      connectionState: old?.connectionState || "new",
      remoteDescriptionSet: old?.remoteDescriptionSet || false,
    }
  }

  for (const sid of Object.keys(next)) {
    const stillExists = participants.value.some((p) => String(p.socketId) === sid)
    if (!stillExists) {
      cleanupPeer(sid)
      delete next[sid]
    }
  }

  peersBySocketId.value = next
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

    if (me?.id) {
      const username = me?.username || me?.display_name || me?.name || me?.email || `User${me.id}`
      socket.emit("user:online", { userId: String(me.id), username })
      socket.emit("register-user", { id: String(me.id), username })
    }
  })

  socket.on("disconnect", () => {
    socketConnected.value = false
    statusText.value = "Reconnecting..."
  })

  socket.on("callroom:error", ({ message } = {}) => {
    errorText.value = message || "Room error"
    statusText.value = message || "Room error"
    joining.value = false
  })

  socket.on("callroom:state", async (payload = {}) => {
    if (payload.roomId) roomId.value = String(payload.roomId)
    if (payload.name) roomName.value = payload.name
    if (payload.kind) roomKind.value = payload.kind

    participants.value = Array.isArray(payload.participants) ? payload.participants : []
    syncPeersFromParticipants()

    statusText.value = joined.value ? "Joined" : "Room ready"

    for (const p of participants.value) {
      const sid = String(p.socketId || "")
      if (!sid) continue
      if (String(p.userId) === myUserId.value) continue
      await ensurePeerConnectionBySocketId(sid, p)
    }
  })

  socket.on("callroom:peer-joined", async ({ roomId: incomingRoomId, userId, socketId, username } = {}) => {
    if (incomingRoomId && String(incomingRoomId) !== roomId.value) return
    if (!socketId) return
    if (String(userId || "") === myUserId.value) return

    statusText.value = `${username || "Someone"} joined`

    upsertParticipant({
      userId: String(userId || ""),
      socketId: String(socketId),
      username: username || `User ${userId || "?"}`,
      isHost: false,
      connected: true,
    })

    await ensurePeerConnectionBySocketId(String(socketId), {
      userId: String(userId || ""),
      socketId: String(socketId),
      username: username || `User ${userId || "?"}`,
      isHost: false,
    })

    if (joined.value) {
      await makeOfferToSocket(String(socketId))
    }
  })

  socket.on("callroom:peer-left", ({ socketId } = {}) => {
    const sid = String(socketId || "")
    if (!sid) return

    participants.value = participants.value.filter((p) => String(p.socketId) !== sid)
    cleanupPeer(sid)
    statusText.value = "Participant left"
  })

  socket.on("callroom:webrtc:offer", async ({ from, offer } = {}) => {
    const fromSocketId = String(from || "")
    if (!fromSocketId || !offer) return

    const participant = getParticipantBySocketId(fromSocketId)

    await ensurePeerConnectionBySocketId(fromSocketId, {
      socketId: fromSocketId,
      userId: String(participant?.userId || ""),
      username: participant?.username || `User ${participant?.userId || "?"}`,
      isHost: !!participant?.isHost,
    })

    const item = peersBySocketId.value[fromSocketId]
    if (!item?.pc) return

    try {
      await item.pc.setRemoteDescription(new RTCSessionDescription(offer))
      item.remoteDescriptionSet = true

      const answer = await item.pc.createAnswer()
      await item.pc.setLocalDescription(answer)

      socket.emit("callroom:webrtc:answer", {
        roomId: roomId.value,
        to: fromSocketId,
        answer: item.pc.localDescription,
      })
    } catch (err) {
      console.error("callroom offer error", err)
    }
  })

  socket.on("callroom:webrtc:answer", async ({ from, answer } = {}) => {
    const fromSocketId = String(from || "")
    if (!fromSocketId || !answer) return

    const item = peersBySocketId.value[fromSocketId]
    if (!item?.pc) return

    try {
      await item.pc.setRemoteDescription(new RTCSessionDescription(answer))
      item.remoteDescriptionSet = true
    } catch (err) {
      console.error("callroom answer error", err)
    }
  })

  socket.on("callroom:webrtc:ice", async ({ from, candidate } = {}) => {
    const fromSocketId = String(from || "")
    if (!fromSocketId || !candidate) return

    const item = peersBySocketId.value[fromSocketId]
    if (!item?.pc) return

    try {
      await item.pc.addIceCandidate(new RTCIceCandidate(candidate))
    } catch (err) {
      console.error("callroom ice error", err)
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

  await nextTick()

  if (roomKind.value === "video" && localVideo.value) {
    localVideo.value.srcObject = stream
    localVideo.value.muted = true
    localVideo.value.playsInline = true
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

    for (const sid of Object.keys(peersBySocketId.value)) {
      const sender = peersBySocketId.value[sid]?.pc
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
    emitMediaState()
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
  emitMediaState()
}

function toggleCamera() {
  if (!localStream.value || roomKind.value !== "video") return
  cameraOff.value = !cameraOff.value
  localStream.value.getVideoTracks().forEach((t) => {
    t.enabled = !cameraOff.value
  })
  emitMediaState()
}

function emitMediaState() {
  socketRef.value?.emit("callroom:media-state", {
    roomId: roomId.value,
    micOn: !micMuted.value,
    camOn: roomKind.value === "video" ? !cameraOff.value : false,
  })
}

/* =========================
   WEBRTC
========================= */
async function getIceServers() {
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
  const userId = String(payload.userId || "")
  const socketId = String(payload.socketId || "")
  if (!userId && !socketId) return

  const idx = participants.value.findIndex(
    (p) =>
      (socketId && String(p.socketId) === socketId) ||
      (userId && String(p.userId) === userId)
  )

  if (idx >= 0) {
    const clone = [...participants.value]
    clone[idx] = { ...clone[idx], ...payload }
    participants.value = clone
  } else {
    participants.value = [...participants.value, payload]
  }

  syncPeersFromParticipants()
}

async function ensurePeerConnectionBySocketId(socketId, meta = {}) {
  const sid = String(socketId || "")
  if (!sid) return

  const existing = peersBySocketId.value[sid]
  if (existing?.pc) return existing

  const iceServers = await getIceServers()
  const pc = new RTCPeerConnection({
    iceServers,
    iceCandidatePoolSize: 10,
  })

  const peerItem = {
    socketId: sid,
    userId: String(meta.userId || ""),
    username: meta.username || `User ${meta.userId || "?"}`,
    isHost: !!meta.isHost,
    pc,
    stream: null,
    connectionState: "connecting",
    remoteDescriptionSet: false,
  }

  if (localStream.value) {
    localStream.value.getTracks().forEach((track) => {
      try {
        pc.addTrack(track, localStream.value)
      } catch {}
    })
  }

  pc.onicecandidate = (event) => {
    if (!event.candidate) return
    socketRef.value?.emit("callroom:webrtc:ice", {
      roomId: roomId.value,
      to: sid,
      candidate: event.candidate,
    })
  }

  pc.ontrack = (event) => {
    const stream = event.streams?.[0]
    if (!stream) return

    peerItem.stream = stream
    peersBySocketId.value = { ...peersBySocketId.value, [sid]: { ...peerItem } }

    nextTick(() => {
      const el = remoteVideoEls.value[sid]
      if (el) {
        el.srcObject = stream
        el.play?.().catch(() => {})
      }
    })
  }

  pc.onconnectionstatechange = () => {
    peerItem.connectionState = pc.connectionState || "connecting"
    peersBySocketId.value = { ...peersBySocketId.value, [sid]: { ...peerItem } }
  }

  peersBySocketId.value = { ...peersBySocketId.value, [sid]: peerItem }
  return peerItem
}

async function makeOfferToSocket(socketId) {
  const sid = String(socketId || "")
  const item = peersBySocketId.value[sid]
  if (!item?.pc) return

  try {
    const offer = await item.pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: roomKind.value === "video",
    })
    await item.pc.setLocalDescription(offer)

    socketRef.value?.emit("callroom:webrtc:offer", {
      roomId: roomId.value,
      to: sid,
      offer: item.pc.localDescription,
    })
  } catch (err) {
    console.error("make offer error", err)
  }
}

/* =========================
   ROOM FLOW
========================= */
async function joinRoom() {
  if (!roomId.value) {
    errorText.value = "Missing roomId."
    return
  }
  if (!socketConnected.value) {
    errorText.value = "Socket not connected yet."
    return
  }
  if (joined.value || joining.value) return

  joining.value = true
  errorText.value = ""
  statusText.value = "Getting media..."

  try {
    await ensureLocalMedia()

    statusText.value = "Joining..."
    socketRef.value?.emit("callroom:join", { roomId: roomId.value })

    joined.value = true
    joining.value = false
    emitMediaState()
  } catch (err) {
    console.error("joinRoom error", err)
    joining.value = false
    statusText.value = "Could not join"
    errorText.value = "Camera/mic permission failed or browser blocked media."
  }
}

function leaveRoom() {
  try {
    if (roomId.value && joined.value) {
      socketRef.value?.emit("callroom:leave", { roomId: roomId.value })
    }
  } catch {}

  cleanupAll()
  router.push("/dashboard")
}

function goBack() {
  leaveRoom()
}

async function copyRoomLink() {
  const url = `${window.location.origin}/room-call?roomId=${encodeURIComponent(roomId.value)}`
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
function cleanupPeer(socketId) {
  const sid = String(socketId || "")
  const item = peersBySocketId.value[sid]

  if (item?.pc) {
    try {
      item.pc.ontrack = null
      item.pc.onicecandidate = null
      item.pc.onconnectionstatechange = null
      item.pc.close()
    } catch {}
  }

  const next = { ...peersBySocketId.value }
  delete next[sid]
  peersBySocketId.value = next

  const refs = { ...remoteVideoEls.value }
  delete refs[sid]
  remoteVideoEls.value = refs
}

function cleanupAll() {
  Object.keys(peersBySocketId.value).forEach((sid) => cleanupPeer(sid))

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
  if (!roomId.value) {
    errorText.value = "Missing roomId in URL."
    return
  }

  wireSocket()
  await nextTick()
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
    socketRef.value?.off("callroom:peer-joined")
    socketRef.value?.off("callroom:peer-left")
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

.alertBox {
  position: relative;
  z-index: 2;
  margin: 0 16px 14px;
  padding: 14px 16px;
  border-radius: 18px;
  border-color: rgba(255,80,80,0.35);
  background: rgba(255,80,80,0.14);
  font-weight: 800;
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