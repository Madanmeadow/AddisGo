<template>
  <Layout>
    <div class="page">
      <div class="head">
        <div>
          <div class="title">👥 People</div>
          <div class="sub">Find users, message them, or start a 1-to-1 call</div>
        </div>
        <button class="btn" @click="refreshAll">↻ Refresh</button>
      </div>

      <input
        v-model="search"
        class="search"
        type="text"
        placeholder="Search people..."
      />

      <div v-if="loading" class="state">Loading people…</div>
      <div v-else-if="error" class="state err">{{ error }}</div>

      <div v-else class="list">
        <div v-if="filteredUsers.length === 0" class="empty">
          <div class="big">No users found</div>
        </div>

        <div v-for="u in filteredUsers" :key="u.id" class="row">
          <div class="avatar">
            <img
              v-if="u.avatar_url"
              :src="mediaUrl(u.avatar_url)"
              class="avatarImg"
              alt="avatar"
            />
            <span v-else>{{ initials(u.username || u.name || "U") }}</span>
          </div>

          <div class="info">
            <div class="nameRow">
              <div class="name">{{ u.username || u.name || `User #${u.id}` }}</div>
              <span class="status" :class="{ on: isOnline(u.id) }">
                {{ isOnline(u.id) ? "Online" : "Offline" }}
              </span>
            </div>

            <div class="meta">
              {{ u.bio || u.email || "Pulse member" }}
            </div>
          </div>

          <div class="actions">
            <button class="pill" @click="openProfile(u)">Profile</button>
            <button class="pill success" @click="startMessage(u)">Text</button>
            <button class="pill hot" @click="startCall(u, 'video')">Video</button>
            <button class="pill audio" @click="startCall(u, 'audio')">Audio</button>
          </div>
        </div>
      </div>
    </div>
  </Layout>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount, ref } from "vue";
import { useRouter } from "vue-router";
import { io } from "socket.io-client";
import Layout from "../components/Layout.vue";

const router = useRouter();
const apiBase = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");
const token = localStorage.getItem("token") || "";

const loading = ref(false);
const error = ref("");
const users = ref([]);
const search = ref("");
const onlineUserIds = ref([]);

let socket = null;

function getMe() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

function authHeaders(extra = {}) {
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

function initials(name) {
  return String(name || "U").trim().charAt(0).toUpperCase();
}

function mediaUrl(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path) || path.startsWith("blob:") || path.startsWith("data:")) return path;
  return `${apiBase}${path.startsWith("/") ? "" : "/"}${path}`;
}

function isOnline(userId) {
  return onlineUserIds.value.includes(String(userId));
}

const filteredUsers = computed(() => {
  const me = getMe();
  const q = search.value.trim().toLowerCase();

  return users.value
    .filter((u) => String(u.id) !== String(me?.id || ""))
    .filter((u) => {
      if (!q) return true;
      return [u.username, u.name, u.email]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
});

async function loadUsers() {
  loading.value = true;
  error.value = "";

  try {
    const res = await fetch(`${apiBase}/users`, {
      headers: authHeaders(),
    });

    const data = await res.json().catch(() => ([]));

    if (!res.ok) {
      throw new Error(data?.error || "Failed to load users");
    }

    users.value = Array.isArray(data) ? data : (data?.users || []);
  } catch (e) {
    error.value = e?.message || "Failed to load users";
  } finally {
    loading.value = false;
  }
}

function connectPresence() {
  const me = getMe();

  try {
    socket = io(apiBase, {
      transports: ["websocket"],
      auth: { token },
    });

    socket.on("connect", () => {
      if (me?.id) {
        socket.emit("register-user", {
          id: String(me.id),
          username: me?.username || me?.display_name || me?.name || "User",
        });
      }
    });

    socket.on("presence:list", ({ onlineUserIds: ids }) => {
      onlineUserIds.value = Array.isArray(ids) ? ids.map(String) : [];
    });

    socket.on("presence:update", ({ userId, online }) => {
      const id = String(userId);
      const set = new Set(onlineUserIds.value.map(String));
      if (online) set.add(id);
      else set.delete(id);
      onlineUserIds.value = Array.from(set);
    });
  } catch (e) {
    console.error("presence socket error:", e);
  }
}

function openProfile(u) {
  router.push(`/profile/${u.id}`);
}

async function startMessage(u) {
  const me = getMe();
  if (!me?.id) {
    error.value = "Login again.";
    return;
  }

  try {
    const res = await fetch(`${apiBase}/conversations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify({
        userId1: me.id,
        userId2: u.id,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data?.error || "Failed to open chat");
    }

    const conversationId = data?.id || data?.conversation?.id;
    if (!conversationId) throw new Error("Could not create conversation");

    router.push({
      path: "/messages",
      query: {
        conversationId,
        otherUserId: u.id,
        name: u.username || u.name || "Chat",
      },
    });
  } catch (e) {
    error.value = e?.message || "Failed to open chat";
  }
}

function startCall(u, kind = "video") {
  const roomId = `call_${Date.now()}_${u.id}`;
  router.push(
    `/call?roomId=${roomId}&kind=${kind}&mode=caller&toUserId=${u.id}&name=${encodeURIComponent(
      u.username || u.name || "User"
    )}`
  );
}

async function refreshAll() {
  await loadUsers();
}

onMounted(async () => {
  await loadUsers();
  connectPresence();
});

onBeforeUnmount(() => {
  try {
    socket?.disconnect?.();
  } catch {}
});
</script>

<style scoped>
.page{max-width:980px;margin:0 auto;padding:18px;color:#fff}
.head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:14px}
.title{font-size:26px;font-weight:900}
.sub{opacity:.76}
.btn,.pill{
  border:none;border-radius:999px;padding:10px 14px;
  background:rgba(255,255,255,.12);color:#fff;font-weight:800
}
.search{
  width:100%;margin-bottom:14px;padding:14px 16px;border-radius:16px;
  border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.08);color:#fff;outline:none
}
.state{padding:16px;border-radius:14px;background:rgba(255,255,255,.08)}
.state.err{border:1px solid rgba(255,80,80,.35)}
.list{display:flex;flex-direction:column;gap:10px}
.row{
  display:flex;align-items:center;gap:12px;padding:14px;border-radius:18px;
  background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12)
}
.avatar{
  width:52px;height:52px;border-radius:16px;display:grid;place-items:center;
  background:linear-gradient(45deg,#7c4dff,#ff4d6d);font-weight:900;font-size:20px;
  overflow:hidden;flex:0 0 auto
}
.avatarImg{width:100%;height:100%;object-fit:cover}
.info{flex:1;min-width:0}
.nameRow{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.name{font-weight:900;font-size:18px}
.meta{opacity:.72;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.status{
  padding:6px 10px;border-radius:999px;
  background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);
  font-size:12px;font-weight:900
}
.status.on{
  background:rgba(0,255,170,.16);border-color:rgba(0,255,170,.22)
}
.actions{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end}
.pill.success{background:rgba(0,255,170,.16);border:1px solid rgba(0,255,170,.22)}
.pill.hot{background:rgba(255,82,82,.16);border:1px solid rgba(255,82,82,.22)}
.pill.audio{background:rgba(91,140,255,.16);border:1px solid rgba(91,140,255,.22)}
.empty{padding:18px;border-radius:16px;background:rgba(255,255,255,.07)}
.big{font-weight:900;font-size:18px}
@media (max-width: 640px){
  .row{flex-direction:column;align-items:flex-start}
  .actions{width:100%;justify-content:flex-start}
}
</style>