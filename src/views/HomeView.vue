<template>
  <div class="home">
    <!-- Hero -->
    <section class="hero">
      <h1>MeDan</h1>
      <p>Where short videos meet real stories.</p>

      <div class="actions">
        <router-link to="/signup" class="btn primary">Get Started</router-link>
        <router-link to="/explore" class="btn outline">Explore Videos</router-link>
      </div>
    </section>

    <!-- Trending -->
    <section class="trending">
      <h2>Trending on MeDan</h2>
      <div class="grid">
        <div v-for="video in videos" :key="video._id" class="card">
          <video :src="video.url" muted />
          <span>@{{ video.user }}</span>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="cta">
      <h2>Ready to share your voice?</h2>
      <router-link to="/signup" class="btn primary">Join MeDan</router-link>
    </section>
  </div>
</template>

<script>
export default {
  name: "Home",
  data() {
    return {
      videos: []
    };
  },
  mounted() {
    // later: fetch public videos
  }
};
</script>

<style scoped>
.hero {
  text-align: center;
  padding: 80px 20px;
}
.actions {
  margin-top: 20px;
}
.btn {
  padding: 12px 24px;
  margin: 8px;
  border-radius: 8px;
  text-decoration: none;
}
.primary {
  background: #7c3aed;
  color: white;
}
.outline {
  border: 2px solid #7c3aed;
  color: #7c3aed;
}
</style>
