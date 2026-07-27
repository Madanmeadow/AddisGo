<template>
  <div class="message-view">
    <!-- Header -->
    <div class="msg-header">
      <button class="back-btn" @click="$emit('back')">←</button>
      <div class="user-info">
        <div class="avatar">{{ otherUserName?.[0] || '?' }}</div>
        <div class="name">{{ otherUserName || 'Chat' }}</div>
      </div>
      <div class="spacer"></div>
    </div>

    <!-- Messages -->
    <div ref="messagesContainer" class="messages-list" @scroll="handleScroll">
      <div v-if="loadingHistory" class="loading-history">Loading messages...</div>

      <div
        v-for="msg in messages"
        :key="msg.id || msg.tempId"
        :class="['msg-bubble', msg.senderId === myUserId ? 'mine' : 'theirs']"
      >
        <div class="msg-content">{{ msg.content || msg.text || msg.body || '' }}</div>
        <div class="msg-meta">
          <span class="msg-time">{{ formatTime(msg.createdAt || msg.timestamp) }}</span>
          <span v-if="msg.senderId === myUserId" class="msg-status">
            {{ msg.failed ? '⚠️' : msg.sending ? '...' : '✓' }}
          </span>
        </div>
      </div>

      <div v-if="messages.length === 0 && !loadingHistory" class="empty-state">
        No messages yet. Say hello!
      </div>
    </div>

    <!-- Typing indicator -->
    <div v-if="otherIsTyping" class="typing-indicator">
      <span></span><span></span><span></span>
    </div>

    <!-- Input -->
    <div class="msg-input-area">
      <div v-if="error" class="input-error">{{ error }}</div>
      <div class="input-row">
        <input
          ref="inputRef"
          v-model="newMessage"
          type="text"
          placeholder="Type a message..."
          :disabled="sending || !conversationId"
          @keydown.enter.prevent="sendMessage"
        />
        <button
          class="send-btn"
          :disabled="!newMessage.trim() || sending || !conversationId"
          @click="sendMessage"
        >
          {{ sending ? '...' : '➤' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'

// ==================== CONFIG ====================
const API_URL = import.meta.env.VITE_API_URL || 'https://api.example.com'
const abortControllers = new Set()

function createAbortController() {
  const c = new AbortController()
  abortControllers.add(c)
  return c
}

function authHeaders() {
  const token = localStorage.getItem('token') || ''
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  }
}

// ==================== PROPS / EMITS ====================
const props = defineProps({
  myUserId: { type: String, required: true },
  otherUserId: { type: String, required: true },
  otherUserName: { type: String, default: '' }
})

const emit = defineEmits(['back', 'conversation-ready'])

// ==================== STATE ====================
const conversationId = ref('')
const messages = ref([])
const newMessage = ref('')
const loadingHistory = ref(false)
const sending = ref(false)
const creatingConversation = ref(false)
const error = ref('')
const otherIsTyping = ref(false)
const messagesContainer = ref(null)
const inputRef = ref(null)
const pollInterval = ref(null)
const typingTimeout = ref(null)

// ==================== API HELPERS (your code) ====================
async function apiGet(path, options = {}) {
  const controller = createAbortController()
  try {
    const res = await fetch(`${API_URL}${path}`, {
      headers: authHeaders(),
      signal: controller.signal,
      ...options,
    })
    abortControllers.delete(controller)
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const msg = data?.error || data?.message || `HTTP ${res.status}`
      throw new Error(msg)
    }
    return data
  } catch (err) {
    abortControllers.delete(controller)
    if (err.name === 'AbortError') throw new Error('Request cancelled')
    throw err
  }
}

async function apiPost(path, body, options = {}) {
  const controller = createAbortController()
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(body),
      signal: controller.signal,
      ...options,
    })
    abortControllers.delete(controller)
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const msg = data?.error || data?.message || `HTTP ${res.status}`
      throw new Error(msg)
    }
    return data
  } catch (err) {
    abortControllers.delete(controller)
    if (err.name === 'AbortError') throw new Error('Request cancelled')
    throw err
  }
}

