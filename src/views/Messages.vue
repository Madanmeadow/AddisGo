<template>
  <Layout>
    <div class="messages-page">
      <div class="bg bg1"></div>
      <div class="bg bg2"></div>

      <header class="topbar glassy">
        <div class="left">
          <button class="chip ghost" @click="goInbox">← Inbox</button>

          <div class="title-wrap">
            <h1>Messages</h1>
            <p>{{ headerName }}</p>
          </div>
        </div>

        <div class="right">
          <button class="chip" @click="reloadMessages" :disabled="loading">
            ↻
          </button>
        </div>
      </header>

      <section v-if="routeError" class="notice error">
        {{ routeError }}
      </section>

      <section v-else class="chat-shell glassy">
        <div class="chat-body" ref="chatBodyRef">
          <div v-if="loading" class="state">Loading messages...</div>

          <template v-else-if="messages.length">
            <div
              v-for="msg in messages"
              :key="msg.id"
              class="bubble-wrap"
              :class="{ mine: isMine(msg) }"
            >
              <div class="bubble">
                <div class="bubble-text">{{ msg.text || msg.body || msg.content }}</div>
                <div class="bubble-time">{{ formatTime(msg.created_at || msg.createdAt) }}</div>
              </div>
            </div>
          </template>

          <div v-else class="state">
            No messages yet. Start the conversation.
          </div>
        </div>

        <div class="composer">
          <textarea
            v-model="draft"
            class="input"
            rows="1"
            placeholder="Type a message..."
            @keydown.enter.exact.prevent="sendMessage"
          ></textarea>

          <button class="send" @click="sendMessage" :disabled="sending || !draft.trim()">
            {{ sending ? "Sending..." : "Send" }}
          </button>
        </div>
      </section>
    </div>
  </Layout>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();

const messages = ref([]);
const loading = ref(false);
const sending = ref(false);
const draft = ref("");
const routeError = ref("");
const chatBodyRef = ref(null);

const currentUser = computed(() => {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
});

const conversationId = computed(() => {
  const value = route.query.conversationId;
  return value ? String(value) : "";
});

const headerName = computed(() => {
  return route.query.name ? String(route.query.name) : "Chat";
});

function goInbox() {
  router.push("/inbox");
}

function isMine(msg) {
  const mineId = String(currentUser.value?.id || "");
  return String(msg.sender_id || msg.senderId || "") === mineId;
}

