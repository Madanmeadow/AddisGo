<template>
  <div class="page">
    <h1 class="title">Book a Driver</h1>
    <p class="subtitle">Contact us via phone or WhatsApp</p>

    <div class="card">
      <a class="btn btn-blue" :href="telLink">
        📞 Call (Ethiopia 🇪🇹)
      </a>

      <a class="btn btn-green" :href="whatsAppLink" target="_blank" rel="noreferrer">
        💬 WhatsApp
      </a>

      <button class="btn btn-gray" @click="goHome">
        ⬅ Back Home
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue"
import { useRouter } from "vue-router"

const router = useRouter()

// ✅ CHANGE THIS to your real number
const PHONE = "+251912345678"

const telLink = computed(() => `tel:${PHONE}`)

const message = "Hi AddisGo! I want to book a driver."
const whatsAppLink = computed(() => {
  const clean = PHONE.replace(/\+/g, "") // WhatsApp wants digits, no +
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`
})

function goHome() {
  router.push("/")
}
</script>

<style scoped>
.page{ padding-top: 24px; }
.title{ font-size: 36px; margin: 0 0 6px 0; }
.subtitle{ margin: 0 0 18px 0; color: #555; }
.card{ display: grid; gap: 14px; max-width: 560px; }
.btn{
  display: block;
  text-align: center;
  text-decoration: none;
  padding: 18px;
  border-radius: 12px;
  color: white;
  font-size: 20px;
  font-weight: 700;
  border: 0;
}
.btn-blue{ background: #1f5cff; }
.btn-green{ background: #15b85a; }
.btn-gray{ background: #666; cursor: pointer; }
</style>
