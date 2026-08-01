<!-- src/views/Messages.vue -->
<template>
  <Layout>
    <div class="wrap">
      <div class="bg-orb orb1"></div>
      <div class="bg-orb orb2"></div>
      <div class="bg-orb orb3"></div>

      <!-- TOPBAR -->
      <header class="topbar glassy">
        <div class="brand" @click="$router.push('/dashboard')">
          <div class="logo">💬</div>
          <div class="brand-text">
            <div class="title">Inbox</div>
            <div class="sub">{{ conversationList.length }} chat{{ conversationList.length === 1 ? '' : 's' }}</div>
          </div>
        </div>

        <div class="top-actions">
          <button class="chip" @click="refreshAll">🔄 Refresh</button>
          <button class="chip ghost" @click="$router.push('/dashboard')">🏠 Dashboard</button>
        </div>
      </header>

      <!-- MAIN -->
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
                :key="conv.otherUserId"
                class="convItem"
                :class="{ active: activeOtherId === conv.otherUserId }"
                @click="openConversation(conv)"
              >
                <div class="convAvatar">{{ conv.name?.[0]?.toUpperCase() || '?' }}</div>
                <div class="convMeta">
                  <div class="convName">{{ conv.name || `User #${conv.otherUserId}` }}</div>
                  <div class="convPreview">{{ conv.lastMessage || 'No messages yet' }}</div>
                </div>
                <div v-if="conv.unread" class="convBadge">{{ conv.unread }}</div>
              </button>
            </div>
          </aside>

          <!-- CHAT AREA -->
          <section class="chatArea glassy">
            <!-- Empty -->
            <div v-if="!activeOtherId" class="emptyChat">
              <div class="state-emoji" style="font-size: 48px;">💬</div>
              <div class="state-title">Select a conversation</div>
              <div class="state-sub">Choose someone from the sidebar to start messaging.</div>
            </div>

            <!-- Active Chat -->
            <template v-else>
              <!-- Header -->
              <div class="chatHeader">
                <div class="chatHeaderLeft">
                  <div class="avatar">{{ activeName?.[0]?.toUpperCase() || '?' }}</div>
                  <div>
                    <div class="chatHeaderName">{{ activeName || `User #${activeOtherId}` }}</div>
                    <div class="chatHeaderStatus">
                      <span class="statusDot" :class="{ on: isOnline(activeOtherId) }"></span>
                      {{ isOnline(activeOtherId) ? 'Online' : 'Offline' }}
                      <span class="socketStatus">{{ socketConnected ? '· ⚡ realtime' : '· ○ offline' }}</span>
                    </div>
                  </div>
                </div>
                <div class="chatHeaderActions">
                  <button class="iconbtn" title="Audio Call" :disabled="!isOnline(activeOtherId)" @click="callUser('audio')">📞</button>
                  <button class="iconbtn" title="Video Call" :disabled="!isOnline(activeOtherId)" @click="callUser('video')">🎥</button>
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
                  <div class="state-sub">Say hello to {{ activeName || 'them' }}!</div>
                </div>

                <div
                  v-for="(msg, idx) in messages"
                  :key="msg.id || msg._id || msg._tempId || `${msg.created_at}-${idx}`"
                  class="msgRow"
                  :class="{ me: isMe(msg) }"
                >
                  <div class="msgBubble" :class="{ pending: msg.pending }">
                    <div class="msgText">{{ msg.text || msg.content || msg.message || '' }}</div>
                    <div class="msgTime">
                      <span v-if="msg.pending" style="opacity:0.7">Sending… · </span>
                      {{ formatDate(msg.created_at || msg.createdAt) }}
                    </div>
                  </div>
                </div>
              </div>

              <!-- Input -->
              <div class="chatInputArea">
                <div v-if="error" class="alert soft">{{ error }}</div>
                <div class="inputRow">
                  <input
                    ref="inputRef"
                    v-model="text"
                    class="chatInput"
                    placeholder="Type a message…"
                    @keydown.enter.prevent="send"
                  />
                  <button
                    class="btn btn-primary sendBtn"
                    :disabled="sending || !canSend"
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

/* =========================
   CONFIG
========================= */
const apiUrl = (() => {
  const raw = (import.meta.env.VITE_API_URL || '').trim()
  return (raw || 'https://addisgo-production-63ae.up.railway.app').replace(/\/$/, '')
})()

const token = ref(localStorage.getItem('token') || '')
const me = ref((() => {
  try { return JSON.parse(localStorage.getItem('user') || 'null') } catch { return null }
})())

