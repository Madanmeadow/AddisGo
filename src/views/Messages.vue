<!-- src/views/Messages.vue -->
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
            <div class="sub">{{ conversationList.length }} chat{{ conversationList.length === 1 ? '' : 's' }}</div>
          </div>
        </div>
        <div class="top-actions">
          <button class="chip" @click="refreshAll">🔄 Refresh</button>
          <button class="chip ghost" @click="$router.push('/dashboard')">🏠 Dashboard</button>
        </div>
      </header>

      <main class="main">
        <div class="chatLayout">
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
                  <div class="convPreview">
                    <span v-if="conv.lastMessageType === 'image'">📷 Photo</span>
                    <span v-else-if="conv.lastMessageType === 'video'">🎥 Video</span>
                    <span v-else>{{ conv.lastMessage || 'No messages yet' }}</span>
                  </div>
                </div>
                <div v-if="conv.unread" class="convBadge">{{ conv.unread }}</div>
              </button>
            </div>
          </aside>

          <section class="chatArea glassy">
            <div v-if="!activeOtherId" class="emptyChat">
              <div class="state-emoji" style="font-size: 48px;">💬</div>
              <div class="state-title">Select a conversation</div>
              <div class="state-sub">Choose someone from the sidebar to start messaging.</div>
            </div>

            <template v-else>
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
                  :key="msg._id || msg.id || msg.__localId || `msg-${idx}`"
                  class="msgRow"
                  :class="{ me: isMe(msg) }"
                >
                  <div class="msgBubble" :class="{ pending: msg.pending, failed: msg.failed }">
                    <div v-if="msg.mediaType === 'image'" class="msgMedia">
                      <img :src="msg.mediaUrl" alt="image" loading="lazy" @load="onMediaLoad" />
                    </div>
                    <div v-else-if="msg.mediaType === 'video'" class="msgMedia">
                      <video :src="msg.mediaUrl" controls playsinline preload="metadata" @loadedmetadata="onMediaLoad" />
                    </div>
                    <div v-else class="msgText" v-html="linkify(msg.text || msg.content || msg.message || '')"></div>

                    <div class="msgMeta">
                      <span v-if="msg.pending" class="status">Sending…</span>
                      <span v-else-if="msg.failed" class="status failed" @click="retryMessage(msg)">Failed · Tap to retry</span>
                      <span v-else class="status delivered">✓{{ msg.seen ? '✓' : '' }}</span>
                      <span class="time">{{ formatDate(msg.created_at || msg.createdAt) }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="chatInputArea">
                <div v-if="error" class="alert soft">{{ error }}</div>

                <div v-if="selectedFile" class="filePreview">
                  <span class="filePreviewName">{{ selectedFile.name }}</span>
                  <button class="filePreviewX" @click="clearFile">✕</button>
                </div>

                <div class="inputRow">
                  <input
                    ref="fileInput"
                    type="file"
                    accept="image/*,video/*"
                    style="display:none"
                    @change="onFileSelected"
                  />
                  <button class="iconbtn attachBtn" title="Attach photo/video" @click="fileInput?.click()">📎</button>
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

const apiUrl = (() => {
  const raw = (import.meta.env.VITE_API_URL || '').trim()
  return (raw || 'https://addisgo-production-63ae.up.railway.app').replace(/\/$/, '')
})()

const token = ref(localStorage.getItem('token') || '')
const me = ref((() => {
  try { return JSON.parse(localStorage.getItem('user') || 'null') } catch { return null }
})())

const DM_QUEUE_KEY = 'pulse_dm_offline_queue_v2'

function getDmStoreKey(otherId) {
  const myId = me.value?.id || 'unknown'
  return `pulse_dm_v2_${myId}_${otherId}`
}

function loadMessages(otherId) {
  if (!otherId) return
  try {
    const saved = JSON.parse(localStorage.getItem(getDmStoreKey(otherId)) || '[]')
    messages.value = Array.isArray(saved) ? saved : []
  } catch { messages.value = [] }
}

function saveMessages(otherId) {
  if (!otherId) return
  try { localStorage.setItem(getDmStoreKey(otherId), JSON.stringify(messages.value.slice(-400))) } catch {}
}

function getMessageQueue() {
  try { return JSON.parse(localStorage.getItem(DM_QUEUE_KEY) || '[]') } catch { return [] }
}

function setMessageQueue(q) {
  try { localStorage.setItem(DM_QUEUE_KEY, JSON.stringify(q.slice(-100))) } catch {}
}

function queueMessage(payload) {
  const q = getMessageQueue()
  q.push({ ...payload, _queuedAt: Date.now() })
  setMessageQueue(q)
}

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
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  })

  socket.on('connect', () => {
    socketConnected.value = true
    if (currentRoomId.value) socket.emit('join_room', currentRoomId.value)
    flushMessageQueue()
    fetchConversations()
  })
  socket.on('disconnect', () => { socketConnected.value = false })
  socket.on('connect_error', () => { socketConnected.value = false })
  socket.on('users_online', (ids) => { onlineIds.value = new Set((ids || []).map(String)) })
  socket.on('user_online', (userId) => onlineIds.value.add(String(userId)))
  socket.on('user_offline', (userId) => onlineIds.value.delete(String(userId)))

  socket.on('receive_message', (data) => {
    const fromId = String(data.sender_id || data.from || data.fromUserId || '')
    const toId = String(data.receiver_id || data.to || data.toUserId || '')
    const myId = String(me.value?.id || '')
    const activeId = String(activeOtherId.value || '')
    const room = data.roomId || data.room_id || getRoomId(fromId, toId)
    const incomingTempId = String(data._tempId || data.tempId || '')
    const incomingRealId = String(data.id || data.message_id || '')

    if (fromId === myId && incomingTempId) {
      const idx = messages.value.findIndex(m => String(m._tempId || m.tempId || '') === incomingTempId)
      if (idx !== -1) {
        messages.value[idx] = {
          ...messages.value[idx],
          id: incomingRealId || messages.value[idx].id,
          _id: incomingRealId || messages.value[idx]._id,
          pending: false,
          failed: false,
          seen: false,
          created_at: data.created_at || messages.value[idx].created_at,
          mediaUrl: data.mediaUrl || data.media_url || messages.value[idx].mediaUrl,
          mediaType: data.mediaType || data.media_type || messages.value[idx].mediaType,
        }
        saveMessages(activeOtherId.value)
        nextTick(scrollToBottom)
        updateConvLastMessage(activeId, messages.value[idx].text, messages.value[idx].mediaType)
        return
      }
    }

    const newMsg = {
      id: incomingRealId || `srv-${Date.now()}`,
      _id: incomingRealId || `srv-${Date.now()}`,
      text: String(data.content || data.text || data.message || ''),
      content: String(data.content || data.text || data.message || ''),
      from: fromId,
      fromUserId: fromId,
      senderId: fromId,
      sender_name: data.sender_name || data.name || '',
      created_at: data.created_at || new Date().toISOString(),
      createdAt: data.created_at || new Date().toISOString(),
      pending: false,
      failed: false,
      seen: false,
      mediaUrl: data.mediaUrl || data.media_url || null,
      mediaType: data.mediaType || data.media_type || null,
    }

    const alreadyHave = messages.value.some(m => {
      if (incomingRealId && (String(m.id) === incomingRealId || String(m._id) === incomingRealId)) return true
      if (incomingTempId && (String(m._tempId || '') === incomingTempId || String(m.tempId || '') === incomingTempId)) return true
      if (m.from === fromId && m.text === newMsg.text && Math.abs(new Date(m.created_at) - new Date(newMsg.created_at)) < 3000) return true
      return false
    })
    if (alreadyHave) return

    const relevant = room === currentRoomId.value || (fromId === activeId && toId === myId) || (fromId === myId && toId === activeId)
    if (relevant) {
      messages.value.push(newMsg)
      saveMessages(activeOtherId.value)
      nextTick(scrollToBottom)
    }
    if (fromId !== myId) {
      upsertConversation(fromId, newMsg.sender_name || `User #${fromId}`, newMsg.text, newMsg.mediaType, !relevant)
    }
  })
}

