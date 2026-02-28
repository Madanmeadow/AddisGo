<template>
  <Layout>
    <div class="page">
      <div class="head">
        <div>
          <div class="title">💬 Inbox</div>
          <div class="sub">Your chats • Tap a person to open messages</div>
        </div>
        <button class="btn" @click="load">↻ Refresh</button>
      </div>

      <div v-if="loading" class="state">Loading…</div>
      <div v-else-if="error" class="state err">{{ error }}</div>

      <div v-else class="list">
        <div v-if="convos.length === 0" class="empty">
          <div class="big">No conversations yet</div>
          <div class="small">Tip: open a Profile and tap “Message” (we can add that button next).</div>
        </div>

        <button
          v-for="c in convos"
          :key="c.id"
          class="row"
          @click="openConversation(c)"
        >
          <div class="avatar">{{ initials(c.other_username || c.other_name || 'User') }}</div>

          <div class="info">
            <div class="name">
              {{ c.other_username || c.other_name || "User" }}
              <span class="meta">#{{ c.id }}</span>
            </div>

            <div class="preview">
              {{ c.last_message || "Say hi 👋" }}
            </div>
          </div>

          <div class="right">
            <div class="time">{{ formatTime(c.updated_at || c.last_message_at || c.created_at) }}</div>
            <div class="pill">Open</div>
          </div>
        </button>
      </div>
    </div>
  </Layout>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import Layout from "../components/Layout.vue";
import apiFetch from "../apiFetch.js";

const router = useRouter();

const loading = ref(false);
const error = ref("");
const convos = ref([]);

function getMe() {
  try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; }
}

function initials(name) {
  const s = String(name || "").trim();
  if (!s) return "U";
  const parts = s.split(" ").filter(Boolean);
  return (parts[0]?.[0] || "U").toUpperCase() + (parts[1]?.[0] ? parts[1][0].toUpperCase() : "");
}

function formatTime(v) {
  if (!v) return "";
  const d = new Date(v);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString([], { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

async function load() {
  const me = getMe();
  if (!me?.id) {
    error.value = "Login again (missing user).";
    return;
  }

  loading.value = true;
  error.value = "";

  try {
    // ✅ your backend is /conversations (no /api)
    const data = await apiFetch(`/conversations?userId=${me.id}`);

    // Accept either array OR {conversations:[...]}
    const rows = Array.isArray(data) ? data : (data?.conversations || []);
    convos.value = rows;
  } catch (e) {
    error.value = e?.message || "Failed to load conversations";
  } finally {
    loading.value = false;
  }
}

function openConversation(c) {
  router.push({
    path: "/messages",
    query: {
      conversationId: c.id,
      otherUserId: c.other_user_id || c.otherUserId || "",
      name: c.other_username || c.other_name || "Chat",
    },
  });
}

onMounted(load);
</script>

<style scoped>
.page{max-width:980px;margin:0 auto;padding:18px}
.head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}
.title{font-size:26px;font-weight:900}
.sub{opacity:.75;font-weight:600}
.btn{border:none;border-radius:999px;padding:10px 14px;background:rgba(255,255,255,.12);color:#fff;font-weight:800}
.state{padding:16px;border-radius:14px;background:rgba(255,255,255,.08)}
.state.err{border:1px solid rgba(255,80,80,.35)}
.list{display:flex;flex-direction:column;gap:10px}
.row{
  display:flex;gap:12px;align-items:center;
  padding:12px;border-radius:16px;
  background:rgba(255,255,255,.08);
  border:1px solid rgba(255,255,255,.12);
  cursor:pointer;color:#fff;text-align:left
}
.row:hover{background:rgba(255,255,255,.11)}
.avatar{
  width:44px;height:44px;border-radius:14px;
  display:grid;place-items:center;
  background:linear-gradient(45deg,#ff416c,#ff4b2b);
  font-weight:900
}
.info{flex:1;min-width:0}
.name{font-weight:900;display:flex;gap:10px;align-items:center}
.meta{opacity:.6;font-weight:700;font-size:12px}
.preview{opacity:.75;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px}
.right{display:flex;flex-direction:column;align-items:flex-end;gap:6px}
.time{opacity:.65;font-size:12px;font-weight:700}
.pill{padding:6px 10px;border-radius:999px;background:rgba(0,255,170,.18);border:1px solid rgba(0,255,170,.25);font-weight:900}
.empty{padding:18px;border-radius:16px;background:rgba(255,255,255,.07);border:1px dashed rgba(255,255,255,.18)}
.big{font-weight:900;font-size:18px}
.small{opacity:.75;margin-top:6px}
</style>