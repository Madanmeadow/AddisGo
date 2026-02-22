<template>
  <div class="dashboard">

    <h1 class="title">🔥 AddisGo Feed</h1>

    <!-- CREATE POST -->
    <div class="create-card">
      <textarea
        v-model="content"
        placeholder="What's happening?"
      ></textarea>

      <input type="file" @change="handleFile" />

      <button @click="createPost" :disabled="loading">
        {{ loading ? "Posting..." : "Post 🚀" }}
      </button>
    </div>

    <!-- POSTS -->
    <div class="feed">

      <div
        v-for="post in posts"
        :key="post.id"
        class="post-card"
      >
        <div class="post-header">
          <div class="avatar">
            {{ post.username?.charAt(0).toUpperCase() }}
          </div>

          <div>
            <h3>{{ post.username }}</h3>
            <small>{{ formatDate(post.created_at) }}</small>
          </div>
        </div>

        <p class="post-content">
          {{ post.content }}
        </p>

        <!-- IMAGE -->
        <img
          v-if="post.image_url"
          :src="fullMediaUrl(post.image_url)"
          class="media"
        />

        <!-- VIDEO -->
        <video
          v-if="post.video_url"
          controls
          class="media"
        >
          <source
            :src="fullMediaUrl(post.video_url)"
            type="video/mp4"
          />
        </video>

      </div>

    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";

const apiUrl = import.meta.env.VITE_API_URL;
const token = localStorage.getItem("token");

const posts = ref([]);
const content = ref("");
const file = ref(null);
const loading = ref(false);

/* ============================= */
/* FETCH POSTS */
/* ============================= */
async function fetchPosts() {
  try {
    const res = await fetch(`${apiUrl}/posts`);
    const data = await res.json();

    posts.value = data.reverse(); // newest first
  } catch (err) {
    console.error("Fetch posts error:", err);
  }
}

/* ============================= */
/* CREATE POST */
/* ============================= */
async function createPost() {
  if (!content.value && !file.value) return;

  loading.value = true;

  const formData = new FormData();
  formData.append("content", content.value);

  if (file.value) {
    formData.append("media", file.value);
  }

  try {
    await fetch(`${apiUrl}/posts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    });

    content.value = "";
    file.value = null;

    await fetchPosts(); // 🔥 THIS FIXES DISAPPEAR ISSUE
  } catch (err) {
    console.error("Post error:", err);
  }

  loading.value = false;
}

/* ============================= */
/* HANDLE FILE */
/* ============================= */
function handleFile(e) {
  file.value = e.target.files[0];
}

/* ============================= */
/* SAFE DATE FORMAT */
/* ============================= */
function formatDate(date) {
  if (!date) return "";

  const d = new Date(date);
  if (isNaN(d.getTime())) return "";

  return d.toLocaleString();
}

/* ============================= */
/* FULL MEDIA URL */
/* ============================= */
function fullMediaUrl(path) {
  if (!path) return "";

  if (path.startsWith("http")) return path;

  return `${apiUrl}${path}`;
}

onMounted(() => {
  fetchPosts();
});
</script>

<style scoped>

.dashboard {
  padding: 40px;
  max-width: 800px;
  margin: auto;
}

.title {
  font-size: 32px;
  margin-bottom: 30px;
  text-align: center;
}

.create-card {
  background: #1f2c3c;
  padding: 25px;
  border-radius: 20px;
  margin-bottom: 40px;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

textarea {
  padding: 15px;
  border-radius: 12px;
  border: none;
  resize: none;
  min-height: 100px;
}

button {
  padding: 12px;
  border-radius: 12px;
  border: none;
  background: #ff4d4d;
  color: white;
  font-weight: bold;
  cursor: pointer;
}

button:disabled {
  opacity: 0.6;
}

.feed {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.post-card {
  background: #16202b;
  padding: 25px;
  border-radius: 20px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.3);
}

.post-header {
  display: flex;
  gap: 15px;
  align-items: center;
  margin-bottom: 15px;
}

.avatar {
  width: 45px;
  height: 45px;
  background: #ff4d4d;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.post-content {
  margin-bottom: 15px;
}

.media {
  width: 100%;
  border-radius: 15px;
  margin-top: 15px;
  max-height: 500px;
  object-fit: cover;
}

</style>