<template>
  <section class="page">
    <div class="card">
      <h1>Services</h1>
      <p class="subtitle">Choose a service — fast, reliable, and handled with care.</p>

      <div class="grid">
        <!-- Delivery -->
        <article class="service" @click="goToContact('Delivery')" role="button" tabindex="0">
          <div class="icon" aria-hidden="true">🚚</div>
          <h2>Delivery</h2>
          <p>Fast and reliable delivery to get your items where they need to go.</p>

          <p class="price">
            Starting at <strong>$19.99</strong>
          </p>

          <button class="btn" type="button" @click.stop="goToContact('Delivery')">
            Request Delivery →
          </button>
        </article>

        <!-- Pickup -->
        <article class="service" @click="goToContact('Pickup')" role="button" tabindex="0">
          <div class="icon" aria-hidden="true">📦</div>
          <h2>Pickup</h2>
          <p>We pick up items from homes or stores and bring them to you safely.</p>

          <p class="price">
            Starting at <strong>$14.99</strong>
          </p>

          <button class="btn" type="button" @click.stop="goToContact('Pickup')">
            Request Pickup →
          </button>
        </article>

        <!-- Support -->
        <article class="service" @click="goToContact('Support')" role="button" tabindex="0">
          <div class="icon" aria-hidden="true">🛟</div>
          <h2>Support</h2>
          <p>Quick help, updates, and customer support when you need it.</p>

          <p class="price">
            Starting at <strong>$9.99</strong>
          </p>

          <button class="btn" type="button" @click.stop="goToContact('Support')">
            Contact Support →
          </button>
        </article>
      </div>
    </div>
  </section>
</template>

<script setup>
import { useRouter } from "vue-router"

const router = useRouter()

function goToContact(serviceName) {
  // Sends the service name as a query param
  // Example: /contact?service=Delivery
  router.push({ path: "/contact", query: { service: serviceName } })
}
</script>

<style scoped>
.page {
  display: flex;
  justify-content: center;
}

.card {
  width: 100%;
  background: #ffffff;
  border-radius: 14px;
  padding: 34px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.06);
}

h1 {
  margin: 0 0 10px;
  font-size: 40px;
}

.subtitle {
  margin: 0 0 26px;
  font-size: 18px;
  color: #444;
}

.grid {
  display: grid;
  gap: 18px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.service {
  background: #f8fafc;
  border-radius: 14px;
  padding: 22px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  cursor: pointer;
  transition: transform 150ms ease, box-shadow 150ms ease, background 150ms ease;
}

.service:hover {
  transform: translateY(-4px);
  box-shadow: 0 14px 28px rgba(0, 0, 0, 0.08);
  background: #ffffff;
}

.icon {
  font-size: 44px;
  margin-bottom: 10px;
}

.service h2 {
  margin: 0 0 8px;
  font-size: 26px;
}

.service p {
  margin: 0 0 12px;
  color: #333;
  line-height: 1.45;
}

.price {
  margin: 0 0 14px;
  color: #222;
}

.btn {
  border: none;
  background: #1f5fe0;
  color: #fff;
  padding: 10px 14px;
  border-radius: 999px;
  font-size: 15px;
  cursor: pointer;
}

.btn:hover {
  filter: brightness(0.95);
}

/* Mobile */
@media (max-width: 900px) {
  .grid {
    grid-template-columns: 1fr;
  }

  h1 {
    font-size: 34px;
  }
}
</style>
