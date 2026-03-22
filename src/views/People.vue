<template>
  <Layout>
    <div class="page">
      <div class="bg-orb orb1"></div>
      <div class="bg-orb orb2"></div>

      <header class="head glass">
        <div>
          <div class="title">👥 People</div>
          <div class="sub">Find users, message them, or start audio/video calls</div>
        </div>

        <div class="headActions">
          <button class="btn" @click="refreshAll">↻ Refresh</button>
        </div>
      </header>

      <section class="toolbar glass">
        <input
          v-model="search"
          class="search"
          type="text"
          placeholder="Search people..."
        />

        <div class="stats">
          <span class="pill success">Online {{ onlineCount }}</span>
          <span class="pill">Total {{ filteredUsers.length }}</span>
        </div>
      </section>

      <section v-if="error" class="errorBox glass">
        {{ error }}
      </section>

      <section v-if="loading" class="state glass">
        Loading people…
      </section>

      <section v-else class="list">
        <div v-if="filteredUsers.length === 0" class="empty glass">
          <div class="emptyTitle">No users found</div>
          <div class="emptySub">Try another search or refresh the list.</div>
        </div>

        <article v-for="u in filteredUsers" :key="u.id" class="person glass">
          <div class="personTop">
            <div class="identity" @click="openProfile(u)">
              <div class="avatarWrap">
                <img
                  v-if="u.avatar_url || u.avatarUrl"
                  :src="mediaUrl(u.avatar_url || u.avatarUrl)"
                  class="avatarImg"
                  alt="avatar"
                />
                <div v-else class="avatarFallback">
                  {{ initials(u.username || u.name || "U") }}
                </div>

                <span class="onlineDot" :class="{ on: isOnline(u.id) }"></span>
              </div>

              <div class="meta">
                <div class="nameRow">
                  <div class="name">{{ u.username || u.name || `User #${u.id}` }}</div>
                  <span class="statusTag" :class="{ on: isOnline(u.id) }">
                    {{ isOnline(u.id) ? "Online" : "Offline" }}
                  </span>
                </div>

                <div class="desc">
                  {{ u.bio || u.email || "Pulse member" }}
                </div>
              </div>
            </div>
          </div>

          <div class="actionGrid">
            <button class="actionBtn profile" @click="openProfile(u)">
              👤 Profile
            </button>

            <button class="actionBtn message" @click="startMessage(u)">
              💬 Text
            </button>

            <button class="actionBtn video" @click="startCall(u, 'video')">
              📹 Video
            </button>

            <button class="actionBtn audio" @click="startCall(u, 'audio')">
              🎧 Audio
            </button>
          </div>
        </article>
      </section>
    </div>
  </Layout>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import Layout from "../components/Layout.vue";
import socket from "../socket.js";

const router = useRouter();
const apiBase = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");
const token = localStorage.getItem("token") || "";

const loading = ref(false);
const error = ref("");
const search = ref("");
const users = ref([]);
const onlineUserIds = ref([]);

let cleanupPresence = null;

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
  if (/^https?:\/\//i.test(path) || path.startsWith("blob:") || path.startsWith("data:")) {
    return path;
  }
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
      return [u.username, u.name, u.email, u.bio]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    })
    .sort((a, b) => {
      const aOn = isOnline(a.id) ? 1 : 0;
      const bOn = isOnline(b.id) ? 1 : 0;
      return bOn - aOn;
    });
});

const onlineCount = computed(() => filteredUsers.value.filter((u) => isOnline(u.id)).length);

async function loadUsers() {
  loading.value = true;
  error.value = "";

  try {
    const res = await fetch(`${apiBase}/users`, {
      headers: authHeaders(),
    });

    const data = await res.json().catch(() => ([]));

    if (!res.ok) {
      throw new Error(data?.error || `Failed to load users (${res.status})`);
    }

    users.value = Array.isArray(data) ? data : data?.users || [];
  } catch (e) {
    error.value = e?.message || "Failed to load users";
  } finally {
    loading.value = false;
  }
}

