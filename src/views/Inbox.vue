<template>
  <Layout>
    <div class="page">
      <div class="head">
        <div>
          <div class="title">💬 Inbox</div>
          <div class="sub">Your chats • tap one to open</div>
        </div>

        <button class="btn ghost" @click="load" :disabled="loading">
          {{ loading ? "Loading..." : "↻ Refresh" }}
        </button>
      </div>

      <div v-if="error" class="alert">{{ error }}</div>

      <div v-if="loading" class="state">
        <div class="big">Loading conversations...</div>
      </div>

      <div v-else-if="convos.length === 0" class="state">
        <div class="big">No conversations yet</div>
        <div class="small">Go to People and tap Message.</div>
      </div>

      <div v-else class="list">
        <button
          v-for="c in convos"
          :key="c.id"
          class="row"
          @click="openConversation(c)"
        >
          <div class="avatar">
            {{ initials(c.other_username || c.other_name || "User") }}
          </div>

          <div class="info">
            <div class="nameRow">
              <div class="name">
                {{ c.other_username || c.other_name || "User" }}
              </div>
              <div class="meta">#{{ c.id }}</div>
            </div>

            <div class="preview">
              {{ c.last_message || "Say hi 👋" }}
            </div>
          </div>

          <div class="right">
            <div class="time">
              {{ formatTime(c.last_message_at || c.updated_at || c.created_at) }}
            </div>
            <div class="pill">Open</div>
          </div>
        </button>
      </div>
    </div>
  </Layout>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import Layout from "../components/Layout.vue";

const router = useRouter();

const API_URL = (import.meta.env.VITE_API_URL || "https://addisgo-production-63ae.up.railway.app").replace(/\/$/, "");
const token = localStorage.getItem("token") || "";

const loading = ref(false);
const error = ref("");
const convos = ref([]);

function getMe() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

async function apiGet(path) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || "Request failed");
  }
  return data;
}

function initials(name) {
  const s = String(name || "").trim();
  if (!s) return "U";
  const parts = s.split(" ").filter(Boolean);
  return (
    (parts[0]?.[0] || "U").toUpperCase() +
    (parts[1]?.[0] ? parts[1][0].toUpperCase() : "")
  );
}

function formatTime(v) {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString([], {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function load() {
  const me = getMe();
  if (!me?.id) {
    error.value = "Login again (missing user).";
    convos.value = [];
    return;
  }

  loading.value = true;
  error.value = "";

  try {
    const data = await apiGet(`/messages/conversations?userId=${encodeURIComponent(me.id)}`);
    convos.value = Array.isArray(data) ? data : [];
  } catch (e) {
    error.value = e?.message || "Failed to load conversations";
    convos.value = [];
  } finally {
    loading.value = false;
  }
}

function openConversation(c) {
  router.push({
    path: "/messages",
    query: {
      conversationId: c.id,
      userId: c.other_user_id || "",
      name: c.other_username || c.other_name || "Chat",
    },
  });
}

onMounted(load);
</script>

<style scoped>
.page {
  max-width: 980px;
  margin: 0 auto;
  padding: 18px;
  color: #fff;
}
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}
.title {
  font-size: 26px;
  font-weight: 900;
}
.sub {
  opacity: 0.75;
  font-weight: 600;
}
.btn {
  border: none;
  border-radius: 999px;
  padding: 10px 14px;
  color: #fff;
  font-weight: 800;
  cursor: pointer;
}
.btn.ghost {
  background: rgba(255, 255, 255, 0.12);
}
.alert {
  padding: 14px;
  margin-bottom: 12px;
  border-radius: 14px;
  background: rgba(255, 80, 80, 0.12);
  border: 1px solid rgba(255, 80, 80, 0.35);
}
.state {
  padding: 18px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
.big {
  font-size: 18px;
  font-weight: 900;
}
.small {
  margin-top: 6px;
  opacity: 0.75;
}
.list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.row {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 12px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #fff;
  text-align: left;
  cursor: pointer;
}
.row:hover {
  background: rgba(255, 255, 255, 0.11);
}
.avatar {
  width: 46px;
  height: 46px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: linear-gradient(45deg, #ff416c, #ff4b2b);
  font-weight: 900;
}
.info {
  flex: 1;
  min-width: 0;
}
.nameRow {
  display: flex;
  align-items: center;
  gap: 8px;
}
.name {
  font-weight: 900;
}
.meta {
  opacity: 0.55;
  font-size: 12px;
  font-weight: 700;
}
.preview {
  opacity: 0.78;
  margin-top: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
}
.time {
  opacity: 0.65;
  font-size: 12px;
  font-weight: 700;
}
.pill {
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(0, 255, 170, 0.16);
  border: 1px solid rgba(0, 255, 170, 0.24);
  font-weight: 900;
}
@media (max-width: 640px) {
  .page {
    padding: 14px;
  }
  .title {
    font-size: 22px;
  }
  .row {
    padding: 10px;
  }
  .avatar {
    width: 42px;
    height: 42px;
  }
  .pill {
    display: none;
  }
}
</style>