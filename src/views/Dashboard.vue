<template>
  <div class="dashboard">

    <!-- Header -->
    <header class="header">
      <h1>🔥 AddisGo</h1>

      <div class="user-section">
        <span class="welcome">
          Welcome, {{ user?.name }}
        </span>
        <button class="logout-btn" @click="logout">
          Logout
        </button>
      </div>
    </header>

    <!-- Main Content -->
    <div class="content">

      <!-- Stats Cards -->
      <div class="cards">

        <div class="card purple">
          <h3>Total Posts</h3>
          <p>{{ posts.length }}</p>
        </div>

        <div class="card blue">
          <h3>Followers</h3>
          <p>1,245</p>
        </div>

        <div class="card orange">
          <h3>Likes</h3>
          <p>8,930</p>
        </div>

      </div>

      <!-- Feed Preview -->
      <div class="feed">
        <h2>Latest Posts</h2>

        <div
          v-for="post in posts"
          :key="post.id"
          class="post-card"
        >
          <p class="caption">{{ post.caption || post.text }}</p>

          <video
            v-if="post.video_url"
            :src="post.video_url"
            controls
            class="video"
          ></video>

          <small class="date">
            {{ formatDate(post.created_at) }}
          </small>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();

const user = ref(JSON.parse(localStorage.getItem("user")));
const posts = ref([]);

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  router.push("/login");
}

function formatDate(date) {
  return new Date(date).toLocaleString();
}

async function fetchPosts() {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/api/posts`
    );

    const data = await response.json();
    posts.value = data;

  } catch (error) {
    console.error("Failed to fetch posts:", error);
  }
}

onMounted(fetchPosts);
</script>

<style scoped>
.dashboard {
  min-height: 100vh;
  background: linear-gradient(135deg, #1e1e2f, #2c2c54);
  color: white;
  font-family: Arial, sans-serif;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 40px;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(10px);
}

.header h1 {
  font-size: 28px;
}

.user-section {
  display: flex;
  align-items: center;
  gap: 15px;
}

.logout-btn {
  padding: 8px 15px;
  background: crimson;
  border: none;
  color: white;
  cursor: pointer;
  border-radius: 6px;
}

.content {
  padding: 40px;
}

.cards {
  display: flex;
  gap: 20px;
  margin-bottom: 40px;
}

.card {
  flex: 1;
  padding: 25px;
  border-radius: 15px;
  text-align: center;
  font-weight: bold;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
}

.card p {
  font-size: 26px;
  margin-top: 10px;
}

.purple {
  background: linear-gradient(135deg, #9b5de5, #5f0f99);
}

.blue {
  background: linear-gradient(135deg, #00bbf9, #0077b6);
}

.orange {
  background: linear-gradient(135deg, #ff9f1c, #ff5400);
}

.feed h2 {
  margin-bottom: 20px;
}

.post-card {
  background: rgba(255, 255, 255, 0.08);
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 20px;
  backdrop-filter: blur(8px);
}

.caption {
  margin-bottom: 10px;
}

.video {
  width: 100%;
  border-radius: 10px;
  margin-top: 10px;
}

.date {
  display: block;
  margin-top: 10px;
  opacity: 0.7;
}
</style>

