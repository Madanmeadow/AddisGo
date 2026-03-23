<template>
  <Layout>
    <div class="page">
      <div class="head">
        <div>
          <div class="title">👥 People</div>
          <div class="sub">See who is online, live, and ready to connect</div>
        </div>

        <div class="headActions">
          <button class="chip" @click="fetchPeople" :disabled="loading">
            {{ loading ? "Loading..." : "↻ Refresh" }}
          </button>
        </div>
      </div>

      <div class="stats">
        <div class="stat">
          <div class="statNum">{{ onlineCount }}</div>
          <div class="statLab">Online</div>
        </div>
        <div class="stat">
          <div class="statNum">{{ liveStreams.length }}</div>
          <div class="statLab">Live</div>
        </div>
        <div class="stat">
          <div class="statNum">{{ people.length }}</div>
          <div class="statLab">People</div>
        </div>
      </div>

      <div class="searchWrap">
        <input v-model="search" class="search" placeholder="Search people..." />
      </div>

      <div v-if="error" class="alert">{{ error }}</div>

      <div v-if="loading" class="state">
        <div class="big">Loading people...</div>
      </div>

      <div v-else-if="filteredPeople.length === 0" class="state">
        <div class="big">No users found</div>
        <div class="small">Try another search.</div>
      </div>

      <div v-else class="list">
        <div
          v-for="u in filteredPeople"
          :key="u.id"
          class="card"
        >
          <div class="avatarWrap">
            <img
              v-if="u.avatar_url"
              :src="u.avatar_url"
              class="avatarImg"
              alt=""
            />
            <div v-else class="avatar">
              {{ getInitial(u) }}
            </div>

            <span class="onlineDot" :class="{ on: isOnline(u.id) }"></span>
          </div>

          <div class="meta">
            <div class="nameRow">
              <div class="name">{{ getName(u) }}</div>
              <span v-if="isLiveUser(u)" class="liveBadge">LIVE</span>
            </div>

            <div class="statusRow">
              <span class="status" :class="{ on: isOnline(u.id) }"></span>
              <span>{{ isOnline(u.id) ? "Online" : "Offline" }}</span>
              <span class="sep">•</span>
              <span>ID {{ u.id }}</span>
            </div>

            <div v-if="u.bio || u.location" class="extra">
              {{ u.bio || u.location }}
            </div>
          </div>

          <div class="actions">
            <button class="action" @click="openMessages(u)">
              💬 <span>Message</span>
            </button>

            <button
              class="action"
              :disabled="!isOnline(u.id)"
              @click="startCall(u, 'audio')"
            >
              📞 <span>Audio</span>
            </button>

            <button
              class="action"
              :disabled="!isOnline(u.id)"
              @click="startCall(u, 'video')"
            >
              🎥 <span>Video</span>
            </button>

            <button class="action ghost" @click="openProfile(u)">
              👤 <span>Profile</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </Layout>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import Layout from "../components/Layout.vue";
import socket, { refreshSocketAuth } from "../socket";

const router = useRouter();

const API_URL = (import.meta.env.VITE_API_URL || "https://addisgo-production-63ae.up.railway.app").replace(/\/$/, "");
const token = localStorage.getItem("token") || "";

const me = (() => {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
})();

const people = ref([]);
const loading = ref(false);
const error = ref("");
const search = ref("");

const onlineUserIds = ref([]);
const liveStreams = ref([]);

function authHeaders() {
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
  if (!res.ok) {
    throw new Error(data?.error || "Request failed");
  }
  return data;
}

function getName(u) {
  return (
    u?.display_name ||
    u?.username ||
    u?.name ||
    u?.email ||
    `User ${u?.id || ""}`
  );
}

function getInitial(u) {
  return getName(u)[0]?.toUpperCase() || "U";
}

function isOnline(userId) {
  return onlineUserIds.value.includes(String(userId));
}

function isLiveUser(user) {
  const id = String(user?.id || "");
  const name = String(getName(user) || "").toLowerCase();
  return liveStreams.value.some((entry) => {
    const s = String(entry || "").toLowerCase();
    return s === id || s === name;
  });
}

const onlineCount = computed(() => onlineUserIds.value.length);

const filteredPeople = computed(() => {
  const q = search.value.trim().toLowerCase();

  const filtered = people.value.filter((u) => {
    if (String(u.id) === String(me?.id || "")) return false;
    if (!q) return true;

    return (
      getName(u).toLowerCase().includes(q) ||
      String(u?.email || "").toLowerCase().includes(q) ||
      String(u?.location || "").toLowerCase().includes(q)
    );
  });

  return filtered.sort((a, b) => {
    const aOnline = isOnline(a.id) ? 1 : 0;
    const bOnline = isOnline(b.id) ? 1 : 0;
    const aLive = isLiveUser(a) ? 1 : 0;
    const bLive = isLiveUser(b) ? 1 : 0;

    if (bLive !== aLive) return bLive - aLive;
    if (bOnline !== aOnline) return bOnline - aOnline;

    return getName(a).localeCompare(getName(b));
  });
});

async function fetchPeople() {
  loading.value = true;
  error.value = "";

  try {
    const data = await apiGet("/users");
    people.value = Array.isArray(data) ? data : [];
  } catch (e) {
    error.value = e?.message || "Failed to load people";
    people.value = [];
  } finally {
    loading.value = false;
  }
}