/* =========================
   DM PERSISTENCE
========================= */
const DM_QUEUE_KEY = 'pulse_dm_offline_queue_v1'

function getDmKey(otherId) {
  const myId = me.value?.id || 'unknown'
  return `pulse_dm_${myId}_${otherId}`
}

function loadMessages(otherId) {
  if (!otherId) return
  try {
    const saved = JSON.parse(localStorage.getItem(getDmKey(otherId)) || '[]')
    messages.value = Array.isArray(saved) ? saved : []
  } catch { messages.value = [] }
}

function saveMessages(otherId) {
  if (!otherId) return
  try { localStorage.setItem(getDmKey(otherId), JSON.stringify(messages.value.slice(-300))) } catch {}
}

function getMessageQueue() {
  try { return JSON.parse(localStorage.getItem(DM_QUEUE_KEY) || '[]') } catch { return [] }
}

function setMessageQueue(q) {
  try { localStorage.setItem(DM_QUEUE_KEY, JSON.stringify(q.slice(-50))) } catch {}
}

function queueMessage(payload) {
  const q = getMessageQueue()
  q.push(payload)
  setMessageQueue(q)
}

function flushMessageQueue() {
  if (!socket?.connected) return
  const q = getMessageQueue()
  if (!q.length) return
  setMessageQueue([])
  for (const payload of q) {
    socket.emit('send_message', payload, (ack) => {
      if (ack?.error) console.error('[DM] queued send failed:', ack.error)
    })
  }
}

/* =========================
   SOCKET
========================= */
let socket = null
const socketConnected = ref(false)

function getRoomId(u1, u2) {
  const a = String(u1 || '')
  const b = String(u2 || '')
  if (!a || !b) return null
  return `dm-${[a, b].sort().join('-')}`
}

const currentRoomId = computed(() => {
  if (!me.value?.id || !activeOtherId.value) return null
  return getRoomId(me.value.id, activeOtherId.value)
})

function connectSocket() {
  if (socket?.connected) return

  socket = io(apiUrl, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  })

  socket.on('connect', () => {
    socketConnected.value = true
    if (currentRoomId.value) {
      socket.emit('join_room', currentRoomId.value)
    }
    flushMessageQueue()
  })

  socket.on('disconnect', () => {
    socketConnected.value = false
  })

  socket.on('connect_error', (err) => {
    socketConnected.value = false
    console.error('[Messages] socket error:', err.message)
  })

  socket.on('receive_message', (data) => {
    const msgRoom = data.roomId || data.room_id
    const fromId = String(data.sender_id || data.from || data.fromUserId || '')
    const toId = String(data.receiver_id || data.to || data.toUserId || '')
    const activeId = String(activeOtherId.value || '')
    const myId = String(me.value?.id || '')

    const relevant = msgRoom === currentRoomId.value ||
      (fromId === activeId && toId === myId) ||
      (fromId === myId && toId === activeId)

    if (!relevant) return

    if (!messages.value.some(m =>
      (m.id && data.id && String(m.id) === String(data.id)) ||
      (m._tempId && data._tempId && String(m._tempId) === String(data._tempId))
    )) {
      messages.value.push({
        id: data.id || Date.now(),
        text: String(data.content || data.text || ''),
        from: fromId,
        fromUserId: fromId,
        senderId: fromId,
        created_at: data.created_at || new Date().toISOString(),
        createdAt: data.created_at || new Date().toISOString(),
      })
      nextTick(scrollToBottom)
    }
  })
}

function disconnectSocket() {
  if (!socket) return
  socket.off('connect')
  socket.off('disconnect')
  socket.off('connect_error')
  socket.off('receive_message')
  if (currentRoomId.value) {
    socket.emit('leave_room', currentRoomId.value)
  }
  socket.disconnect()
  socket = null
  socketConnected.value = false
}

/* =========================
   STATE
========================= */
const search = ref('')
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

/* =========================
   COMPUTED
========================= */
const conversationList = computed(() => {
  const list = [...conversations.value]
  const qId = route.query.userId || route.query.otherUserId
  const qName = route.query.name || route.query.username
  if (qId && !list.some(c => String(c.otherUserId) === String(qId))) {
    list.unshift({
      otherUserId: String(qId),
      name: qName || `User #${qId}`,
      lastMessage: '',
      unread: 0
    })
  }
  return list
})

const filteredConversations = computed(() => {
  const q = (search.value || '').toLowerCase()
  if (!q) return conversationList.value
  return conversationList.value.filter(c =>
    (c.name || '').toLowerCase().includes(q) ||
    String(c.otherUserId).includes(q)
  )
})

