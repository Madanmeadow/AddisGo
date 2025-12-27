<template>
  <div class="addisgo-container">
    <h1>AddisGo 🇪🇹</h1>
    <p class="subtitle">Book trusted drivers and hotels in Addis Ababa</p>
  <div class="page">
    <h1 class="title">AddisGo 🇪🇹</h1>
    <p class="subtitle">Book trusted drivers and hotels in Addis Ababa</p>

    <div class="cardx">
      <router-link to="/drivers" class="action-link">🚗 Book a Driver</router-link>
    </div>
    <div class="card">
      <button class="btn btn-blue" @click="goDrivers">
        🚗 Book a Driver
      </button>

    <div class="cardx">
      <router-link to="/hotels" class="action-link">🏨 Book a Hotel</router-link>
      <button class="btn btn-green" @click="goHotels">
        🏨 Book a Hotel
      </button>
    </div>

    <!-- ✅ Footer goes INSIDE template -->
    <footer class="footer">
      © 2025 AddisGo • Trusted local bookings in Ethiopia
    </footer>

    <!-- ✅ Footer belongs INSIDE template (this fixes your © build error) -->
    <footer class="footer">
      © {{ new Date().getFullYear() }} AddisGo • Trusted local bookings in Ethiopia
    </footer>
  </div>
</template>

<script setup>
// Home page
import { useRouter } from "vue-router"
const router = useRouter()

function goDrivers() {
  router.push("/drivers")
}

function goHotels() {
  router.push("/hotels")
}
</script>

<style scoped>
.page{
  text-align: center;
  padding-top: 40px;
}
.title{
  font-size: 44px;
  margin: 0 0 8px 0;
}
.subtitle{
  margin: 0 0 24px 0;
  color: #555;
}
.card{
  margin: 0 auto;
  max-width: 560px;
  display: grid;
  gap: 18px;
}
.btn{
  width: 100%;
  padding: 18px 18px;
  border-radius: 12px;
  border: 0;
  color: white;
  font-size: 20px;
  font-weight: 700;
  cursor: pointer;
}
.btn-blue{ background: #1f5cff; }
.btn-green{ background: #15b85a; }
.footer{
  margin-top: 40px;
  font-size: 14px;
  color: #777;
}

.footer {
  margin-top: 40px;
  font-size: 14px;
  color: #777;
}
</style>

