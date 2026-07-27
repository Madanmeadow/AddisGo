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
            <div class="sub">{{ conversations.length }} conversations</div>
          </div>
        </div>

        <div class="top-actions">
          <button class="chip" @click="refreshAll">
            🔄 Refresh
          </button>
          <button class="chip ghost" @click="$router.push('/dashboard')">
            🏠 Dashboard
          </button>
        </div>
      </header>

      <!-- MAIN CHAT LAYOUT -->
      <main class="main">
        <div class="chatLayout">
          <!-- SIDEBAR: CONVERSATIONS -->
          <aside class="sidebar glassy">
            <div class="sidebarHead">
              <div class="panel-title">👥 Conversations</div>
              <div class="searchWrap">
                <input
                  v-model="search"
                  class="search"
                  placeholder="Search people…"
                />
                <button v-if="search" class="searchClear" @click="search = ''">✕</button>
              </div>
            </div>

            <div class="convList">
              <div
                v-if="!token"
                class="state mini"
              >
                <div class="state-sub">Login to see messages</div>
              </div>

              <div
                v-else-if="loadingConversations"
                class="state mini"
              >
                <div class="state-emoji">⏳</div>
                <div class="state-sub">Loading…</div>
              </div>

              <div
                v-else-if="filteredConversations.length === 0"
                class="state mini"
              >
                <div class="state-emoji">📭</div>
                <div class="state-title">No conversations</div>
                <div class="state-sub">Start chatting from the People tab.</div>
              </div>

              <button
                v-for="conv in filteredConversations"
                :key="conv.otherUserId"
                class="convItem"
                :class="{ active: activeOtherId === conv.otherUserId }"
                @click="openConversation(conv)"
              >
                <div class="convAvatar">
                  {{ conv.name?.[0]?.toUpperCase() || '?' }}
                </div>
                <div class="convMeta">
                  <div class="convName">{{ conv.name }}</div>
                  <div class="convPreview">{{ conv.lastMessage || 'No messages yet' }}</div>
                </div>
                <div
                  v-if="conv.unread"
                  class="convBadge"
                >
                  {{ conv.unread }}
                </div>
              </button>
            </div>
          </aside>

          <!-- CHAT AREA -->
          <section class="chatArea glassy">
            <!-- Empty State -->
            <div v-if="!activeOtherId" class="emptyChat">
              <div class="state-emoji" style="font-size: 48px;">💬</div>
              <div class="state-title">Select a conversation</div>
              <div class="state-sub">Choose someone from the sidebar to start messaging.</div>
            </div>

            <!-- Active Chat -->
            <template v-else>
              <!-- Chat Header -->
              <div class="chatHeader">
                <div class="chatHeaderLeft">
                  <div class="avatar">{{ activeName[0]?.toUpperCase() || '?' }}</div>
                  <div>
                    <div class="chatHeaderName">{{ activeName }}</div>
                    <div class="chatHeaderStatus">
                      <span class="statusDot" :class="{ on: isOnline(activeOtherId) }"></span>
                      {{ isOnline(activeOtherId) ? 'Online' : 'Offline' }}
                    </div>
                  </div>
                </div>
                <div class="chatHeaderActions">
                  <button class="iconbtn" title="Audio Call" :disabled="!isOnline(activeOtherId)" @click="callUser('audio')">📞</button>
                  <button class="iconbtn" title="Video Call" :disabled="!isOnline(activeOtherId)" @click="callUser('video')">🎥</button>
                  <button class="iconbtn" @click="activeOtherId = null">✕</button>
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
                  <div class="state-sub">Say hello to {{ activeName }}!</div>
                </div>

                <div
                  v-for="msg in messages"
                  :key="msg.id || msg._id || msg.created_at"
                  class="msgRow"
                  :class="{ me: isMe(msg) }"
                >
                  <div class="msgBubble">
                    <div class="msgText">{{ msg.text || msg.content || msg.message || '' }}</div>
                    <div class="msgTime">{{ formatDate(msg.created_at || msg.createdAt) }}</div>
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
                    :disabled="!text.trim() || sending"
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
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Layout from '../components/Layout.vue'

const route = useRoute()
const router = useRouter()
const apiUrl = (import.meta.env.VITE_API_URL || '').trim()
const token = localStorage.getItem('token') || ''