const canSend = computed(() => {
  const t = text.value || ''
  return t.trim().length > 0 && !!token.value && !!activeOtherId.value
})

/* =========================
   WATCHERS
========================= */
watch(messages, () => {
  if (activeOtherId.value) saveMessages(activeOtherId.value)
}, { deep: true })

watch(() => route.query.userId, (newId) => {
  if (newId) {
    activeOtherId.value = String(newId)
    activeName.value = route.query.name || `User #${newId}`
    loadMessages(String(newId))
    fetchMessages()
  }
})

watch(currentRoomId, (newRoom, oldRoom) => {
  if (!socket?.connected) return
  if (oldRoom) socket.emit('leave_room', oldRoom)
  if (newRoom) socket.emit('join_room', newRoom)
})

/* =========================
   ONLINE STATUS
========================= */
const onlineIds = ref(new Set())
function isOnline(userId) {
  return onlineIds.value.has(String(userId))
}

/* =========================
   CONVERSATIONS
========================= */
const conversations = ref([])

async function fetchConversations() {
  if (!token.value) return
  loadingConversations.value = true
  error.value = ''

  const urls = [
    `${apiUrl}/messages/conversations`,
    `${apiUrl}/conversations`,
    `${apiUrl}/api/messages/conversations`
  ]

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token.value}` }
      })
      if (res.ok) {
        const data = await res.json()
        conversations.value = Array.isArray(data) ? data : Array.isArray(data?.conversations) ? data.conversations : []
        loadingConversations.value = false
        return
      }
    } catch (err) {
      console.warn('[Messages] conversations fetch error:', err.message)
    }
  }

  conversations.value = []
  loadingConversations.value = false
}

/* =========================
   MESSAGES (REST fallback for history)
========================= */
async function fetchMessages() {
  if (!token.value || !activeOtherId.value) return
  loadingMessages.value = true
  error.value = ''
  messages.value = []

  const id = String(activeOtherId.value)

  const urls = [
    `${apiUrl}/messages?otherUserId=${encodeURIComponent(id)}`,
    `${apiUrl}/messages?userId=${encodeURIComponent(id)}`,
    `${apiUrl}/api/messages?otherUserId=${encodeURIComponent(id)}`,
    `${apiUrl}/api/messages?userId=${encodeURIComponent(id)}`,
    `${apiUrl}/messages/${encodeURIComponent(id)}`
  ]

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token.value}` }
      })
      if (res.ok) {
        const data = await res.json()
        messages.value = Array.isArray(data) ? data : Array.isArray(data?.messages) ? data.messages : []
        nextTick(scrollToBottom)
        loadingMessages.value = false
        return
      }
    } catch (err) {
      console.warn('[Messages] fetchMessages error:', err.message)
    }
  }

  // Backend has no REST history endpoint — that's OK, socket handles real-time
  messages.value = []
  loadingMessages.value = false
}