function disconnectSocket() {
  if (!socket) return
  socket.off('connect')
  socket.off('disconnect')
  socket.off('connect_error')
  socket.off('receive_message')
  socket.off('users_online')
  socket.off('user_online')
  socket.off('user_offline')
  if (currentRoomId.value) socket.emit('leave_room', currentRoomId.value)
  socket.disconnect()
  socket = null
  socketConnected.value = false
}

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
const fileInput = ref(null)
const selectedFile = ref(null)
const selectedFileType = ref(null)

const conversationList = computed(() => {
  const list = [...conversations.value]
  const qId = route.query.userId || route.query.otherUserId
  const qName = route.query.name || route.query.username
  if (qId && !list.some(c => String(c.otherUserId) === String(qId))) {
    list.unshift({ otherUserId: String(qId), name: qName || `User #${qId}`, lastMessage: '', lastMessageType: null, unread: 0 })
  }
  return list
})

const filteredConversations = computed(() => {
  const q = (search.value || '').toLowerCase()
  if (!q) return conversationList.value
  return conversationList.value.filter(c => (c.name || '').toLowerCase().includes(q) || String(c.otherUserId).includes(q))
})

const canSend = computed(() => {
  const hasText = (text.value || '').trim().length > 0
  const hasFile = !!selectedFile.value
  return (hasText || hasFile) && !!token.value && !!activeOtherId.value
})

