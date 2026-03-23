<template>
  <Layout>
    <div class="messages-page">
      <div class="topbar">
        <button class="back" @click="router.back()">← Back</button>

        <div class="titleWrap">
          <div class="title">{{ chatName }}</div>
          <div class="sub">Direct messages</div>
        </div>

        <button class="ghostBtn" @click="reloadMessages" :disabled="loadingHistory">
          {{ loadingHistory ? "..." : "↻" }}
        </button>
      </div>

      <div v-if="error" class="alert">{{ error }}</div>

      <div ref="listEl" class="messages-list">
        <div v-if="loadingHistory" class="state">
          Loading messages...
        </div>

        <div v-else-if="messages.length === 0" class="state">
          No messages yet. Say hi 👋
        </div>

        <div
          v-for="msg in messages"
          :key="msg.localKey"
          class="bubble-wrap"
          :class="{ me: String(msg.senderId) === myUserId }"
        >
          <div class="bubble">
            <div class="from">
              {{ String(msg.senderId) === myUserId ? "You" : (msg.from || chatName) }}
            </div>
            <div class="text">{{ msg.text }}</div>
            <div class="time">{{ formatTime(msg.createdAt) }}</div>
          </div>
        </div>
      </div>

      <form class="composer" @submit.prevent="sendMessage">
        <input
          v-model="text"
          type="text"
          placeholder="Write a message..."
          :disabled="sending || creatingConversation"
        />
        <button type="submit" :disabled="sending || creatingConversation || !text.trim()">
          {{ sending ? "Sending..." : "Send" }}
        </button>
      </form>
    </div>
  </Layout>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import Layout from "../components/Layout.vue";
import socket, { refreshSocketAuth } from "../socket";

const route = useRoute();
const router = useRouter();

const API_URL = (import.meta.env.VITE_API_URL || "https://addisgo-production-63ae.up.railway.app").replace(/\/$/, "");
const token = localStorage.getItem("token") || "";

const me = (() => {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
})();

const myUserId = String(me?.id || "");
const otherUserId = ref(String(route.query.userId || ""));
const chatName = ref(route.query.name || `User ${otherUserId.value || ""}`);

const conversationId = ref(route.query.conversationId ? String(route.query.conversationId) : "");
const roomId = ref("");

const text = ref("");
const messages = ref([]);
const listEl = ref(null);
const error = ref("");
const loadingHistory = ref(false);
const creatingConversation = ref(false);
const sending = ref(false);

function authHeaders() {
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function apiGet(path) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: authHeaders(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || "Request failed");
  }
  return data;
}

async function apiPost(path, body) {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || "Request failed");
  }
  return data;
}

function buildRoomId() {
  if (!myUserId || !otherUserId.value) return "";
  return [myUserId, otherUserId.value].sort().join("-");
}

function normalizeDbMessage(msg) {
  return {
    localKey: `db-${msg.id}-${msg.created_at || Date.now()}`,
    id: msg.id,
    room: roomId.value,
    from: msg.sender_name || msg.from || "User",
    senderId: String(msg.sender_id),
    text: msg.text || "",
    createdAt: msg.created_at || new Date().toISOString(),
  };
}

