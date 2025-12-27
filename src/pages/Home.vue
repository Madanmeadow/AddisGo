<template>
  <div class="page">
    <h1 class="title">AddisGo 🇪🇹</h1>
    <p class="subtitle">Book trusted drivers and hotels in Addis Ababa</p>

    <div class="card">
      <button class="btn btn-primary" @click="goDrivers">
        🚗 Book a Driver
      </button>

      <button class="btn btn-success" @click="goHotels">
        🏨 Book a Hotel
      </button>
    </div>

    <footer class="footer">
      © {{ year }} AddisGo • Trusted local bookings in Ethiopia
    </footer>
  </div>
</template>

<script setup>
import { computed } from "vue"
import { useRouter } from "vue-router"

const router = useRouter()
const year = computed(() => new Date().getFullYear())

function goDrivers() {
  router.push("/drivers")
}

function goHotels() {
  router.push("/hotels")
}
</script>

<style scoped>
.page {
  text-align: center;
  padding-top: 40px;
}

.title {
  font-size: 44px;
  margin: 0 0 8px 0;
}

.subtitle {
  margin: 0 0 24px 0;
  color: #555;
}

.card {
  margin: 0 auto;
  max-width: 560px;
  display: grid;
  gap: 18px;
}

.btn {
  width: 100%;
  padding: 18px;
  border-radius: 14px;
  border: none;
  font-size: 20px;
  font-weight: 700;
  cursor: pointer;
}

.btn-primary {
  background: #1f5cff;
  color: white;
}

.btn-success {
  background: #18b35b;
  color: white;
}

.footer {
  margin-top: 40px;
  font-size: 14px;
  color: #777;
}
</style>
