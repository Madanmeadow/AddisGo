
<template>
  <section id="contact" class="section">
    <div class="container">
      <h2>Contact</h2>
      <ContactForm />
    </div>
  </section>
</template>

<script setup>
import ContactForm from "../components/ContactForm.vue"
</script>

<style scoped>
.section {
  padding: 80px 20px;
}
.container {
  max-width: 900px;
  margin: 0 auto;
}
</style>

