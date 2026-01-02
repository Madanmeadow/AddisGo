<template>
  <header class="topbar">
    <div class="brand">AddisGo</div>

    <nav class="nav">
      <a href="#home">Home</a>
      <a href="#services">Services</a>
      <a href="#contact">Contact</a>
    </nav>
  </header>

  <main>
    <section id="home" class="hero">
      <div class="container">
        <h1>Fast delivery &amp; great pricing</h1>
        <p>Welcome to AddisGo.</p>
      </div>
    </section>

    <section id="services" class="section">
      <div class="container">
        <h2>Services</h2>
        <p>Your services cards go here...</p>
      </div>
    </section>

    <Contact />
  </main>
</template>

<script setup>
import Contact from "./components/Contact.vue"
</script>

<style scoped>
.topbar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 18px;
  background: #1f5fbf;
  color: white;
}
.brand { font-weight: 800; }
.nav a {
  color: white;
  text-decoration: none;
  margin-left: 14px;
  font-weight: 600;
}
.nav a:hover { text-decoration: underline; }

.hero {
  padding: 80px 20px;
  background: linear-gradient(180deg, #1f5fbf, #2f7be0);
  color: white;
}
.container { max-width: 900px; margin: 0 auto; }
.section { padding: 70px 20px; background: #f7f7f7; }
</style>
