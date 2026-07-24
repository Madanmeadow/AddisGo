<template>
  <div class="chat-container">
    <div class="chat-header">
      <span>💬 Conversation</span>
      <span class="connection-status" :class="{ connected: isConnected }">
        {{ isConnected ? '● Online' : '○ Offline' }}
      </span>
    </div>

    <div v-if="connectionError" class="connection-error">
      {{ connectionError }}
    </div>

    <div ref="messagesContainer" class="messages">
      <div v-if="messages.length === 0" class="empty-state">
        No messages yet. Say hi! 👋
      </div>

      <div
        v-for="msg in messages"
        :key="msg.id"
        :class="['message-bubble', isMyMessage(msg) ? 'my-msg' : 'their-msg']"
      >
        <div class="message-content">{{ msg.content }}</div>
        <div class="message-meta">
          <span class="sender">{{ msg.sender_name || 'User' }}</span>
          <span class="time">{{ formatTime(msg.created_at) }}</span>
        </div>
      </div>
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
        {{ sending ? 'Sending...' : 'Send 🚀' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { io } from 'socket.io-client'

// Config
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const ROOM_ID = 'room-1' // TODO: make this dynamic via props

// State
const user = ref(null)
const message = ref('')
const messages = ref([])
const isConnected = ref(false)
const connectionError = ref('')
const sending = ref(false)
const messagesContainer = ref(null)

// Socket (created per-component, not module-level)
let socket = null

// Initialize user safely
function initUser() {
  try {
    const stored = localStorage.getItem('user')
    user.value = stored ? JSON.parse(stored) : null
  } catch (err) {
    console.error('Failed to parse user from localStorage:', err)
    user.value = null
  }
}

const isMyMessage = computed(() => (msg) => {
  return String(msg.sender_id) === String(user.value?.id)
})

function formatTime(timestamp) {
  if (!timestamp) return ''
  const d = new Date(timestamp)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

function hasMessage(msg) {
  return messages.value.some(m =>
    m.id && msg.id && String(m.id) === String(msg.id)
  )
}

function connectSocket() {
  socket = io(API_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  })

  socket.on('connect', () => {
    isConnected.value = true
    connectionError.value = ''
    socket.emit('join_room', ROOM_ID)
  })

  socket.on('disconnect', (reason) => {
    isConnected.value = false
    if (reason === 'io server disconnect') {
      connectionError.value = 'Disconnected by server'
    }
  })

  socket.on('connect_error', (err) => {
    isConnected.value = false
    connectionError.value = `Connection error: ${err.message}`
  })

  socket.on('receive_message', (data) => {
    // Prevent duplicates
    if (hasMessage(data)) return

    messages.value.push({
      id: data.id || Date.now(),
      sender_id: data.sender_id,
      sender_name: data.sender_name || 'User',
      content: String(data.content || ''),
      created_at: data.created_at || new Date().toISOString(),
    })

    scrollToBottom()
  })
}

function disconnectSocket() {
  if (!socket) return

  socket.off('connect')
  socket.off('disconnect')
  socket.off('connect_error')
  socket.off('receive_message')

  if (socket.connected) {
    socket.emit('leave_room', ROOM_ID)
  }

  socket.disconnect()
  socket = null
}

async function sendMessage() {
  const content = message.value.trim()
  if (!content || !isConnected.value || sending.value) return
  if (!user.value?.id) {
    connectionError.value = 'Please log in to send messages'
    return
  }

  sending.value = true

  const msgData = {
    roomId: ROOM_ID,
    sender_id: user.value.id,
    sender_name: user.value.username || user.value.name || 'You',
    content,
    created_at: new Date().toISOString(),
  }

  // Optimistic local update
  const localMsg = {
    id: `local-${Date.now()}`,
    ...msgData,
  }

  messages.value.push(localMsg)
  message.value = ''
  scrollToBottom()

  try {
    socket.emit('send_message', msgData, (ack) => {
      sending.value = false
      if (ack?.error) {
        connectionError.value = ack.error
        // Remove optimistic message on error
        const idx = messages.value.findIndex(m => m.id === localMsg.id)
        if (idx !== -1) messages.value.splice(idx, 1)
      } else if (ack?.id) {
        // Update with server-assigned ID
        const idx = messages.value.findIndex(m => m.id === localMsg.id)
        if (idx !== -1) {
          messages.value[idx] = { ...messages.value[idx], id: ack.id }
        }
      }
    })

    // Timeout fallback if server doesn't acknowledge
    setTimeout(() => {
      sending.value = false
    }, 5000)
  } catch (err) {
    sending.value = false
    connectionError.value = 'Failed to send message'
    console.error('Send error:', err)
  }
}

// Auto-scroll when messages change
watch(messages, scrollToBottom, { deep: true })

onMounted(() => {
  initUser()
  connectSocket()
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

/* Custom scrollbar */
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