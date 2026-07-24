<template>
  <Layout>
    <div class="chat-page">
      <!-- Header -->
      <div class="chat-header">
        <button class="back-btn" @click="router.back()">←</button>
        <div class="header-info">
          <div class="chat-name">{{ chatName }}</div>
          <div class="chat-status">
            <span class="status-dot" :class="{ online: socketConnected }"></span>
            {{ socketConnected ? 'Online' : 'Connecting...' }}
            <span v-if="otherUserTyping" class="typing-indicator"> • typing...</span>
          </div>
        </div>
      </div>

      <!-- Error Banner -->
      <div v-if="error" class="error-banner">
        {{ error }}
        <button class="close-error" @click="error = ''">×</button>
      </div>

      <!-- Messages -->
      <div ref="listEl" class="messages" @scroll="onScroll">
        <div v-if="loadingHistory" class="loading-more">
          <span>Loading history...</span>
        </div>

        <div v-if="messages.length === 0 && !loadingHistory" class="empty-state">
          <div class="empty-icon">💬</div>
          <div>No messages yet</div>
          <div class="empty-sub">Say hi to start the conversation!</div>
        </div>

        <div
          v-for="(msg, index) in messages"
          :key="msg.localKey"
          :class="['message-row', isMyMessage(msg) ? 'my-row' : 'their-row']"
        >
          <div class="message-bubble">
            <div class="message-text">{{ msg.text }}</div>
            <div class="message-meta">
              <span class="sender">{{ msg.from }}</span>
              <span class="time">{{ formatTime(msg.createdAt) }}</span>
              <span v-if="isMyMessage(msg) && msg.id && !msg.id.toString().startsWith('local-')" class="read-status">
                {{ msg.read ? '✓✓' : '✓' }}
              </span>
            </div>
          </div>
        </div>

        <div ref="messagesEnd" class="messages-end"></div>
      </div>

      <!-- Input -->
      <div class="input-area">
        <div v-if="sending" class="sending-overlay">Sending...</div>
        <input
          v-model="text"
          placeholder="Type a message..."
          :disabled="sending || !socketConnected"
          @keydown.enter="sendMessage"
          @input="onTyping"
        />
        <button
          @click="sendMessage"
          :disabled="!text.trim() || sending || !socketConnected"
        >
          {{ sending ? '...' : 'Send' }}
        </button>
      </div>
    </div>
  </Layout>
</template>

<script setup>
import {
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
  computed,
} from "vue";
import { useRoute, useRouter } from "vue-router";
import Layout from "../components/Layout.vue";
import socket, { refreshSocketAuth, ensurePulseSocket } from "../socket";

const route = useRoute();
const router = useRouter();

const API_URL = (
  import.meta.env.VITE_API_URL ||
  "https://addisgo-production-63ae.up.railway.app"
).replace(/\/$/, "");

// Abort controllers for pending requests
const abortControllers = new Set();

function getToken() {
  return localStorage.getItem("token") || "";
}

function getMe() {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
}

// State
const me = ref(getMe());
const myUserId = ref(String(me.value?.id || "").trim());
const otherUserId = ref(String(route.query.userId || "").trim());
const chatName = ref(route.query.name || `User ${otherUserId.value || ""}`);

const conversationId = ref(
  route.query.conversationId ? String(route.query.conversationId) : ""
);

const roomId = ref("");
const text = ref("");
const messages = ref([]);
const listEl = ref(null);
const messagesEnd = ref(null);
const error = ref("");
const loadingHistory = ref(false);
const creatingConversation = ref(false);
const sending = ref(false);
const socketConnected = ref(socket.connected);
const otherUserTyping = ref(false);
const shouldScrollToBottom = ref(true);

// Pagination
const hasMoreMessages = ref(true);
const oldestMessageId = ref(null);

function authHeaders() {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function createAbortController() {
  const controller = new AbortController();
  abortControllers.add(controller);
  return controller;
}

function cleanupAbortControllers() {
  for (const controller of abortControllers) {
    controller.abort();
  }
  abortControllers.clear();
}

async function apiGet(path, options = {}) {
  const controller = createAbortController();
  try {
    const res = await fetch(`${API_URL}${path}`, {
      headers: authHeaders(),
      signal: controller.signal,
      ...options,
    });
    abortControllers.delete(controller);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || "Request failed");
    return data;
  } catch (err) {
    abortControllers.delete(controller);
    if (err.name === "AbortError") throw new Error("Request cancelled");
    throw err;
  }
}

