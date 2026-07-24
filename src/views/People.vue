<template>
  <Layout>
    <div class="people-page">
      <div class="bg-orb orb1"></div>
      <div class="bg-orb orb2"></div>
      <div class="bg-orb orb3"></div>

      <section class="people-shell glassy">
        <header class="people-top">
          <div class="title-wrap">
            <button type="button" class="back-btn" @click="goBack">← Back</button>
            <div>
              <h1>People</h1>
              <p>Call, message, and open profiles instantly.</p>
            </div>
          </div>

          <div class="top-actions">
            <button type="button" class="chip" @click="refreshAll" :disabled="loading">
              {{ loading ? 'Refreshing...' : 'Refresh' }}
            </button>
            <button type="button" class="chip ghost" @click="toggleOffline">
              {{ showOffline ? 'Hide Offline' : 'Show Offline' }}
            </button>
          </div>
        </header>

        <section class="toolbar glassy">
          <div class="search-wrap">
            <input
              v-model.trim="search"
              class="search"
              type="text"
              placeholder="Search people..."
              @input="onSearchInput"
            />
          </div>

          <div class="toolbar-right">
            <div class="status-pill" :class="{ on: socketConnected }">
              <span class="dot"></span>
              <span>{{ socketConnected ? 'Connected' : 'Offline' }}</span>
            </div>

            <div class="count-pill">
              {{ onlineCount }} online / {{ people.length }} total
            </div>
          </div>
        </section>

        <section v-if="error" class="error-card">
          {{ error }}
          <button class="error-close" @click="error = ''">×</button>
        </section>

        <!-- Skeleton Loading -->
        <section v-if="loading && !filteredPeople.length" class="skeleton-list">
          <div v-for="i in 6" :key="i" class="skeleton-row">
            <div class="skeleton-avatar"></div>
            <div class="skeleton-content">
              <div class="skeleton-line short"></div>
              <div class="skeleton-line"></div>
            </div>
          </div>
        </section>

        <section v-else-if="!filteredPeople.length" class="empty-card">
          {{ search ? 'No people match your search.' : 'No people found.' }}
        </section>

        <section v-else class="people-list">
          <article
            v-for="person in paginatedPeople"
            :key="person.id"
            class="person-card glassy"
            :class="{ online: isOnline(person.id) }"
            @click="goProfile(person)"
            tabindex="0"
            @keydown.enter="goProfile(person)"
          >
            <div class="person-main">
              <div class="avatar-wrap">
                <img
                  v-if="person.avatar || person.avatar_url || person.photo_url"
                  :src="mediaUrl(person.avatar || person.avatar_url || person.photo_url)"
                  class="avatar"
                  alt="avatar"
                  loading="lazy"
                  @error="onAvatarError($event, person)"
                />
                <div v-else class="avatar fallback">
                  {{ initialOf(person) }}
                </div>

                <span class="presence" :class="{ on: isOnline(person.id) }"></span>
              </div>

              <div class="meta">
                <div class="name-row">
                  <h3>{{ displayName(person) }}</h3>
                  <span class="mini-id">#{{ person.id }}</span>
                </div>

                <div class="sub-row">
                  <span class="presence-label" :class="{ on: isOnline(person.id) }">
                    {{ isOnline(person.id) ? 'Online' : lastSeen(person) }}
                  </span>

                  <span v-if="person.bio" class="bio-line" :title="person.bio">
                    {{ person.bio }}
                  </span>
                </div>
              </div>
            </div>

            <div class="person-actions" @click.stop>
              <button
                type="button"
                class="mini-action"
                title="Audio Call"
                :disabled="!isOnline(person.id)"
                @click.stop.prevent="startAudioCall(person)"
              >
                📞
              </button>

              <button
                type="button"
                class="mini-action"
                title="Video Call"
                :disabled="!isOnline(person.id)"
                @click.stop.prevent="startVideoCall(person)"
              >
                🎥
              </button>

              <button
                type="button"
                class="mini-action"
                title="Message"
                @click.stop.prevent="openChat(person)"
              >
                💬
              </button>

              <button
                type="button"
                class="mini-action"
                title="Profile"
                @click.stop.prevent="goProfile(person)"
              >
                👤
              </button>
            </div>
          </article>
        </section>

        <!-- Pagination -->
        <div v-if="filteredPeople.length > itemsPerPage" class="pagination">
          <button
            :disabled="currentPage === 1"
            @click="currentPage--"
          >
            ← Prev
          </button>
          <span>Page {{ currentPage }} of {{ totalPages }}</span>
          <button
            :disabled="currentPage >= totalPages"
            @click="currentPage++"
          >
            Next →
          </button>
        </div>
      </section>
    </div>
  </Layout>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import Layout from '../components/Layout.vue'
