<template>
  <Layout>
    <div class="page">
      <div class="hero">
        <div class="hero-left">
          <div class="eyebrow">Pulse</div>
          <h1>Call Rooms</h1>
          <p>Create or join shared audio/video rooms.</p>
        </div>

        <div class="hero-actions">
          <input v-model="roomName" class="inp" placeholder="Room name" />
          <select v-model="roomKind" class="inp select">
            <option value="audio">Audio Room</option>
            <option value="video">Video Room</option>
          </select>
          <button class="btn primary" @click="createRoom" :disabled="busyCreate">
            {{ busyCreate ? "Creating..." : "Create Room" }}
          </button>
        </div>
      </div>

      <section class="panel">
        <div class="panel-head">
          <div class="title">Available Rooms</div>
          <button class="btn" @click="refreshRooms">Refresh</button>
        </div>

        <div v-if="error" class="alert">{{ error }}</div>

        <div v-if="rooms.length === 0" class="empty">
          <div class="emoji">📞</div>
          <div class="big">No call rooms yet</div>
          <div class="sub">Create the first room and invite others.</div>
        </div>

        <div v-else class="grid">
          <div v-for="room in rooms" :key="room.roomId" class="roomCard">
            <div class="roomTop">
              <div>
                <div class="roomName">{{ room.name }}</div>
                <div class="roomSub">
                  {{ room.kind === "video" ? "🎥 Video" : "🎙 Audio" }}
                  • {{ room.participantCount }} inside
                </div>
              </div>

              <button class="btn primary" @click="joinRoom(room)">Join</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  </Layout>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue"
import { useRouter } from "vue-router"
import Layout from "../components/Layout.vue"
import { createSocket } from "../api/socket"

const router = useRouter()
let socket = null

const rooms = ref([])
const roomName = ref("")
const roomKind = ref("audio")
const busyCreate = ref(false)
const error = ref("")

function refreshRooms() {
  error.value = ""
  socket?.emit("callroom:list:get")
}

function createRoom() {
  if (!socket) return
  busyCreate.value = true
  error.value = ""

  socket.emit("callroom:create", {
    name: roomName.value,
    kind: roomKind.value,
  })
}

function joinRoom(room) {
  router.push(`/room-call?roomId=${encodeURIComponent(room.roomId)}`)
}

onMounted(() => {
  socket = createSocket()

  socket.on("connect", () => {
    socket.safeEmitPresence?.()
    refreshRooms()
  })

  socket.on("callroom:list", (list) => {
    rooms.value = Array.isArray(list) ? list : []
  })

  socket.on("callroom:created", ({ roomId }) => {
    busyCreate.value = false
    if (!roomId) return
    router.push(`/room-call?roomId=${encodeURIComponent(roomId)}`)
  })

  socket.on("callroom:error", ({ message }) => {
    busyCreate.value = false
    error.value = message || "Call room error"
  })

  refreshRooms()
})

onBeforeUnmount(() => {
  try { socket?.cleanupPulseSocket?.() } catch {}
  socket = null
})
</script>

<style scoped>
.page {
  min-height: 100vh;
  padding: 18px;
  color: white;
  background:
    radial-gradient(circle at top left, rgba(255,80,120,.16), transparent 26%),
    radial-gradient(circle at top right, rgba(90,140,255,.14), transparent 24%),
    linear-gradient(180deg, #08101d, #091424 45%, #060c16);
}

.hero {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 16px;
  padding: 18px;
  border-radius: 22px;
  background: rgba(255,255,255,.08);
  border: 1px solid rgba(255,255,255,.12);
  backdrop-filter: blur(14px);
}

.eyebrow {
  opacity: .72;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: .15em;
}

h1 {
  margin: 6px 0;
  font-size: 32px;
}

p {
  margin: 0;
  opacity: .82;
}

.hero-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}

.inp {
  min-width: 180px;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(0,0,0,.28);
  color: white;
}

.select {
  min-width: 150px;
}

.panel {
  padding: 16px;
  border-radius: 22px;
  background: rgba(255,255,255,.08);
  border: 1px solid rgba(255,255,255,.12);
  backdrop-filter: blur(14px);
}

.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.title {
  font-size: 20px;
  font-weight: 900;
}

.btn {
  border: 0;
  color: white;
  cursor: pointer;
  border-radius: 999px;
  padding: 10px 14px;
  background: rgba(255,255,255,.12);
}

.btn.primary {
  background: linear-gradient(135deg, #ff416c, #ff4b2b);
}

.alert {
  margin-bottom: 12px;
  padding: 10px 12px;
  border-radius: 14px;
  background: rgba(255,80,80,.16);
  border: 1px solid rgba(255,80,80,.28);
}

.empty {
  padding: 32px 16px;
  text-align: center;
  opacity: .9;
}

.emoji {
  font-size: 32px;
  margin-bottom: 8px;
}

.big {
  font-size: 20px;
  font-weight: 900;
}

.sub {
  margin-top: 6px;
  opacity: .72;
}

.grid {
  display: grid;
  gap: 12px;
}

.roomCard {
  padding: 14px;
  border-radius: 18px;
  background: rgba(0,0,0,.25);
  border: 1px solid rgba(255,255,255,.10);
}

.roomTop {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.roomName {
  font-weight: 900;
  font-size: 18px;
}

.roomSub {
  margin-top: 4px;
  opacity: .72;
  font-size: 13px;
}
</style>