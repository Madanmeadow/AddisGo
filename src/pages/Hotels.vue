<script setup>
import { ACTIVE_CONTACT } from "../config"

const phone = ACTIVE_CONTACT.phone
const callLink = `tel:${phone}`
const whatsappLink = `https://wa.me/${phone.replace("+", "")}?text=Hi AddisGo! I want to book a hotel.`
</script>

<template>
  <div class="page">
    <h2>Book a Hotel</h2>
    <p>Contact us via phone or WhatsApp</p>

    <a :href="callLink" class="btn call">
      📞 Call ({{ ACTIVE_CONTACT.label }})
    </a>

    <a :href="whatsappLink" class="btn whatsapp" target="_blank">
      💬 WhatsApp
    </a>
  </div>
</template>

<style scoped>
.page {
  max-width: 500px;
  margin: auto;
}
.btn {
  display: block;
  padding: 14px;
  margin: 12px 0;
  border-radius: 10px;
  text-align: center;
  text-decoration: none;
  font-weight: bold;
}
.call {
  background: #2563eb;
  color: white;
}
.whatsapp {
  background: #25d366;
  color: white;
}
</style>