function connectPresence() {
  const me = getMe();

  const onConnect = () => {
    if (me?.id) {
      socket.emit("register-user", {
        id: String(me.id),
        username: me?.username || me?.display_name || me?.name || "User",
      });
      socket.emit("presence:get");
    }
  };

  const onPresenceList = ({ onlineUserIds: ids }) => {
    onlineUserIds.value = Array.isArray(ids) ? ids.map(String) : [];
  };

  const onPresenceUpdate = ({ userId, online }) => {
    const set = new Set(onlineUserIds.value.map(String));
    const id = String(userId);
    if (online) set.add(id);
    else set.delete(id);
    onlineUserIds.value = Array.from(set);
  };

  socket.on("connect", onConnect);
  socket.on("presence:list", onPresenceList);
  socket.on("presence:update", onPresenceUpdate);

  if (socket.connected) onConnect();

  return () => {
    socket.off("connect", onConnect);
    socket.off("presence:list", onPresenceList);
    socket.off("presence:update", onPresenceUpdate);
  };
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

  if (String(u.id) === String(me.id)) {
    error.value = "You cannot message yourself.";
    return;
  }

  error.value = "";

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
      throw new Error(data?.error || `Failed to create conversation (${res.status})`);
    }

    const conversationId = data?.id || data?.conversation?.id;
    if (!conversationId) {
      throw new Error("Conversation id missing from server response");
    }

    router.push({
      path: "/messages",
      query: {
        conversationId,
        otherUserId: u.id,
        name: u.username || u.name || "Chat",
      },
    });
  } catch (e) {
    error.value = e?.message || "Failed to create conversation";
  }
}

function startCall(u, kind = "video") {
  const me = getMe();

  if (!me?.id) {
    error.value = "Login again.";
    return;
  }

  if (String(u.id) === String(me.id)) {
    error.value = "You cannot call yourself.";
    return;
  }

  error.value = "";

  const roomId = `call_${Date.now()}_${u.id}`;
  router.push(
    `/call?roomId=${encodeURIComponent(roomId)}&kind=${encodeURIComponent(kind)}&mode=caller&toUserId=${encodeURIComponent(
      u.id
    )}&name=${encodeURIComponent(u.username || u.name || "User")}`
  );
}

async function refreshAll() {
  await loadUsers();
  if (socket.connected) {
    socket.emit("presence:get");
  }
}

onMounted(async () => {
  await loadUsers();
  cleanupPresence = connectPresence();
});

onBeforeUnmount(() => {
  try {
    cleanupPresence?.();
  } catch {}
});
</script>

<style scoped>
.page{
  position:relative;
  max-width:980px;
  margin:0 auto;
  padding:18px 18px 110px;
  color:#fff;
  overflow:hidden;
}

.bg-orb{
  position:fixed;
  border-radius:999px;
  filter:blur(90px);
  pointer-events:none;
  opacity:.22;
}
.orb1{
  width:220px;
  height:220px;
  left:-60px;
  top:70px;
  background:rgba(124,77,255,.38);
}
.orb2{
  width:240px;
  height:240px;
  right:-70px;
  top:180px;
  background:rgba(255,77,109,.28);
}

.glass{
  position:relative;
  z-index:1;
  background:rgba(255,255,255,.07);
  border:1px solid rgba(255,255,255,.12);
  backdrop-filter:blur(16px);
  -webkit-backdrop-filter:blur(16px);
  box-shadow:0 14px 44px rgba(0,0,0,.22);
  border-radius:24px;
}

.head{
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:12px;
  padding:18px;
  margin-bottom:14px;
}

.title{
  font-size:34px;
  font-weight:950;
  line-height:1;
}

.sub{
  margin-top:8px;
  opacity:.8;
  font-size:16px;
  line-height:1.4;
}

.headActions{
  display:flex;
  gap:10px;
  flex-wrap:wrap;
}

.toolbar{
  padding:16px;
  margin-bottom:14px;
}

