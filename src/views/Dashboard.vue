<template>
  <div class="dashboard">

    <!-- SIDEBAR -->
    <aside class="sidebar">
      <h1 class="logo">🔥 AddisGo</h1>

      <nav>
        <router-link to="/dashboard">🏠 Home</router-link>
        <router-link to="/messages">💬 Inbox</router-link>
        <router-link to="/live">📹 Live</router-link>
      </nav>

      <div class="profile">
        <div class="avatar-big">
          {{ user?.name?.charAt(0).toUpperCase() }}
        </div>
        <p>{{ user?.name }}</p>
        <button @click="logout">Logout</button>
      </div>
    </aside>

    <!-- MAIN -->
    <main class="main">

      <!-- CREATE POST -->
      <div class="create-post">
        <textarea
          v-model="content"
          placeholder="What's happening?"
        ></textarea>

        <!-- PREVIEW -->
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

      <!-- FEED -->
      <div class="feed">
        <div
          class="post-card"
          v-for="post in posts"
          :key="post.id"
        >

          <div class="post-header">
            <div class="avatar">
              {{ post.name?.charAt(0).toUpperCase() }}
            </div>

            <div class="post-meta">
              <strong>{{ post.name }}</strong>
              <span>{{ formatDate(post.created_at) }}</span>
            </div>
          </div>

          <!-- TEXT -->
          <p v-if="post.caption" class="caption">
            {{ post.caption }}
          </p>

          <!-- IMAGE -->
          <img
            v-if="post.image_url"
            :src="apiUrl + post.image_url"
            class="media"
          />

          <!-- VIDEO -->
          <video
            v-if="post.video_url"
            controls
            class="media"
            :src="apiUrl + post.video_url"
          ></video>

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
  background: linear-gradient(135deg, #141e30, #243b55);
  color: white;
}

/* SIDEBAR */
.sidebar {
  width: 260px;
  padding: 30px;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(12px);
  display: flex;
  flex-direction: column;
}

.logo {
  font-size: 28px;
  margin-bottom: 40px;
}

.sidebar nav {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.sidebar a {
  color: white;
  font-size: 18px;
  text-decoration: none;
  transition: 0.3s;
}

.sidebar a:hover {
  color: #ff416c;
}

.profile {
  margin-top: auto;
  text-align: center;
}

.avatar-big {
  width: 70px;
  height: 70px;
  background: linear-gradient(45deg, #ff416c, #ff4b2b);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  margin: 0 auto 10px;
}

.profile button {
  padding: 8px 16px;
  background: crimson;
  border: none;
  border-radius: 8px;
  color: white;
  cursor: pointer;
}

/* MAIN */
.main {
  flex: 1;
  padding: 40px;
}

/* CREATE POST */
.create-post {
  background: rgba(255,255,255,0.1);
  padding: 25px;
  border-radius: 20px;
  margin-bottom: 40px;
}

textarea {
  width: 100%;
  height: 120px;
  padding: 15px;
  border-radius: 12px;
  border: none;
  resize: none;
  font-size: 16px;
}

.actions {
  margin-top: 15px;
  display: flex;
  justify-content: space-between;
}

.actions button {
  padding: 10px 20px;
  background: linear-gradient(45deg, #ff416c, #ff4b2b);
  border: none;
  border-radius: 10px;
  color: white;
  cursor: pointer;
}

/* PREVIEW */
.preview img,
.preview video {
  width: 100%;
  margin-top: 15px;
  border-radius: 15px;
}

/* FEED */
.feed {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.post-card {
  background: rgba(0,0,0,0.6);
  padding: 25px;
  border-radius: 20px;
  transition: 0.3s;
}

.post-card:hover {
  transform: translateY(-4px);
}

.post-header {
  display: flex;
  gap: 15px;
  align-items: center;
}

.avatar {
  width: 50px;
  height: 50px;
  background: linear-gradient(45deg, #ff416c, #ff4b2b);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.post-meta span {
  font-size: 12px;
  opacity: 0.7;
}

.caption {
  margin: 15px 0;
  font-size: 17px;
}

.media {
  width: 100%;
  border-radius: 15px;
  margin-top: 10px;
}
</style>