function formatTime(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

async function scrollToBottom() {
  await nextTick();
  const el = chatBodyRef.value;
  if (el) el.scrollTop = el.scrollHeight;
}

async function reloadMessages() {
  if (!conversationId.value) {
    routeError.value = "Missing conversationId. Open chat from People or Inbox.";
    setTimeout(() => router.push("/people"), 1400);
    return;
  }

  routeError.value = "";
  loading.value = true;

  try {
    const { data } = await api.get(`/messages/${conversationId.value}`);
    messages.value = Array.isArray(data) ? data : data.messages || [];
    await scrollToBottom();
  } catch (err) {
    routeError.value =
      err?.response?.data?.message || "Failed to load messages.";
  } finally {
    loading.value = false;
  }
}

async function sendMessage() {
  const text = draft.value.trim();
  if (!text || !conversationId.value) return;

  sending.value = true;

  try {
    const { data } = await api.post(`/messages/${conversationId.value}`, { text });

    const saved =
      data?.message || data || {
        id: `local_${Date.now()}`,
        text,
        sender_id: currentUser.value?.id,
        created_at: new Date().toISOString(),
      };

    messages.value.push(saved);

    socket.emit("message:send", {
      conversationId: conversationId.value,
      message: saved,
    });

    draft.value = "";
    await scrollToBottom();
  } catch (err) {
    routeError.value =
      err?.response?.data?.message || "Failed to send message.";
  } finally {
    sending.value = false;
  }
}

onMounted(async () => {
  await reloadMessages();

  socket.on("message:new", async (payload) => {
    if (String(payload?.conversationId) !== conversationId.value) return;

    const msg = payload?.message;
    if (!msg) return;

    const exists = messages.value.some((m) => String(m.id) === String(msg.id));
    if (!exists) {
      messages.value.push(msg);
      await scrollToBottom();
    }
  });
});

watch(
  () => route.query.conversationId,
  async () => {
    await reloadMessages();
  }
);
</script>

<style scoped>
.messages-page {
  min-height: 100vh;
  padding: 18px;
  position: relative;
  color: #fff;
  background:
    radial-gradient(circle at top left, rgba(255, 0, 153, 0.12), transparent 26%),
    radial-gradient(circle at right, rgba(59, 130, 246, 0.14), transparent 30%),
    linear-gradient(180deg, #07111f 0%, #0d1528 100%);
}

.bg {
  position: absolute;
  border-radius: 999px;
  filter: blur(46px);
  opacity: 0.3;
}

.bg1 {
  width: 240px;
  height: 240px;
  left: -50px;
  top: -30px;
  background: #ff3aa7;
}

.bg2 {
  width: 260px;
  height: 260px;
  right: -70px;
  top: 140px;
  background: #2563eb;
}

.glassy {
  position: relative;
  z-index: 1;
  backdrop-filter: blur(14px);
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.22);
}

.topbar,
.chat-shell,
.notice {
  border-radius: 22px;
}

.topbar {
  padding: 16px 18px;
  margin-bottom: 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
}

.left {
  display: flex;
  gap: 14px;
  align-items: center;
}

.title-wrap h1 {
  margin: 0;
  font-size: 30px;
}

.title-wrap p {
  margin: 4px 0 0;
  color: rgba(255, 255, 255, 0.7);
}

.chat-shell {
  height: calc(100vh - 145px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-body {
  flex: 1;
  overflow-y: auto;
  padding: 18px;
}

.state {
  text-align: center;
  padding: 24px;
  color: rgba(255, 255, 255, 0.72);
}

.bubble-wrap {
  display: flex;
  margin-bottom: 12px;
}

.bubble-wrap.mine {
  justify-content: flex-end;
}

.bubble {
  max-width: min(78%, 620px);
  padding: 12px 14px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.08);
}

.bubble-wrap.mine .bubble {
  background: linear-gradient(135deg, #ff2d9c, #7c3aed);
}

.bubble-text {
  white-space: pre-wrap;
  word-break: break-word;
}

.bubble-time {
  margin-top: 6px;
  font-size: 12px;
  opacity: 0.75;
}

.composer {
  display: flex;
  gap: 12px;
  padding: 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.input {
  flex: 1;
  resize: none;
  min-height: 54px;
  max-height: 160px;
  border: none;
  outline: none;
  color: #fff;
  border-radius: 16px;
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.08);
}

.input::placeholder {
  color: rgba(255, 255, 255, 0.56);
}

.send,
.chip {
  border: none;
  outline: none;
  cursor: pointer;
  color: #fff;
  font-weight: 700;
}

.send {
  min-width: 110px;
  border-radius: 16px;
  background: linear-gradient(135deg, #ff2d9c, #7c3aed);
  padding: 0 18px;
}

.chip {
  border-radius: 999px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.08);
}

.notice {
  position: relative;
  z-index: 1;
  padding: 14px 16px;
}

.notice.error {
  background: rgba(255, 90, 90, 0.12);
  border: 1px solid rgba(255, 90, 90, 0.25);
}

@media (max-width: 720px) {
  .messages-page {
    padding: 12px;
  }

  .topbar {
    padding: 14px;
  }

  .title-wrap h1 {
    font-size: 24px;
  }

  .chat-shell {
    height: calc(100vh - 128px);
  }

  .composer {
    flex-direction: column;
  }

  .send {
    height: 48px;
  }

  .bubble {
    max-width: 88%;
  }
}
</style>