const me = (() => {
  try { return JSON.parse(localStorage.getItem('user') || 'null') } catch { return null }
})()

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
const messagesRef = ref(null)
const inputRef = ref(null)

/* =========================
   ONLINE STATUS (from socket if available, or polling)
========================= */
const onlineIds = ref(new Set())

function isOnline(userId) {
  return onlineIds.value.has(String(userId))
}

/* =========================
   CONVERSATIONS
========================= */
const conversations = ref([])

const filteredConversations = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return conversations.value
  return conversations.value.filter(c =>
    c.name?.toLowerCase().includes(q) ||
    String(c.otherUserId).includes(q)
  )
})

async function fetchConversations() {
  if (!token) return
  loadingConversations.value = true
  try {
    const res = await fetch(`${apiUrl}/messages/conversations`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) throw new Error('Failed')
    const data = await res.json()
    conversations.value = Array.isArray(data) ? data : []
  } catch {
    // Fallback: build from localStorage / people if API doesn't have conversations endpoint
    conversations.value = []
  } finally {
    loadingConversations.value = false
  }
}

function openConversation(conv) {
  activeOtherId.value = conv.otherUserId
  activeName.value = conv.name || `User #${conv.otherUserId}`
  error.value = ''
  fetchMessages()
  nextTick(() => inputRef.value?.focus())
}

/* =========================
   MESSAGES
========================= */
async function fetchMessages() {
  if (!token || !activeOtherId.value) return
  loadingMessages.value = true
  error.value = ''
  try {
    // FIX: use otherUserId (not userId) and full apiUrl
    const res = await fetch(
      `${apiUrl}/messages?otherUserId=${encodeURIComponent(activeOtherId.value)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data?.error || `HTTP ${res.status}`)
    }
    const data = await res.json()
    messages.value = Array.isArray(data) ? data : Array.isArray(data?.messages) ? data.messages : []
    nextTick(scrollToBottom)
  } catch (e) {
    error.value = e.message || 'Failed to load messages'
    messages.value = []
  } finally {
    loadingMessages.value = false
  }
}

async function send() {
  if (!text.value.trim() || !token || !activeOtherId.value) return
  sending.value = true
  error.value = ''
  try {
    const res = await fetch(`${apiUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        otherUserId: activeOtherId.value,
        text: text.value.trim()
      })
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data?.error || `HTTP ${res.status}`)
    }
    const saved = await res.json().catch(() => null)
    messages.value.push({
      ...(saved || {}),
      text: text.value.trim(),
      from: me?.id,
      created_at: new Date().toISOString()
    })
    text.value = ''
    nextTick(scrollToBottom)
    // Update conversation preview
    const conv = conversations.value.find(c => c.otherUserId === activeOtherId.value)
    if (conv) conv.lastMessage = 'You: ' + text.value
  } catch (e) {
    error.value = e.message || 'Send failed'
  } finally {
    sending.value = false
  }
}

/* =========================
   HELPERS
========================= */
function isMe(msg) {
  const fromId = msg.from || msg.fromUserId || msg.senderId || msg.user_id
  return String(fromId) === String(me?.id)
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

function callUser(kind) {
  if (!activeOtherId.value) return
  router.push({
    path: '/call',
    query: {
      toUserId: String(activeOtherId.value),
      name: activeName.value,
      kind
    }
  })
}

async function refreshAll() {
  await fetchConversations()
  if (activeOtherId.value) await fetchMessages()
}

/* =========================
   LIFECYCLE
========================= */
onMounted(() => {
  fetchConversations()
  // If routed with ?userId=, open that conversation
  const qUserId = route.query.userId || route.query.otherUserId
  const qName = route.query.name || route.query.username || 'User'
  if (qUserId) {
    activeOtherId.value = String(qUserId)
    activeName.value = qName
    fetchMessages()
  }
})

watch(activeOtherId, () => {
  if (activeOtherId.value) fetchMessages()
})
</script>

<style scoped>
/* ===== BASE WRAP (matches Dashboard) ===== */
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

.orb1 {
  width: 320px; height: 320px; left: -60px; top: 40px;
  background: radial-gradient(circle, rgba(236, 72, 153, 0.45), transparent 70%);
}
.orb2 {
  width: 360px; height: 360px; right: -80px; top: 180px;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.40), transparent 70%);
  animation-direction: reverse;
}
.orb3 {
  width: 260px; height: 260px; left: 35%; bottom: 60px;
  background: radial-gradient(circle, rgba(59, 130, 246, 0.30), transparent 70%);
  animation-duration: 16s;
}

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

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}

