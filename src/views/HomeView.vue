<template>
  <section class="home">
    <!-- HERO -->
    <div class="hero">
      <h1 class="title">MeDan</h1>
      <p class="subtitle">
        Where short videos meet real stories.
      </p>

      <div class="hero-actions">
        <router-link to="/explore" class="btn primary">
          Explore Videos
        </router-link>

        <router-link to="/dashboard" class="btn outline">
          Dashboard
        </router-link>
      </div>
    </div>

    <!-- TRENDING -->
    <section class="trending">
      <h2>Trending on MeDan</h2>

      <div class="cards">
        <div class="card" v-for="creator in creators" :key="creator">
          <div class="icon">🎥</div>
          <p>@{{ creator }}</p>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="cta">
      <h2>Ready to share your voice?</h2>
      <router-link to="/upload" class="btn primary">
        Join MeDan
      </router-link>
    </section>
  </section>
</template>

<script>
export default {
  name: "HomeView",
  data() {
    return {
      creators: ["creator1", "creator2", "creator3"]
    };
  }
};
</script>

<style scoped>
/* =====================
   LAYOUT
===================== */
.home {
  width: 100%;
  background: linear-gradient(135deg, #f5f7ff, #ffffff);
}

/* =====================
   HERO
===================== */
.hero {
  min-height: 70vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 40px 16px;
}

.title {
  font-size: clamp(3rem, 6vw, 4.5rem);
  font-weight: 800;
  color: #1f2937;
}

.subtitle {
  margin-top: 12px;
  font-size: 1.1rem;
  color: #6b7280;
  max-width: 480px;
}

/* =====================
   HERO BUTTONS
===================== */
.hero-actions {
  display: flex;
  gap: 16px;
  margin-top: 28px;
  flex-wrap: wrap;
  justify-content: center;
}

.btn {
  padding: 12px 26px;
  border-radius: 999px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.2s ease;
}

.btn.primary {
  background: #6366f1;
  color: white;
}

.btn.primary:hover {
  background: #4f46e5;
}

.btn.outline {
  background: transparent;
  border: 2px solid #6366f1;
  color: #6366f1;
}

.btn.outline:hover {
  background: #6366f1;
  color: white;
}

/* =====================
   TRENDING
===================== */
.trending {
  padding: 60px 16px;
  max-width: 1100px;
  margin: auto;
}

.trending h2 {
  font-size: 2rem;
  margin-bottom: 32px;
  text-align: center;
}

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 24px;
}

.card {
  background: white;
  border-radius: 18px;
  padding: 40px 20px;
  text-align: center;
  box-shadow: 0 10px 30px rgba(0,0,0,0.05);
}

.icon {
  font-size: 2.5rem;
  margin-bottom: 12px;
}

.card p {
  font-weight: 600;
  color: #374151;
}

/* =====================
   CTA
===================== */
.cta {
  padding: 80px 16px;
  text-align: center;
}

.cta h2 {
  font-size: 2.2rem;
  margin-bottom: 24px;
}

/* =====================
   MOBILE TWEAKS
===================== */
@media (max-width: 480px) {
  .title {
    font-size: 3rem;
  }

  .subtitle {
    font-size: 1rem;
  }
}
</style>

