<template>
  <Layout>
    <div class="page">
      <div class="top">
        <button class="chip" @click="$router.push('/inbox')">← Inbox</button>
        <div class="who">
          <div class="name">💬 {{ title }}</div>
          <div class="meta">Conversation: <b class="mono">{{ conversationId || "—" }}</b></div>
        </div>
        <button class="chip" @click="load">↻</button>
      </div>

      <div class="card thread" ref="threadEl">
        <div v-if="loading" class="state">Loading…</div>
        <div v-else-if="error" class="state err">{{ error }}</div>

        <div v-else>
          <div v-if="msgs.length === 0" class="empty">
            No messages yet. Say hi 👋
          </div>

          <div
            v-for="m in msgs"
            :key="m.id || m.created_at || Math.random()"
            :class="['msg', isMine(m) ? 'mine' : 'theirs']"
          >
            <div class="bubble">
              <div class="text">{{ m.text || m.message || "" }}</div>
              <div class="time">{{ formatTime(m.created_at || m.createdAt) }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="composer">
        <input
          v-model="text"
          class="input"
          placeholder="Type message…"
          @keydown.enter.prevent="send"
        />
        <button class="send" :disabled="sending || !text.trim()" @click="send">
          {{ sending ? "…" : "Send" }}
        </button>
      </div>
    </div>
  </Layout>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from "vue";
import { useRoute } from "vue-router";
import Layout from "../components/Layout.vue";
import apiFetch from "../apiFetch.js";

const route = useRoute();

const conversationId = computed(() => String(route.query.conversationId || ""));
const otherUserId = computed(() => String(route.query.otherUserId || ""));
const title = computed(() => String(route.query.name || "Messages"));

const msgs = ref([]);
const loading = ref(false);
const sending = ref(false);
const error = ref("");
const text = ref("");
const threadEl = ref(null);

function getMe() {
  try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; }
}

function isMine(m) {
  const me = getMe();
  return me?.id && String(m.sender_id || m.senderId) === String(me.id);
}

function formatTime(v) {
  if (!v) return "";
  const d = new Date(v);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString([], { hour: "2-digit", minute: "2-digit" });
}

async function scrollDown() {
  await nextTick();
  if (threadEl.value) threadEl.value.scrollTop = threadEl.value.scrollHeight;
}

async function load() {
  error.value = "";
  loading.value = true;

  try {
    // ✅ expects your backend to support GET /messages/:conversationId
    const data = await apiFetch(`/messages/${conversationId.value}`);
    msgs.value = Array.isArray(data) ? data : (data?.messages || []);
    await scrollDown();
  } catch (e) {
    error.value = e?.message || "Failed to load messages";
  } finally {
    loading.value = false;
  }
}

async function send() {
  const me = getMe();
  if (!me?.id) return alert("Login again.");

  const body = text.value.trim();
  if (!body) return;

  sending.value = true;
  error.value = "";

  try {
    // ✅ POST /messages  (adjust keys if your routes use different ones)
    await apiFetch(`/messages`, {
      method: "POST",
      body: JSON.stringify({
        conversationId: conversationId.value,
        senderId: me.id,
        receiverId: otherUserId.value || null,
        text: body,
      }),
    });

    text.value = "";
    await load(); // simple + reliable
  } catch (e) {
    error.value = e?.message || "Failed to send";
  } finally {
    sending.value = false;
  }
}

onMounted(() => {
  if (!conversationId.value) {
    error.value = "Missing conversationId (open chat from Inbox).";
    return;
  }
  load();
});
</script>

<style scoped>
.page{max-width:980px;margin:0 auto;padding:18px}
.top{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}
.chip{border:none;border-radius:999px;padding:10px 14px;background:rgba(255,255,255,.12);color:#fff;font-weight:800}
.who{flex:1;min-width:0}
.name{font-size:20px;font-weight:900}
.meta{opacity:.7;font-weight:700}
.mono{font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace}
.card{
  background:rgba(255,255,255,.08);
  border:1px solid rgba(255,255,255,.12);
  border-radius:18px;
  padding:12px;
  backdrop-filter: blur(10px);
}
.thread{height:58vh;overflow:auto}
.state{padding:12px;border-radius:14px;background:rgba(255,255,255,.07)}
.state.err{border:1px solid rgba(255,80,80,.35)}
.empty{opacity:.7;padding:14px;text-align:center;font-weight:800}
.msg{display:flex;margin:10px 0}
.msg.mine{justify-content:flex-end}
.bubble{
  max-width:78%;
  padding:10px 12px;
  border-radius:16px;
  border:1px solid rgba(255,255,255,.12);
  background:rgba(0,255,170,.14);
}
.msg.theirs .bubble{
  background:rgba(255,255,255,.09);
}
.text{font-weight:800}
.time{opacity:.65;font-size:12px;margin-top:4px;text-align:right}
.composer{display:flex;gap:10px;margin-top:12px}
.input{
  flex:1;padding:12px 14px;border-radius:14px;border:1px solid rgba(255,255,255,.12);
  background:rgba(0,0,0,.35);color:#fff;font-weight:800
}
.send{
  padding:12px 16px;border:none;border-radius:14px;
  background:linear-gradient(45deg,#ff416c,#ff4b2b);
  color:#fff;font-weight:900
}
.send:disabled{opacity:.6}
</style>