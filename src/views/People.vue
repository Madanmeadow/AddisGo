<!-- src/views/People.vue -->
<template>
  <Layout>
    <div class="page">
      <div class="head">
        <div class="title">👥 People</div>
        <button class="btn" @click="fetchPeople">
          {{ loading ? "Loading..." : "Refresh" }}
        </button>
      </div>

      <div v-if="error" class="alert">{{ error }}</div>

      <div v-if="loading" class="state">Loading users...</div>

      <div v-else class="list">
        <div
          v-for="u in people"
          :key="u.id"
          class="card"
        >
          <div class="avatar">
            {{ getInitial(u) }}
          </div>

          <div class="meta">
            <div class="name">{{ getName(u) }}</div>
            <div class="status">
              <span :class="['dot', { on: isOnline(u.id) }]"></span>
              {{ isOnline(u.id) ? "Online" : "Offline" }}
            </div>
          </div>

          <div class="actions">
            <button
              class="icon"
              :disabled="!isOnline(u.id)"
              @click="startChat(u)"
            >
              💬
            </button>

            <button
              class="icon"
              :disabled="!isOnline(u.id)"
              @click="startCall(u)"
            >
              📞
            </button>
          </div>
        </div>
      </div>
    </div>
  </Layout>
</template>

<script>
import axios from "axios";
import socket from "@/socket";

export default {
  data() {
    return {
      people: [],
      loading: false,
      error: "",
      onlineUserIds: [],
      token: localStorage.getItem("token"),
    };
  },

  mounted() {
    this.fetchPeople();

    // ✅ match server presence system
    socket.on("presence:list", ({ onlineUserIds }) => {
      this.onlineUserIds = onlineUserIds || [];
    });

    socket.on("presence:update", ({ userId, online }) => {
      if (online) {
        if (!this.onlineUserIds.includes(userId)) {
          this.onlineUserIds.push(userId);
        }
      } else {
        this.onlineUserIds = this.onlineUserIds.filter(id => id !== userId);
      }
    });
  },

  methods: {
    async fetchPeople() {
      this.loading = true;
      this.error = "";

      try {
        const res = await axios.get("/users", {
          headers: { Authorization: `Bearer ${this.token}` },
        });

        this.people = res.data || [];
      } catch (e) {
        this.error = "Failed to load users";
      } finally {
        this.loading = false;
      }
    },

    isOnline(userId) {
      return this.onlineUserIds.includes(String(userId));
    },

    getName(u) {
      return u.username || u.name || u.email || `User${u.id}`;
    },

    getInitial(u) {
      return this.getName(u)[0]?.toUpperCase();
    },

    startChat(user) {
      this.$router.push(`/messages?userId=${user.id}`);
    },

    startCall(user) {
      // matches your existing system (handled elsewhere)
      socket.emit("call:start", {
        to: String(user.id),
        kind: "audio",
      });
    },
  },
};
</script>

<style scoped>
.page { padding: 12px; }
.head { display:flex; justify-content:space-between; margin-bottom:10px; }
.list { display:flex; flex-direction:column; gap:10px; }
.card { display:flex; align-items:center; gap:10px; padding:10px; border-radius:12px; background:#111; }
.avatar { width:40px; height:40px; display:flex; align-items:center; justify-content:center; background:#333; border-radius:50%; }
.meta { flex:1; }
.name { font-weight:600; }
.status { font-size:12px; opacity:0.7; }
.dot { width:8px; height:8px; border-radius:50%; background:#555; display:inline-block; margin-right:6px; }
.dot.on { background:#0f0; }
.actions { display:flex; gap:6px; }
.icon { background:#222; border:none; padding:6px; border-radius:8px; }
</style>