/* =========================
   SEND (Socket.IO primary, REST fallback)
========================= */
async function send() {
  const rawText = text.value
  if (!rawText || typeof rawText !== 'string') return
  const trimmed = rawText.trim()
  if (!trimmed || !token.value || !activeOtherId.value) return

  sending.value = true
  error.value = ''

  const id = String(activeOtherId.value)
  const myId = String(me.value?.id || '')
  const room = currentRoomId.value || getRoomId(myId, id)
  const tempId = `temp-${Date.now()}`

  const msgPayload = {
    roomId: room,
    sender_id: myId,
    sender_name: me.value?.username || me.value?.display_name || 'You',
    receiver_id: id,
    content: trimmed,
    text: trimmed,
    created_at: new Date().toISOString(),
    _tempId: tempId
  }

  // Optimistic UI
  const optimisticMsg = {
    id: tempId,
    _tempId: tempId,
    text: trimmed,
    from: myId,
    fromUserId: myId,
    senderId: myId,
    created_at: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    pending: true
  }
  messages.value.push(optimisticMsg)
  text.value = ''
  nextTick(scrollToBottom)

  // 1) Try Socket.IO first
  let sent = false
  if (socket?.connected) {
    try {
      socket.emit('send_message', msgPayload, (ack) => {
        sending.value = false
        const idx = messages.value.findIndex(m => m._tempId === tempId)
        if (ack?.error) {
          console.error('[Messages] socket send error:', ack.error)
          error.value = ack.error
          if (idx !== -1) messages.value.splice(idx, 1)
        } else {
          if (idx !== -1) {
            messages.value[idx] = { 
              ...messages.value[idx], 
              id: ack?.id || messages.value[idx].id,
              pending: false 
            }
          }
          const conv = conversations.value.find(c => String(c.otherUserId) === id)
          if (conv) conv.lastMessage = trimmed
        }
      })

      setTimeout(() => { sending.value = false }, 5000)
      sent = true
    } catch (err) {
      console.error('[Messages] socket emit error:', err)
    }
  }

  // 2) REST fallback
  if (!sent) {
    // Queue for later if offline
    queueMessage(msgPayload)

    const payloadOptions = [
      { otherUserId: id, text: trimmed },
      { userId: id, text: trimmed },
      { toUserId: id, text: trimmed },
      { receiverId: id, text: trimmed }
    ]
    const urls = [`${apiUrl}/messages`, `${apiUrl}/api/messages`]

    for (const url of urls) {
      for (const body of payloadOptions) {
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token.value}`
            },
            body: JSON.stringify(body)
          })
          if (res.ok) {
            const saved = await res.json().catch(() => null)
            const idx = messages.value.findIndex(m => m._tempId === tempId)
            if (idx !== -1) {
              messages.value[idx] = { 
                ...messages.value[idx], 
                id: saved?.id || messages.value[idx].id,
                pending: false
              }
            }
            sent = true
            sending.value = false
            break
          }
        } catch {}
      }
      if (sent) break
    }

    if (!sent) {
      error.value = 'Send failed. Message queued for retry when online.'
      const idx = messages.value.findIndex(m => m._tempId === tempId)
      if (idx !== -1) messages.value[idx].pending = false
    }
    sending.value = false
  }
}

/* =========================
   HELPERS
========================= */
function isMe(msg) {
  if (!msg || !me.value?.id) return false
  const fromId = msg.from || msg.fromUserId || msg.senderId || msg.user_id || msg.userId
  return String(fromId) === String(me.value.id)
}

function formatDate(d) {
  if (!d) return ''
  const date = new Date(d)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function scrollToBottom() {
  const el = messagesRef.value
  if (el) el.scrollTop = el.scrollHeight
}

function openConversation(conv) {
  activeOtherId.value = conv.otherUserId
  activeName.value = conv.name || `User #${conv.otherUserId}`
  error.value = ''
  loadMessages(conv.otherUserId)
  if (socket?.connected && currentRoomId.value) {
    socket.emit('join_room', currentRoomId.value)
  }
  fetchMessages()
  nextTick(() => inputRef.value?.focus())
}

function closeChat() {
  if (socket?.connected && currentRoomId.value) {
    socket.emit('leave_room', currentRoomId.value)
  }
  activeOtherId.value = null
  activeName.value = ''
  messages.value = []
  error.value = ''
}

function callUser(kind) {
  if (!activeOtherId.value) return
  router.push({
    path: '/call',
    query: {
      toUserId: String(activeOtherId.value),
      name: activeName.value || 'User',
      kind
    }
  })
}

async function refreshAll() {
  token.value = localStorage.getItem('token') || ''
  me.value = (() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null') } catch { return null }
  })()
  await fetchConversations()
  if (activeOtherId.value) await fetchMessages()
}

/* =========================
   LIFECYCLE
========================= */
onMounted(() => {
  connectSocket()
  fetchConversations()

  const qId = route.query.userId || route.query.otherUserId
  const qName = route.query.name || route.query.username
  if (qId) {
    activeOtherId.value = String(qId)
    activeName.value = qName || `User #${qId}`
    loadMessages(String(qId))
    fetchMessages()
    nextTick(() => inputRef.value?.focus())
  }
})

onBeforeUnmount(() => {
  disconnectSocket()
})
</script>

<style scoped>
/* ===== RESET LAYOUT SIDEBAR ===== */
:deep(.sidebar),
:deep(.layout-sidebar),
:deep(.left-menu),
:deep(.sidemenu),
:deep(aside.sidebar),
:deep(nav.sidebar) {
  display: none !important;
}

/* ===== BASE ===== */
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

/* ===== TOPBAR ===== */
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

/* ===== MAIN ===== */
.main { position: relative; z-index: 2; max-width: 1100px; margin: 0 auto; padding: 20px; }
.chatLayout { display: grid; grid-template-columns: 300px 1fr; gap: 16px; height: calc(100vh - 100px); min-height: 500px; }

/* ===== SIDEBAR ===== */
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

/* ===== CHAT AREA ===== */
.chatArea { border-radius: 24px; padding: 0; display: flex; flex-direction: column; overflow: hidden; }
.emptyChat { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 40px; }

.chatHeader { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; border-bottom: 1px solid rgba(255,255,255,0.06); background: rgba(0,0,0,0.15); }
.chatHeaderLeft { display: flex; align-items: center; gap: 12px; }
.chatHeaderName { font-weight: 800; font-size: 15px; }
.chatHeaderStatus { font-size: 12px; opacity: 0.6; display: flex; align-items: center; gap: 6px; margin-top: 2px; }
.statusDot { width: 8px; height: 8px; border-radius: 50%; background: rgba(255,255,255,0.3); }
.statusDot.on { background: #22c55e; box-shadow: 0 0 8px rgba(34,197,94,0.4); }
.socketStatus { margin-left: 6px; opacity: 0.5; font-size: 11px; }
.chatHeaderActions { display: flex; gap: 6px; }

.iconbtn { width: 36px; height: 36px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.06); color: #e2e8f0; cursor: pointer; display: grid; place-items: center; font-size: 14px; transition: all 0.2s ease; }
.iconbtn:hover:not(:disabled) { background: rgba(255,255,255,0.12); transform: translateY(-1px); }
.iconbtn:disabled { opacity: 0.35; cursor: not-allowed; }

/* ===== MESSAGES ===== */
.messagesWrap { flex: 1; overflow-y: auto; padding: 18px; display: flex; flex-direction: column; gap: 10px; scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.1) transparent; }

.msgRow { display: flex; width: 100%; }
.msgRow.me { justify-content: flex-end; }

.msgBubble { max-width: 70%; padding: 10px 14px; border-radius: 18px; font-size: 14px; line-height: 1.5; word-break: break-word; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08); color: #e2e8f0; }
.msgRow.me .msgBubble { background: linear-gradient(135deg, rgba(236,72,153,0.25), rgba(139,92,246,0.2)); border-color: rgba(139,92,246,0.25); color: #fff; }
.msgBubble.pending { opacity: 0.7; }
.msgTime { font-size: 10px; opacity: 0.45; margin-top: 4px; text-align: right; }

/* ===== INPUT ===== */
.chatInputArea { padding: 14px 18px; border-top: 1px solid rgba(255,255,255,0.06); background: rgba(0,0,0,0.15); }
.inputRow { display: flex; gap: 10px; align-items: center; }

.chatInput { flex: 1; background: rgba(0,0,0,0.35); border: 1px solid rgba(255,255,255,0.08); color: #f1f5f9; padding: 12px 16px; border-radius: 999px; outline: none; font-size: 14px; transition: all 0.2s ease; font-family: inherit; }
.chatInput:focus { border-color: rgba(139, 92, 246, 0.4); box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1); }

.btn { border: none; border-radius: 999px; padding: 10px 16px; cursor: pointer; background: rgba(255,255,255,0.08); color: #e2e8f0; font-weight: 600; font-size: 13px; transition: all 0.2s ease; }
.btn-primary { background: linear-gradient(135deg, #ec4899, #8b5cf6); color: #fff; box-shadow: 0 8px 24px rgba(236, 72, 153, 0.25); }
.btn-primary:hover:not(:disabled) { box-shadow: 0 12px 32px rgba(236, 72, 153, 0.35); transform: translateY(-2px); }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }

.sendBtn { width: 44px; height: 44px; border-radius: 50%; padding: 0; display: grid; place-items: center; font-size: 18px; }

/* ===== STATES ===== */
.state { text-align: center; padding: 32px 20px; opacity: 0.9; }
.state.mini { padding: 20px 10px; }
.state-emoji { font-size: 32px; margin-bottom: 8px; }
.state-title { font-weight: 800; font-size: 16px; }
.state-sub { opacity: 0.55; margin-top: 4px; font-size: 13px; }

.alert { padding: 10px 14px; border-radius: 12px; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); color: #fca5a5; font-size: 13px; margin-bottom: 10px; }
.alert.soft { background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.08); color: #cbd5e1; }

.avatar { width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #ec4899, #8b5cf6); display: grid; place-items: center; font-weight: 800; font-size: 15px; flex-shrink: 0; }

/* ===== RESPONSIVE ===== */
@media (max-width: 900px) {
  .chatLayout { grid-template-columns: 1fr; height: auto; min-height: calc(100vh - 100px); }
  .sidebar { max-height: 260px; }
  .messagesWrap { min-height: 400px; }
}
</style>