import socket, { ensurePulseSocket, refreshSocketAuth } from '../socket'

const router = useRouter()

const API_URL = (
  import.meta.env.VITE_API_URL ||
  'https://addisgo-production-63ae.up.railway.app'
).replace(/\/$/, '')

// State
const people = ref([])
const loading = ref(false)
const error = ref('')
const search = ref('')
const showOffline = ref(true)
const socketConnected = ref(socket.connected)
const onlineUserIds = ref([])
const currentPage = ref(1)
const itemsPerPage = ref(20)
const lastSeenMap = ref(new Map()) // userId -> timestamp

// Abort controllers
const abortControllers = new Set()

function getToken() {
  return localStorage.getItem('token') || ''
}

function getMe() {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}')
  } catch {
    return {}
  }
}

const me = ref(getMe())
const myUserId = computed(() => String(me.value?.id || '').trim())

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

function mediaUrl(url) {
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  return `${API_URL}${url.startsWith('/') ? '' : '/'}${url}`
}

function displayName(person) {
  return person?.username || person?.name || person?.display_name || `User ${person?.id || ''}`
}

function initialOf(person) {
  return String(displayName(person)).trim().charAt(0).toUpperCase() || 'U'
}

function normalizeUser(user) {
  return {
    ...user,
    id: String(user?.id || user?.userId || '').trim(),
    lastSeenAt: user?.last_seen_at || user?.updated_at || null,
  }
}

function isOnline(userId) {
  return onlineUserIds.value.includes(String(userId))
}

function lastSeen(person) {
  const ts = lastSeenMap.value.get(String(person.id)) || person.lastSeenAt
  if (!ts) return 'Offline'

  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return 'Offline'

  const now = new Date()
  const diffMs = now - d
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function onAvatarError(event, person) {
  // Replace broken image with fallback
  const img = event.target
  img.style.display = 'none'
  const fallback = document.createElement('div')
  fallback.className = 'avatar fallback'
  fallback.textContent = initialOf(person)
  img.parentNode.appendChild(fallback)
}

const onlineCount = computed(() => onlineUserIds.value.length)

// Debounced search
let searchDebounce = null
function onSearchInput() {
  clearTimeout(searchDebounce)
  searchDebounce = setTimeout(() => {
    currentPage.value = 1 // Reset to first page on search
  }, 150)
}

const filteredPeople = computed(() => {
  const q = search.value.toLowerCase().trim()

  let list = people.value.filter((p) => p.id && p.id !== myUserId.value)

  if (!showOffline.value) {
    list = list.filter((p) => isOnline(p.id))
  }

  if (!q) {
    return [...list].sort((a, b) => {
      const aOn = isOnline(a.id) ? 1 : 0
      const bOn = isOnline(b.id) ? 1 : 0
      if (aOn !== bOn) return bOn - aOn
      // Secondary sort by name
      return displayName(a).localeCompare(displayName(b))
    })
  }

  return list
    .filter((p) => {
      const hay =
        `${displayName(p)} ${p.email || ''} ${p.bio || ''} ${p.id || ''}`.toLowerCase()
      return hay.includes(q)
    })
    .sort((a, b) => {
      const aOn = isOnline(a.id) ? 1 : 0
      const bOn = isOnline(b.id) ? 1 : 0
      return bOn - aOn
    })
})

const totalPages = computed(() => Math.ceil(filteredPeople.value.length / itemsPerPage.value))

const paginatedPeople = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  return filteredPeople.value.slice(start, start + itemsPerPage.value)
})

