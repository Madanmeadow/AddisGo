<template>
  <section class="home">
    <!-- Hero -->
    <div class="hero">
      <h1 class="brand">
        Me<span>Dan</span>
      </h1>

      <p class="tagline">
        MeDan is not a clone.<br />
        <strong>MeDan is a voice.</strong>
      </p>

      <p class="subtext">
        A modern social space built for clarity, presence, and real human expression.
      </p>

      <div class="actions">
        <RouterLink to="/services" class="btn primary">
          Explore Services
        </RouterLink>
        <RouterLink to="/about" class="btn outline">
          Our Story
        </RouterLink>
      </div>
    </div>
  </section>
</template>

<script setup>
import { RouterLink } from "vue-router"
</script>

<style scoped>
.home {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at top, #111827, #020617);
  color: #f9fafb;
  padding: 2rem;
}

.hero {
  max-width: 720px;
  text-align: center;
}

.brand {
  font-size: 4rem;
  font-weight: 800;
  letter-spacing: -1px;
}

.brand span {
  color: #38bdf8;
}

.tagline {
  font-size: 1.6rem;
  margin-top: 1rem;
  line-height: 1.4;
}

.subtext {
  margin-top: 1rem;
  color: #9ca3af;
}

.actions {
  margin-top: 2rem;
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.btn {
  padding: 0.75rem 1.5rem;
  border-radius: 999px;
  font-weight: 600;
  transition: all 0.25s ease;
  text-decoration: none;
}

.btn.primary {
  background: #38bdf8;
  color: #020617;
}

.btn.primary:hover {
  transform: scale(1.05);
}

.btn.outline {
  border: 1px solid #38bdf8;
  color: #38bdf8;
}

.btn.outline:hover {
  background: rgba(56, 189, 248, 0.1);
}
</style>