watch(messages, () => { if (activeOtherId.value) saveMessages(activeOtherId.value) }, { deep: true })
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

const onlineIds = ref(new Set())
function isOnline(userId) { return onlineIds.value.has(String(userId)) }

const conversations = ref([])

async function fetchConversations() {
  if (!token.value) return
  loadingConversations.value = true
  error.value = ''
  const urls = [`${apiUrl}/messages/conversations`, `${apiUrl}/conversations`, `${apiUrl}/api/messages/conversations`]
  for (const url of urls) {
    try {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token.value}` } })
      if (res.ok) {
        const data = await res.json()
        const list = Array.isArray(data) ? data : Array.isArray(data?.conversations) ? data.conversations : []
        conversations.value = list.map(c => ({
          otherUserId: String(c.otherUserId || c.other_user_id || c.userId || c.id),
          name: c.name || c.username || c.display_name || `User #${c.otherUserId}`,
          lastMessage: c.lastMessage || c.last_message || '',
          lastMessageType: c.lastMessageType || c.media_type || null,
          unread: Number(c.unread || c.unread_count || 0),
        }))
        loadingConversations.value = false
        return
      }
    } catch {}
  }
  conversations.value = []
  loadingConversations.value = false
}

function upsertConversation(otherId, name, lastMessage, mediaType, incrementUnread = true) {
  const id = String(otherId)
  const existing = conversations.value.find(c => String(c.otherUserId) === id)
  if (existing) {
    existing.lastMessage = lastMessage
    existing.lastMessageType = mediaType
    if (incrementUnread) existing.unread = (existing.unread || 0) + 1
  } else {
    conversations.value.unshift({ otherUserId: id, name: name || `User #${id}`, lastMessage, lastMessageType: mediaType, unread: incrementUnread ? 1 : 0 })
  }
}

function updateConvLastMessage(otherId, text, mediaType) {
  const c = conversations.value.find(x => String(x.otherUserId) === String(otherId))
  if (c) { c.lastMessage = text; c.lastMessageType = mediaType }
}

