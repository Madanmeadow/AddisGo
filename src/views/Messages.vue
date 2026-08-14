<!-- ============================================================
  BULLETPROOF MESSAGES.VUE
  Supports: text, image, video, voice, file, links
  Offline queue, auto-retry, optimistic UI, read receipts, typing
============================================================ -->
<template>
  <Layout>
    <div class="wrap">
      <div class="bg-orb orb1"></div>
      <div class="bg-orb orb2"></div>
      <div class="bg-orb orb3"></div>

      <header class="topbar glassy">
        <div class="brand" @click="$router.push('/dashboard')">
          <div class="logo">💬</div>
          <div class="brand-text">
            <div class="title">Inbox</div>
            <div class="sub">{{ conversations.length }} chat{{ conversations.length === 1 ? '' : 's' }}</div>
          </div>
        </div>
        <div class="top-actions">
          <button class="chip" @click="refreshAll">🔄 Refresh</button>
          <button class="chip ghost" @click="$router.push('/dashboard')">🏠 Dashboard</button>
        </div>
      </header>

      <main class="main">
        <div class="chatLayout">
          <!-- SIDEBAR -->
          <aside class="sidebar glassy">
            <div class="sidebarHead">
              <div class="panel-title">👥 Conversations</div>
              <div class="searchWrap">
                <input v-model="search" class="search" placeholder="Search people…" />
                <button v-if="search" class="searchClear" @click="search = ''">✕</button>
              </div>
            </div>

            <div v-if="!token" class="state mini">
              <div class="state-emoji">🔒</div>
              <div class="state-sub">Login to see messages</div>
            </div>
            <div v-else-if="loadingConversations" class="state mini">
              <div class="state-emoji">⏳</div>
              <div class="state-sub">Loading…</div>
            </div>
            <div v-else-if="filteredConversations.length === 0" class="state mini">
              <div class="state-emoji">📭</div>
              <div class="state-title">No conversations</div>
              <div class="state-sub">Tap a user in Dashboard to start chatting.</div>
            </div>
            <div v-else class="convList">
              <button
                v-for="conv in filteredConversations"
                :key="conv.id"
                class="convItem"
                :class="{ active: activeConversationId === conv.id }"
                @click="openConversation(conv)"
              >
                <div class="convAvatar">{{ initials(conv.other_username) }}</div>
                <div class="convMeta">
                  <div class="convName">{{ conv.other_username || conv.other_name || 'User' }}</div>
                  <div class="convPreview">
                    <span v-if="conv.last_media_type === 'image'">📷 Photo</span>
                    <span v-else-if="conv.last_media_type === 'video'">🎥 Video</span>
                    <span v-else-if="conv.last_media_type === 'voice'">🎤 Voice</span>
                    <span v-else>{{ conv.last_message || 'No messages yet' }}</span>
                  </div>
                </div>
                <div v-if="conv.unread_count > 0" class="convBadge">{{ conv.unread_count }}</div>
              </button>
            </div>
          </aside>

          <!-- CHAT AREA -->
          <section class="chatArea glassy">
            <div v-if="!activeConversationId" class="emptyChat">
              <div class="state-emoji" style="font-size:48px">💬</div>
              <div class="state-title">Select a conversation</div>
              <div class="state-sub">Choose someone from the sidebar to start messaging.</div>
            </div>

            <template v-else>
              <!-- Header -->
              <div class="chatHeader">
                <div class="chatHeaderLeft">
                  <div class="avatar">{{ initials(activeName) }}</div>
                  <div>
                    <div class="chatHeaderName">{{ activeName || 'User' }}</div>
                    <div class="chatHeaderStatus">
                      <span class="statusDot" :class="{ on: isOnline(activeOtherId) }"></span>
                      {{ isOnline(activeOtherId) ? 'Online' : 'Offline' }}
                      <span class="socketStatus">{{ socketConnected ? '· ⚡ realtime' : '· ○ offline' }}</span>
                      <span v-if="typingUser" class="typingIndicator">· typing…</span>
                    </div>
                  </div>
                </div>
                <div class="chatHeaderActions">
                  <button class="iconbtn" @click="closeChat">✕</button>
                </div>
              </div>

              <!-- Messages -->
              <div class="messagesWrap" ref="messagesRef">
                <div v-if="loadingMessages" class="state mini">
                  <div class="state-emoji">⏳</div>
                  <div class="state-sub">Loading messages…</div>
                </div>
                <div v-else-if="messages.length === 0" class="state mini">
                  <div class="state-emoji">👋</div>
                  <div class="state-title">No messages yet</div>
                  <div class="state-sub">Say hello!</div>
                </div>

                <div
                  v-for="(msg, idx) in messages"
                  :key="msg.__localId || msg.id || `msg-${idx}`"
                  class="msgRow"
                  :class="{ me: isMe(msg) }"
                >
                  <div class="msgBubble" :class="{ pending: msg.pending, failed: msg.failed }">
                    <!-- Media: Image -->
                    <div v-if="msg.media_type === 'image'" class="msgMedia">
                      <img :src="resolveUrl(msg.media_url)" alt="image" loading="lazy" @load="onMediaLoad" />
                    </div>
                    <!-- Media: Video -->
                    <div v-else-if="msg.media_type === 'video'" class="msgMedia">
                      <video :src="resolveUrl(msg.media_url)" controls playsinline preload="metadata" @loadedmetadata="onMediaLoad" />
                    </div>
                    <!-- Media: Voice -->
                    <div v-else-if="msg.media_type === 'voice'" class="msgVoice">
                      <audio :src="resolveUrl(msg.media_url)" controls preload="metadata" />
                      <span v-if="msg.voice_duration" class="voiceDuration">{{ formatDuration(msg.voice_duration) }}</span>
                    </div>
                    <!-- Media: File -->
                    <div v-else-if="msg.media_type === 'file'" class="msgFile">
                      <a :href="resolveUrl(msg.media_url)" target="_blank" rel="noopener" class="fileLink">
                        📎 {{ msg.file_name || 'File' }}
                      </a>
                    </div>
                    <!-- Text / Link -->
                    <div v-else class="msgText" v-html="linkify(msg.text || '')"></div>

                    <div class="msgMeta">
                      <span v-if="msg.pending" class="status">Sending…</span>
                      <span v-else-if="msg.failed" class="status failed" @click="retryMessage(msg)">Failed · Tap to retry</span>
                      <span v-else class="status delivered">
                        ✓{{ msg.seen ? '✓' : '' }}
                      </span>
                      <span class="time">{{ formatDate(msg.created_at) }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Input -->
              <div class="chatInputArea">
                <div v-if="error" class="alert soft">{{ error }}</div>

                <!-- File preview -->
                <div v-if="selectedFile" class="filePreview">
                  <span class="filePreviewName">{{ selectedFile.name }}</span>
                  <button class="filePreviewX" @click="clearFile">✕</button>
                </div>

                <!-- Voice recording indicator -->
                <div v-if="isRecording" class="recordingBar">
                  <span class="recDot"></span>
                  <span>Recording {{ recordingTime }}s</span>
                  <button class="recStop" @click="stopRecording">⏹ Stop</button>
                </div>

                <div class="inputRow">
                  <input ref="fileInput" type="file" accept="image/*,video/*,audio/*" style="display:none" @change="onFileSelected" />
                  <button class="iconbtn attachBtn" title="Attach" @click="fileInput?.click()">📎</button>
                  <button class="iconbtn micBtn" :class="{ recording: isRecording }" title="Voice message" @click="toggleRecording">🎤</button>

                  <input
                    ref="inputRef"
                    v-model="text"
                    class="chatInput"
                    placeholder="Type a message…"
                    :disabled="isRecording"
                    @keydown.enter.prevent="send"
                    @input="onTyping"
                  />
                  <button
                    class="btn btn-primary sendBtn"
                    :disabled="sending || !canSend || isRecording"
                    @click="send"
                  >
                    {{ sending ? '…' : '➤' }}
                  </button>
                </div>
              </div>
            </template>
          </section>
        </div>
      </main>
    </div>
  </Layout>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { io } from 'socket.io-client'
import Layout from '../components/Layout.vue'

const route = useRoute()
const router = useRouter()

const apiUrl = (() => {
  const raw = (import.meta.env.VITE_API_URL || '').trim()
  return (raw || 'http://localhost:5000').replace(/\/$/, '')
})()

const token = ref(localStorage.getItem('token') || '')
const me = ref((() => {
  try { return JSON.parse(localStorage.getItem('user') || 'null') } catch { return null }
})())

// ── OFFLINE QUEUE ──
const DM_QUEUE_KEY = 'pulse_dm_offline_queue_v3'
function getQueue() {
  try { return JSON.parse(localStorage.getItem(DM_QUEUE_KEY) || '[]') } catch { return [] }
}
function setQueue(q) {
  try { localStorage.setItem(DM_QUEUE_KEY, JSON.stringify(q.slice(-100))) } catch {}
}
function enqueue(payload) {
  const q = getQueue()
  q.push({ ...payload, _queuedAt: Date.now() })
  setQueue(q)
}

// ── SOCKET ──
let socket = null
const socketConnected = ref(false)
const onlineIds = ref(new Set())
const typingUser = ref('')
let typingTimeout = null

function connectSocket() {
  if (socket?.connected) return
  socket = io(apiUrl, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    auth: { token: token.value }
  })

  socket.on('connect', () => {
    socketConnected.value = true
    if (activeConversationId.value) {
      socket.emit('join_conversation', activeConversationId.value)
    }
    flushQueue()
    fetchConversations()
  })
  socket.on('disconnect', () => { socketConnected.value = false })
  socket.on('connect_error', () => { socketConnected.value = false })
  socket.on('users_online', (ids) => { onlineIds.value = new Set((ids || []).map(String)) })
  socket.on('user_online', (id) => onlineIds.value.add(String(id)))
  socket.on('user_offline', (id) => onlineIds.value.delete(String(id)))

  socket.on('receive_message', (data) => handleIncomingMessage(data))
  socket.on('new_conversation_message', ({ conversationId, message }) => {
    if (String(conversationId) === String(activeConversationId.value)) {
      handleIncomingMessage(message)
    } else {
      // Refresh sidebar to show unread
      fetchConversations()
    }
  })

  socket.on('typing', ({ conversationId }) => {
    if (String(conversationId) === String(activeConversationId.value)) {
      typingUser.value = 'typing'
      if (typingTimeout) clearTimeout(typingTimeout)
      typingTimeout = setTimeout(() => { typingUser.value = '' }, 3000)
    }
  })
  socket.on('stop_typing', ({ conversationId }) => {
    if (String(conversationId) === String(activeConversationId.value)) typingUser.value = ''
  })

  socket.on('messages_read', ({ conversationId, userId }) => {
    if (String(conversationId) === String(activeConversationId.value) && String(userId) !== String(me.value?.id)) {
      messages.value.forEach(m => { if (isMe(m)) m.seen = true })
    }
  })
}

