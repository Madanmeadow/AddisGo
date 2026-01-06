<script setup>
import { siteConfig } from "../config/site"
</script>

<template>
  <section class="services">
    <RouterLink
      v-for="s in siteConfig.services"
      :key="s.id"
      to="/contact"
      class="card"
    >
      <div class="icon" aria-hidden="true">{{ s.icon }}</div>
      <h2>{{ s.title }}</h2>
      <p>{{ s.description }}</p>

      <div class="price">
        <span class="label">{{ s.priceLabel }}</span>
        <span class="amount">{{ s.price }}</span>
      </div>

      <div class="cta">{{ s.cta }} →</div>
    </RouterLink>
  </section>
</template>

<style scoped>
.services {
  max-width: 1050px;
  margin: 44px auto;
  padding: 0 16px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 22px;
}
.card {
  background: #fff;
  border-radius: 14px;
  padding: 26px 22px;
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.08);
  text-align: center;
  text-decoration: none;
  color: inherit;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  border: 1px solid rgba(0, 0, 0, 0.06);
}
.card:hover {
  transform: translateY(-6px);
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.14);
}
.icon { font-size: 46px; margin-bottom: 10px; }
h2 { margin: 6px 0 10px; font-size: 26px; }
p { margin: 0 0 18px; font-size: 16px; line-height: 1.6; color: #333; }
.price {
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.08);
  margin-bottom: 14px;
}
.label { font-size: 13px; color: #444; }
.amount { font-size: 20px; font-weight: 800; }
.cta { font-weight: 700; color: #2563eb; }
</style>
