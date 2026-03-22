<template>
  <Layout>
    <div class="page">
      <div class="head">
        <button class="back" @click="goInbox">← Inbox</button>

        <div class="headMeta">
          <div class="title">💬 Messages</div>
          <div class="sub">{{ chatName }}</div>
        </div>

        <button class="refresh" @click="loadMessages">↻</button>
      </div>

      <div v-if="!conversationId" class="errorBox">
        Missing conversationId (open chat from Inbox or People).
      </div>

      <template v-else>
        <div class="messagesBox" ref="messagesBox">
          <div v-if="loading" class="state">Loading…</div>
          <div v-else-if="error" class="state err">{{ error }}</div>

          <template v-else>
            <div v-if="messages.length === 0" class="empty">
              No messages yet. Start the conversation 👋
            </div>

            <div
              v-for="m in messages"
              :key="m.id"
              class="bubbleWrap"
              :class="{ mine: String(m.sender_id) === String(me?.id || '') }"
            >
              <div class="bubble">
                <div class="text">{{ m.text }}</div>
                <div class="time">{{ formatTime(m.created_at) }}</div>
              </div>
            </div>
          </template>
        </div>

        <div class="composer">
          <input
            v-model="draft"
            class="input"
            type="text"
            placeholder="Type message..."
            @keydown.enter="send"
          />
          <button class="send" @click="send" :disabled="sending || !draft.trim()">
            {{ sending ? "..." : "Send" }}
          </button>
        </div>
      </template>
    </div>
  </Layout>
</template>

<script setup>
import { nextTick, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import Layout from "../components/Layout.vue";

const router = useRouter();
const route = useRoute();

const apiBase = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");
const token = localStorage.getItem("token") || "";

const conversationId = String(route.query.conversationId || "");
const chatName = String(route.query.name || "Chat");

const loading = ref(false);
const sending = ref(false);
const error = ref("");
const messages = ref([]);
const draft = ref("");
const messagesBox = ref(null);

function getMe() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}
const me = getMe();

function authHeaders(extra = {}) {
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

function goInbox() {
  router.push("/inbox");
}

function formatTime(v) {
  if (!v) return "";
  const d = new Date(v);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString([], {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function scrollBottom() {
  await nextTick();
  const el = messagesBox.value;
  if (el) el.scrollTop = el.scrollHeight;
}

async function loadMessages() {
  if (!conversationId) return;

  loading.value = true;
  error.value = "";

  try {
    const res = await fetch(
      `${apiBase}/messages?conversationId=${encodeURIComponent(conversationId)}`,
      { headers: authHeaders() }
    );

    const data = await res.json().catch(() => ([]));

    if (!res.ok) {
      throw new Error(data?.error || "Failed to load messages");
    }

    messages.value = Array.isArray(data) ? data : data?.messages || [];
    await scrollBottom();
  } catch (e) {
    error.value = e?.message || "Failed to load messages";
  } finally {
    loading.value = false;
  }
}

async function send() {
  if (!conversationId || !draft.value.trim() || !me?.id) return;

  sending.value = true;
  error.value = "";

  try {
    const payload = {
      conversationId,
      sender_id: me.id,
      text: draft.value.trim(),
    };

    const res = await fetch(`${apiBase}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify(payload),
    });

    const created = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(created?.error || "Failed to send");
    }

    if (created?.id) {
      messages.value.push(created);
    } else {
      await loadMessages();
    }

    draft.value = "";
    await scrollBottom();
  } catch (e) {
    error.value = e?.message || "Failed to send";
  } finally {
    sending.value = false;
  }
}

onMounted(loadMessages);
</script>

<style scoped>
.page{max-width:980px;margin:0 auto;padding:18px;color:#fff}
.head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}
.back,.refresh,.send{
  border:none;border-radius:999px;padding:12px 16px;
  background:rgba(255,255,255,.12);color:#fff;font-weight:800
}
.headMeta{flex:1;min-width:0}
.title{font-size:26px;font-weight:900}
.sub{opacity:.75;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.errorBox,.state,.empty{
  padding:16px;border-radius:16px;background:rgba(255,255,255,.08)
}
.errorBox,.state.err{border:1px solid rgba(255,80,80,.35)}
.messagesBox{
  min-height:55vh;max-height:62vh;overflow:auto;padding:14px;border-radius:22px;
  background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12)
}
.bubbleWrap{display:flex;margin-bottom:10px}
.bubbleWrap.mine{justify-content:flex-end}
.bubble{
  max-width:78%;padding:12px 14px;border-radius:18px;
  background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.12)
}
.bubbleWrap.mine .bubble{
  background:linear-gradient(45deg,#ff416c,#ff4b2b);
  border-color:transparent
}
.text{white-space:pre-wrap;word-break:break-word}
.time{margin-top:6px;font-size:12px;opacity:.7}
.composer{display:flex;gap:10px;margin-top:14px}
.input{
  flex:1;padding:14px 16px;border-radius:16px;border:1px solid rgba(255,255,255,.12);
  background:rgba(0,0,0,.22);color:#fff;outline:none
}
.send{min-width:96px;background:linear-gradient(45deg,#ff416c,#ff4b2b)}
</style>