.search{
  width:100%;
  padding:14px 16px;
  border-radius:16px;
  border:1px solid rgba(255,255,255,.12);
  background:rgba(255,255,255,.06);
  color:#fff;
  outline:none;
  font-size:15px;
}

.search::placeholder{
  color:rgba(255,255,255,.6);
}

.stats{
  display:flex;
  gap:8px;
  flex-wrap:wrap;
  margin-top:12px;
}

.pill,.btn{
  border:none;
  border-radius:999px;
  padding:10px 14px;
  color:#fff;
  font-weight:800;
  background:rgba(255,255,255,.12);
}

.pill.success{
  background:rgba(0,255,170,.16);
  border:1px solid rgba(0,255,170,.22);
}

.errorBox,
.state,
.empty{
  padding:16px 18px;
  margin-bottom:14px;
}

.errorBox{
  color:#ffd7dd;
  border-color:rgba(255,80,80,.35);
}

.emptyTitle{
  font-size:20px;
  font-weight:900;
}

.emptySub{
  margin-top:6px;
  opacity:.75;
}

.list{
  display:grid;
  gap:12px;
}

.person{
  padding:16px;
}

.personTop{
  margin-bottom:14px;
}

.identity{
  display:flex;
  align-items:center;
  gap:14px;
  cursor:pointer;
}

.avatarWrap{
  position:relative;
  width:64px;
  height:64px;
  flex:0 0 auto;
}

.avatarImg,
.avatarFallback{
  width:100%;
  height:100%;
  border-radius:18px;
  object-fit:cover;
}

.avatarFallback{
  display:grid;
  place-items:center;
  background:linear-gradient(135deg,#7c4dff,#ff4d6d);
  font-size:24px;
  font-weight:900;
}

.onlineDot{
  position:absolute;
  right:-2px;
  bottom:-2px;
  width:16px;
  height:16px;
  border-radius:50%;
  background:#6b7280;
  border:2px solid rgba(11,17,33,.95);
}

.onlineDot.on{
  background:#00d084;
}

.meta{
  min-width:0;
  flex:1;
}

.nameRow{
  display:flex;
  align-items:center;
  gap:8px;
  flex-wrap:wrap;
}

.name{
  font-size:20px;
  font-weight:900;
  word-break:break-word;
}

.statusTag{
  padding:6px 10px;
  border-radius:999px;
  background:rgba(255,255,255,.08);
  border:1px solid rgba(255,255,255,.12);
  font-size:12px;
  font-weight:900;
}

.statusTag.on{
  background:rgba(0,255,170,.16);
  border-color:rgba(0,255,170,.22);
}

.desc{
  margin-top:6px;
  opacity:.74;
  font-size:14px;
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
}

.actionGrid{
  display:grid;
  grid-template-columns:repeat(4, minmax(0, 1fr));
  gap:10px;
}

.actionBtn{
  min-height:48px;
  border:none;
  border-radius:16px;
  color:#fff;
  font-weight:900;
  font-size:14px;
  padding:12px 10px;
  background:rgba(255,255,255,.08);
  border:1px solid rgba(255,255,255,.12);
}

.actionBtn.profile{
  background:rgba(255,255,255,.08);
}

.actionBtn.message{
  background:rgba(0,255,170,.14);
  border-color:rgba(0,255,170,.18);
}

.actionBtn.video{
  background:rgba(255,82,82,.14);
  border-color:rgba(255,82,82,.18);
}

.actionBtn.audio{
  background:rgba(91,140,255,.14);
  border-color:rgba(91,140,255,.18);
}

@media (max-width: 760px){
  .title{
    font-size:30px;
  }

  .head{
    flex-direction:column;
    align-items:flex-start;
  }

  .actionGrid{
    grid-template-columns:repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 520px){
  .page{
    padding:14px 14px 110px;
  }

  .title{
    font-size:28px;
  }

  .identity{
    align-items:flex-start;
  }

  .name{
    font-size:18px;
  }

  .desc{
    white-space:normal;
  }

  .actionGrid{
    grid-template-columns:1fr 1fr;
  }
}
</style>