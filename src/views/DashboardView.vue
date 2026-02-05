<template>
  <div class="dashboard">
    <h1>Dashboard</h1>
    <p class="subtitle">Your videos & performance</p>

    <!-- STATS -->
    <div class="stats">
      <div class="stat-card">
        <h2>{{ videos.length }}</h2>
        <span>Videos</span>
      </div>
      <div class="stat-card">
        <h2>{{ totalViews }}</h2>
        <span>Total Views</span>
      </div>
    </div>

    <!-- VIDEOS -->
    <div v-if="videos.length === 0" class="empty">
      You haven’t uploaded any videos yet.
    </div>

    <div class="video-list">
      <div v-for="video in videos" :key="video.id" class="video-card">
        <img
          :src="video.thumbnail_url || '/default-thumb.png'"
          alt="thumbnail"
        />
        <div class="info">
          <h3>{{ video.title }}</h3>
          <span>{{ video.views }} views</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from "vue";

export default {
  name: "DashboardView",
  setup() {
    const videos = ref([]);
    const totalViews = ref(0);

    const loadDashboard = async () => {
      // TEMP: using explore endpoint filtered by username
      // later we’ll secure this with auth
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/videos/explore?page=1&limit=50`
      );
      const data = await res.json();

      // simulate "my videos"
      const myVideos = data.filter(v => v.username === "creator1");

      videos.value = myVideos;
      totalViews.value = myVideos.reduce(
        (sum, v) => sum + (v.views || 0),
        0
      );
    };

    onMounted(loadDashboard);

    return { videos, totalViews };
  }
};
</script>

<style scoped>
.dashboard {
  padding: 24px;
  max-width: 900px;
  margin: auto;
}

.subtitle {
  color: #666;
  margin-bottom: 20px;
}

/* STATS */
.stats {
  display: flex;
  gap: 16px;
  margin-bottom: 30px;
}

.stat-card {
  flex: 1;
  background: #f5f7ff;
  border-radius: 14px;
  padding: 20px;
  text-align: center;
}

.stat-card h2 {
  margin: 0;
  font-size: 28px;
  color: #5f63ff;
}

/* VIDEOS */
.video-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}

.video-card {
  background: white;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0,0,0,0.06);
}

.video-card img {
  width: 100%;
  height: 140px;
  object-fit: cover;
}

.info {
  padding: 12px;
}

.empty {
  padding: 40px;
  text-align: center;
  color: #777;
}
</style>
