<template>
  <Layout>
    <div class="page">
      <!-- Header -->
      <div class="head">
        <div>
          <div class="title">💬 Inbox</div>
          <div class="sub">
            {{ totalUnread > 0 ? `${totalUnread} unread` : 'Your chats • tap one to open' }}
          </div>
        </div>

        <div class="head-actions">
          <input
            v-model="searchQuery"
            placeholder="Search chats..."
            class="search-input"
          />
          <button class="btn ghost" @click="load" :disabled="loading">
            {{ loading ? '...' : '↻' }}
          </button>
        </div>
      </div>

      <!-- Error -->
      <div v-if="error" class="alert">
        {{ error }}
        <button class="alert-close" @click="error = ''">×</button>
      </div>

      <!-- Loading Skeleton -->
      <div v-if="loading && convos.length === 0" class="skeleton-list">
        <div v-for="i in 5" :key="i" class="skeleton-row">
          <div class="skeleton-avatar"></div>
          <div class="skeleton-content">
            <div class="skeleton-line short"></div>
            <div class="skeleton-line"></div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredConvos.length === 0" class="state">
        <div class="big">
          {{ searchQuery ? 'No matches found' : 'No conversations yet' }}
        </div>
        <div v-if="!searchQuery" class="small">Go to People and tap Message.</div>
      </div>

      <!-- List -->
      <div v-else class="list">
        <button
          v-for="c in filteredConvos"
          :key="c.id"
          class="row"
          :class="{ unread: c.unread_count > 0 }"
          @click="openConversation(c)"
        >
          <div class="avatar" :class="{ online: c.other_user_online }">
            {{ initials(c.other_username || c.other_name || 'User') }}
          </div>

          <div class="info">
            <div class="nameRow">
              <div class="name">
                {{ c.other_username || c.other_name || 'User' }}
              </div>
              <div v-if="c.unread_count > 0" class="unread-badge">
                {{ c.unread_count }}
              </div>
            </div>

            <div class="preview" :class="{ unread: c.unread_count > 0 }">
              {{ c.last_message || 'Say hi 👋' }}
            </div>
          </div>

          <div class="right">
            <div class="time">{{ formatRelativeTime(c.last_message_at || c.updated_at) }}</div>
            <div class="pill">Open</div>
          </div>
        </button>
      </div>

      <!-- Load More -->
      <div v-if="hasMore && !loading" class="load-more">
        <button @click="loadMore">Load more</button>
      </div>
    </div>
  </Layout>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import Layout from '../components/Layout.vue'

const router = useRouter()

const API_URL = (import.meta.env.VITE_API_URL || 'https://addisgo-production-63ae.up.railway.app').replace(/\/$/, '')

// State
const loading = ref(false)
const loadingMore = ref(false)
const error = ref('')
const convos = ref([])
const searchQuery = ref('')
const hasMore = ref(true)
const page = ref(1)
const totalUnread = ref(0)

// Abort controllers for cleanup
const abortControllers = new Set()

function getToken() {
  return localStorage.getItem('token') || ''
}

function getMe() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null')
  } catch {
    return null
  }
}

function authHeaders() {
  const token = getToken()
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

function createAbortController() {
  const controller = new AbortController()
  abortControllers.add(controller)
  return controller
}

function cleanupControllers() {
  for (const controller of abortControllers) {
    controller.abort()
  }
  abortControllers.clear()
}

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
    if (!res.ok) throw new Error(data?.error || 'Request failed')
    return data
  } catch (err) {
    abortControllers.delete(controller)
    if (err.name === 'AbortError') throw new Error('Request cancelled')
    throw err
  }
}

// Search filter
const filteredConvos = computed(() => {
  if (!searchQuery.value.trim()) return convos.value
  const q = searchQuery.value.toLowerCase()
  return convos.value.filter(c =>
    (c.other_username || '').toLowerCase().includes(q) ||
    (c.other_name || '').toLowerCase().includes(q) ||
    (c.last_message || '').toLowerCase().includes(q)
  )
})

function initials(name) {
  const s = String(name || '').trim()
  if (!s) return 'U'
  const parts = s.split(' ').filter(Boolean)
  return (
    (parts[0]?.[0] || 'U').toUpperCase() +
    (parts[1]?.[0] ? parts[1][0].toUpperCase() : '')
  )
}

