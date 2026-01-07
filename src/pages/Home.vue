<template>
  <section class="hero">
    <h1>Fast delivery & reliable service</h1>

    <p class="lead">
      MeDan provides dependable local delivery, pickup, and support services for
      individuals and small businesses. Simple pricing, quick response, and care
      you can trust.
    </p>

    <p class="sub">
      Serving our local community with speed, safety, and professionalism.
    </p>

    <div class="actions">
      <RouterLink to="/services" class="btn primary">
        View Services
      </RouterLink>

      <RouterLink to="/contact" class="btn outline">
        Get in Touch
      </RouterLink>
    </div>
  </section>
</template>

<script setup>
import { RouterLink } from "vue-router"
</script>

<style scoped>
.hero {
  padding-top: 24px;
  max-width: 720px;
}

h1 {
  font-size: 46px;
  margin-bottom: 14px;
  letter-spacing: 0.3px;
}

.lead {
  font-size: 18px;
  line-height: 1.6;
  color: #333;
  margin-bottom: 10px;
}

.sub {
  font-size: 16px;
  color: #555;
  margin-bottom: 26px;
}

.actions {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
}

.btn {
  padding: 12px 22px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  text-decoration: none;
  transition: all 160ms ease;
}

.primary {
  background: #1f5fd6;
  color: white;
}

.primary:hover {
  background: #174bb0;
}

.outline {
  border: 2px solid #1f5fd6;
  color: #1f5fd6;
}

.outline:hover {
  background: rgba(31, 95, 214, 0.08);
}

/* Mobile */
@media (max-width: 600px) {
  h1 {
    font-size: 38px;
  }
}
</style>
