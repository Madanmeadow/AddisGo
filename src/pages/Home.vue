<template>
  <div class="addisgo-container">
    <h1>AddisGo 🇪🇹</h1>
    <p class="subtitle">Book trusted drivers and hotels in Addis Ababa</p>

    <div class="cardx">
      <router-link to="/drivers" class="action-link">🚗 Book a Driver</router-link>
    </div>

    <div class="cardx">
      <router-link to="/hotels" class="action-link">🏨 Book a Hotel</router-link>
    </div>

    <!-- ✅ Footer goes INSIDE template -->
    <footer class="footer">
      © 2025 AddisGo • Trusted local bookings in Ethiopia
    </footer>
  </div>
</template>

<script setup>
// Home page
</script>

<style scoped>
.addisgo-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 24px;
  text-align: center;
}

.subtitle {
  color: #555;
  margin-bottom: 32px;
}

.cardx {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 24px;
  margin-bottom: 20px;
}

.action-link {
  font-size: 18px;
  text-decoration: none;
  color: #2c3e50;
  font-weight: bold;
}

.footer {
  margin-top: 40px;
  font-size: 14px;
  color: #777;
}
</style>