function normalizeSocketMessage(payload) {
  return {
    localKey: `sock-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    room: payload?.room || roomId.value,
    from: payload?.from || "User",
    senderId:
      payload?.senderId
        ? String(payload.senderId)
        : payload?.from === (me?.username || "You")
          ? myUserId
          : otherUserId.value,
    text: payload?.text || "",
    createdAt: payload?.createdAt || payload?.created_at || new Date().toISOString(),
  };
}

function formatTime(v) {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function scrollBottom() {
  nextTick(() => {
    if (listEl.value) {
      listEl.value.scrollTop = listEl.value.scrollHeight;
    }
  });
}

async function ensureConversation() {
  if (conversationId.value) return conversationId.value;
  if (!myUserId || !otherUserId.value) {
    throw new Error("Missing user info for conversation");
  }

  creatingConversation.value = true;
  error.value = "";

  try {
    // Your pasted conversations router can end up mounted as /conversations/conversations
    // depending on server/index.js. We try that first, then fallback.
    let data;
    try {
      data = await apiPost("/conversations/conversations", {
        userId1: myUserId,
        userId2: otherUserId.value,
      });
    } catch {
      data = await apiPost("/conversations", {
        userId1: myUserId,
        userId2: otherUserId.value,
      });
    }

    conversationId.value = String(data?.id || "");
    return conversationId.value;
  } finally {
    creatingConversation.value = false;
  }
}

async function loadMessages() {
  if (!conversationId.value) return;

  loadingHistory.value = true;
  error.value = "";

  try {
    const data = await apiGet(`/messages?conversationId=${encodeURIComponent(conversationId.value)}`);
    messages.value = Array.isArray(data) ? data.map(normalizeDbMessage) : [];
    scrollBottom();
  } catch (e) {
    error.value = e?.message || "Failed to load messages";
  } finally {
    loadingHistory.value = false;
  }
}

async function reloadMessages() {
  await loadMessages();
}

async function sendMessage() {
  const value = text.value.trim();
  if (!value || !myUserId) return;

  sending.value = true;
  error.value = "";

  try {
    const convoId = await ensureConversation();

    const saved = await apiPost("/messages", {
      conversationId: convoId,
      senderId: myUserId,
      text: value,
    });

    const mine = {
      localKey: `local-${saved.id}-${Date.now()}`,
      id: saved.id,
      room: roomId.value,
      from: saved.sender_name || me?.username || "You",
      senderId: String(saved.sender_id || myUserId),
      text: saved.text || value,
      createdAt: saved.created_at || new Date().toISOString(),
    };

    messages.value.push(mine);

    socket.emit("send-message", {
      room: roomId.value,
      from: me?.username || "You",
      senderId: myUserId,
      text: value,
      conversationId: convoId,
      createdAt: mine.createdAt,
    });

    text.value = "";
    scrollBottom();
  } catch (e) {
    error.value = e?.message || "Failed to send message";
  } finally {
    sending.value = false;
  }
}

function onReceiveMessage(payload) {
  const incoming = normalizeSocketMessage(payload);
  if (!incoming.text) return;
  if (incoming.room !== roomId.value) return;

  // prevent double message when our own socket echo comes back
  const isMine = String(incoming.senderId) === myUserId;
  if (isMine) return;

  messages.value.push(incoming);
  scrollBottom();
}

onMounted(async () => {
  roomId.value = buildRoomId();

  try {
    await ensureConversation();
  } catch {
    // allow chat page to stay open if only socket room is used
  }

  refreshSocketAuth();

  if (roomId.value) {
    socket.emit("join-room", roomId.value);
  }

  socket.on("receive-message", onReceiveMessage);

  if (conversationId.value) {
    await loadMessages();
  }
});

onBeforeUnmount(() => {
  socket.off("receive-message", onReceiveMessage);
});
</script>

<style scoped>
.messages-page {
  min-height: 100vh;
  background: #0b1220;
  color: white;
  display: flex;
  flex-direction: column;
}
.topbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  position: sticky;
  top: 0;
  background: rgba(11, 18, 32, 0.92);
  backdrop-filter: blur(12px);
  z-index: 2;
}
.back,
.ghostBtn {
  border: none;
  border-radius: 12px;
  padding: 10px 12px;
  cursor: pointer;
}
.back {
  background: rgba(255,255,255,0.1);
  color: white;
}
.ghostBtn {
  margin-left: auto;
  background: rgba(255,255,255,0.08);
  color: white;
}
.titleWrap {
  min-width: 0;
}
.title {
  font-weight: 900;
  font-size: 1rem;
}
.sub {
  opacity: 0.7;
  font-size: 0.86rem;
}
.alert {
  margin: 12px 16px 0;
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(255, 80, 80, 0.12);
  border: 1px solid rgba(255, 80, 80, 0.35);
}
.messages-list {
  flex: 1;
  overflow: auto;
  padding: 16px;
}
.state {
  padding: 16px;
  border-radius: 14px;
  background: rgba(255,255,255,0.08);
}
.bubble-wrap {
  display: flex;
  margin-bottom: 10px;
}
.bubble-wrap.me {
  justify-content: flex-end;
}
.bubble {
  max-width: 78%;
  padding: 12px 14px;
  border-radius: 18px;
  background: rgba(255,255,255,0.08);
}
.bubble-wrap.me .bubble {
  background: #2563eb;
}
.from {
  font-size: 0.8rem;
  opacity: 0.75;
  margin-bottom: 4px;
  font-weight: 700;
}
.text {
  word-break: break-word;
}
.time {
  margin-top: 6px;
  font-size: 11px;
  opacity: 0.72;
}
.composer {
  display: flex;
  gap: 10px;
  padding: 14px;
  border-top: 1px solid rgba(255,255,255,0.08);
  background: rgba(11, 18, 32, 0.96);
  position: sticky;
  bottom: 0;
}
.composer input {
  flex: 1;
  padding: 14px;
  border-radius: 14px;
  border: none;
  outline: none;
}
.composer button {
  border: none;
  padding: 0 18px;
  border-radius: 14px;
  background: #22c55e;
  color: white;
  font-weight: 800;
  cursor: pointer;
}
.composer button:disabled {
  opacity: 0.6;
  cursor: default;
}
@media (max-width: 640px) {
  .messages-list {
    padding: 12px;
  }
  .bubble {
    max-width: 86%;
  }
  .composer {
    padding: 12px;
  }
}
</style>