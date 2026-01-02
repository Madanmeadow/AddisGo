<script setup>
import ContactForm from "../components/ContactForm.vue"
</script>

<template>
  <section id="contact" class="section">
    <div class="container">
      <h2>Contact</h2>
      <ContactForm />
    </div>
  </section>
</template>

<style scoped>
.section {
  padding: 60px 20px;
  background: white;
}
.container {
  max-width: 900px;
  margin: 0 auto;
}
</style>
