<template>
  <section class="services">
    <!-- Delivery -->
    <RouterLink to="/contact" class="card" aria-label="Delivery - contact us">
      <div class="icon" aria-hidden="true">🚚</div>
      <h2>Delivery</h2>
      <p>
        Fast and reliable delivery to get your items where they need to go,
        on time and handled with care.
      </p>

      <div class="price">
        <span class="label">Starting at</span>
        <span class="amount">$19.99</span>
      </div>

      <div class="cta">Request Delivery →</div>
    </RouterLink>

    <!-- Pickup -->
    <RouterLink to="/contact" class="card" aria-label="Pickup - contact us">
      <div class="icon" aria-hidden="true">📦</div>
      <h2>Pickup</h2>
      <p>
        Convenient pickup services from homes, businesses, or stores —
        simple, quick, and stress-free.
      </p>

      <div class="price">
        <span class="label">Starting at</span>
        <span class="amount">$14.99</span>
      </div>

      <div class="cta">Schedule Pickup →</div>
    </RouterLink>

    <!-- Support -->
    <RouterLink to="/contact" class="card" aria-label="Support - contact us">
      <div class="icon" aria-hidden="true">💬</div>
      <h2>Support</h2>
      <p>
        Friendly customer support ready to help you with scheduling,
        questions, and special requests.
      </p>

      <div class="price">
        <span class="label">From</span>
        <span class="amount">$0</span>
        <span class="small"> (included)</span>
      </div>

      <div class="cta">Message Support →</div>
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

/* Card is a RouterLink, so we style it like a card */
.card {
  background: #ffffff;
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

.card:active {
  transform: translateY(-2px);
}

/* Nice focus for keyboard users */
.card:focus-visible {
  outline: 3px solid rgba(37, 99, 235, 0.55);
  outline-offset: 3px;
}

.icon {
  font-size: 46px;
  margin-bottom: 10px;
}

h2 {
  margin: 6px 0 10px;
  font-size: 26px;
}

p {
  margin: 0 0 18px;
  font-size: 16px;
  line-height: 1.6;
  color: #333;
}

/* Pricing */
.price {
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.08);
  margin-bottom: 14px;
}

.label {
  font-size: 13px;
  color: #444;
}

.amount {
  font-size: 20px;
  font-weight: 800;
}

.small {
  font-size: 13px;
  color: #555;
}

/* CTA */
.cta {
  font-weight: 700;
  color: #2563eb;
}

/* Mobile tweaks */
@media (max-width: 420px) {
  .card {
    padding: 22px 18px;
  }
  .icon {
    font-size: 42px;
  }
}
</style>