function disconnectSocket() {
  if (!socket) return
  if (activeConversationId.value) socket.emit('leave_conversation', activeConversationId.value)
  socket.disconnect()
  socket = null
  socketConnected.value = false
}

// ── STATE ──
const search = ref('')
const conversations = ref([])
const activeConversationId = ref(null)
const activeOtherId = ref(null)
const activeName = ref('')
const messages = ref([])
const loadingMessages = ref(false)
const loadingConversations = ref(false)
const sending = ref(false)
const error = ref('')
const text = ref('')
const messagesRef = ref(null)
const inputRef = ref(null)
const fileInput = ref(null)
const selectedFile = ref(null)
const selectedFileType = ref(null)

// Voice recording
const isRecording = ref(false)
const recordingTime = ref(0)
let mediaRecorder = null
let audioChunks = []
let recordInterval = null
let voiceBlob = null

// ── COMPUTED ──
const filteredConversations = computed(() => {
  const q = (search.value || '').toLowerCase()
  if (!q) return conversations.value
  return conversations.value.filter(c =>
    (c.other_username || '').toLowerCase().includes(q) ||
    String(c.other_user_id).includes(q)
  )
})

const canSend = computed(() => {
  const hasText = (text.value || '').trim().length > 0
  const hasFile = !!selectedFile.value
  const hasVoice = !!voiceBlob
  return (hasText || hasFile || hasVoice) && !!token.value && !!activeConversationId.value
})