.logo {
  width: 44px; height: 44px; border-radius: 14px;
  display: grid; place-items: center;
  background: linear-gradient(135deg, #ec4899, #8b5cf6, #6366f1);
  border: 1px solid rgba(255,255,255,0.15);
  font-size: 22px;
  box-shadow: 0 8px 24px rgba(139, 92, 246, 0.25);
}

.title {
  font-weight: 900; font-size: 19px;
  background: linear-gradient(135deg, #fff, #c7d2fe);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
}

.sub {
  opacity: 0.55; font-size: 11px; font-weight: 500;
  text-transform: uppercase; letter-spacing: 0.04em;
}

.top-actions {
  display: flex; gap: 8px; flex-wrap: wrap;
}

.chip {
  border: none; border-radius: 999px; padding: 10px 16px;
  cursor: pointer; background: rgba(255,255,255,0.08);
  color: #e2e8f0; font-weight: 600; font-size: 13px;
  transition: all 0.2s ease;
}
.chip:hover {
  transform: translateY(-1px);
  background: rgba(255,255,255,0.14);
}
.chip.ghost {
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.08);
}

/* ===== MAIN ===== */
.main {
  position: relative; z-index: 2;
  max-width: 1100px; margin: 0 auto; padding: 20px;
}

.chatLayout {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 16px;
  height: calc(100vh - 100px);
  min-height: 500px;
}

/* ===== SIDEBAR ===== */
.sidebar {
  border-radius: 24px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebarHead {
  margin-bottom: 12px;
}

.panel-title {
  font-weight: 800; font-size: 15px;
  margin-bottom: 10px;
  display: flex; align-items: center; gap: 8px;
}

.searchWrap {
  position: relative;
}

.search {
  width: 100%;
  background: rgba(0,0,0,0.35);
  border: 1px solid rgba(255,255,255,0.08);
  color: #f1f5f9;
  padding: 10px 36px 10px 14px;
  border-radius: 999px;
  outline: none;
  font-size: 13px;
  transition: all 0.2s ease;
}
.search:focus {
  border-color: rgba(139, 92, 246, 0.4);
  box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
}

.searchClear {
  position: absolute; right: 8px; top: 50%;
  transform: translateY(-50%);
  border: none; background: rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.7);
  width: 24px; height: 24px; border-radius: 50%;
  cursor: pointer; font-size: 11px;
  display: grid; place-items: center;
}

.convList {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-right: 4px;
}

.convItem {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border-radius: 16px;
  border: 1px solid transparent;
  background: transparent;
  color: #e2e8f0;
  cursor: pointer;
  text-align: left;
  transition: all 0.18s ease;
  width: 100%;
}

.convItem:hover {
  background: rgba(255,255,255,0.05);
  border-color: rgba(255,255,255,0.08);
}

.convItem.active {
  background: rgba(139, 92, 246, 0.12);
  border-color: rgba(139, 92, 246, 0.25);
}

.convAvatar {
  width: 40px; height: 40px; border-radius: 14px;
  background: linear-gradient(135deg, rgba(139,92,246,0.3), rgba(236,72,153,0.2));
  border: 1px solid rgba(255,255,255,0.1);
  display: grid; place-items: center;
  font-weight: 800; font-size: 14px;
  flex-shrink: 0;
}

.convMeta {
  flex: 1; min-width: 0;
}

.convName {
  font-weight: 700; font-size: 13px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

.convPreview {
  font-size: 12px; opacity: 0.5;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  margin-top: 2px;
}

.convBadge {
  background: linear-gradient(135deg, #ec4899, #8b5cf6);
  color: #fff;
  font-size: 11px; font-weight: 800;
  min-width: 20px; height: 20px;
  border-radius: 999px;
  display: grid; place-items: center;
  padding: 0 6px;
  flex-shrink: 0;
}

/* ===== CHAT AREA ===== */
.chatArea {
  border-radius: 24px;
  padding: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.emptyChat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 40px;
}

.chatHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  background: rgba(0,0,0,0.15);
}

.chatHeaderLeft {
  display: flex; align-items: center; gap: 12px;
}

.chatHeaderName {
  font-weight: 800; font-size: 15px;
}

.chatHeaderStatus {
  font-size: 12px; opacity: 0.6;
  display: flex; align-items: center; gap: 6px;
  margin-top: 2px;
}

.statusDot {
  width: 8px; height: 8px; border-radius: 50%;
  background: rgba(255,255,255,0.3);
}
.statusDot.on {
  background: #22c55e;
  box-shadow: 0 0 8px rgba(34,197,94,0.4);
}

.chatHeaderActions {
  display: flex; gap: 6px;
}

.iconbtn {
  width: 36px; height: 36px; border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.06);
  color: #e2e8f0;
  cursor: pointer;
  display: grid; place-items: center;
  font-size: 14px;
  transition: all 0.2s ease;
}
.iconbtn:hover:not(:disabled) {
  background: rgba(255,255,255,0.12);
  transform: translateY(-1px);
}
.iconbtn:disabled {
  opacity: 0.35; cursor: not-allowed;
}

/* ===== MESSAGES ===== */
.messagesWrap {
  flex: 1;
  overflow-y: auto;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,0.1) transparent;
}

