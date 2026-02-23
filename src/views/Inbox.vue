<template>
  <Layout>
    <div class="wrap">
      <aside class="list">
        <div class="head">
          <h2>Inbox</h2>
          <button class="btn" @click="loadUsers">+ New</button>
        </div>

        <div v-if="showUsers" class="panel">
          <div class="panelTitle">Start a chat</div>
          <button
            v-for="u in users"
            :key="u.id"
            class="item"
            @click="startChat(u.id)"
          >
            {{ u.display_name }} (#{{
              u.id
            }})
          </button>
        </div>

        <div class="panel">
          <div class="panelTitle">Conversations</div>

          <button
            v-for="c in conversations"
            :key="c.id"
            class="item"
            :class="{ active: c.id === activeConvId }"
            @click="openConversation(c.id)"
          >
            <div class="title">{{ c.title || "Conversation " + c.id }}</div>
            <div class="sub">
              <span class="last">{{ c.last_text || "No messages yet" }}</span>
              <span class="time">{{ c.last_time ? new Date(c.last_time).toLocaleString() : "" }}</span>
            </div>
          </button>
        </div>
      </aside>

      <main class="chat">
        <div class="chatHead">
          <div class="chatTitle">
            {{ activeConvId ? "Conversation #" + activeConvId : "Select a conversation" }}
          </div>
        </div>

        <div class="msgs" ref="msgsEl">
          <div v-if="!activeConvId" class="empty">
            Pick a conversation on the left 👈
          </div>

          <div
            v-for="m in messages"
            :key="m.id"
            class="msg"
            :class="{ mine: m.sender_id === me?.id }"
          >
            <div class="bubble">
              <div class="text">{{ m.text }}</div>
              <div class="meta">{{ new Date(m.created_at).toLocaleString() }}</div>
            </div>
          </div>
        </div>

        <div class="composer" v-if="activeConvId">
          <input
            v-model="text"
            placeholder="Type a message..."
            @keydown.enter.prevent="send"
          />
          <button class="btn primary" @click="send">Send</button>
        </div>
      </main>
    </div>
  </Layout>
</template>

<script setup>
import { ref, onMounted, nextTick } from "vue"
import Layout from "../components/Layout.vue"
import { io } from "socket.io-client"

const apiUrl = import.meta.env.VITE_API_URL
const token = localStorage.getItem("token")
const me = (() => {
  try { return JSON.parse(localStorage.getItem("user") || "null") } catch { return null }
})()

const conversations = ref([])
const users = ref([])
const showUsers = ref(false)

const activeConvId = ref(null)
const messages = ref([])
const text = ref("")
const msgsEl = ref(null)

let socket = null

async function loadConversations() {
  const res = await fetch(`${apiUrl}/conversations`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  conversations.value = await res.json()
}

async function loadUsers() {
  showUsers.value = !showUsers.value
  if (!showUsers.value) return
  const res = await fetch(`${apiUrl}/users`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  users.value = await res.json()
}

async function startChat(otherUserId) {
  const res = await fetch(`${apiUrl}/conversations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ otherUserId })
  })
  const data = await res.json()
  showUsers.value = false
  await loadConversations()
  await openConversation(data.id)
}

async function openConversation(id) {
  activeConvId.value = id
  socket?.emit("join-conversation", id)

  const res = await fetch(`${apiUrl}/messages/${id}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  messages.value = await res.json()
  await scrollBottom()
}

async function send() {
  if (!text.value.trim() || !activeConvId.value) return

  socket.emit("send-message", {
    conversationId: activeConvId.value,
    senderId: me?.id,
    text: text.value
  })

  text.value = ""
}

async function scrollBottom() {
  await nextTick()
  if (msgsEl.value) msgsEl.value.scrollTop = msgsEl.value.scrollHeight
}

onMounted(async () => {
  await loadConversations()

  socket = io(apiUrl, { transports: ["websocket", "polling"] })
  socket.on("connect", () => {
    if (me?.id) socket.emit("register-user", me.id)
  })

  socket.on("receive-message", async (m) => {
    if (Number(m.conversation_id) === Number(activeConvId.value)) {
      messages.value.push(m)
      await scrollBottom()
    }
    // refresh conversation list previews
    await loadConversations()
  })
})
</script>

<style scoped>
.wrap{display:grid;grid-template-columns:360px 1fr;gap:16px;max-width:1200px;margin:0 auto;padding:18px}
@media(max-width:900px){.wrap{grid-template-columns:1fr}}
.list,.chat{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);border-radius:18px;backdrop-filter:blur(10px)}
.list{padding:14px}
.head{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
.panel{margin-top:12px;background:rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.10);border-radius:14px;padding:10px}
.panelTitle{font-weight:900;margin-bottom:8px}
.item{width:100%;text-align:left;background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.12);color:#fff;padding:10px;border-radius:12px;margin-bottom:8px;cursor:pointer}
.item.active{border-color:rgba(255,80,80,.6)}
.title{font-weight:800}
.sub{display:flex;justify-content:space-between;gap:10px;font-size:12px;opacity:.8}
.last{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:210px}
.chat{display:flex;flex-direction:column;min-height:70vh}
.chatHead{padding:14px;border-bottom:1px solid rgba(255,255,255,.10)}
.chatTitle{font-weight:900}
.msgs{flex:1;overflow:auto;padding:14px;display:flex;flex-direction:column;gap:10px}
.empty{opacity:.7}
.msg{display:flex}
.msg.mine{justify-content:flex-end}
.bubble{max-width:75%;background:rgba(0,0,0,.45);border:1px solid rgba(255,255,255,.10);border-radius:14px;padding:10px}
.msg.mine .bubble{background:rgba(255,65,108,.18);border-color:rgba(255,65,108,.25)}
.meta{font-size:11px;opacity:.75;margin-top:6px}
.composer{display:flex;gap:10px;padding:12px;border-top:1px solid rgba(255,255,255,.10)}
.composer input{flex:1;background:rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.12);color:#fff;border-radius:12px;padding:10px;outline:none}
.btn{border:none;border-radius:999px;padding:10px 14px;background:rgba(255,255,255,.12);color:#fff;cursor:pointer}
.btn.primary{background:linear-gradient(45deg,#ff416c,#ff4b2b)}
</style>