async function fetchMessages() {
  if (!token.value || !activeOtherId.value) return
  loadingMessages.value = true
  error.value = ''
  const id = String(activeOtherId.value)
  const urls = [
    `${apiUrl}/messages?otherUserId=${encodeURIComponent(id)}`,
    `${apiUrl}/messages?userId=${encodeURIComponent(id)}`,
    `${apiUrl}/messages/${encodeURIComponent(id)}`,
    `${apiUrl}/api/messages?otherUserId=${encodeURIComponent(id)}`,
    `${apiUrl}/api/messages?userId=${encodeURIComponent(id)}`,
  ]
  for (const url of urls) {
    try {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token.value}` } })
      if (res.ok) {
        const data = await res.json()
        const list = Array.isArray(data) ? data : Array.isArray(data?.messages) ? data.messages : []
        const normalized = list.map(m => ({
          id: String(m.id || m._id || m.message_id || `hist-${Date.now()}-${Math.random()}`),
          _id: String(m.id || m._id || m.message_id || `hist-${Date.now()}-${Math.random()}`),
          text: String(m.content || m.text || m.message || ''),
          content: String(m.content || m.text || m.message || ''),
          from: String(m.sender_id || m.senderId || m.from || m.user_id || ''),
          fromUserId: String(m.sender_id || m.senderId || m.from || m.user_id || ''),
          senderId: String(m.sender_id || m.senderId || m.from || m.user_id || ''),
          sender_name: m.sender_name || m.senderName || m.username || '',
          created_at: m.created_at || m.createdAt || new Date().toISOString(),
          createdAt: m.created_at || m.createdAt || new Date().toISOString(),
          pending: false,
          failed: false,
          seen: !!m.seen || !!m.read,
          mediaUrl: m.mediaUrl || m.media_url || m.image_url || m.video_url || null,
          mediaType: m.mediaType || m.media_type || (m.image_url ? 'image' : m.video_url ? 'video' : null),
        }))
        const localPending = messages.value.filter(m => m.pending || m.failed)
        const serverIds = new Set(normalized.map(m => m._id))
        const localResolved = messages.value.filter(m => !m.pending && !m.failed && !serverIds.has(m._id))
        messages.value = [...normalized, ...localResolved, ...localPending].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        nextTick(scrollToBottom)
        loadingMessages.value = false
        return
      }
    } catch {}
  }
  loadingMessages.value = false
}

async function send() {
  const rawText = text.value
  if (!rawText && !selectedFile.value) return
  const trimmed = (rawText || '').trim()
  if (!trimmed && !selectedFile.value) return
  if (!token.value || !activeOtherId.value) return

  sending.value = true
  error.value = ''

  const id = String(activeOtherId.value)
  const myId = String(me.value?.id || '')
  const room = currentRoomId.value || getRoomId(myId, id)
  const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

  const isImage = selectedFileType.value === 'image'
  const isVideo = selectedFileType.value === 'video'
  const displayText = trimmed || (isImage ? '📷 Photo' : isVideo ? '🎥 Video' : '')

  const optimisticMsg = {
    __localId: tempId,
    _tempId: tempId,
    tempId: tempId,
    id: tempId,
    _id: tempId,
    text: displayText,
    content: displayText,
    from: myId,
    fromUserId: myId,
    senderId: myId,
    sender_name: me.value?.username || me.value?.display_name || 'You',
    created_at: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    pending: true,
    failed: false,
    seen: false,
    mediaUrl: null,
    mediaType: selectedFileType.value,
    rawFile: selectedFile.value,
  }

  messages.value.push(optimisticMsg)
  text.value = ''
  const fileToUpload = selectedFile.value
  clearFile()
  nextTick(scrollToBottom)

  let mediaUrl = null
  let mediaType = optimisticMsg.mediaType

  if (fileToUpload) {
    try {
      const form = new FormData()
      form.append('file', fileToUpload)
      const uploadUrls = [`${apiUrl}/upload`, `${apiUrl}/api/upload`, `${apiUrl}/media/upload`]
      for (const uu of uploadUrls) {
        try {
          const upRes = await fetch(uu, {
            method: 'POST',
            headers: token.value ? { Authorization: `Bearer ${token.value}` } : {},
            body: form,
          })
          if (upRes.ok) {
            const upData = await upRes.json()
            mediaUrl = upData.url || upData.fileUrl || upData.image_url || upData.video_url || null
            if (mediaUrl) break
          }
        } catch {}
      }
      if (!mediaUrl && fileToUpload.size < 500 * 1024) {
        mediaUrl = await fileToBase64(fileToUpload)
      }
    } catch {}
  }

  if (mediaUrl) {
    const idx = messages.value.findIndex(m => m.__localId === tempId)
    if (idx !== -1) messages.value[idx].mediaUrl = mediaUrl
  }

  const payload = {
    roomId: room,
    room_id: room,
    sender_id: myId,
    sender_name: me.value?.username || me.value?.display_name || 'You',
    receiver_id: id,
    receiverId: id,
    content: trimmed,
    text: trimmed,
    message: trimmed,
    created_at: new Date().toISOString(),
    _tempId: tempId,
    tempId: tempId,
    mediaUrl,
    media_url: mediaUrl,
    mediaType,
    media_type: mediaType,
  }

  let sent = false
  if (socket?.connected) {
    try {
      socket.emit('send_message', payload, (ack) => {
        sending.value = false
        const idx = messages.value.findIndex(m => m.__localId === tempId)
        if (ack?.error) {
          error.value = ack.error
          if (idx !== -1) { messages.value[idx].pending = false; messages.value[idx].failed = true }
        } else {
          if (idx !== -1) {
            messages.value[idx].pending = false
            messages.value[idx].failed = false
            messages.value[idx].id = ack?.id || ack?.message_id || messages.value[idx].id
            messages.value[idx]._id = ack?.id || ack?.message_id || messages.value[idx]._id
            if (ack?.mediaUrl) messages.value[idx].mediaUrl = ack.mediaUrl
          }
          updateConvLastMessage(id, displayText, mediaType)
        }
      })
      setTimeout(() => { sending.value = false }, 5000)
      sent = true
    } catch {}
  }

  if (!sent) {
    queueMessage(payload)
    const urls = [`${apiUrl}/messages`, `${apiUrl}/api/messages`]
    const bodies = [
      { otherUserId: id, text: trimmed, mediaUrl, mediaType },
      { userId: id, text: trimmed, mediaUrl, mediaType },
      { receiverId: id, content: trimmed, mediaUrl, mediaType },
    ]
    for (const url of urls) {
      for (const body of bodies) {
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token.value}` },
            body: JSON.stringify(body),
          })
          if (res.ok) {
            const saved = await res.json().catch(() => null)
            const idx = messages.value.findIndex(m => m.__localId === tempId)
            if (idx !== -1) {
              messages.value[idx].pending = false
              messages.value[idx].failed = false
              messages.value[idx].id = saved?.id || saved?._id || messages.value[idx].id
              messages.value[idx]._id = saved?.id || saved?._id || messages.value[idx]._id
            }
            sent = true
            break
          }
        } catch {}
      }
      if (sent) break
    }
    if (!sent) {
      error.value = 'Offline — message queued for retry'
      const idx = messages.value.findIndex(m => m.__localId === tempId)
      if (idx !== -1) { messages.value[idx].pending = false; messages.value[idx].failed = true }
    }
    sending.value = false
  }
  saveMessages(activeOtherId.value)
}

