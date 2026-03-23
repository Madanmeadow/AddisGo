<template>
  <div class="messages-page">
    <div class="topbar">
      <button class="back" @click="router.back()">← Back</button>
      <div>
        <div class="title">{{ chatName }}</div>
        <div class="sub">Direct messages</div>
      </div>
    </div>

    <div ref="listEl" class="messages-list">
      <div
        v-for="(msg, i) in messages"
        :key="i"
        class="bubble-wrap"
        :class="{ me: String(msg.senderId) === myUserId }"
      >
        <div class="bubble">
          <div class="from">
            {{ String(msg.senderId) === myUserId ? "You" : (msg.from || chatName) }}
          </div>
          <div class="text">{{ msg.text }}</div>
        </div>
      </div>
    </div>

    <form class="composer" @submit.prevent="sendMessage">
      <input
        v-model="text"
        type="text"
        placeholder="Write a message..."
      />
      <button type="submit">Send</button>
    </form>
  </div>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import socket, { refreshSocketAuth } from "../socket";

const route = useRoute();
const router = useRouter();

const me = JSON.parse(localStorage.getItem("user") || "{}");
const myUserId = String(me?.id || "");

const otherUserId = String(route.query.userId || "");
const chatName = route.query.name || `User ${otherUserId}`;
const roomId = [myUserId, otherUserId].sort().join("-");

const text = ref("");
const messages = ref([]);
const listEl = ref(null);

function scrollBottom() {
  nextTick(() => {
    if (listEl.value) {
      listEl.value.scrollTop = listEl.value.scrollHeight;
    }
  });
}

function sendMessage() {
  const value = text.value.trim();
  if (!value) return;

  const mine = {
    room: roomId,
    from: me?.username || "You",
    senderId: myUserId,
    text: value,
    createdAt: new Date().toISOString(),
  };

  messages.value.push(mine);

  socket.emit("send-message", {
    room: roomId,
    from: me?.username || "You",
    text: value,
  });

  text.value = "";
  scrollBottom();
}

function onReceiveMessage(payload) {
  const incoming = {
    room: payload?.room || roomId,
    from: payload?.from || "User",
    senderId: payload?.from === (me?.username || "You") ? myUserId : otherUserId,
    text: payload?.text || "",
    createdAt: payload?.createdAt || payload?.created_at || new Date().toISOString(),
  };

  if (incoming.text) {
    messages.value.push(incoming);
    scrollBottom();
  }
}

onMounted(() => {
  refreshSocketAuth();
  socket.emit("join-room", roomId);

  socket.on("receive-message", onReceiveMessage);
  scrollBottom();
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
  padding: 16px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}
.back {
  border: none;
  border-radius: 12px;
  padding: 10px 12px;
}
.title { font-weight: 900; }
.sub { opacity: 0.7; font-size: 0.9rem; }
.messages-list {
  flex: 1;
  overflow: auto;
  padding: 16px;
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
}
.composer {
  display: flex;
  gap: 10px;
  padding: 14px;
  border-top: 1px solid rgba(255,255,255,0.08);
}
.composer input {
  flex: 1;
  padding: 14px;
  border-radius: 14px;
  border: none;
}
.composer button {
  border: none;
  padding: 0 18px;
  border-radius: 14px;
  background: #22c55e;
  color: white;
}
</style>