<!-- ============================================================
  CONVERSATIONS.VUE  —  Inbox / Conversation List
  Works with /api/conversations endpoint
============================================================ -->
<template>
  <Layout>
    <div class="page">
      <div class="head">
        <div>
          <div class="title">💬 Inbox</div>
          <div class="sub">
            {{ totalUnread > 0 ? `${totalUnread} unread` : 'Your chats • tap one to open' }}
          </div>
        </div>
        <div class="head-actions">
          <input v-model="searchQuery" placeholder="Search chats…" class="search-input" />
          <button class="btn ghost" @click="load" :disabled="loading">
            {{ loading ? '…' : '↻' }}
          </button>
        </div>
      </div>

      <div v-if="error" class="alert">
        {{ error }}
        <button class="alert-close" @click="error = ''">×</button>
      </div>

      <!-- Skeleton -->
      <div v-if="loading && convos.length === 0" class="skeleton-list">
        <div v-for="i in 5" :key="i" class="skeleton-row">
          <div class="skeleton-avatar"></div>
          <div class="skeleton-content">
            <div class="skeleton-line short"></div>
            <div class="skeleton-line"></div>
          </div>
        </div>
      </div>

      <!-- Empty -->
      <div v-else-if="filteredConvos.length === 0" class="state">
        <div class="big">{{ searchQuery ? 'No matches' : 'No conversations yet' }}</div>
        <div v-if="!searchQuery" class="small">Go to People and tap Message to start.</div>
      </div>

      <!-- List -->
      <div v-else class="list">
        <button
          v-for="c in filteredConvos"
          :key="c.id"
          class="row"
          :class="{ unread: c.unread_count > 0 }"
          @click="openChat(c)"
        >
          <div class="avatar" :class="{ online: isOnline(c.other_user_id) }">
            {{ initials(c.other_username || c.other_name) }}
          </div>
          <div class="info">
            <div class="nameRow">
              <div class="name">{{ c.other_username || c.other_name || 'User' }}</div>
              <div v-if="c.unread_count > 0" class="unread-badge">{{ c.unread_count }}</div>
            </div>
            <div class="preview" :class="{ unread: c.unread_count > 0 }">
              <span v-if="c.last_media_type === 'image'">📷 Photo</span>
              <span v-else-if="c.last_media_type === 'video'">🎥 Video</span>
              <span v-else-if="c.last_media_type === 'voice'">🎤 Voice</span>
              <span v-else>{{ c.last_message || 'Say hi 👋' }}</span>
            </div>
          </div>
          <div class="right">
            <div class="time">{{ formatRelativeTime(c.last_message_at || c.updated_at) }}</div>
            <div class="pill">Open</div>
          </div>
        </button>
      </div>
    </div>
  </Layout>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { io } from 'socket.io-client'
import Layout from '../components/Layout.vue'

const router = useRouter()
const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '')

const loading = ref(false)
const error = ref('')
const convos = ref([])
const searchQuery = ref('')
const totalUnread = ref(0)
const onlineIds = ref(new Set())

let socket = null

const token = localStorage.getItem('token') || ''

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

// ── SOCKET (lightweight, just for online status) ──
function connectSocket() {
  if (!token) return
  socket = io(API_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    auth: { token }
  })
  socket.on('users_online', (ids) => { onlineIds.value = new Set((ids || []).map(String)) })
  socket.on('user_online', (id) => onlineIds.value.add(String(id)))
  socket.on('user_offline', (id) => onlineIds.value.delete(String(id)))
  socket.on('new_conversation_message', () => { load() })
}
function disconnectSocket() {
  if (socket) { socket.disconnect(); socket = null }
}

// ── HELPERS ──
function initials(name) {
  const s = String(name || '').trim()
  if (!s) return 'U'
  const parts = s.split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || s[0].toUpperCase()
}
function isOnline(userId) { return onlineIds.value.has(String(userId)) }

