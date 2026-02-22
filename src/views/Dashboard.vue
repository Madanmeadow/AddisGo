<template>
  <Layout>
    <div class="container">

      <!-- CREATE POST -->
      <div class="create">
        <textarea v-model="content" placeholder="What's happening?" />
        <div class="row">
          <input type="file" @change="handleFile" />
          <button @click="submitPost">Post 🚀</button>
        </div>
      </div>

      <!-- LIVE STREAMS -->
      <div class="live-section">
        <h2>🔴 Live Now</h2>

        <button class="go-live" @click="startLive">
          Go Live
        </button>

        <div class="live-grid">
          <div
            v-for="stream in liveStreams"
            :key="stream"
            class="live-card"
            @click="joinLive(stream)"
          >
            🔴 {{ stream }}
          </div>
        </div>
      </div>

      <!-- POSTS -->
      <div v-for="post in posts" :key="post.id" class="post">

        <div class="header">
          <div class="avatar">
            {{ post.name?.charAt(0) }}
          </div>
          <div>
            <strong>{{ post.name }}</strong>
            <div class="date">
              {{ new Date(post.created_at).toLocaleString() }}
            </div>
          </div>
        </div>

        <div v-if="post.caption" class="caption">
          {{ post.caption }}
        </div>

        <img
          v-if="post.image_url"
          :src="getMedia(post.image_url)"
          class="media"
        />

        <video
          v-if="post.video_url"
          controls
          :src="getMedia(post.video_url)"
          class="media"
        ></video>

      </div>

    </div>
  </Layout>
</template>

<script setup>
import { ref, onMounted } from "vue";
import Layout from "../components/Layout.vue";
import { io } from "socket.io-client";

const apiUrl = import.meta.env.VITE_API_URL;
const token = localStorage.getItem("token");
const user = JSON.parse(localStorage.getItem("user"));

const socket = io(apiUrl);

const posts = ref([]);
const content = ref("");
const file = ref(null);
const liveStreams = ref([]);

/* ===== POSTS ===== */

async function fetchPosts() {
  const res = await fetch(`${apiUrl}/posts`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  posts.value = await res.json();
}

async function submitPost() {
  const form = new FormData();
  form.append("content", content.value);
  if (file.value) form.append("file", file.value);

  await fetch(`${apiUrl}/posts`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form
  });

  content.value = "";
  fetchPosts();
}

function handleFile(e) {
  file.value = e.target.files[0];
}

/* ===== MEDIA FIX ===== */

function getMedia(url) {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${apiUrl}${url}`;
}

/* ===== LIVE ===== */

function startLive() {
  socket.emit("start-live", { userId: user.id });
}

function joinLive(streamId) {
  socket.emit("join-live", streamId);
  alert("Joined " + streamId);
}

socket.on("live-list", (streams) => {
  liveStreams.value = streams;
});

/* ===== INIT ===== */

onMounted(() => {
  fetchPosts();
});
</script>

<style scoped>
.container {
  max-width: 800px;
  margin: auto;
  padding: 30px;
}

.create {
  background: rgba(255,255,255,0.08);
  padding: 20px;
  border-radius: 20px;
  margin-bottom: 30px;
}

textarea {
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  resize: none;
  margin-bottom: 10px;
}

button {
  background: linear-gradient(45deg,#ff416c,#ff4b2b);
  color: white;
  border: none;
  padding: 8px 18px;
  border-radius: 12px;
  cursor: pointer;
}

.post {
  background: rgba(0,0,0,0.6);
  padding: 18px;
  border-radius: 20px;
  margin-bottom: 25px;
}

.media {
  width: 100%;
  max-height: 600px;
  object-fit: cover;
  border-radius: 18px;
  margin-top: 15px;
}

.live-section {
  margin-bottom: 40px;
}

.live-card {
  background: rgba(255,0,0,0.2);
  padding: 15px;
  border-radius: 15px;
  margin: 10px 0;
  cursor: pointer;
}

.go-live {
  margin-bottom: 15px;
}
</style>