// ── HELPERS ──
function initials(name) {
  const s = String(name || '').trim()
  if (!s) return '?'
  const parts = s.split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || s[0].toUpperCase()
}
function isOnline(userId) { return onlineIds.value.has(String(userId)) }
function isMe(msg) { return String(msg.sender_id || msg.senderId || msg.from) === String(me.value?.id) }
function resolveUrl(url) { return url?.startsWith('http') ? url : `${apiUrl}${url}` }
function formatDate(d) {
  if (!d) return ''
  const date = new Date(d)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
function formatDuration(sec) {
  if (!sec) return ''
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}
function scrollToBottom() {
  nextTick(() => {
    const el = messagesRef.value
    if (el) el.scrollTop = el.scrollHeight
  })
}
function onMediaLoad() { scrollToBottom() }

function escapeHtml(t) {
  if (!t) return ''
  const d = document.createElement('div')
  d.textContent = t
  return d.innerHTML
}
function linkify(t) {
  const e = escapeHtml(t)
  return e.replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer" class="msgLink">$1</a>'
  )
}

// ── CONVERSATION MANAGEMENT ──
async function ensureConversation(otherUserId) {
  if (!otherUserId || !token.value) return null
  try {
    // Try find existing
    const res = await fetch(`${apiUrl}/api/conversations/find?otherUserId=${encodeURIComponent(otherUserId)}`, {
      headers: { Authorization: `Bearer ${token.value}` }
    })
    if (res.ok) {
      const data = await res.json()
      return data.id
    }
    // Create new
    const createRes = await fetch(`${apiUrl}/api/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token.value}` },
      body: JSON.stringify({ otherUserId })
    })
    if (createRes.ok) {
      const data = await createRes.json()
      return data.id
    }
  } catch (err) {
    console.error('ensureConversation error:', err)
  }
  return null
}

async function fetchConversations() {
  if (!token.value) return
  loadingConversations.value = true
  error.value = ''
  try {
    const res = await fetch(`${apiUrl}/api/conversations`, {
      headers: { Authorization: `Bearer ${token.value}` }
    })
    if (!res.ok) throw new Error('Failed to load conversations')
    const data = await res.json()
    conversations.value = Array.isArray(data) ? data : []
  } catch (e) {
    error.value = e.message
  } finally {
    loadingConversations.value = false
  }
}