async function apiPost(path, body, options = {}) {
  const controller = createAbortController();
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(body),
      signal: controller.signal,
      ...options,
    });
    abortControllers.delete(controller);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || "Request failed");
    return data;
  } catch (err) {
    abortControllers.delete(controller);
    if (err.name === "AbortError") throw new Error("Request cancelled");
    throw err;
  }
}

function buildRoomId() {
  if (!myUserId.value || !otherUserId.value) return "";
  return [String(myUserId.value), String(otherUserId.value)].sort().join("-");
}

function normalizeDbMessage(msg) {
  return {
    localKey: `db-${msg.id}-${msg.created_at || Date.now()}`,
    id: msg.id,
    room: roomId.value,
    conversationId: String(msg.conversation_id || conversationId.value || ""),
    from: msg.sender_name || msg.from || "User",
    senderId: String(msg.sender_id || ""),
    text: String(msg.text || ""),
    createdAt: msg.created_at || new Date().toISOString(),
    read: msg.read || false,
  };
}

function normalizeSocketMessage(payload) {
  return {
    localKey: `sock-${payload?.messageId || Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`,
    id: payload?.messageId || null,
    room: String(payload?.room || ""),
    conversationId: String(payload?.conversationId || ""),
    from: payload?.from || "User",
    senderId: String(payload?.senderId || ""),
    text: String(payload?.text || ""),
    createdAt: payload?.createdAt || payload?.created_at || new Date().toISOString(),
    read: false,
  };
}

function formatTime(v) {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function isMyMessage(msg) {
  return String(msg.senderId) === String(myUserId.value);
}

function scrollToBottom(force = false) {
  if (!shouldScrollToBottom.value && !force) return;
  
  nextTick(() => {
    if (messagesEnd.value) {
      messagesEnd.value.scrollIntoView({ behavior: "smooth" });
    } else if (listEl.value) {
      listEl.value.scrollTop = listEl.value.scrollHeight;
    }
  });
}

function onScroll() {
  if (!listEl.value) return;
  const { scrollTop, scrollHeight, clientHeight } = listEl.value;
  const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
  shouldScrollToBottom.value = isNearBottom;
}

// Debounced typing indicator
let typingTimeout = null;
function onTyping() {
  if (!socketConnected.value || !roomId.value) return;
  
  socket.emit("typing", { room: roomId.value, userId: myUserId.value });
  
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit("stop-typing", { room: roomId.value, userId: myUserId.value });
  }, 2000);
}

function hasMessage(msg) {
  if (!msg.id) return false;
  return messages.value.some((m) => {
    if (m.id && msg.id && String(m.id) === String(msg.id)) return true;
    return false;
  });
}

async function ensureConversation() {
  if (conversationId.value) return conversationId.value;
  if (!myUserId.value || !otherUserId.value) {
    throw new Error("Missing user info for conversation");
  }

  creatingConversation.value = true;
  error.value = "";

  try {
    let data;
    try {
      data = await apiPost("/conversations/conversations", {
        userId1: myUserId.value,
        userId2: otherUserId.value,
      });
    } catch (firstErr) {
      // Only retry on 404, not on network errors or 500s
      if (firstErr.message?.includes("404") || firstErr.message?.includes("not found")) {
        data = await apiPost("/conversations", {
          userId1: myUserId.value,
          userId2: otherUserId.value,
        });
      } else {
        throw firstErr;
      }
    }

    conversationId.value = String(data?.id || "");
    return conversationId.value;
  } finally {
    creatingConversation.value = false;
  }
}

async function loadMessages(loadMore = false) {
  if (!conversationId.value) return;
  if (loadingHistory.value) return;

  loadingHistory.value = true;
  error.value = "";

  try {
    let url = `/messages?conversationId=${encodeURIComponent(conversationId.value)}`;
    if (loadMore && oldestMessageId.value) {
      url += `&beforeId=${encodeURIComponent(oldestMessageId.value)}&limit=50`;
    } else {
      url += `&limit=50`;
    }

    const data = await apiGet(url);
    const newMessages = Array.isArray(data) ? data.map(normalizeDbMessage) : [];

    if (newMessages.length > 0) {
      oldestMessageId.value = newMessages[0].id;
    }
    hasMoreMessages.value = newMessages.length === 50;

    if (loadMore) {
      messages.value.unshift(...newMessages);
    } else {
      messages.value = newMessages;
      scrollToBottom(true);
    }
  } catch (e) {
    if (e.message !== "Request cancelled") {
      error.value = e?.message || "Failed to load messages";
    }
  } finally {
    loadingHistory.value = false;
  }
}