// ==================== CONVERSATION LOGIC (your code) ====================
async function ensureConversation() {
  if (conversationId.value) return conversationId.value
  if (!props.myUserId || !props.otherUserId) {
    throw new Error('otherUserId required')
  }

  creatingConversation.value = true
  error.value = ''

  try {
    // 1) Try to list all conversations and find one with this user
    try {
      const list = await apiGet('/conversations')
      const all = Array.isArray(list) ? list : list?.items || list?.conversations || []
      const found = all.find((c) => {
        const pids = c.participantIds || c.participants || c.userIds || []
        return pids.includes(String(props.otherUserId))
      })
      if (found?.id) {
        conversationId.value = String(found.id)
        return conversationId.value
      }
    } catch (e) {
      console.log('GET /conversations list failed:', e.message)
    }

    // 2) Try common POST body formats until one succeeds
    const attempts = [
      { body: { participantId: String(props.otherUserId) },   desc: 'participantId' },
      { body: { userId: String(props.otherUserId) },          desc: 'userId' },
      { body: { userId1: String(props.myUserId), userId2: String(props.otherUserId) }, desc: 'userId1+userId2' },
      { body: { participants: [String(props.myUserId), String(props.otherUserId)] }, desc: 'participants[]' },
      { body: { toUserId: String(props.otherUserId) },        desc: 'toUserId' },
    ]

    let lastErr = null
    for (const attempt of attempts) {
      try {
        console.log(`Trying POST /conversations with ${attempt.desc}:`, attempt.body)
        const data = await apiPost('/conversations', attempt.body)
        conversationId.value = String(data?.id || data?.conversation?.id || data?.conversationId || '')
        if (conversationId.value) {
          console.log(`✅ Success with format: ${attempt.desc}`)
          return conversationId.value
        }
      } catch (e) {
        lastErr = e
        console.log(`❌ Failed with ${attempt.desc}:`, e.message)
      }
    }

    throw lastErr || new Error('Backend rejected all conversation formats')
  } finally {
    creatingConversation.value = false
  }
}

// ==================== MESSAGES ====================
async function fetchMessages() {
  if (!conversationId.value) return
  loadingHistory.value = true
  error.value = ''
  try {
    const data = await apiGet(`/conversations/${conversationId.value}/messages`)
    const fetched = Array.isArray(data) ? data : data?.items || data?.messages || []
    // Merge with pending messages to avoid flicker
    const pending = messages.value.filter(m => m.sending || m.failed)
    const existingIds = new Set(fetched.map(m => String(m.id)))
    messages.value = [
      ...fetched,
      ...pending.filter(m => !existingIds.has(String(m.id)))
    ]
    await nextTick(() => scrollToBottom(false))
  } catch (e) {
    error.value = e.message
  } finally {
    loadingHistory.value = false
  }
}

async function sendMessage() {
  const text = newMessage.value.trim()
  if (!text || sending.value) return

  // Ensure conversation exists
  try {
    await ensureConversation()
  } catch (e) {
    error.value = e.message
    return
  }

  const tempId = `temp-${Date.now()}`
  const optimisticMsg = {
    tempId,
    content: text,
    senderId: props.myUserId,
    createdAt: new Date().toISOString(),
    sending: true,
    failed: false
  }

  messages.value.push(optimisticMsg)
  newMessage.value = ''
  sending.value = true
  await nextTick(() => scrollToBottom(true))

  try {
    const data = await apiPost(`/conversations/${conversationId.value}/messages`, {
      content: text,
      text: text,
      body: text
    })
    // Replace optimistic with real
    const idx = messages.value.findIndex(m => m.tempId === tempId)
    if (idx !== -1) {
      messages.value[idx] = {
        ...messages.value[idx],
        ...data,
        id: data?.id || tempId,
        sending: false
      }
    }
  } catch (e) {
    const idx = messages.value.findIndex(m => m.tempId === tempId)
    if (idx !== -1) {
      messages.value[idx].failed = true
      messages.value[idx].sending = false
    }
    error.value = e.message
  } finally {
    sending.value = false
    inputRef.value?.focus()
  }
}

