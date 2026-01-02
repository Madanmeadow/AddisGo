<template>
  <div>
    <!-- NAVBAR -->
    <header class="navbar">
      <div class="brand">AddisGo</div>

      <nav class="nav-links">
        <a href="#home" @click.prevent="scrollTo('home')">Home</a>
        <a href="#services" @click.prevent="scrollTo('services')">Services</a>
        <a href="#contact" @click.prevent="scrollTo('contact')">Contact</a>
      </nav>

      <button class="cta" @click="scrollTo('contact')">Get in touch</button>
    </header>

    <!-- PAGE SECTIONS (IMPORTANT: IDs must match nav links) -->
    <main>
      <section id="home" class="section hero">
        <!-- If you have a hero overlay, it must NOT block clicks -->
        <div class="hero-overlay"></div>

        <div class="hero-content">
          <h1>Fast delivery & great pricing</h1>
          <p>Welcome to AddisGo.</p>
        </div>
      </section>

      <section id="services" class="section">
        <h2>Services</h2>
        <p>Your services cards go here...</p>
      </section>

      <section id="contact" class="section">
        <h2>Contact</h2>
        <p>Contact form goes here...</p>
      </section>
    </main>
  </div>
</template>

<script setup>
const NAV_HEIGHT = 72

function scrollTo(id) {
  const el = document.getElementById(id)
  if (!el) return

  const y = el.getBoundingClientRect().top + window.scrollY - NAV_HEIGHT
  window.scrollTo({ top: y, behavior: "smooth" })
}
</script>

<style>
/* Global smooth scroll (works for normal anchor too) */
html {
  scroll-behavior: smooth;
}

/* NAVBAR MUST BE ABOVE EVERYTHING */
.navbar {
  position: sticky;   /* use fixed if you want it always pinned */
  top: 0;
  z-index: 9999;      /* key fix */
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 18px;
  background: #1f4ed8;
  color: white;
}

/* Make sure navbar is clickable even if something weird happens */
.navbar, .navbar * {
  pointer-events: auto;
}

.brand {
  font-weight: 700;
}

.nav-links {
  display: flex;
  gap: 18px;
}

.nav-links a {
  color: white;
  text-decoration: none;
  font-weight: 600;
}

.nav-links a:hover {
  text-decoration: underline;
}

.cta {
  border: 0;
  background: white;
  color: #1f4ed8;
  padding: 8px 12px;
  border-radius: 8px;
  font-weight: 700;
  cursor: pointer;
}

/* Sections */
.section {
  min-height: 70vh;
  padding: 70px 18px;
  background: #f6f7fb;
  border-bottom: 1px solid #e7e7e7;
}

/* HERO with overlay */
.hero {
  position: relative;
  background: linear-gradient(180deg, #1f4ed8, #153aa3);
  color: white;
}

/* IMPORTANT FIX: overlay should NOT block clicking */
.hero-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.15);
  pointer-events: none; /* key fix */
}

.hero-content {
  position: relative;
  z-index: 1; /* above overlay */
  max-width: 900px;
}
</style>
