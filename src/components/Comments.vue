<template>
  <section class="comments">
    <header class="head">
      <div class="head-left">
        <h4 class="title">Comments <span class="count">({{ items.length }})</span></h4>
        <div class="sub">{{ loading ? "Syncing..." : "Join the conversation" }}</div>
      </div>

      <div class="head-actions">
        <button class="btn ghost" @click="refresh" :disabled="loading">
          {{ loading ? "Loading..." : "Refresh" }}
        </button>
      </div>
    </header>

    <div v-if="error" class="alert">{{ error }}</div>

    <div v-if="loading && items.length === 0" class="state">Loading comments...</div>

    <div v-else class="list">
      <div v-if="items.length === 0" class="empty">
        <div class="empty-icon">💬</div>
        <div class="empty-title">No comments yet</div>
        <div class="empty-sub">Be the first to say something.</div>
      </div>

      <article
        v-for="c in items"
        :key="c.id"
        class="item"
        :class="{ optimistic: c._optimistic }"
      >
        <div class="avatar">
          {{ getInitial(c) }}
        </div>

        <div class="bubble">
          <div class="meta">
            <div class="meta-left">
              <span class="who">{{ getDisplayName(c) }}</span>
              <span v-if="isMine(c)" class="mine-tag">You</span>
              <span v-if="c._optimistic" class="sending-tag">Sending...</span>
            </div>
            <span class="time">{{ formatDate(c.created_at) }}</span>
          </div>

          <div class="text">{{ c.body }}</div>

          <div class="row-actions">
            <button
              v-if="canDelete(c)"
              class="text-btn danger"
              :disabled="busyDeleteId === c.id"
              @click="remove(c)"
              title="Delete your comment"
            >
              {{ busyDeleteId === c.id ? "Deleting..." : "Delete" }}
            </button>
          </div>
        </div>
      </article>
    </div>

    <footer class="compose">
      <div class="compose-box">
        <input
          v-model="draft"
          class="input"
          maxlength="500"
          placeholder="Write a comment..."
          @keydown.enter.prevent="send"
        />
        <button
          class="btn primary send-btn"
          :disabled="sending || !draft.trim()"
          @click="send"
        >
          {{ sending ? "Sending..." : "Send" }}
        </button>
      </div>

      <div class="compose-meta">
        <span>{{ draft.trim().length }}/500</span>
      </div>
    </footer>
  </section>
</template>

<script setup>
import { ref, onMounted, computed, watch, onBeforeUnmount } from "vue"

const props = defineProps({
  postId: { type: [Number, String], required: true },
})

const emit = defineEmits(["changed"])

const apiUrl =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_SERVER_URL ||
  "http://localhost:5000"

const token = localStorage.getItem("token") || ""

const me = (() => {
  try {
    return JSON.parse(localStorage.getItem("user") || "null")
  } catch {
    return null
  }
})()

const items = ref([])
const draft = ref("")
const loading = ref(false)
const sending = ref(false)
const error = ref("")
const busyDeleteId = ref(null)
let refreshTimer = null

const postIdNum = computed(() => Number(props.postId))

function authHeaders(json = false) {
  const h = {}
  if (json) h["Content-Type"] = "application/json"
  if (token) h["Authorization"] = `Bearer ${token}`
  return h
}

function formatDate(d) {
  if (!d) return "Now"
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return "Now"

  const diffMs = Date.now() - dt.getTime()
  const sec = Math.floor(diffMs / 1000)
  const min = Math.floor(sec / 60)
  const hr = Math.floor(min / 60)
  const day = Math.floor(hr / 24)

  if (sec < 10) return "Just now"
  if (sec < 60) return `${sec}s ago`
  if (min < 60) return `${min}m ago`
  if (hr < 24) return `${hr}h ago`
  if (day < 7) return `${day}d ago`

  return dt.toLocaleString()
}