function retryFailed(msg) {
  if (!msg.failed) return
  const idx = messages.value.findIndex(m => m.tempId === msg.tempId)
  if (idx !== -1) {
    messages.value.splice(idx, 1)
    newMessage.value = msg.content
    sendMessage()
  }
}

// ==================== POLLING & TYPING ====================
function startPolling() {
  pollInterval.value = setInterval(() => {
    if (conversationId.value && !loadingHistory.value) {
      fetchMessages()
    }
  }, 3000)
}

function stopPolling() {
  if (pollInterval.value) {
    clearInterval(pollInterval.value)
    pollInterval.value = null
  }
}

function onTyping() {
  // Debounced typing indicator to backend (optional)
  if (typingTimeout.value) clearTimeout(typingTimeout.value)
  // apiPost(`/conversations/${conversationId.value}/typing`, {}).catch(() => {})
  typingTimeout.value = setTimeout(() => {}, 2000)
}

// ==================== UTILS ====================
function scrollToBottom(smooth = true) {
  const el = messagesContainer.value
  if (!el) return
  el.scrollTo({
    top: el.scrollHeight,
    behavior: smooth ? 'smooth' : 'auto'
  })
}

function handleScroll() {
  // Could implement infinite scroll here
}

function formatTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// ==================== LIFECYCLE ====================
onMounted(async () => {
  try {
    await ensureConversation()
    emit('conversation-ready', conversationId.value)
    await fetchMessages()
    startPolling()
    inputRef.value?.focus()
  } catch (e) {
    error.value = e.message
  }
})

onUnmounted(() => {
  stopPolling()
  abortControllers.forEach(c => c.abort())
  abortControllers.clear()
  if (typingTimeout.value) clearTimeout(typingTimeout.value)
})

// Watch for conversation changes
watch(conversationId, (id) => {
  if (id) fetchMessages()
})
</script>

<style scoped>
.message-view {
  display: flex;
  flex-direction: column;
  height: 100vh;
  max-width: 600px;
  margin: 0 auto;
  background: #f5f5f5;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* Header */
.msg-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #fff;
  border-bottom: 1px solid #e0e0e0;
  position: sticky;
  top: 0;
  z-index: 10;
}

.back-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  padding: 4px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #6366f1;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
}

.name {
  font-weight: 600;
  font-size: 16px;
}

.spacer {
  width: 32px;
}

/* Messages */
.messages-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.loading-history {
  text-align: center;
  color: #888;
  font-size: 13px;
  padding: 8px;
}

.empty-state {
  text-align: center;
  color: #888;
  margin-top: 40px;
  font-size: 14px;
}

.msg-bubble {
  max-width: 75%;
  padding: 10px 14px;
  border-radius: 18px;
  font-size: 14px;
  line-height: 1.4;
  word-wrap: break-word;
}

.msg-bubble.mine {
  align-self: flex-end;
  background: #6366f1;
  color: white;
  border-bottom-right-radius: 4px;
}

.msg-bubble.theirs {
  align-self: flex-start;
  background: white;
  color: #333;
  border-bottom-left-radius: 4px;
}

.msg-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  font-size: 11px;
  opacity: 0.7;
}

.mine .msg-meta {
  justify-content: flex-end;
}

/* Typing */
.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 8px 16px;
  align-self: flex-start;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  background: #999;
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out both;
}

.typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
.typing-indicator span:nth-child(2) { animation-delay: -0.16s; }

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}

/* Input */
.msg-input-area {
  padding: 12px 16px;
  background: white;
  border-top: 1px solid #e0e0e0;
}

.input-error {
  color: #ef4444;
  font-size: 12px;
  margin-bottom: 8px;
  text-align: center;
}

.input-row {
  display: flex;
  gap: 10px;
  align-items: center;
}

.input-row input {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid #ddd;
  border-radius: 24px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.input-row input:focus {
  border-color: #6366f1;
}

.send-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: none;
  background: #6366f1;
  color: white;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.2s;
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>