async function retryMessage(msg) {
  if (!msg.__localId) return
  if (!msg.rawFile) {
    text.value = msg.text
    await send()
    const idx = messages.value.findIndex(m => m.__localId === msg.__localId)
    if (idx !== -1) messages.value.splice(idx, 1)
    return
  }
  selectedFile.value = msg.rawFile
  selectedFileType.value = msg.mediaType
  text.value = (msg.text === '📷 Photo' || msg.text === '🎥 Video') ? '' : msg.text
  const idx = messages.value.findIndex(m => m.__localId === msg.__localId)
  if (idx !== -1) messages.value.splice(idx, 1)
  await send()
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

function onFileSelected(e) {
  const file = e.target.files?.[0]
  if (!file) return
  if (file.size > 50 * 1024 * 1024) { error.value = 'File too large (max 50MB)'; return }
  selectedFile.value = file
  selectedFileType.value = file.type.startsWith('video/') ? 'video' : 'image'
  nextTick(() => inputRef.value?.focus())
}

function clearFile() {
  selectedFile.value = null
  selectedFileType.value = null
  if (fileInput.value) fileInput.value.value = ''
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function onMediaLoad() { nextTick(scrollToBottom) }

function escapeHtml(text) {
  if (!text) return ''
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

function linkify(text) {
  const escaped = escapeHtml(text)
  return escaped.replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer" class="msgLink">$1</a>'
  )
}

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
  const c = conversations.value.find(x => String(x.otherUserId) === String(conv.otherUserId))
  if (c) c.unread = 0
  loadMessages(conv.otherUserId)
  if (socket?.connected && currentRoomId.value) socket.emit('join_room', currentRoomId.value)
  fetchMessages()
  nextTick(() => inputRef.value?.focus())
}

function closeChat() {
  if (socket?.connected && currentRoomId.value) socket.emit('leave_room', currentRoomId.value)
  activeOtherId.value = null
  activeName.value = ''
  messages.value = []
  error.value = ''
  clearFile()
}

function callUser(kind) {
  if (!activeOtherId.value) return
  router.push({ path: '/call', query: { toUserId: String(activeOtherId.value), name: activeName.value || 'User', kind } })
}

async function refreshAll() {
  token.value = localStorage.getItem('token') || ''
  me.value = (() => { try { return JSON.parse(localStorage.getItem('user') || 'null') } catch { return null } })()
  await fetchConversations()
  if (activeOtherId.value) await fetchMessages()
}

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
  window.addEventListener('online', flushMessageQueue)
})