function getDisplayName(c) {
  return c.username || c.name || c.display_name || c.email || `User #${c.user_id}`
}

function getInitial(c) {
  const name = getDisplayName(c)
  return String(name).trim().charAt(0).toUpperCase() || "U"
}

function isMine(c) {
  return !!me?.id && Number(c.user_id) === Number(me.id)
}

function canDelete(c) {
  return isMine(c)
}

function normalizeComment(c = {}) {
  return {
    id: c.id,
    post_id: c.post_id,
    user_id: c.user_id,
    username: c.username || c.name || c.display_name || "",
    body: c.body || "",
    created_at: c.created_at || new Date().toISOString(),
    _optimistic: !!c._optimistic,
  }
}

function setComments(list = []) {
  items.value = list
    .map(normalizeComment)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
}

async function refresh({ silent = false } = {}) {
  if (!postIdNum.value) return
  if (!silent) loading.value = true
  error.value = ""

  try {
    const res = await fetch(`${apiUrl}/posts/${postIdNum.value}/comments`, {
      headers: authHeaders(false),
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      if (!silent) {
        items.value = []
        error.value = data?.error || "Failed to load comments"
      }
      return
    }

    const nextItems = Array.isArray(data) ? data : (data.items || [])
    setComments(nextItems)
  } catch {
    if (!silent) {
      items.value = []
      error.value = "Failed to load comments"
    }
  } finally {
    if (!silent) loading.value = false
  }
}

async function send() {
  const text = String(draft.value || "").trim()
  if (!text || !postIdNum.value) return

  if (!token) {
    error.value = "Please login again to comment."
    return
  }

  sending.value = true
  error.value = ""

  const tempId = `tmp-${Date.now()}`
  const optimistic = normalizeComment({
    id: tempId,
    post_id: postIdNum.value,
    user_id: me?.id || 0,
    username: me?.display_name || me?.username || "You",
    body: text,
    created_at: new Date().toISOString(),
    _optimistic: true,
  })

  items.value = [optimistic, ...items.value]
  draft.value = ""

  try {
    const res = await fetch(`${apiUrl}/posts/${postIdNum.value}/comments`, {
      method: "POST",
      headers: authHeaders(true),
      body: JSON.stringify({ body: text }),
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      items.value = items.value.filter((c) => c.id !== tempId)
      error.value = data?.error || "Failed to send comment"
      return
    }

    const saved = normalizeComment(data)
    items.value = items.value.map((c) => (c.id === tempId ? saved : c))
    setComments(items.value)
    emit("changed")
  } catch {
    items.value = items.value.filter((c) => c.id !== tempId)
    error.value = "Failed to send comment"
  } finally {
    sending.value = false
  }
}

async function remove(c) {
  if (!token || !c?.id) return

  busyDeleteId.value = c.id
  error.value = ""

  const prev = [...items.value]
  items.value = items.value.filter((x) => x.id !== c.id)

  try {
    const res = await fetch(`${apiUrl}/posts/${postIdNum.value}/comments/${c.id}`, {
      method: "DELETE",
      headers: authHeaders(false),
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      items.value = prev
      error.value = data?.error || "Delete failed"
      return
    }

    emit("changed")
  } catch {
    items.value = prev
    error.value = "Delete failed"
  } finally {
    busyDeleteId.value = null
  }
}

function startAutoRefresh() {
  stopAutoRefresh()
  refreshTimer = setInterval(() => {
    if (!sending.value && !busyDeleteId.value) {
      refresh({ silent: true })
    }
  }, 12000)
}

function stopAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

watch(
  () => props.postId,
  async () => {
    await refresh()
    startAutoRefresh()
  }
)

onMounted(async () => {
  await refresh()
  startAutoRefresh()
})

onBeforeUnmount(() => {
  stopAutoRefresh()
})
</script>

<style scoped>
.comments {
  margin-top: 12px;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 18px;
  padding: 14px;
  backdrop-filter: blur(12px);
}

.head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.head-left {
  min-width: 0;
}

.title {
  margin: 0;
  font-weight: 900;
  font-size: 16px;
}

.count {
  opacity: 0.8;
  font-weight: 800;
}

.sub {
  margin-top: 4px;
  font-size: 12px;
  opacity: 0.7;
}

.head-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.state,
.empty {
  opacity: 0.9;
  padding: 16px 0;
}

.empty {
  text-align: center;
}

.empty-icon {
  font-size: 28px;
  margin-bottom: 6px;
}

.empty-title {
  font-weight: 900;
  font-size: 15px;
}

.empty-sub {
  opacity: 0.72;
  margin-top: 4px;
  font-size: 13px;
}

.alert {
  margin: 10px 0 12px;
  padding: 10px 12px;
  border-radius: 14px;
  background: rgba(255, 80, 80, 0.18);
  border: 1px solid rgba(255, 80, 80, 0.35);
  font-size: 13px;
}

.list {
  display: grid;
  gap: 12px;
  max-height: 340px;
  overflow: auto;
  padding-right: 4px;
}

.item {
  display: grid;
  grid-template-columns: 42px 1fr;
  gap: 10px;
  align-items: start;
}

.item.optimistic {
  opacity: 0.78;
}

.avatar {
  width: 42px;
  height: 42px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  font-size: 14px;
  font-weight: 900;
  background: linear-gradient(135deg, #ff5478, #617bff);
  color: #fff;
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.18);
}

.bubble {
  padding: 12px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.10);
}

.meta {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
  align-items: center;
}

.meta-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex-wrap: wrap;
}

.who {
  font-weight: 900;
  font-size: 13px;
  opacity: 0.98;
}

.mine-tag,
.sending-tag {
  font-size: 11px;
  font-weight: 800;
  padding: 4px 8px;
  border-radius: 999px;
}

.mine-tag {
  background: rgba(90, 160, 255, 0.18);
  border: 1px solid rgba(90, 160, 255, 0.28);
}

.sending-tag {
  background: rgba(255, 180, 60, 0.18);
  border: 1px solid rgba(255, 180, 60, 0.28);
}

.time {
  font-size: 12px;
  opacity: 0.72;
  white-space: nowrap;
}

.text {
  line-height: 1.5;
  font-size: 14px;
  word-break: break-word;
}

.row-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}

