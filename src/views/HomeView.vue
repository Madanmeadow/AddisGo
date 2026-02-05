<template>
  <div class="home">
    <!-- HERO -->
    <section class="hero">
      <div class="hero-content">
        <h1>MeDan</h1>

        <p class="subtitle">
          Where short videos meet real stories.
        </p>

        <div class="hero-actions">
          <router-link to="/register" class="btn primary">
            Get Started
          </router-link>

          <router-link to="/explore" class="btn outline">
            Explore Videos
          </router-link>
        </div>
      </div>
    </section>

    <!-- TRENDING -->
    <section class="trending">
      <h2>Trending on MeDan</h2>

      <div class="trending-grid">
        <div class="video-card" v-for="n in 3" :key="n">
          <div class="video-placeholder">🎥</div>
          <p>@creator{{ n }}</p>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="cta">
      <h2>Ready to share your voice?</h2>

      <router-link to="/register" class="btn primary">
        Join MeDan
      </router-link>
    </section>
  </div>
</template>

<script>
export default {
  name: "HomeView"
};
</script>

<style scoped>
.home {
  width: 100%;
}

/* HERO */
.hero {
  min-height: 70vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(
    135deg,
    #f5f3ff,
    #eef2ff,
    #ffffff
  );
  text-align: center;
  padding: 60px 20px;
}

.hero-content {
  max-width: 720px;
}

.hero h1 {
  font-size: 64px;
  font-weight: 800;
  letter-spacing: -1px;
  color: #1f2937;
  margin-bottom: 12px;
}

.subtitle {
  font-size: 20px;
  color: #4b5563;
  margin-bottom: 32px;
}

.hero-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
}

/* BUTTONS */
.btn {
  padding: 14px 28px;
  border-radius: 999px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.2s ease;
}

.primary {
  background: #6366f1;
  color: white;
}

.primary:hover {
  background: #4f46e5;
  transform: translateY(-2px);
}

.outline {
  border: 2px solid #6366f1;
  color: #6366f1;
  background: transparent;
}

.outline:hover {
  background: #eef2ff;
}

/* TRENDING */
.trending {
  padding: 60px 40px;
}

.trending h2 {
  font-size: 28px;
  margin-bottom: 24px;
}

.trending-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
}

.video-card {
  background: #fafafa;
  border-radius: 16px;
  padding: 20px;
  text-align: center;
  transition: transform 0.2s ease;
}

.video-card:hover {
  transform: translateY(-4px);
}

.video-placeholder {
  font-size: 48px;
  margin-bottom: 12px;
}

/* CTA */
.cta {
  padding: 80px 20px;
  text-align: center;
  background: #fafafa;
}

.cta h2 {
  font-size: 32px;
  margin-bottom: 20px;
}
</style>
