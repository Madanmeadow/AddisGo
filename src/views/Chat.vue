<template>
  <div class="chat-container">
    <div class="chat-header">
      <span>💬 {{ roomName }}</span>
      <span class="connection-status" :class="{ connected: isConnected }">
        {{ isConnected ? "● Online" : "○ Offline" }}
      </span>
    </div>

    <div v-if="connectionError" class="connection-error">
      {{ connectionError }}
    </div>

    <div ref="messagesContainer" class="messages">
      <div v-if="messages.length === 0 && !historyLoading" class="empty-state">
        No messages yet. Say hi! 👋
      </div>

      <div
        v-for="msg in messages"
        :key="msg.id"
        :class="['message-bubble', isMyMessage(msg) ? 'my-msg' : 'their-msg']"
      >
        <div class="message-content">{{ msg.content }}</div>
        <div class="message-meta">
          <span class="sender">{{ msg.sender_name || "User" }}</span>
          <span class="time">{{ formatTime(msg.created_at) }}</span>
        </div>
      </div>

      <div v-if="historyLoading" class="empty-state">Loading history…</div>
    </div>

    <div class="chat-input">
      <input
        v-model="message"
        placeholder="Type message..."
        :disabled="!isConnected || sending"
        @keydown.enter="sendMessage"
      />
      <button
        @click="sendMessage"
        :disabled="!message.trim() || !isConnected || sending"
      >
        {{ sending ? "Sending..." : "Send 🚀" }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from "vue"
import { io } from "socket.io-client"

/* ── Props ── */
const props = defineProps({
  roomId: { type: String, default: "global" },
  roomName: { type: String, default: "Conversation" },
})

/* ── Config ── */
const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "")
const token = localStorage.getItem("token") || ""

/* ── State ── */
const user = ref(null)
const message = ref("")
const messages = ref([])
const isConnected = ref(false)
const connectionError = ref("")
const sending = ref(false)
const historyLoading = ref(false)
const messagesContainer = ref(null)
const historyFetched = ref(false)

let socket = null

/* ── User ── */
function initUser() {
  try {
    const stored = localStorage.getItem("user")
    user.value = stored ? JSON.parse(stored) : null
  } catch {
    user.value = null
  }
}

const isMyMessage = computed(() => (msg) => {
  return String(msg.sender_id) === String(user.value?.id)
})