onBeforeUnmount(() => {
  disconnectSocket()
  window.removeEventListener('online', flushMessageQueue)
})
</script>

<style scoped>
:deep(.sidebar),
:deep(.layout-sidebar),
:deep(.left-menu),
:deep(.sidemenu),
:deep(aside.sidebar),
:deep(nav.sidebar) {
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
.chatHeaderActions { display: flex; gap: 6px; }

.iconbtn { width: 36px; height: 36px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.06); color: #e2e8f0; cursor: pointer; display: grid; place-items: center; font-size: 14px; transition: all 0.2s ease; }
.iconbtn:hover:not(:disabled) { background: rgba(255,255,255,0.12); transform: translateY(-1px); }
.iconbtn:disabled { opacity: 0.35; cursor: not-allowed; }

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

.btn { border: none; border-radius: 999px; padding: 10px 16px; cursor: pointer; background: rgba(255,255,255,0.08); color: #e2e8f0; font-weight: 600; font-size: 13px; transition: all 0.2s ease; }
.btn-primary { background: linear-gradient(135deg, #ec4899, #8b5cf6); color: #fff; box-shadow: 0 8px 24px rgba(236, 72, 153, 0.25); }
.btn-primary:hover:not(:disabled) { box-shadow: 0 12px 32px rgba(236, 72, 153, 0.35); transform: translateY(-2px); }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }

.sendBtn { width: 44px; height: 44px; border-radius: 50%; padding: 0; display: grid; place-items: center; font-size: 18px; flex-shrink: 0; }

.filePreview { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; padding: 8px 12px; border-radius: 12px; background: rgba(139, 92, 246, 0.1); border: 1px solid rgba(139, 92, 246, 0.2); font-size: 13px; }
.filePreviewName { font-weight: 600; }
.filePreviewX { border: none; background: rgba(255,255,255,0.1); color: #fff; width: 22px; height: 22px; border-radius: 50%; cursor: pointer; font-size: 11px; }

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