async function reloadMessages() {
  oldestMessageId.value = null;
  hasMoreMessages.value = true;
  await loadMessages(false);
}

// Queue for offline messages
const pendingMessages = ref([]);

async function sendMessage() {
  const value = text.value.trim();
  if (!value || !myUserId.value || sending.value) return;

  sending.value = true;
  error.value = "";

  const tempId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  
  const optimisticMsg = {
    localKey: tempId,
    id: tempId,
    room: roomId.value,
    conversationId: conversationId.value,
    from: me.value?.username || "You",
    senderId: myUserId.value,
    text: value,
    createdAt: new Date().toISOString(),
    read: false,
    pending: true,
  };

  // Optimistic UI
  messages.value.push(optimisticMsg);
  text.value = "";
  scrollToBottom(true);

  try {
    const convoId = await ensureConversation();

    const saved = await apiPost("/messages", {
      conversationId: convoId,
      senderId: myUserId.value,
      text: value,
    });

    // Update optimistic message with real data
    const idx = messages.value.findIndex((m) => m.localKey === tempId);
    if (idx !== -1) {
      messages.value[idx] = {
        ...messages.value[idx],
        localKey: `db-${saved.id}-${saved.created_at || Date.now()}`,
        id: saved.id,
        conversationId: String(saved.conversation_id || convoId),
        from: saved.sender_name || me.value?.username || "You",
        text: saved.text || value,
        createdAt: saved.created_at || new Date().toISOString(),
        pending: false,
      };
    }

    // Emit via socket
    socket.emit("send-message", {
      room: roomId.value,
      conversationId: convoId,
      messageId: saved.id,
      from: me.value?.username || "You",
      senderId: myUserId.value,
      text: value,
      createdAt: saved.created_at || new Date().toISOString(),
      toUserId: otherUserId.value,
    });

    // Mark as read for self
    socket.emit("message-read", {
      room: roomId.value,
      messageId: saved.id,
      userId: myUserId.value,
    });
  } catch (e) {
    // Mark as failed
    const idx = messages.value.findIndex((m) => m.localKey === tempId);
    if (idx !== -1) {
      messages.value[idx] = { ...messages.value[idx], failed: true, pending: false };
    }
    error.value = e?.message || "Failed to send message";
  } finally {
    sending.value = false;
  }
}

function retryFailedMessage(msg) {
  if (!msg.failed) return;
  text.value = msg.text;
  // Remove failed message
  const idx = messages.value.findIndex((m) => m.localKey === msg.localKey);
  if (idx !== -1) messages.value.splice(idx, 1);
  sendMessage();
}

function joinActiveRoom() {
  if (!roomId.value) return;
  socket.emit("join-room", roomId.value);
}

function leaveActiveRoom() {
  if (!roomId.value) return;
  socket.emit("leave-room", roomId.value);
}

// Socket handlers
function onReceiveMessage(payload) {
  const incoming = normalizeSocketMessage(payload);
  if (!incoming.text) return;
  if (incoming.room !== roomId.value) return;

  const isMine = String(incoming.senderId) === String(myUserId.value);
  if (isMine) {
    // Update our optimistic message if it exists
    const idx = messages.value.findIndex(
      (m) => m.pending && String(m.text) === String(incoming.text)
    );
    if (idx !== -1) {
      messages.value[idx] = { ...messages.value[idx], id: incoming.id, pending: false };
    }
    return;
  }

  if (!hasMessage(incoming)) {
    messages.value.push(incoming);
    scrollToBottom();
    
    // Mark as read immediately if we're active
    if (document.visibilityState === "visible") {
      socket.emit("message-read", {
        room: roomId.value,
        messageId: incoming.id,
        userId: myUserId.value,
      });
    }
  }
}

function onTypingEvent(payload) {
  if (payload.room !== roomId.value) return;
  if (String(payload.userId) === String(myUserId.value)) return;
  otherUserTyping.value = true;
  
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    otherUserTyping.value = false;
  }, 3000);
}

function onStopTypingEvent(payload) {
  if (payload.room !== roomId.value) return;
  if (String(payload.userId) === String(myUserId.value)) return;
  otherUserTyping.value = false;
}

function onMessageRead(payload) {
  if (payload.room !== roomId.value) return;
  const msg = messages.value.find((m) => String(m.id) === String(payload.messageId));
  if (msg && isMyMessage(msg)) {
    msg.read = true;
  }
}