.msgRow {
  display: flex;
  width: 100%;
}

.msgRow.me {
  justify-content: flex-end;
}

.msgBubble {
  max-width: 70%;
  padding: 10px 14px;
  border-radius: 18px;
  font-size: 14px;
  line-height: 1.5;
  word-break: break-word;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.08);
  color: #e2e8f0;
}

.msgRow.me .msgBubble {
  background: linear-gradient(135deg, rgba(236,72,153,0.25), rgba(139,92,246,0.2));
  border-color: rgba(139,92,246,0.25);
  color: #fff;
}

.msgTime {
  font-size: 10px;
  opacity: 0.45;
  margin-top: 4px;
  text-align: right;
}

/* ===== INPUT ===== */
.chatInputArea {
  padding: 14px 18px;
  border-top: 1px solid rgba(255,255,255,0.06);
  background: rgba(0,0,0,0.15);
}

.inputRow {
  display: flex;
  gap: 10px;
  align-items: center;
}

.chatInput {
  flex: 1;
  background: rgba(0,0,0,0.35);
  border: 1px solid rgba(255,255,255,0.08);
  color: #f1f5f9;
  padding: 12px 16px;
  border-radius: 999px;
  outline: none;
  font-size: 14px;
  transition: all 0.2s ease;
  font-family: inherit;
}
.chatInput:focus {
  border-color: rgba(139, 92, 246, 0.4);
  box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
}

.sendBtn {
  width: 44px; height: 44px;
  border-radius: 50%;
  padding: 0;
  display: grid; place-items: center;
  font-size: 18px;
}

/* ===== STATES ===== */
.state {
  text-align: center;
  padding: 32px 20px;
  opacity: 0.9;
}
.state.mini {
  padding: 20px 10px;
}
.state-emoji {
  font-size: 32px;
  margin-bottom: 8px;
}
.state-title {
  font-weight: 800;
  font-size: 16px;
}
.state-sub {
  opacity: 0.55;
  margin-top: 4px;
  font-size: 13px;
}

.alert {
  padding: 10px 14px;
  border-radius: 12px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  color: #fca5a5;
  font-size: 13px;
  margin-bottom: 10px;
}

.avatar {
  width: 40px; height: 40px; border-radius: 50%;
  background: linear-gradient(135deg, #ec4899, #8b5cf6);
  display: grid; place-items: center;
  font-weight: 800; font-size: 15px;
  flex-shrink: 0;
}

/* ===== RESPONSIVE ===== */
@media (max-width: 900px) {
  .chatLayout {
    grid-template-columns: 1fr;
    height: auto;
    min-height: calc(100vh - 100px);
  }
  .sidebar {
    max-height: 260px;
  }
  .messagesWrap {
    min-height: 400px;
  }
}
</style>