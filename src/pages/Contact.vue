<script setup>
import { siteConfig } from "../config/site"

const telHref = `tel:${siteConfig.phoneE164}`
const emailHref = `mailto:${siteConfig.email}`
const waHref = `https://wa.me/${siteConfig.whatsappE164.replace("+", "")}`
</script>

<template>
  <section class="contact">
    <div class="card">
      <h1>Contact {{ siteConfig.brandName }}</h1>
      <p class="muted">Fast response. Call, email, or WhatsApp.</p>

      <div class="contact-actions">
        <a class="btn primary" :href="telHref">Call {{ siteConfig.phoneDisplay }}</a>
        <a class="btn" :href="emailHref">Email</a>
        <a class="btn" :href="waHref" target="_blank" rel="noopener">WhatsApp</a>
      </div>

      <!-- Your form can stay below -->
      <!-- (We can hook it to API later) -->
    </div>
  </section>
</template>

<style scoped>
.contact { max-width: 900px; margin: 40px auto; padding: 0 16px; }
.card {
  background: white;
  border-radius: 12px;
  padding: 28px;
  box-shadow: 0 8px 22px rgba(0,0,0,0.08);
}
.muted { color: #444; margin-top: 6px; }
.contact-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 16px;
}
.btn {
  display: inline-block;
  padding: 12px 14px;
  border-radius: 10px;
  text-decoration: none;
  background: #eef2ff;
  color: #1f3aa5;
  font-weight: 700;
}
.btn.primary { background: #1f5ed8; color: white; }
</style>
