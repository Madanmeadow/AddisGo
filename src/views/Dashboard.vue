<template>
  <div class="dashboard">

    <!-- SIDEBAR -->
    <aside class="sidebar">
      <h2 class="logo">🔥 AddisGo</h2>

      <nav>
        <router-link to="/dashboard">🏠 Home</router-link>
        <router-link to="/messages">💬 Inbox</router-link>
        <router-link to="/live">📹 Live</router-link>
      </nav>

      <div class="user-box">
        <p>{{ user?.name }}</p>
        <button @click="logout">Logout</button>
      </div>
    </aside>

    <!-- MAIN CONTENT -->
    <main class="main">

      <!-- CREATE POST -->
      <div class="create-post">
        <textarea
          v-model="content"
          placeholder="What's happening?"
        ></textarea>

        <!-- Preview -->
        <div v-if="previewUrl" class="preview">
          <img v-if="isImage" :src="previewUrl" />
          <video v-if="isVideo" controls :src="previewUrl"></video>
        </div>

        <div class="actions">
          <input type="file" @change="handleFile" />
          <button @click="createPost" :disabled="loading">
            {{ loading ? "Posting..." : "Post 🚀" }}
          </button>
        </div>
      </div>

      <!-- POSTS FEED -->
      <div class="feed">
        <div class="post-card" v-for="post in posts" :key="post.id">

          <div class="post-header">
            <div class="avatar">{{ post.name?.charAt(0) }}</div>
            <div>
              <strong>{{ post.name }}</strong>
              <div class="time">
                {{ formatDate(post.created_at) }}
              </div>
            </div>
          </div>

          <p v-if="post.caption" class="caption">
            {{ post.caption }}
          </p>

          <img
            v-if="post.image_url"
            :src="apiUrl + post.image_url"
            class="media"
          />

          <video
            v-if="post.video_url"
            controls
            class="media"
          >
            <source :src="apiUrl + post.video_url" />
          </video>

        </div>
      </div>

    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const apiUrl = import.meta.env.VITE_API_URL;

const posts = ref([]);
const content = ref("");
const selectedFile = ref(null);
const previewUrl = ref(null);
const isImage = ref(false);
const isVideo = ref(false);
const loading = ref(false);

const token = localStorage.getItem("token");
const user = JSON.parse(localStorage.getItem("user"));

if (!token) {
  router.push("/login");
}

function logout() {
  localStorage.clear();
  router.push("/login");
}

function handleFile(e) {
  const file = e.target.files[0];
  if (!file) return;

  selectedFile.value = file;
  previewUrl.value = URL.createObjectURL(file);

  isImage.value = file.type.startsWith("image");
  isVideo.value = file.type.startsWith("video");
}

async function fetchPosts() {
  const res = await fetch(`${apiUrl}/posts`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  posts.value = await res.json();
}

async function createPost() {
  if (!content.value && !selectedFile.value) return;

  loading.value = true;

  const formData = new FormData();
  formData.append("content", content.value);

  if (selectedFile.value) {
    formData.append("file", selectedFile.value);
  }

  await fetch(`${apiUrl}/posts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: formData
  });

  content.value = "";
  selectedFile.value = null;
  previewUrl.value = null;

  await fetchPosts();
  loading.value = false;
}

function formatDate(date) {
  return new Date(date).toLocaleString();
}

onMounted(fetchPosts);
</script>

<style scoped>
.dashboard {
  display: flex;
  min-height: 100vh;
  background: linear-gradient(135deg, #1f1c2c, #928dab);
  color: white;
}

/* SIDEBAR */
.sidebar {
  width: 240px;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(10px);
  padding: 30px;
  display: flex;
  flex-direction: column;
}

.logo {
  margin-bottom: 40px;
}

.sidebar nav {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.sidebar a {
  color: white;
  text-decoration: none;
  font-size: 18px;
}

.user-box {
  margin-top: auto;
}

.user-box button {
  margin-top: 10px;
  padding: 8px;
  width: 100%;
  background: crimson;
  border: none;
  color: white;
  border-radius: 6px;
  cursor: pointer;
}

/* MAIN */
.main {
  flex: 1;
  padding: 40px;
}

/* CREATE POST */
.create-post {
  background: rgba(255, 255, 255, 0.1);
  padding: 20px;
  border-radius: 15px;
  margin-bottom: 40px;
}

textarea {
  width: 100%;
  height: 100px;
  border-radius: 10px;
  padding: 10px;
  border: none;
  resize: none;
}

.actions {
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
}

.actions button {
  padding: 10px 20px;
  background: #ff416c;
  border: none;
  color: white;
  border-radius: 8px;
  cursor: pointer;
}

/* PREVIEW */
.preview img,
.preview video {
  width: 100%;
  margin-top: 10px;
  border-radius: 10px;
}

/* FEED */
.feed {
  display: flex;
  flex-direction: column;
  gap: 25px;
}

.post-card {
  background: rgba(0, 0, 0, 0.4);
  padding: 20px;
  border-radius: 15px;
}

.post-header {
  display: flex;
  gap: 15px;
  align-items: center;
}

.avatar {
  width: 45px;
  height: 45px;
  background: linear-gradient(45deg, #ff416c, #ff4b2b);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-weight: bold;
}

.caption {
  margin: 15px 0;
  font-size: 16px;
}

.media {
  width: 100%;
  border-radius: 12px;
}

.time {
  font-size: 12px;
  opacity: 0.7;
}
</style>