/* ── Time ── */
function formatTime(timestamp) {
  if (!timestamp) return ""
  const d = new Date(timestamp)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

/* ── Scroll ── */
function scrollToBottom(force = false) {
  nextTick(() => {
    const el = messagesContainer.value
    if (!el) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120
    if (force || nearBottom) {
      el.scrollTop = el.scrollHeight
    }
  })
}

/* ── Deduplication ── */
function hasMessage(msg) {
  return messages.value.some(
    (m) =>
      (m.id && msg.id && String(m.id) === String(msg.id)) ||
      (m.tempId && msg.tempId && String(m.tempId) === String(msg.tempId))
  )
}

/* ── Normalize incoming data ── */
function normalizeMsg(data) {
  return {
    id: data.id || data.message_id || `local-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    tempId: data.tempId || null,
    sender_id: data.sender_id ?? data.senderId ?? data.user_id ?? data.userId ?? data.from ?? "",
    sender_name: data.sender_name ?? data.senderName ?? data.username ?? data.from ?? "User",
    content: String(data.content ?? data.text ?? data.message ?? ""),
    created_at: data.created_at ?? data.createdAt ?? data.timestamp ?? new Date().toISOString(),
  }
}

/* ── Fetch history via REST ── */
async function fetchHistory() {
  if (!token || historyFetched.value) return
  historyLoading.value = true
  try {
    const res = await fetch(
      `${API_URL}/messages?roomId=${encodeURIComponent(props.roomId)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    const list = Array.isArray(data) ? data : data.messages || data.items || []
    const normalized = list.map(normalizeMsg).filter((m) => m.content)
    const existingIds = new Set(messages.value.map((m) => String(m.id)))
    const newMsgs = normalized.filter((m) => !existingIds.has(String(m.id)))
    messages.value = [...messages.value, ...newMsgs].sort(
      (a, b) => new Date(a.created_at) - new Date(b.created_at)
    )
    historyFetched.value = true
    scrollToBottom(true)
  } catch (err) {
    connectionError.value = `Failed to load history: ${err.message}`
  } finally {
    historyLoading.value = false
  }
}

/* ── Socket ── */
function connectSocket() {
  socket = io(API_URL, {
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    auth: token ? { token } : undefined,
  })

  socket.on("connect", () => {
    isConnected.value = true
    connectionError.value = ""
    socket.emit("join-room", props.roomId)
    if (!historyFetched.value) fetchHistory()
  })

  socket.on("disconnect", (reason) => {
    isConnected.value = false
    if (reason === "io server disconnect") {
      connectionError.value = "Disconnected by server"
    }
  })

  socket.on("connect_error", (err) => {
    isConnected.value = false
    connectionError.value = `Connection error: ${err.message}`
  })

  socket.on("receive-message", (data) => {
    const msg = normalizeMsg(data)
    if (hasMessage(msg)) return
    messages.value.push(msg)
    scrollToBottom()
  })

  socket.on("receive_message", (data) => {
    const msg = normalizeMsg(data)
    if (hasMessage(msg)) return
    messages.value.push(msg)
    scrollToBottom()
  })
}

function disconnectSocket() {
  if (!socket) return
  socket.off("connect")
  socket.off("disconnect")
  socket.off("connect_error")
  socket.off("receive-message")
  socket.off("receive_message")
  if (socket.connected) socket.emit("leave-room", props.roomId)
  socket.disconnect()
  socket = null
}

/* ── Send ── */
async function sendMessage() {
  const content = message.value.trim()
  if (!content || !isConnected.value || sending.value) return
  if (!user.value?.id) {
    connectionError.value = "Please log in to send messages"
    return
  }

  sending.value = true

  const tempId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  const msgData = {
    room: props.roomId,
    roomId: props.roomId,
    sender_id: user.value.id,
    sender_name: user.value.username || user.value.name || user.value.display_name || "You",
    content,
    created_at: new Date().toISOString(),
    tempId,
  }

  const localMsg = normalizeMsg({ ...msgData, id: tempId })
  messages.value.push(localMsg)
  message.value = ""
  scrollToBottom(true)

  try {
    socket.emit("send-room-message", msgData, (ack) => {
      sending.value = false
      if (ack?.error) {
        connectionError.value = ack.error
        const idx = messages.value.findIndex((m) => m.id === tempId)
        if (idx !== -1) messages.value.splice(idx, 1)
      } else if (ack?.id) {
        const idx = messages.value.findIndex((m) => m.id === tempId)
        if (idx !== -1) {
          messages.value[idx] = { ...messages.value[idx], id: ack.id }
        }
      }
    })

    setTimeout(() => {
      sending.value = false
    }, 5000)
  } catch (err) {
    sending.value = false
    connectionError.value = "Failed to send message"
    console.error("Send error:", err)
  }
}

/* ── Watchers ── */
watch(messages, () => scrollToBottom(), { deep: true })

/* ── Lifecycle ── */
onMounted(() => {
  initUser()
  connectSocket()
  fetchHistory()
})

onBeforeUnmount(() => {
  disconnectSocket()
})
</script>

<style scoped>
.chat-container {
  max-width: 600px;
  margin: auto;
  background: #1e1e3f;
  border-radius: 20px;
  padding: 20px;
  color: white;
  display: flex;
  flex-direction: column;
  height: 600px;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 12px;
  font-weight: 700;
}

.connection-status {
  font-size: 12px;
  color: #ff6b6b;
  font-weight: 600;
}

.connection-status.connected {
  color: #51cf66;
}

.connection-error {
  padding: 10px 14px;
  background: rgba(255, 80, 80, 0.15);
  border: 1px solid rgba(255, 80, 80, 0.3);
  border-radius: 12px;
  margin-bottom: 12px;
  font-size: 13px;
}

.messages {
  flex: 1;
  overflow-y: auto;
  margin-bottom: 12px;
  padding-right: 4px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.messages::-webkit-scrollbar {
  width: 6px;
}
.messages::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 3px;
}
.messages::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  opacity: 0.5;
  font-size: 14px;
}

.message-bubble {
  max-width: 80%;
  padding: 10px 14px;
  border-radius: 16px;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

.my-msg {
  align-self: flex-end;
  background: linear-gradient(135deg, #ff416c, #ff4b2b);
  border-bottom-right-radius: 4px;
}

.their-msg {
  align-self: flex-start;
  background: rgba(255, 255, 255, 0.12);
  border-bottom-left-radius: 4px;
}

.message-content {
  line-height: 1.4;
  word-break: break-word;
}

.message-meta {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-top: 6px;
  font-size: 11px;
  opacity: 0.7;
}

.sender {
  font-weight: 600;
}

.time {
  white-space: nowrap;
}

.chat-input {
  display: flex;
  gap: 10px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.chat-input input {
  flex: 1;
  padding: 12px 16px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.08);
  color: white;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.chat-input input:focus {
  border-color: rgba(255, 255, 255, 0.3);
}

.chat-input input::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

.chat-input input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.chat-input button {
  padding: 12px 20px;
  border-radius: 14px;
  border: none;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.2s;
  white-space: nowrap;
}

.chat-input button:hover:not(:disabled) {
  opacity: 0.9;
}

.chat-input button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>