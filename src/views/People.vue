<template>
  <Layout>
    <div class="page">
      <div class="head">
        <div>
          <div class="title">👥 People</div>
          <div class="sub">Find users, message them, or start a 1-to-1 call</div>
        </div>
        <button class="btn" @click="loadUsers">↻ Refresh</button>
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
          <div class="avatar">{{ initials(u.username || u.name || "U") }}</div>

          <div class="info">
            <div class="name">{{ u.username || u.name || `User #${u.id}` }}</div>
            <div class="meta">{{ u.bio || u.email || "Pulse member" }}</div>
          </div>

          <div class="actions">
            <button class="pill" @click="openProfile(u)">Profile</button>
            <button class="pill success" @click="startMessage(u)">Message</button>
            <button class="pill hot" @click="startCall(u, 'video')">Call</button>
          </div>
        </div>
      </div>
    </div>
  </Layout>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import Layout from "../components/Layout.vue";
import apiFetch from "../apiFetch.js";

const router = useRouter();

const loading = ref(false);
const error = ref("");
const users = ref([]);
const search = ref("");

function getMe() {
  try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; }
}

function initials(name) {
  return String(name || "U").trim().charAt(0).toUpperCase();
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
    const data = await apiFetch("/users");
    users.value = Array.isArray(data) ? data : (data?.users || []);
  } catch (e) {
    error.value = e?.message || "Failed to load users";
  } finally {
    loading.value = false;
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
    const data = await apiFetch("/conversations", {
      method: "POST",
      body: JSON.stringify({
        userId1: me.id,
        userId2: u.id,
      }),
    });

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

onMounted(loadUsers);
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
  width:48px;height:48px;border-radius:16px;display:grid;place-items:center;
  background:linear-gradient(45deg,#7c4dff,#ff4d6d);font-weight:900;font-size:20px
}
.info{flex:1;min-width:0}
.name{font-weight:900;font-size:18px}
.meta{opacity:.72;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.actions{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end}
.pill.success{background:rgba(0,255,170,.16);border:1px solid rgba(0,255,170,.22)}
.pill.hot{background:rgba(255,82,82,.16);border:1px solid rgba(255,82,82,.22)}
.empty{padding:18px;border-radius:16px;background:rgba(255,255,255,.07)}
.big{font-weight:900;font-size:18px}
@media (max-width: 640px){
  .row{flex-direction:column;align-items:flex-start}
  .actions{width:100%;justify-content:flex-start}
}
</style>