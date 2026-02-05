<template>
  <section class="dashboard">
    <!-- HEADER -->
    <header class="dash-header">
      <h1>Dashboard</h1>
      <p>Your content, your growth 📈</p>
    </header>

    <!-- STATS -->
    <section class="stats">
      <div class="stat">
        <h2>{{ stats.videos }}</h2>
        <span>Videos</span>
      </div>
      <div class="stat">
        <h2>{{ stats.views }}</h2>
        <span>Views</span>
      </div>
      <div class="stat">
        <h2>{{ stats.likes }}</h2>
        <span>Likes</span>
      </div>
    </section>

    <!-- VIDEOS -->
    <section class="videos">
      <h2>Your Videos</h2>

      <div v-if="videos.length === 0" class="empty">
        <p>No videos yet.</p>
        <router-link to="/upload" class="btn">
          Upload your first video
        </router-link>
      </div>

      <div class="video-grid">
        <div class="video-card" v-for="video in videos" :key="video.id">
          <div class="thumb">
            🎬
          </div>
          <div class="meta">
            <p class="title">{{ video.title }}</p>
            <span>{{ video.views }} views</span>
          </div>
        </div>
      </div>
    </section>
  </section>
</template>

<script>
export default {
  name: "DashboardView",
  data() {
    return {
      stats: {
        videos: 3,
        views: 1240,
        likes: 312
      },
      videos: [
        { id: 1, title: "My first story", views: 420 },
        { id: 2, title: "Why I started MeDan", views: 610 },
        { id: 3, title: "Daily motivation", views: 210 }
      ]
    };
  }
};
</script>

<style scoped>
/* =====================
   DASHBOARD LAYOUT
===================== */
.dashboard {
  padding: 32px 16px 80px;
  max-width: 1100px;
  margin: auto;
}

.dash-header {
  margin-bottom: 32px;
}

.dash-header h1 {
  font-size: 2.5rem;
  font-weight: 800;
}

.dash-header p {
  color: #6b7280;
}

/* =====================
   STATS
===================== */
.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 16px;
  margin-bottom: 48px;
}

.stat {
  background: white;
  border-radius: 16px;
  padding: 24px;
  text-align: center;
  box-shadow: 0 10px 25px rgba(0,0,0,0.05);
}

.stat h2 {
  font-size: 2rem;
  color: #6366f1;
}

.stat span {
  color: #6b7280;
  font-size: 0.9rem;
}

/* =====================
   VIDEOS
===================== */
.videos h2 {
  margin-bottom: 16px;
}

.video-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
}

.video-card {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 10px 25px rgba(0,0,0,0.05);
}

.thumb {
  height: 140px;
  background: linear-gradient(135deg, #6366f1, #818cf8);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
  color: white;
}

.meta {
  padding: 14px;
}

.meta .title {
  font-weight: 600;
  margin-bottom: 6px;
}

.meta span {
  font-size: 0.85rem;
  color: #6b7280;
}

/* =====================
   EMPTY STATE
===================== */
.empty {
  text-align: center;
  padding: 40px 0;
}

.btn {
  display: inline-block;
  margin-top: 12px;
  padding: 10px 22px;
  background: #6366f1;
  color: white;
  border-radius: 999px;
  text-decoration: none;
  font-weight: 600;
}

/* =====================
   MOBILE
===================== */
@media (max-width: 480px) {
  .dash-header h1 {
    font-size: 2rem;
  }
}
</style>

