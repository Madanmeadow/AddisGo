<template>
  <div class="dashboard">
    <aside class="sidebar">
      <h2>🔥 AddisGo</h2>
      <nav>
        <router-link to="/dashboard">Home</router-link>
        <router-link to="/messages">Inbox</router-link>
        <router-link to="/live">Live Call</router-link>
      </nav>
      <button class="logout" @click="logout">Logout</button>
    </aside>

    <main class="main">
      <div class="post-box">
        <textarea
          v-model="content"
          placeholder="What’s happening?"
        ></textarea>

        <div class="post-actions">
          <input type="file" @change="handleFile" />
          <button @click="createPost" :disabled="loading">
            {{ loading ? "Posting..." : "Post 🚀" }}
          </button>
        </div>
      </div>

      <div v-if="error" class="error">{{ error }}</div>

      <div class="posts">
        <div class="post-card" v-for="post in posts" :key="post.id">
          <div class="post-header">
            <strong>{{ post.username }}</strong>
            <span>{{ formatDate(post.created_at) }}</span>
          </div>

          <p>{{ post.content }}</p>

          <img
            v-if="post.media_url && isImage(post.media_url)"
            :src="apiUrl + post.media_url"
          />

          <video
            v-if="post.media_url && isVideo(post.media_url)"
            controls
            :src="apiUrl + post.media_url"
          ></video>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";

const apiUrl = import.meta.env.VITE_API_URL;
const router = useRouter();

const posts = ref([]);
const content = ref("");
const selectedFile = ref(null);
const loading = ref(false);
const error = ref("");

const token = localStorage.getItem("token");

if (!token) {
  router.push("/login");
}

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  router.push("/login");
}

function handleFile(e) {
  selectedFile.value = e.target.files[0];
}

async function fetchPosts() {
  try {
    const res = await fetch(`${apiUrl}/posts`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!res.ok) throw new Error("Failed to fetch posts");

    posts.value = await res.json();
  } catch (err) {
    error.value = err.message;
  }
}

async function createPost() {
  loading.value = true;
  error.value = "";

  try {
    const formData = new FormData();
    formData.append("content", content.value);

    if (selectedFile.value) {
      formData.append("file", selectedFile.value);
    }

    const res = await fetch(`${apiUrl}/posts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    });

    if (!res.ok) throw new Error("Post failed");

    content.value = "";
    selectedFile.value = null;

    await fetchPosts();
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

function formatDate(date) {
  return new Date(date).toLocaleString();
}

function isImage(url) {
  return url.match(/\.(jpeg|jpg|png|gif)$/);
}

function isVideo(url) {
  return url.match(/\.(mp4|webm|ogg)$/);
}

onMounted(fetchPosts);
</script>

<style scoped>
.dashboard {
  display: flex;
  min-height: 100vh;
  background: #1e1e2f;
  color: white;
}

.sidebar {
  width: 220px;
  background: #151525;
  padding: 20px;
  display: flex;
  flex-direction: column;
}

.sidebar nav {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-top: 30px;
}

.sidebar a {
  color: white;
  text-decoration: none;
}

.logout {
  margin-top: auto;
  padding: 10px;
  background: crimson;
  border: none;
  color: white;
  cursor: pointer;
}

.main {
  flex: 1;
  padding: 40px;
}

.post-box {
  background: #2a2a40;
  padding: 20px;
  border-radius: 10px;
  margin-bottom: 30px;
}

textarea {
  width: 100%;
  height: 100px;
  padding: 10px;
  border-radius: 8px;
  border: none;
  resize: none;
}

.post-actions {
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
}

button {
  padding: 8px 20px;
  background: #ff4757;
  border: none;
  color: white;
  cursor: pointer;
  border-radius: 5px;
}

.posts {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.post-card {
  background: #2a2a40;
  padding: 20px;
  border-radius: 10px;
}

.post-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

img, video {
  width: 100%;
  margin-top: 10px;
  border-radius: 10px;
}

.error {
  color: red;
  margin-bottom: 20px;
}
</style>