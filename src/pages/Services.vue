<template>
  <section class="wrap">
    <h1 class="title">Services</h1>
    <p class="subtitle">Choose a service to request. Quick, simple, professional.</p>

    <div class="grid">
      <RouterLink
        v-for="s in services"
        :key="s.key"
        class="card"
        :to="{
          path: '/contact',
          query: { service: s.title }
        }"
      >
        <div class="icon" v-html="s.icon"></div>

        <h2 class="card-title">{{ s.title }}</h2>
        <p class="card-text">{{ s.desc }}</p>

        <p class="price">
          <span class="muted">Starting at</span>
          <span class="amount">{{ s.price }}</span>
        </p>

        <div class="cta">
          {{ s.cta }} <span class="arrow">→</span>
        </div>
      </RouterLink>
    </div>
  </section>
</template>

<script setup>
import { RouterLink } from "vue-router"

const services = [
  {
    key: "delivery",
    title: "Delivery",
    desc: "Fast and reliable delivery to get your items where they need to go — handled with care.",
    price: "$19.99",
    cta: "Request Delivery",
    icon: `
      <svg width="44" height="44" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 7h11v10H3V7Z" stroke="currentColor" stroke-width="1.8" />
        <path d="M14 10h4l3 3v4h-7v-7Z" stroke="currentColor" stroke-width="1.8" />
        <path d="M6.5 19.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" stroke="currentColor" stroke-width="1.8"/>
        <path d="M17.5 19.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" stroke="currentColor" stroke-width="1.8"/>
      </svg>
    `
  },
  {
    key: "pickup",
    title: "Pickup",
    desc: "We pick up from stores, homes, or offices and deliver to your destination on time.",
    price: "$14.99",
    cta: "Schedule Pickup",
    icon: `
      <svg width="44" height="44" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 3v10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        <path d="M8 7l4-4 4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M4 13h16v8H4v-8Z" stroke="currentColor" stroke-width="1.8"/>
        <path d="M7 17h10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      </svg>
    `
  },
  {
    key: "support",
    title: "Support",
    desc: "Need help with delivery planning, special items, or timing? We respond quickly.",
    price: "$9.99",
    cta: "Get Support",
    icon: `
      <svg width="44" height="44" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 10a6 6 0 0 1 12 0v2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        <path d="M6 12h2v6H6a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2Z" stroke="currentColor" stroke-width="1.8"/>
        <path d="M18 12h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2v-6Z" stroke="currentColor" stroke-width="1.8"/>
        <path d="M10 20h4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      </svg>
    `
  }
]
</script>

<style scoped>
.wrap {
  padding-top: 8px;
}

.title {
  margin: 0 0 8px;
  font-size: 44px;
  letter-spacing: 0.2px;
}

.subtitle {
  margin: 0 0 22px;
  font-size: 18px;
  color: #444;
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.card {
  display: block;
  text-decoration: none;
  color: inherit;

  background: white;
  border-radius: 18px;
  padding: 22px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.08);

  transform: translateY(0);
  transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease;
}

.card:hover {
  transform: translateY(-6px);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.14);
  border-color: rgba(31, 95, 214, 0.25);
}

.icon {
  width: 54px;
  height: 54px;
  display: grid;
  place-items: center;
  border-radius: 14px;
  background: rgba(31, 95, 214, 0.08);
  color: #1f5fd6;
  margin-bottom: 14px;
}

.card-title {
  margin: 0 0 8px;
  font-size: 34px;
}

.card-text {
  margin: 0 0 16px;
  font-size: 16px;
  line-height: 1.5;
  color: #333;
}

.price {
  margin: 0 0 14px;
  font-size: 16px;
}

.muted {
  color: #666;
  margin-right: 8px;
}

.amount {
  font-weight: 800;
  font-size: 22px;
  color: #111;
}

.cta {
  font-weight: 700;
  color: #1f5fd6;
  display: inline-flex;
  gap: 8px;
  align-items: center;
}

.arrow {
  transition: transform 180ms ease;
}

.card:hover .arrow {
  transform: translateX(4px);
}

/* Mobile */
@media (max-width: 900px) {
  .grid {
    grid-template-columns: 1fr;
  }
  .title {
    font-size: 38px;
  }
  .card-title {
    font-size: 32px;
  }
}
</style>