// Reset page when filters change
watch([showOffline, search], () => {
  currentPage.value = 1
})

async function fetchPeople() {
  loading.value = true
  error.value = ''

  try {
    const controller = createAbortController()
    const res = await fetch(`${API_URL}/users`, {
      headers: authHeaders(),
      signal: controller.signal,
    })

    abortControllers.delete(controller)

    const data = await res.json().catch(() => [])
    if (!res.ok) {
      throw new Error(data?.error || 'Failed to load people')
    }

    const list = Array.isArray(data) ? data : Array.isArray(data?.users) ? data.users : []
    people.value = list.map(normalizeUser).filter((u) => u.id)

    // Populate lastSeenMap from user data
    for (const user of people.value) {
      if (user.lastSeenAt) {
        lastSeenMap.value.set(user.id, user.lastSeenAt)
      }
    }
  } catch (e) {
    if (e.name !== 'AbortError') {
      error.value = e?.message || 'Failed to load people'
    }
  } finally {
    loading.value = false
  }
}

function openChat(person) {
  const targetId = String(person?.id || person?.userId || '').trim()
  const targetName = displayName(person)

  if (!targetId) {
    error.value = 'Missing user id for chat'
    return
  }

  router.push({
    path: '/messages',
    query: {
      userId: targetId,
      name: targetName,
    },
  })
}

function startAudioCall(person) {
  const targetId = String(person?.id || person?.userId || '').trim()
  const targetName = displayName(person)

  if (!targetId) {
    error.value = 'Missing user id for call'
    return
  }

  router.push({
    path: '/call',
    query: {
      toUserId: targetId,
      name: targetName,
      kind: 'audio',
    },
  })
}

function startVideoCall(person) {
  const targetId = String(person?.id || person?.userId || '').trim()
  const targetName = displayName(person)

  if (!targetId) {
    error.value = 'Missing user id for call'
    return
  }

  router.push({
    path: '/call',
    query: {
      toUserId: targetId,
      name: targetName,
      kind: 'video',
    },
  })
}

function goProfile(person) {
  const targetId = String(person?.id || person?.userId || '').trim()
  if (!targetId) {
    error.value = 'Missing user id for profile'
    return
  }
  router.push(`/profile/${targetId}`)
}

function goBack() {
  router.push('/dashboard')
}

function toggleOffline() {
  showOffline.value = !showOffline.value
}

async function refreshAll() {
  await fetchPeople()
  if (socketConnected.value) {
    socket.emit('presence:list:get')
  }
}

// Socket handlers
function onPresenceList(payload) {
  const ids = Array.isArray(payload?.onlineUserIds) ? payload.onlineUserIds : []
  onlineUserIds.value = ids.map((id) => String(id))
}

function onPresenceUpdate(payload) {
  const uid = String(payload?.userId || '').trim()
  const online = !!payload?.online
  const lastSeen = payload?.lastSeenAt || payload?.timestamp

  if (!uid) return

  const set = new Set(onlineUserIds.value)
  if (online) {
    set.add(uid)
  } else {
    set.delete(uid)
    if (lastSeen) {
      lastSeenMap.value.set(uid, lastSeen)
    }
  }
  onlineUserIds.value = Array.from(set)
}

function onOnlineUsersLegacy(entries) {
  if (!Array.isArray(entries)) return
  const ids = entries
    .map((entry) => String(Array.isArray(entry) ? entry[0] : entry))
    .filter(Boolean)
  onlineUserIds.value = Array.from(new Set(ids))
}

function onSocketConnect() {
  socketConnected.value = true
  const username = me.value?.username || me.value?.name || 'User'
  if (myUserId.value) {
    socket.emit('user:online', { userId: myUserId.value, username })
  }
  socket.emit('presence:list:get')
}

function onSocketDisconnect() {
  socketConnected.value = false
}

// Auto-refresh interval
let refreshInterval = null

function startAutoRefresh() {
  stopAutoRefresh()
  refreshInterval = setInterval(() => {
    if (!loading.value) {
      fetchPeople().catch(() => {})
    }
  }, 60000) // Refresh every minute
}

function stopAutoRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval)
    refreshInterval = null
  }
}

onMounted(async () => {
  me.value = getMe()

  ensurePulseSocket()
  refreshSocketAuth(true)

  socket.on('connect', onSocketConnect)
  socket.on('disconnect', onSocketDisconnect)
  socket.on('presence:list', onPresenceList)
  socket.on('presence:update', onPresenceUpdate)
  socket.on('online-users', onOnlineUsersLegacy)

  await fetchPeople()

  if (socket.connected) {
    onSocketConnect()
  }

  startAutoRefresh()
})

onBeforeUnmount(() => {
  cleanupControllers()
  stopAutoRefresh()
  clearTimeout(searchDebounce)

  // Mark self as offline
  if (myUserId.value) {
    socket.emit('user:offline', { userId: myUserId.value })
  }

  socket.off('connect', onSocketConnect)
  socket.off('disconnect', onSocketDisconnect)
  socket.off('presence:list', onPresenceList)
  socket.off('presence:update', onPresenceUpdate)
  socket.off('online-users', onOnlineUsersLegacy)
})
</script>

<style scoped>
.people-page {
  position: relative;
  min-height: 100vh;
  padding: 22px;
  overflow: hidden;
  background:
    radial-gradient(circle at top left, rgba(255, 75, 120, 0.16), transparent 26%),
    radial-gradient(circle at top right, rgba(87, 112, 255, 0.18), transparent 30%),
    linear-gradient(180deg, #07111f 0%, #081325 55%, #08101d 100%);
  color: #f6f8ff;
}

.bg-orb {
  position: absolute;
  border-radius: 999px;
  filter: blur(70px);
  pointer-events: none;
  opacity: 0.42;
}

.orb1 {
  width: 260px;
  height: 260px;
  top: -60px;
  left: -40px;
  background: rgba(255, 76, 123, 0.24);
}

.orb2 {
  width: 280px;
  height: 280px;
  top: 24%;
  right: -90px;
  background: rgba(109, 127, 255, 0.2);
}

.orb3 {
  width: 240px;
  height: 240px;
  bottom: -50px;
  left: 18%;
  background: rgba(72, 222, 128, 0.12);
}

.glassy {
  background: rgba(14, 20, 38, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow:
    0 12px 40px rgba(0, 0, 0, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(18px);
}

.people-shell {
  position: relative;
  z-index: 2;
  max-width: 1080px;
  margin: 0 auto;
  border-radius: 28px;
  padding: 20px;
}

.people-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.title-wrap {
  display: flex;
  align-items: center;
  gap: 14px;
}

.title-wrap h1 {
  margin: 0;
  font-size: 28px;
  line-height: 1.05;
}

.title-wrap p {
  margin: 4px 0 0;
  color: #aeb7d8;
  font-size: 14px;
}

.back-btn,
.chip,
.mini-action {
  border: 0;
  outline: none;
  cursor: pointer;
  transition: transform 0.16s ease, opacity 0.16s ease, background 0.16s ease;
}

.back-btn,
.chip {
  border-radius: 14px;
  padding: 12px 16px;
  color: #eef2ff;
  background: rgba(255, 255, 255, 0.08);
}

.back-btn:hover,
.chip:hover,
.mini-action:hover {
  transform: translateY(-1px);
}

.chip.ghost {
  background: rgba(255, 255, 255, 0.05);
}

.top-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 14px;
  border-radius: 20px;
  margin-bottom: 16px;
}

.search-wrap {
  flex: 1;
}

.search {
  width: 100%;
  height: 48px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(8, 12, 24, 0.78);
  color: #f4f7ff;
  padding: 0 14px;
  font-size: 15px;
  outline: none;
  transition: border-color 0.2s;
}

.search:focus {
  border-color: rgba(102, 126, 234, 0.5);
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.status-pill,
.count-pill {
  height: 42px;
  padding: 0 14px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(255,255,255,0.06);
  color: #eaf0ff;
  font-size: 13px;
  font-weight: 700;
}

.status-pill .dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #ff637e;
  box-shadow: 0 0 14px rgba(255, 99, 126, 0.7);
}

.status-pill.on .dot {
  background: #3ee07f;
  box-shadow: 0 0 14px rgba(62, 224, 127, 0.7);
}

.error-card,
.empty-card {
  padding: 16px 18px;
  border-radius: 18px;
  margin-bottom: 16px;
}

.error-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #ffd7df;
  background: rgba(120, 15, 35, 0.28);
  border: 1px solid rgba(255, 102, 140, 0.3);
}

.error-close {
  background: none;
  border: none;
  color: #ffd7df;
  font-size: 20px;
  cursor: pointer;
}

.empty-card {
  color: #d7def6;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.06);
}

/* Skeleton Loading */
.skeleton-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.skeleton-row {
  display: flex;
  gap: 14px;
  align-items: center;
  padding: 16px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.04);
  animation: skeletonPulse 1.5s ease-in-out infinite;
}

