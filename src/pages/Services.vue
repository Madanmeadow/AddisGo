<template>
  <section class="services">
    <h2>What We’re Building</h2>
    <p class="intro">
      MeDan is designed as a calm, modern social platform — built step by step.
    </p>

    <div class="grid">
      <div class="card">
        <h3>🗣 Voice Posts</h3>
        <p>
          Express ideas freely without chasing likes or trends.
        </p>
        <span class="price">Free</span>
      </div>

      <div class="card">
        <h3>🌱 Communities</h3>
        <p>
          Small, meaningful spaces built around values — not algorithms.
        </p>
        <span class="price">Coming Soon</span>
      </div>

      <div class="card">
        <h3>🔒 Ownership</h3>
        <p>
          Your content belongs to you. Exportable. Transparent. Safe.
        </p>
        <span class="price">Core Feature</span>
      </div>
    </div>
  </section>
</template>

<script setup></script>

<style scoped>
.services {
  padding: 4rem 2rem;
  max-width: 1100px;
  margin: auto;
}

h2 {
  font-size: 2.5rem;
  text-align: center;
}

.intro {
  text-align: center;
  color: #6b7280;
  margin-top: 1rem;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1.5rem;
  margin-top: 3rem;
}

.card {
  background: #020617;
  border: 1px solid #1f2937;
  border-radius: 1rem;
  padding: 2rem;
  transition: transform 0.25s ease, border-color 0.25s ease;
}

.card:hover {
  transform: translateY(-6px);
  border-color: #38bdf8;
}

.card h3 {
  margin-bottom: 0.75rem;
}

.card p {
  color: #9ca3af;
}

.price {
  display: inline-block;
  margin-top: 1rem;
  color: #38bdf8;
  font-weight: 600;
}
</style>
