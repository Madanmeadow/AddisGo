<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import Layout from "../components/Layout.vue";
import socket, { refreshSocketAuth, ensurePulseSocket } from "../socket";

const route = useRoute();
const router = useRouter();

const API_URL = (
  import.meta.env.VITE_API_URL ||
  "https://addisgo-production-63ae.up.railway.app"
).replace(/\/$/, "");

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
const error = ref("");
const loadingHistory = ref(false);
const creatingConversation = ref(false);
const sending = ref(false);
const socketConnected = ref(socket.connected);

function authHeaders() {
  const token = getToken();
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
  if (!res.ok) throw new Error(data?.error || "Request failed");
  return data;
}

async function apiPost(path, body) {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Request failed");
  return data;
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
  };
}

function normalizeSocketMessage(payload) {
  return {
    localKey: `sock-${payload?.messageId || Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}`,
    id: payload?.messageId || null,
    room: String(payload?.room || ""),
    conversationId: String(payload?.conversationId || ""),
    from: payload?.from || "User",
    senderId: String(payload?.senderId || ""),
    text: String(payload?.text || ""),
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

function hasMessage(msg) {
  return messages.value.some((m) => {
    if (msg.id && m.id && String(m.id) === String(msg.id)) return true;
    return (
      String(m.senderId) === String(msg.senderId) &&
      String(m.text) === String(msg.text) &&
      String(m.createdAt) === String(msg.createdAt)
    );
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
    } catch {
      data = await apiPost("/conversations", {
        userId1: myUserId.value,
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
    const data = await apiGet(
      `/messages?conversationId=${encodeURIComponent(conversationId.value)}`
    );
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
  if (!value || !myUserId.value || sending.value) return;

  sending.value = true;
  error.value = "";

  try {
    const convoId = await ensureConversation();

    const saved = await apiPost("/messages", {
      conversationId: convoId,
      senderId: myUserId.value,
      text: value,
    });

    const mine = {
      localKey: `local-${saved.id}-${Date.now()}`,
      id: saved.id,
      room: roomId.value,
      conversationId: String(saved.conversation_id || convoId),
      from: saved.sender_name || me.value?.username || "You",
      senderId: String(saved.sender_id || myUserId.value),
      text: saved.text || value,
      createdAt: saved.created_at || new Date().toISOString(),
    };

    if (!hasMessage(mine)) {
      messages.value.push(mine);
    }

    socket.emit("send-message", {
      room: roomId.value,
      conversationId: convoId,
      messageId: saved.id,
      from: me.value?.username || "You",
      senderId: myUserId.value,
      text: mine.text,
      createdAt: mine.createdAt,
      toUserId: otherUserId.value,
    });

    text.value = "";
    scrollBottom();
  } catch (e) {
    error.value = e?.message || "Failed to send message";
  } finally {
    sending.value = false;
  }
}

function joinActiveRoom() {
  if (!roomId.value) return;
  socket.emit("join-room", roomId.value);
}

function onReceiveMessage(payload) {
  const incoming = normalizeSocketMessage(payload);
  if (!incoming.text) return;
  if (incoming.room !== roomId.value) return;

  const isMine = String(incoming.senderId) === String(myUserId.value);
  if (isMine) return;

  if (!hasMessage(incoming)) {
    messages.value.push(incoming);
    scrollBottom();
  }
}

function onSocketConnect() {
  socketConnected.value = true;
  joinActiveRoom();
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

  try {
    await ensureConversation();
  } catch {}

  joinActiveRoom();

  if (conversationId.value) {
    await loadMessages();
  }
});

watch(
  () => route.query.userId,
  async (newUserId) => {
    if (!newUserId) return;
    otherUserId.value = String(newUserId).trim();
    roomId.value = buildRoomId();
    messages.value = [];
    conversationId.value = route.query.conversationId
      ? String(route.query.conversationId)
      : "";
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
  socket.off("connect", onSocketConnect);
  socket.off("disconnect", onSocketDisconnect);
  socket.off("receive-message", onReceiveMessage);
});
</script>