function onSocketConnect() {
  socketConnected.value = true;
  joinActiveRoom();
  
  // Resend pending messages
  for (const msg of pendingMessages.value) {
    socket.emit("send-message", msg);
  }
  pendingMessages.value = [];
}

function onSocketDisconnect() {
  socketConnected.value = false;
}

onMounted(async () => {
  me.value = getMe();
  myUserId.value = String(me.value?.id || "").trim();
  roomId.value = buildRoomId();

  ensurePulseSocket();
  refreshSocketAuth(true);

  socket.on("connect", onSocketConnect);
  socket.on("disconnect", onSocketDisconnect);
  socket.on("receive-message", onReceiveMessage);
  socket.on("typing", onTypingEvent);
  socket.on("stop-typing", onStopTypingEvent);
  socket.on("message-read", onMessageRead);

  try {
    await ensureConversation();
  } catch {}

  joinActiveRoom();

  if (conversationId.value) {
    await loadMessages();
  }
});

const stopWatchUserId = watch(
  () => route.query.userId,
  async (newUserId) => {
    if (!newUserId) return;
    
    // Cancel pending requests
    cleanupAbortControllers();
    
    otherUserId.value = String(newUserId).trim();
    roomId.value = buildRoomId();
    messages.value = [];
    conversationId.value = route.query.conversationId
      ? String(route.query.conversationId)
      : "";
    oldestMessageId.value = null;
    hasMoreMessages.value = true;
    error.value = "";
    
    joinActiveRoom();

    try {
      await ensureConversation();
    } catch {}

    if (conversationId.value) {
      await loadMessages();
    }
  }
);

onBeforeUnmount(() => {
  leaveActiveRoom();
  cleanupAbortControllers();
  
  socket.off("connect", onSocketConnect);
  socket.off("disconnect", onSocketDisconnect);
  socket.off("receive-message", onReceiveMessage);
  socket.off("typing", onTypingEvent);
  socket.off("stop-typing", onStopTypingEvent);
  socket.off("message-read", onMessageRead);
  
  stopWatchUserId();
  
  clearTimeout(typingTimeout);
});
</script>

<style scoped>
.chat-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  max-width: 800px;
  margin: 0 auto;
  background: #0f172a;
  color: white;
}

.chat-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(15, 23, 42, 0.95);
  backdrop-filter: blur(10px);
}

.back-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  cursor: pointer;
  display: grid;
  place-items: center;
  font-size: 18px;
}

.header-info {
  flex: 1;
}

.chat-name {
  font-weight: 800;
  font-size: 16px;
}

.chat-status {
  font-size: 13px;
  opacity: 0.7;
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ef4444;
}

.status-dot.online {
  background: #22c55e;
}

.typing-indicator {
  color: #22c55e;
  font-style: italic;
}

.error-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: rgba(239, 68, 68, 0.15);
  border-bottom: 1px solid rgba(239, 68, 68, 0.2);
  font-size: 13px;
}

.close-error {
  background: none;
  border: none;
  color: white;
  font-size: 18px;
  cursor: pointer;
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.loading-more {
  text-align: center;
  padding: 12px;
  opacity: 0.6;
  font-size: 13px;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  opacity: 0.5;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.empty-sub {
  font-size: 14px;
  margin-top: 8px;
}

.message-row {
  display: flex;
}

.my-row {
  justify-content: flex-end;
}

.their-row {
  justify-content: flex-start;
}

.message-bubble {
  max-width: 75%;
  padding: 10px 14px;
  border-radius: 16px;
  word-break: break-word;
}

.my-row .message-bubble {
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-bottom-right-radius: 4px;
}

.their-row .message-bubble {
  background: rgba(255, 255, 255, 0.1);
  border-bottom-left-radius: 4px;
}

.message-text {
  line-height: 1.4;
}

.message-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  font-size: 11px;
  opacity: 0.7;
}

.sender {
  font-weight: 600;
}

.read-status {
  color: #60a5fa;
}

.input-area {
  display: flex;
  gap: 10px;
  padding: 12px 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(15, 23, 42, 0.95);
  position: relative;
}

.sending-overlay {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(15, 23, 42, 0.8);
  font-size: 13px;
  z-index: 2;
}

.input-area input {
  flex: 1;
  padding: 12px 16px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.08);
  color: white;
  font-size: 14px;
  outline: none;
}

.input-area input:focus {
  border-color: rgba(255, 255, 255, 0.3);
}

.input-area input::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

.input-area button {
  padding: 12px 20px;
  border-radius: 14px;
  border: none;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  font-weight: 700;
  cursor: pointer;
}

.input-area button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>