@keyframes skeletonPulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.8; }
}

.skeleton-avatar {
  width: 60px;
  height: 60px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
}

.skeleton-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.skeleton-line {
  height: 12px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.1);
}

.skeleton-line.short {
  width: 30%;
}

.people-list {
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px;
}

.person-card {
  border-radius: 22px;
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  cursor: pointer;
  transition: all 0.2s;
  outline: none;
}

.person-card:hover,
.person-card:focus {
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-1px);
}

.person-card.online {
  border-color: rgba(52, 211, 108, 0.2);
}

.person-main {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 14px;
  flex: 1;
}

.avatar-wrap {
  position: relative;
  flex: 0 0 auto;
}

.avatar,
.avatar.fallback {
  width: 60px;
  height: 60px;
  border-radius: 18px;
  object-fit: cover;
}

.avatar.fallback {
  display: grid;
  place-items: center;
  font-weight: 800;
  font-size: 24px;
  color: white;
  background: linear-gradient(135deg, #ff5f7d, #6f7cff);
}

.presence {
  position: absolute;
  right: -2px;
  bottom: -2px;
  width: 14px;
  height: 14px;
  border-radius: 999px;
  border: 2px solid #0b1220;
  background: #64748b;
}

.presence.on {
  background: #31e074;
  box-shadow: 0 0 10px rgba(49, 224, 116, 0.75);
}

.meta {
  min-width: 0;
  flex: 1;
}

.name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.name-row h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 800;
}

.mini-id {
  color: #9aa5cc;
  font-size: 12px;
  font-weight: 700;
}

.sub-row {
  margin-top: 6px;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.presence-label {
  display: inline-flex;
  align-items: center;
  height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(255,255,255,0.06);
  color: #b2bedf;
  font-size: 12px;
  font-weight: 800;
}

.presence-label.on {
  background: rgba(52, 211, 108, 0.12);
  color: #8ef0ae;
}

.bio-line {
  color: #afbadb;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.person-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 0 0 auto;
}

.mini-action {
  width: 46px;
  height: 46px;
  border-radius: 14px;
  color: #eef2ff;
  background: rgba(255,255,255,0.07);
  font-size: 18px;
}

.mini-action:disabled {
  opacity: 0.38;
  cursor: not-allowed;
  transform: none;
}

/* Pagination */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  padding: 20px;
}

.pagination button {
  padding: 10px 20px;
  border-radius: 12px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-weight: 700;
  cursor: pointer;
}

.pagination button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

@media (max-width: 720px) {
  .people-page {
    padding: 14px;
  }

  .people-shell {
    padding: 14px;
    border-radius: 22px;
  }

  .people-top,
  .toolbar,
  .person-card {
    flex-direction: column;
    align-items: stretch;
  }

  .title-wrap {
    align-items: flex-start;
  }

  .top-actions,
  .toolbar-right,
  .person-actions {
    width: 100%;
  }

  .top-actions,
  .person-actions {
    justify-content: stretch;
  }

  .chip,
  .mini-action {
    flex: 1;
  }

  .person-main {
    width: 100%;
  }
}
</style>