.compose {
  margin-top: 12px;
}

.compose-box {
  display: flex;
  gap: 8px;
}

.compose-meta {
  margin-top: 8px;
  font-size: 12px;
  opacity: 0.65;
  text-align: right;
}

.input {
  flex: 1;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: white;
  padding: 12px 14px;
  border-radius: 14px;
  outline: none;
  font-size: 14px;
}

.input:focus {
  border-color: rgba(255, 90, 120, 0.45);
  box-shadow: 0 0 0 3px rgba(255, 90, 120, 0.12);
}

.btn {
  border: none;
  border-radius: 999px;
  padding: 10px 14px;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.12);
  color: white;
  font-weight: 800;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn.primary {
  background: linear-gradient(45deg, #ff416c, #ff4b2b);
}

.btn.ghost {
  opacity: 0.95;
}

.send-btn {
  min-width: 86px;
}

.text-btn {
  border: 0;
  background: transparent;
  color: white;
  cursor: pointer;
  font-weight: 800;
  font-size: 12px;
  opacity: 0.86;
}

.text-btn.danger {
  color: #ff8d8d;
}

@media (max-width: 640px) {
  .comments {
    padding: 12px;
    border-radius: 16px;
  }

  .compose-box {
    align-items: stretch;
  }

  .send-btn {
    min-width: 78px;
  }

  .item {
    grid-template-columns: 38px 1fr;
  }

  .avatar {
    width: 38px;
    height: 38px;
  }
}
</style>