async function ensureConversationWith(user) {
  try {
    let data;
    try {
      data = await fetch(`${API_URL}/conversations/conversations`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          userId1: me?.id,
          userId2: user.id,
        }),
      }).then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j?.error || "Failed to create conversation");
        return j;
      });
    } catch {
      data = await fetch(`${API_URL}/conversations`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          userId1: me?.id,
          userId2: user.id,
        }),
      }).then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j?.error || "Failed to create conversation");
        return j;
      });
    }

    return data?.id ? String(data.id) : "";
  } catch {
    return "";
  }
}

async function openMessages(user) {
  const convoId = await ensureConversationWith(user);

  router.push({
    path: "/messages",
    query: {
      conversationId: convoId,
      userId: user.id,
      name: getName(user),
    },
  });
}

function startCall(user, kind = "audio") {
  router.push({
    path: "/call",
    query: {
      userId: user.id,
      name: getName(user),
      kind,
    },
  });
}

function openProfile(user) {
  router.push(`/profile/${user.id}`);
}

function onPresenceList(payload) {
  onlineUserIds.value = Array.isArray(payload?.onlineUserIds)
    ? payload.onlineUserIds.map(String)
    : [];
}

function onPresenceUpdate(payload) {
  const uid = String(payload?.userId || "");
  if (!uid) return;

  if (payload?.online) {
    if (!onlineUserIds.value.includes(uid)) {
      onlineUserIds.value = [...onlineUserIds.value, uid];
    }
  } else {
    onlineUserIds.value = onlineUserIds.value.filter((id) => id !== uid);
  }
}

function onLiveList(payload) {
  liveStreams.value = Array.isArray(payload) ? payload : [];
}

onMounted(async () => {
  await fetchPeople();

  refreshSocketAuth();

  socket.on("presence:list", onPresenceList);
  socket.on("presence:update", onPresenceUpdate);
  socket.on("live-list", onLiveList);

  if (socket.connected && me?.id) {
    socket.emit("user:online", {
      userId: String(me.id),
      username: me?.username || me?.name || `User${me.id}`,
    });
  }
});

onBeforeUnmount(() => {
  socket.off("presence:list", onPresenceList);
  socket.off("presence:update", onPresenceUpdate);
  socket.off("live-list", onLiveList);
});
</script>

<style scoped>
.page {
  max-width: 1100px;
  margin: 0 auto;
  padding: 18px;
  color: #fff;
}
.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
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
.headActions {
  display: flex;
  gap: 10px;
}
.chip {
  border: none;
  border-radius: 999px;
  padding: 10px 14px;
  background: rgba(255,255,255,0.12);
  color: #fff;
  font-weight: 800;
  cursor: pointer;
}
.stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 14px;
}
.stat {
  padding: 14px;
  border-radius: 16px;
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.1);
}
.statNum {
  font-size: 22px;
  font-weight: 900;
}
.statLab {
  opacity: 0.7;
  font-weight: 700;
  margin-top: 4px;
}
.searchWrap {
  margin-bottom: 14px;
}
.search {
  width: 100%;
  border: none;
  outline: none;
  border-radius: 16px;
  padding: 14px 16px;
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
  background: rgba(255,255,255,0.08);
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
  gap: 12px;
}
.card {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 12px;
  align-items: center;
  padding: 12px;
  border-radius: 18px;
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.12);
}
.avatarWrap {
  position: relative;
}
.avatar,
.avatarImg {
  width: 56px;
  height: 56px;
  border-radius: 18px;
  object-fit: cover;
}
.avatar {
  display: grid;
  place-items: center;
  background: linear-gradient(45deg, #7c3aed, #2563eb);
  font-weight: 900;
  font-size: 20px;
}
.onlineDot {
  position: absolute;
  right: -2px;
  bottom: -2px;
  width: 14px;
  height: 14px;
  border-radius: 999px;
  background: #475569;
  border: 2px solid #0b1220;
}
.onlineDot.on {
  background: #22c55e;
}
.meta {
  min-width: 0;
}
.nameRow {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.name {
  font-size: 17px;
  font-weight: 900;
}
.liveBadge {
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(255, 55, 95, 0.16);
  border: 1px solid rgba(255, 55, 95, 0.32);
  color: #ff8aa7;
  font-size: 11px;
  font-weight: 900;
}
.statusRow {
  display: flex;
  gap: 6px;
  align-items: center;
  opacity: 0.78;
  margin-top: 4px;
  font-size: 13px;
  flex-wrap: wrap;
}
.status {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #64748b;
}
.status.on {
  background: #22c55e;
}
.sep {
  opacity: 0.45;
}
.extra {
  margin-top: 6px;
  opacity: 0.75;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.action {
  border: none;
  border-radius: 14px;
  padding: 10px 12px;
  background: rgba(255,255,255,0.1);
  color: white;
  font-weight: 800;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.action.ghost {
  background: rgba(255,255,255,0.06);
}
.action:disabled {
  opacity: 0.45;
  cursor: default;
}
@media (max-width: 760px) {
  .page {
    padding: 14px;
  }
  .stats {
    grid-template-columns: repeat(3, 1fr);
  }
  .card {
    grid-template-columns: auto 1fr;
  }
  .actions {
    grid-column: 1 / -1;
    justify-content: stretch;
  }
  .action {
    flex: 1;
    justify-content: center;
  }
}
</style>