async function openConversation(conv) {
  activeConversationId.value = conv.id
  activeOtherId.value = String(conv.other_user_id)
  activeName.value = conv.other_username || conv.other_name || 'User'
  error.value = ''

  // Clear unread locally
  const c = conversations.value.find(x => x.id === conv.id)
  if (c) c.unread_count = 0

  // Join socket room
  if (socket?.connected) {
    socket.emit('join_conversation', conv.id)
  }

  await fetchMessages()
  nextTick(() => inputRef.value?.focus())
}

function closeChat() {
  if (socket?.connected && activeConversationId.value) {
    socket.emit('leave_conversation', activeConversationId.value)
  }
  activeConversationId.value = null
  activeOtherId.value = null
  activeName.value = ''
  messages.value = []
  error.value = ''
  clearFile()
  stopRecording()
}

// ── MESSAGES ──
async function fetchMessages() {
  if (!token.value || !activeConversationId.value) return
  loadingMessages.value = true
  error.value = ''
  try {
    const res = await fetch(
      `${apiUrl}/api/messages?conversationId=${encodeURIComponent(activeConversationId.value)}&limit=100`,
      { headers: { Authorization: `Bearer ${token.value}` } }
    )
    if (!res.ok) throw new Error('Failed to load messages')
    const data = await res.json()
    const list = Array.isArray(data) ? data : []
    messages.value = list.map(m => ({
      id: m.id,
      sender_id: String(m.sender_id),
      sender_name: m.sender_name || 'User',
      text: m.text || '',
      media_url: m.media_url,
      media_type: m.media_type || 'text',
      voice_duration: m.voice_duration,
      file_name: m.file_name,
      file_size: m.file_size,
      created_at: m.created_at,
      pending: false,
      failed: false,
      seen: false,
    }))
    scrollToBottom()
  } catch (e) {
    error.value = e.message
  } finally {
    loadingMessages.value = false
  }
}

function handleIncomingMessage(data) {
  const convId = Number(data.conversation_id || data.conversationId)
  if (String(convId) !== String(activeConversationId.value)) {
    fetchConversations() // update unread badges
    return
  }

  const newMsg = {
    id: data.id,
    sender_id: String(data.sender_id || data.senderId || data.from),
    sender_name: data.sender_name || 'User',
    text: data.text || data.content || '',
    media_url: data.media_url || data.mediaUrl,
    media_type: data.media_type || data.mediaType || 'text',
    voice_duration: data.voice_duration || data.voiceDuration,
    file_name: data.file_name || data.fileName,
    file_size: data.file_size || data.fileSize,
    created_at: data.created_at || data.createdAt,
    pending: false,
    failed: false,
    seen: false,
    tempId: data.tempId || null,
  }

  // Deduplicate by id or tempId
  const exists = messages.value.some(m => {
    if (newMsg.id && m.id === newMsg.id) return true
    if (newMsg.tempId && (m.__localId === newMsg.tempId || m.tempId === newMsg.tempId)) return true
    return false
  })
  if (exists) {
    // Update pending message to confirmed
    const idx = messages.value.findIndex(m => m.__localId === newMsg.tempId || m.tempId === newMsg.tempId)
    if (idx !== -1) {
      messages.value[idx] = { ...messages.value[idx], ...newMsg, pending: false, failed: false }
    }
    return
  }

  messages.value.push(newMsg)
  scrollToBottom()

  // Mark as read immediately if we're active
  if (socket?.connected && !isMe(newMsg)) {
    socket.emit('mark_read', { conversationId: activeConversationId.value })
  }
}