function formatRelativeTime(v) {
  if (!v) return ''
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return ''
  const diffMs = Date.now() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffMins < 1) return 'now'
  if (diffMins < 60) return `${diffMins}m`
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d`
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

// ── DATA ──
const filteredConvos = computed(() => {
  if (!searchQuery.value.trim()) return convos.value
  const q = searchQuery.value.toLowerCase()
  return convos.value.filter(c =>
    (c.other_username || '').toLowerCase().includes(q) ||
    (c.other_name || '').toLowerCase().includes(q) ||
    (c.last_message || '').toLowerCase().includes(q)
  )
})

async function load() {
  if (!token) { error.value = 'Please log in.'; return }
  loading.value = true
  error.value = ''
  try {
    const res = await fetch(`${API_URL}/api/conversations`, { headers: authHeaders() })
    if (!res.ok) throw new Error('Failed to load')
    const data = await res.json()
    convos.value = Array.isArray(data) ? data : []
    totalUnread.value = convos.value.reduce((s, c) => s + (c.unread_count || 0), 0)
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

function openChat(conv) {
  router.push({
    path: '/messages',
    query: { userId: conv.other_user_id, name: conv.other_username || conv.other_name }
  })
}

// ── REFRESH ──
let refreshInterval = null
function startAutoRefresh() {
  stopAutoRefresh()
  refreshInterval = setInterval(() => { if (!loading.value) load().catch(() => {}) }, 30000)
}
function stopAutoRefresh() {
  if (refreshInterval) { clearInterval(refreshInterval); refreshInterval = null }
}

onMounted(() => {
  load()
  connectSocket()
  startAutoRefresh()
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') load()
  })
})
onBeforeUnmount(() => {
  stopAutoRefresh()
  disconnectSocket()
})
</script>

<style scoped>
.page { max-width: 980px; margin: 0 auto; padding: 18px; color: #fff; }
.head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; flex-wrap: wrap; }
.title { font-size: 26px; font-weight: 900; }
.sub { opacity: 0.75; font-weight: 600; }
.head-actions { display: flex; align-items: center; gap: 10px; }
.search-input { padding: 10px 14px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.08); color: white; font-size: 14px; width: 200px; outline: none; }
.search-input::placeholder { color: rgba(255,255,255,0.4); }
.btn { border: none; border-radius: 999px; padding: 10px 14px; color: #fff; font-weight: 800; cursor: pointer; }
.btn.ghost { background: rgba(255,255,255,0.12); }
.alert { display: flex; justify-content: space-between; align-items: center; padding: 14px; margin-bottom: 12px; border-radius: 14px; background: rgba(255,80,80,0.12); border: 1px solid rgba(255,80,80,0.35); }
.alert-close { background: none; border: none; color: white; font-size: 18px; cursor: pointer; }

.skeleton-list { display: flex; flex-direction: column; gap: 10px; }
.skeleton-row { display: flex; gap: 12px; align-items: center; padding: 12px; border-radius: 16px; background: rgba(255,255,255,0.04); animation: pulse 1.5s ease-in-out infinite; }
@keyframes pulse { 0%,100% { opacity: 0.4; } 50% { opacity: 0.8; } }
.skeleton-avatar { width: 46px; height: 46px; border-radius: 14px; background: rgba(255,255,255,0.1); }
.skeleton-content { flex: 1; display: flex; flex-direction: column; gap: 8px; }
.skeleton-line { height: 12px; border-radius: 6px; background: rgba(255,255,255,0.1); }
.skeleton-line.short { width: 40%; }

.state { padding: 18px; border-radius: 16px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.1); text-align: center; }
.big { font-size: 18px; font-weight: 900; }
.small { margin-top: 6px; opacity: 0.75; }

.list { display: flex; flex-direction: column; gap: 10px; }
.row { display: flex; gap: 12px; align-items: center; padding: 12px; border-radius: 16px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12); color: #fff; text-align: left; cursor: pointer; transition: all 0.2s; width: 100%; }
.row:hover { background: rgba(255,255,255,0.11); }
.row.unread { background: rgba(139, 92, 246, 0.08); border-color: rgba(139, 92, 246, 0.2); }

.avatar { width: 46px; height: 46px; border-radius: 14px; display: grid; place-items: center; background: linear-gradient(45deg, #ff416c, #ff4b2b); font-weight: 900; position: relative; flex-shrink: 0; }
.avatar.online::after { content: ''; position: absolute; bottom: 2px; right: 2px; width: 12px; height: 12px; border-radius: 50%; background: #22c55e; border: 2px solid #0f172a; }
.info { flex: 1; min-width: 0; }
.nameRow { display: flex; align-items: center; gap: 8px; }
.name { font-weight: 900; }
.unread-badge { padding: 2px 8px; border-radius: 999px; background: #ef4444; color: white; font-size: 11px; font-weight: 800; }
.preview { opacity: 0.78; margin-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 14px; }
.preview.unread { opacity: 1; font-weight: 600; }
.right { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
.time { opacity: 0.65; font-size: 12px; font-weight: 700; white-space: nowrap; }
.pill { padding: 6px 10px; border-radius: 999px; background: rgba(0,255,170,0.16); border: 1px solid rgba(0,255,170,0.24); font-weight: 900; font-size: 12px; }

@media (max-width: 640px) {
  .page { padding: 14px; }
  .title { font-size: 22px; }
  .search-input { width: 140px; }
  .row { padding: 10px; }
  .avatar { width: 42px; height: 42px; }
  .pill { display: none; }
}
</style>