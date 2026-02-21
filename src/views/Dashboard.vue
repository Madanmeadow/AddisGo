<template>
  <Layout>
    <div class="dashboard">

      <!-- CREATE POST -->
      <div class="create-post">
        <textarea
          v-model="content"
          placeholder="What's happening?"
          rows="3"
        ></textarea>

        <div class="create-actions">
          <input type="file" @change="handleFile" />
          <button @click="submitPost" :disabled="loading">
            {{ loading ? "Posting..." : "Post 🚀" }}
          </button>
        </div>
      </div>

      <!-- POSTS FEED -->
      <div v-if="posts.length === 0" class="empty">
        No posts yet...
      </div>

      <div v-for="post in posts" :key="post.id" class="post-card">

        <!-- HEADER -->
        <div class="post-header">
          <div class="avatar">
            {{ post.name?.charAt(0).toUpperCase() }}
          </div>

          <div>
            <div class="username">{{ post.name }}</div>
            <div class="time">
              {{ formatDate(post.created_at) }}
            </div>
          </div>
        </div>

        <!-- CONTENT -->
        <div v-if="post.caption" class="post-text">
          {{ post.caption }}
        </div>

        <!-- IMAGE -->
        <img
          v-if="post.image_url"
          :src="apiUrl + post.image_url"
          class="post-media"
        />

        <!-- VIDEO -->
        <video
          v-if="post.video_url"
          :src="apiUrl + post.video_url"
          controls
          class="post-media"
        ></video>

      </div>

    </div>
  </Layout>
</template>

<script setup>
import { ref, onMounted } from "vue";
import Layout from "../components/Layout.vue";

const apiUrl = import.meta.env.VITE_API_URL;

const posts = ref([]);
const content = ref("");
const file = ref(null);
const loading = ref(false);

const token = localStorage.getItem("token");

/* ===============================
   FETCH POSTS
================================ */

async function fetchPosts() {
  try {
    const res = await fetch(`${apiUrl}/posts`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await res.json();
    posts.value = data;

  } catch (err) {
    console.error("Fetch posts error:", err);
  }
}

/* ===============================
   SUBMIT POST
================================ */

async function submitPost() {
  if (!content.value && !file.value) return;

  loading.value = true;

  const formData = new FormData();
  formData.append("content", content.value);

  if (file.value) {
    formData.append("file", file.value);
  }

  try {
    const res = await fetch(`${apiUrl}/posts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    });

    if (!res.ok) throw new Error("Post failed");

    content.value = "";
    file.value = null;

    await fetchPosts();

  } catch (err) {
    console.error("Post error:", err);
  } finally {
    loading.value = false;
  }
}

function handleFile(e) {
  file.value = e.target.files[0];
}

/* ===============================
   FORMAT DATE
================================ */

function formatDate(date) {
  return new Date(date).toLocaleString();
}

onMounted(fetchPosts);
</script>

<style scoped>

.dashboard {
  max-width: 700px;
  margin: auto;
  padding: 30px;
}

/* CREATE POST */

.create-post {
  background: rgba(255,255,255,0.08);
  padding: 20px;
  border-radius: 18px;
  margin-bottom: 30px;
  backdrop-filter: blur(10px);
}

textarea {
  width: 100%;
  resize: none;
  border-radius: 12px;
  padding: 12px;
  border: none;
  outline: none;
  font-size: 15px;
}

.create-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 15px;
}

button {
  background: linear-gradient(45deg, #ff416c, #ff4b2b);
  border: none;
  padding: 8px 18px;
  border-radius: 10px;
  color: white;
  cursor: pointer;
}

/* POST CARD */

.post-card {
  background: rgba(0,0,0,0.5);
  padding: 18px;
  border-radius: 18px;
  margin-bottom: 20px;
  backdrop-filter: blur(8px);
}

.post-header {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.avatar {
  width: 45px;
  height: 45px;
  background: #ff4b2b;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  margin-right: 12px;
}

.username {
  font-weight: 600;
}

.time {
  font-size: 12px;
  opacity: 0.7;
}

.post-text {
  margin-bottom: 12px;
  font-size: 15px;
}

.post-media {
  width: 100%;
  max-height: 450px;
  border-radius: 15px;
  object-fit: cover;
}

/* EMPTY */

.empty {
  text-align: center;
  opacity: 0.7;
}

/* MOBILE */

@media (max-width: 768px) {
  .dashboard {
    padding: 15px;
  }
}

</style>