// ── SEND ──
async function send() {
  const trimmed = (text.value || '').trim()
  if (!trimmed && !selectedFile.value && !voiceBlob) return
  if (!token.value || !activeConversationId.value) return

  sending.value = true
  error.value = ''

  const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  let mediaUrl = null
  let mediaType = 'text'
  let voiceDuration = null
  let fileName = null
  let fileSize = null

  // Upload file if present
  if (selectedFile.value) {
    try {
      const up = await uploadFile(selectedFile.value)
      mediaUrl = up.url
      mediaType = up.mediaType
      fileName = up.fileName
      fileSize = up.fileSize
    } catch (e) {
      error.value = 'Upload failed: ' + e.message
      sending.value = false
      return
    }
  } else if (voiceBlob) {
    try {
      const up = await uploadFile(new File([voiceBlob], 'voice-message.webm', { type: 'audio/webm' }))
      mediaUrl = up.url
      mediaType = 'voice'
      voiceDuration = recordingTime.value
      fileName = 'Voice message'
      fileSize = voiceBlob.size
    } catch (e) {
      error.value = 'Voice upload failed: ' + e.message
      sending.value = false
      return
    }
  }

  const displayText = trimmed || (mediaType === 'image' ? '📷 Photo' : mediaType === 'video' ? '🎥 Video' : mediaType === 'voice' ? '🎤 Voice' : '📎 File')

  const optimistic = {
    __localId: tempId,
    tempId: tempId,
    id: tempId,
    sender_id: String(me.value?.id),
    sender_name: me.value?.username || 'You',
    text: displayText,
    media_url: mediaUrl,
    media_type: mediaType,
    voice_duration: voiceDuration,
    file_name: fileName,
    file_size: fileSize,
    created_at: new Date().toISOString(),
    pending: true,
    failed: false,
    seen: false,
  }

  messages.value.push(optimistic)
  text.value = ''
  clearFile()
  stopRecording()
  scrollToBottom()

  const payload = {
    conversationId: activeConversationId.value,
    text: trimmed,
    mediaUrl: mediaUrl,
    mediaType: mediaType,
    voiceDuration: voiceDuration,
    fileName: fileName,
    fileSize: fileSize,
    tempId: tempId,
  }

  // Try socket first
  let sent = false
  if (socket?.connected) {
    try {
      socket.emit('send_message', payload, (ack) => {
        sending.value = false
        if (ack?.error) {
          error.value = ack.error
          const idx = messages.value.findIndex(m => m.__localId === tempId)
          if (idx !== -1) { messages.value[idx].pending = false; messages.value[idx].failed = true }
        } else {
          const idx = messages.value.findIndex(m => m.__localId === tempId)
          if (idx !== -1) {
            messages.value[idx].pending = false
            messages.value[idx].failed = false
            if (ack?.id) messages.value[idx].id = ack.id
          }
          fetchConversations() // refresh last message
        }
      })
      setTimeout(() => { sending.value = false }, 5000)
      sent = true
    } catch {}
  }

  if (!sent) {
    // Queue and try REST
    enqueue(payload)
    try {
      const res = await fetch(`${apiUrl}/api/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token.value}`
        },
        body: JSON.stringify(payload)
      })
      if (res.ok) {
        const saved = await res.json()
        const idx = messages.value.findIndex(m => m.__localId === tempId)
        if (idx !== -1) {
          messages.value[idx].pending = false
          messages.value[idx].failed = false
          messages.value[idx].id = saved.id
        }
        fetchConversations()
      } else {
        throw new Error('Server error')
      }
    } catch (e) {
      error.value = 'Offline — message queued for retry'
      const idx = messages.value.findIndex(m => m.__localId === tempId)
      if (idx !== -1) { messages.value[idx].pending = false; messages.value[idx].failed = true }
    }
    sending.value = false
  }
}

async function retryMessage(msg) {
  if (!msg.__localId) return
  // Reconstruct payload
  const payload = {
    conversationId: activeConversationId.value,
    text: msg.text,
    mediaUrl: msg.media_url,
    mediaType: msg.media_type,
    voiceDuration: msg.voice_duration,
    fileName: msg.file_name,
    fileSize: msg.file_size,
    tempId: msg.__localId,
  }
  const idx = messages.value.findIndex(m => m.__localId === msg.__localId)
  if (idx !== -1) { messages.value[idx].pending = true; messages.value[idx].failed = false }

  if (socket?.connected) {
    socket.emit('send_message', payload, (ack) => {
      if (ack?.error) {
        if (idx !== -1) { messages.value[idx].pending = false; messages.value[idx].failed = true }
      } else {
        if (idx !== -1) {
          messages.value[idx].pending = false
          messages.value[idx].failed = false
          if (ack?.id) messages.value[idx].id = ack.id
        }
        fetchConversations()
      }
    })
  } else {
    enqueue(payload)
    error.value = 'Queued for retry when online'
    if (idx !== -1) { messages.value[idx].pending = false; messages.value[idx].failed = true }
  }
}

async function flushQueue() {
  if (!socket?.connected) return
  const q = getQueue()
  if (!q.length) return
  setQueue([])
  for (const payload of q) {
    socket.emit('send_message', payload, (ack) => {
      if (ack?.error) console.error('[Queue] send failed:', ack.error)
    })
  }
}