function formatRelativeTime(v) {
  if (!v) return ''
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return ''

  const now = new Date()
  const diffMs = now - d
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

function calculateTotalUnread() {
  totalUnread.value = convos.value.reduce((sum, c) => sum + (c.unread_count || 0), 0)
}

async function load(reset = true) {
  const me = getMe()
  if (!me?.id) {
    error.value = 'Login again (missing user).'
    if (reset) convos.value = []
    return
  }

  if (reset) {
    loading.value = true
    page.value = 1
  } else {
    loadingMore.value = true
  }
  error.value = ''

  try {
    const data = await apiGet(
      `/messages/conversations?userId=${encodeURIComponent(me.id)}&page=${page.value}&limit=20`
    )

    const newConvos = Array.isArray(data) ? data : []
    hasMore.value = newConvos.length === 20

    if (reset) {
      convos.value = newConvos
    } else {
      // Merge, avoiding duplicates
      const existingIds = new Set(convos.value.map(c => c.id))
      const uniqueNew = newConvos.filter(c => !existingIds.has(c.id))
      convos.value.push(...uniqueNew)
    }

    calculateTotalUnread()
  } catch (e) {
    if (e.message !== 'Request cancelled') {
      error.value = e?.message || 'Failed to load conversations'
    }
    if (reset) convos.value = []
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

async function loadMore() {
  if (loadingMore.value || !hasMore.value) return
  page.value++
  await load(false)
}

function openConversation(c) {
  if (!c.other_user_id) {
    error.value = 'Cannot open conversation: missing user info'
    return
  }

  router.push({
    path: '/messages',
    query: {
      conversationId: c.id,
      userId: String(c.other_user_id),
      name: c.other_username || c.other_name || 'Chat',
    },
  })
}

// Auto-refresh interval
let refreshInterval = null

function startAutoRefresh() {
  stopAutoRefresh()
  refreshInterval = setInterval(() => {
    if (!loading.value) {
      load(true).catch(() => {})
    }
  }, 30000) // Refresh every 30s
}

function stopAutoRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval)
    refreshInterval = null
  }
}

// Visibility change handler
function onVisibilityChange() {
  if (document.visibilityState === 'visible') {
    load(true).catch(() => {})
  }
}

onMounted(() => {
  load()
  startAutoRefresh()
  document.addEventListener('visibilitychange', onVisibilityChange)
})

onBeforeUnmount(() => {
  cleanupControllers()
  stopAutoRefresh()
  document.removeEventListener('visibilitychange', onVisibilityChange)
})
</script>

<style scoped>
.page {
  max-width: 980px;
  margin: 0 auto;
  padding: 18px;
  color: #fff;
}

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}

.title {
  font-size: 26px;
  font-weight: 900;
}

.sub {
  opacity: 0.75;
  font-weight: 600;
}

.head-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.search-input {
  padding: 10px 14px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.08);
  color: white;
  font-size: 14px;
  width: 200px;
  outline: none;
}

.search-input::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

.btn {
  border: none;
  border-radius: 999px;
  padding: 10px 14px;
  color: #fff;
  font-weight: 800;
  cursor: pointer;
}

.btn.ghost {
  background: rgba(255, 255, 255, 0.12);
}

.alert {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px;
  margin-bottom: 12px;
  border-radius: 14px;
  background: rgba(255, 80, 80, 0.12);
  border: 1px solid rgba(255, 80, 80, 0.35);
}

.alert-close {
  background: none;
  border: none;
  color: white;
  font-size: 18px;
  cursor: pointer;
}

/* Skeleton Loading */
.skeleton-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.skeleton-row {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 12px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.04);
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.8; }
}

.skeleton-avatar {
  width: 46px;
  height: 46px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.1);
}

.skeleton-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skeleton-line {
  height: 12px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.1);
}

.skeleton-line.short {
  width: 40%;
}

.state {
  padding: 18px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  text-align: center;
}

.big {
  font-size: 18px;
  font-weight: 900;
}

.small {
  margin-top: 6px;
  opacity: 0.75;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.row {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 12px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #fff;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s;
}

.row:hover {
  background: rgba(255, 255, 255, 0.11);
}

.row.unread {
  background: rgba(0, 210, 255, 0.06);
  border-color: rgba(0, 210, 255, 0.15);
}

.avatar {
  width: 46px;
  height: 46px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: linear-gradient(45deg, #ff416c, #ff4b2b);
  font-weight: 900;
  position: relative;
}

.avatar.online::after {
  content: '';
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #22c55e;
  border: 2px solid #0f172a;
}

.info {
  flex: 1;
  min-width: 0;
}

.nameRow {
  display: flex;
  align-items: center;
  gap: 8px;
}

.name {
  font-weight: 900;
}

.unread-badge {
  padding: 2px 8px;
  border-radius: 999px;
  background: #ef4444;
  color: white;
  font-size: 11px;
  font-weight: 800;
}

.preview {
  opacity: 0.78;
  margin-top: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 14px;
}

.preview.unread {
  opacity: 1;
  font-weight: 600;
}

.right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
}

.time {
  opacity: 0.65;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.pill {
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(0, 255, 170, 0.16);
  border: 1px solid rgba(0, 255, 170, 0.24);
  font-weight: 900;
}

.load-more {
  text-align: center;
  padding: 20px;
}

.load-more button {
  padding: 10px 24px;
  border-radius: 999px;
  border: none;
  background: rgba(255, 255, 255, 0.12);
  color: white;
  font-weight: 700;
  cursor: pointer;
}

@media (max-width: 640px) {
  .page {
    padding: 14px;
  }

  .title {
    font-size: 22px;
  }

  .search-input {
    width: 140px;
  }

  .row {
    padding: 10px;
  }

  .avatar {
    width: 42px;
    height: 42px;
  }

  .pill {
    display: none;
  }
}
</style>