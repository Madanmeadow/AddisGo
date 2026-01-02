<template>
  <NavBar />

  <section id="home" class="hero">
    <div class="container">
      <h1>Fast delivery & great pricing</h1>
      <p>Welcome to AddisGo.</p>
    </div>
  </section>

  <section id="services">
    <div class="container">
      <h2>Services</h2>
      <div class="card">Your services cards go here...</div>
    </div>
  </section>

  <section id="contact">
    <div class="container">
      <ContactForm />
    </div>
  </section>
</template>

<script setup>
import NavBar from "./components/NavBar.vue";
import ContactForm from "./components/ContactForm.vue";
</script>