// ── UPLOAD ──
async function uploadFile(file) {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${apiUrl}/api/upload`, {
    method: 'POST',
    headers: token.value ? { Authorization: `Bearer ${token.value}` } : {},
    body: form,
  })
  if (!res.ok) throw new Error('Upload failed')
  return await res.json()
}

function onFileSelected(e) {
  const file = e.target.files?.[0]
  if (!file) return
  if (file.size > 50 * 1024 * 1024) { error.value = 'File too large (max 50MB)'; return }
  selectedFile.value = file
  selectedFileType.value = file.type.startsWith('video/') ? 'video' : file.type.startsWith('audio/') ? 'voice' : 'image'
  nextTick(() => inputRef.value?.focus())
}
function clearFile() {
  selectedFile.value = null
  selectedFileType.value = null
  voiceBlob = null
  if (fileInput.value) fileInput.value.value = ''
}

// ── VOICE RECORDING ──
async function toggleRecording() {
  if (isRecording.value) {
    stopRecording()
  } else {
    startRecording()
  }
}

async function startRecording() {
  if (!navigator.mediaDevices?.getUserMedia) {
    error.value = 'Voice recording not supported in this browser'
    return
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    mediaRecorder = new MediaRecorder(stream)
    audioChunks = []
    mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunks.push(e.data) }
    mediaRecorder.onstop = () => {
      voiceBlob = new Blob(audioChunks, { type: 'audio/webm' })
      stream.getTracks().forEach(t => t.stop())
    }
    mediaRecorder.start()
    isRecording.value = true
    recordingTime.value = 0
    recordInterval = setInterval(() => { recordingTime.value++ }, 1000)
  } catch (e) {
    error.value = 'Microphone access denied'
  }
}

function stopRecording() {
  if (!isRecording.value) return
  if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop()
  isRecording.value = false
  if (recordInterval) { clearInterval(recordInterval); recordInterval = null }
}

// ── TYPING ──
function onTyping() {
  if (socket?.connected && activeConversationId.value) {
    socket.emit('typing', activeConversationId.value)
  }
}

// ── LIFECYCLE ──
async function init() {
  token.value = localStorage.getItem('token') || ''
  try { me.value = JSON.parse(localStorage.getItem('user') || 'null') } catch { me.value = null }

  connectSocket()
  await fetchConversations()

  // Handle route query (e.g. from Dashboard)
  const qOtherId = route.query.userId || route.query.otherUserId
  const qName = route.query.name || route.query.username
  if (qOtherId) {
    const convId = await ensureConversation(qOtherId)
    if (convId) {
      activeConversationId.value = convId
      activeOtherId.value = String(qOtherId)
      activeName.value = qName || 'User'
      if (socket?.connected) socket.emit('join_conversation', convId)
      await fetchMessages()
      nextTick(() => inputRef.value?.focus())
    }
  }
}

async function refreshAll() {
  await init()
}

onMounted(() => {
  init()
  window.addEventListener('online', flushQueue)
})

onBeforeUnmount(() => {
  disconnectSocket()
  window.removeEventListener('online', flushQueue)
  if (typingTimeout) clearTimeout(typingTimeout)
})
</script>

<style scoped>
:deep(.sidebar), :deep(.layout-sidebar), :deep(.left-menu), :deep(.sidemenu), :deep(aside.sidebar), :deep(nav.sidebar) {
  display: none !important;
}

.wrap {
  position: relative;
  min-height: 100vh;
  padding-bottom: 40px;
  color: #f0f2f7;
  overflow-x: hidden;
  background:
    radial-gradient(1200px 800px at 15% -5%, rgba(99, 102, 241, 0.12), transparent 60%),
    radial-gradient(1000px 700px at 85% 10%, rgba(236, 72, 153, 0.10), transparent 60%),
    radial-gradient(900px 600px at 50% 105%, rgba(59, 130, 246, 0.08), transparent 60%),
    linear-gradient(180deg, #070a14 0%, #0a0e1a 40%, #070b14 100%);
}

.bg-orb {
  position: fixed;
  border-radius: 50%;
  filter: blur(100px);
  pointer-events: none;
  opacity: 0.25;
  z-index: 0;
  animation: floatOrb 14s ease-in-out infinite;
}
.orb1 { width: 320px; height: 320px; left: -60px; top: 40px; background: radial-gradient(circle, rgba(236, 72, 153, 0.45), transparent 70%); }
.orb2 { width: 360px; height: 360px; right: -80px; top: 180px; background: radial-gradient(circle, rgba(99, 102, 241, 0.40), transparent 70%); animation-direction: reverse; }
.orb3 { width: 260px; height: 260px; left: 35%; bottom: 60px; background: radial-gradient(circle, rgba(59, 130, 246, 0.30), transparent 70%); animation-duration: 16s; }

@keyframes floatOrb {
  0%, 100% { transform: translateY(0) translateX(0) scale(1); }
  33% { transform: translateY(-24px) translateX(12px) scale(1.03); }
  66% { transform: translateY(8px) translateX(-8px) scale(0.97); }
}

.glassy {
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px) saturate(1.4);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18), inset 0 1px 0 rgba(255,255,255,0.04);
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 60;
  padding: 14px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  background: rgba(7, 10, 20, 0.78);
  backdrop-filter: blur(24px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.brand { display: flex; align-items: center; gap: 12px; cursor: pointer; }
.logo { width: 44px; height: 44px; border-radius: 14px; display: grid; place-items: center; background: linear-gradient(135deg, #ec4899, #8b5cf6, #6366f1); border: 1px solid rgba(255,255,255,0.15); font-size: 22px; box-shadow: 0 8px 24px rgba(139, 92, 246, 0.25); }
.title { font-weight: 900; font-size: 19px; background: linear-gradient(135deg, #fff, #c7d2fe); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.sub { opacity: 0.55; font-size: 11px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.04em; }
.top-actions { display: flex; gap: 8px; flex-wrap: wrap; }

.chip { border: none; border-radius: 999px; padding: 10px 16px; cursor: pointer; background: rgba(255,255,255,0.08); color: #e2e8f0; font-weight: 600; font-size: 13px; transition: all 0.2s ease; }
.chip:hover { transform: translateY(-1px); background: rgba(255,255,255,0.14); }
.chip.ghost { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08); }

.main { position: relative; z-index: 2; max-width: 1100px; margin: 0 auto; padding: 20px; }
.chatLayout { display: grid; grid-template-columns: 300px 1fr; gap: 16px; height: calc(100vh - 100px); min-height: 500px; }

.sidebar { border-radius: 24px; padding: 16px; display: flex; flex-direction: column; overflow: hidden; }
.sidebarHead { margin-bottom: 12px; }
.panel-title { font-weight: 800; font-size: 15px; margin-bottom: 10px; display: flex; align-items: center; gap: 8px; }

.searchWrap { position: relative; }
.search { width: 100%; background: rgba(0,0,0,0.35); border: 1px solid rgba(255,255,255,0.08); color: #f1f5f9; padding: 10px 36px 10px 14px; border-radius: 999px; outline: none; font-size: 13px; transition: all 0.2s ease; }
.search:focus { border-color: rgba(139, 92, 246, 0.4); box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1); }
.searchClear { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); border: none; background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.7); width: 24px; height: 24px; border-radius: 50%; cursor: pointer; font-size: 11px; display: grid; place-items: center; }

.convList { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; padding-right: 4px; }

.convItem { display: flex; align-items: center; gap: 10px; padding: 10px; border-radius: 16px; border: 1px solid transparent; background: transparent; color: #e2e8f0; cursor: pointer; text-align: left; transition: all 0.18s ease; width: 100%; }
.convItem:hover { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.08); }
.convItem.active { background: rgba(139, 92, 246, 0.12); border-color: rgba(139, 92, 246, 0.25); }

.convAvatar { width: 40px; height: 40px; border-radius: 14px; background: linear-gradient(135deg, rgba(139,92,246,0.3), rgba(236,72,153,0.2)); border: 1px solid rgba(255,255,255,0.1); display: grid; place-items: center; font-weight: 800; font-size: 14px; flex-shrink: 0; }
.convMeta { flex: 1; min-width: 0; }
.convName { font-weight: 700; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.convPreview { font-size: 12px; opacity: 0.5; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 2px; }
.convBadge { background: linear-gradient(135deg, #ec4899, #8b5cf6); color: #fff; font-size: 11px; font-weight: 800; min-width: 20px; height: 20px; border-radius: 999px; display: grid; place-items: center; padding: 0 6px; flex-shrink: 0; }

.chatArea { border-radius: 24px; padding: 0; display: flex; flex-direction: column; overflow: hidden; }
.emptyChat { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 40px; }

.chatHeader { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; border-bottom: 1px solid rgba(255,255,255,0.06); background: rgba(0,0,0,0.15); }
.chatHeaderLeft { display: flex; align-items: center; gap: 12px; }
.chatHeaderName { font-weight: 800; font-size: 15px; }
.chatHeaderStatus { font-size: 12px; opacity: 0.6; display: flex; align-items: center; gap: 6px; margin-top: 2px; }
.statusDot { width: 8px; height: 8px; border-radius: 50%; background: rgba(255,255,255,0.3); }
.statusDot.on { background: #22c55e; box-shadow: 0 0 8px rgba(34,197,94,0.4); }
.socketStatus { margin-left: 6px; opacity: 0.5; font-size: 11px; }
.typingIndicator { color: #a5b4fc; font-style: italic; }
.chatHeaderActions { display: flex; gap: 6px; }

.iconbtn { width: 36px; height: 36px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.06); color: #e2e8f0; cursor: pointer; display: grid; place-items: center; font-size: 14px; transition: all 0.2s ease; }
.iconbtn:hover:not(:disabled) { background: rgba(255,255,255,0.12); transform: translateY(-1px); }
.iconbtn:disabled { opacity: 0.35; cursor: not-allowed; }
.iconbtn.recording { background: rgba(239, 68, 68, 0.25); border-color: rgba(239, 68, 68, 0.5); animation: pulseRec 1.2s infinite; }

@keyframes pulseRec {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.4); }
  50% { box-shadow: 0 0 0 8px rgba(239,68,68,0); }
}

.messagesWrap { flex: 1; overflow-y: auto; padding: 18px; display: flex; flex-direction: column; gap: 10px; scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.1) transparent; }

.msgRow { display: flex; width: 100%; }
.msgRow.me { justify-content: flex-end; }

.msgBubble { max-width: 70%; padding: 10px 14px; border-radius: 18px; font-size: 14px; line-height: 1.5; word-break: break-word; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08); color: #e2e8f0; }
.msgRow.me .msgBubble { background: linear-gradient(135deg, rgba(236,72,153,0.25), rgba(139,92,246,0.2)); border-color: rgba(139,92,246,0.25); color: #fff; }
.msgBubble.pending { opacity: 0.7; }
.msgBubble.failed { border-color: rgba(239, 68, 68, 0.4); background: rgba(239, 68, 68, 0.08); }

.msgText :deep(.msgLink) { color: #a5b4fc; text-decoration: underline; word-break: break-all; }
.msgText :deep(.msgLink:hover) { color: #c7d2fe; }

.msgMedia { max-width: 260px; border-radius: 14px; overflow: hidden; margin-bottom: 6px; }
.msgMedia img { width: 100%; display: block; border-radius: 14px; }
.msgMedia video { width: 100%; display: block; border-radius: 14px; max-height: 320px; object-fit: cover; }

.msgVoice { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
.msgVoice audio { max-width: 220px; height: 36px; border-radius: 999px; }
.voiceDuration { font-size: 11px; opacity: 0.7; }

.msgFile { margin-bottom: 6px; }
.fileLink { color: #a5b4fc; text-decoration: none; font-weight: 600; }
.fileLink:hover { text-decoration: underline; }

.msgMeta { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
.msgMeta .status { font-size: 10px; opacity: 0.6; }
.msgMeta .status.failed { color: #fca5a5; opacity: 1; cursor: pointer; }
.msgMeta .status.delivered { opacity: 0.8; }
.msgMeta .time { font-size: 10px; opacity: 0.45; margin-left: auto; }

.chatInputArea { padding: 14px 18px; border-top: 1px solid rgba(255,255,255,0.06); background: rgba(0,0,0,0.15); }
.inputRow { display: flex; gap: 10px; align-items: center; }

.chatInput { flex: 1; background: rgba(0,0,0,0.35); border: 1px solid rgba(255,255,255,0.08); color: #f1f5f9; padding: 12px 16px; border-radius: 999px; outline: none; font-size: 14px; transition: all 0.2s ease; font-family: inherit; }
.chatInput:focus { border-color: rgba(139, 92, 246, 0.4); box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1); }

.attachBtn { width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0; }
.micBtn { width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0; }

.btn { border: none; border-radius: 999px; padding: 10px 16px; cursor: pointer; background: rgba(255,255,255,0.08); color: #e2e8f0; font-weight: 600; font-size: 13px; transition: all 0.2s ease; }
.btn-primary { background: linear-gradient(135deg, #ec4899, #8b5cf6); color: #fff; box-shadow: 0 8px 24px rgba(236, 72, 153, 0.25); }
.btn-primary:hover:not(:disabled) { box-shadow: 0 12px 32px rgba(236, 72, 153, 0.35); transform: translateY(-2px); }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }

.sendBtn { width: 44px; height: 44px; border-radius: 50%; padding: 0; display: grid; place-items: center; font-size: 18px; flex-shrink: 0; }

.filePreview { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; padding: 8px 12px; border-radius: 12px; background: rgba(139, 92, 246, 0.1); border: 1px solid rgba(139, 92, 246, 0.2); font-size: 13px; }
.filePreviewName { font-weight: 600; }
.filePreviewX { border: none; background: rgba(255,255,255,0.1); color: #fff; width: 22px; height: 22px; border-radius: 50%; cursor: pointer; font-size: 11px; }

.recordingBar { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; padding: 8px 12px; border-radius: 12px; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.25); font-size: 13px; }
.recDot { width: 10px; height: 10px; border-radius: 50%; background: #ef4444; animation: pulseRec 1.2s infinite; }
.recStop { margin-left: auto; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.15); color: #fff; border-radius: 8px; padding: 4px 10px; cursor: pointer; font-size: 12px; }

.state { text-align: center; padding: 32px 20px; opacity: 0.9; }
.state.mini { padding: 20px 10px; }
.state-emoji { font-size: 32px; margin-bottom: 8px; }
.state-title { font-weight: 800; font-size: 16px; }
.state-sub { opacity: 0.55; margin-top: 4px; font-size: 13px; }

.alert { padding: 10px 14px; border-radius: 12px; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); color: #fca5a5; font-size: 13px; margin-bottom: 10px; }
.alert.soft { background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.08); color: #cbd5e1; }

.avatar { width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #ec4899, #8b5cf6); display: grid; place-items: center; font-weight: 800; font-size: 15px; flex-shrink: 0; }

@media (max-width: 900px) {
  .chatLayout { grid-template-columns: 1fr; height: auto; min-height: calc(100vh - 100px); }
  .sidebar { max-height: 260px; }
  .messagesWrap { min-height: 400px; }
}
</style>