✅ src/pages/About.vue (FULL CODE)
<template>
  <div class="about-page">
    <section class="about-hero">
      <h1>About MeDan</h1>
      <p class="tagline">
        Connecting people through smart, reliable digital solutions.
      </p>
    </section>

    <section class="about-content">
      <h2>Who We Are</h2>
      <p>
        MeDan is a modern digital platform focused on building clean, fast,
        and user-friendly web experiences. We believe technology should be
        simple, powerful, and accessible to everyone.
      </p>

      <h2>What We Do</h2>
      <ul>
        <li>✔️ Web application development</li>
        <li>✔️ Modern UI & UX design</li>
        <li>✔️ Secure contact & communication solutions</li>
        <li>✔️ Scalable frontend architecture</li>
      </ul>

      <h2>Why MeDan</h2>
      <p>
        We focus on real results — clean code, reliable performance,
        and tools that work in production, not just in demos.
      </p>

      <div class="cta">
        <router-link to="/contact" class="cta-button">
          Contact Us
        </router-link>
      </div>
    </section>
  </div>
</template>

<script>
export default {
  name: "AboutPage",
};
</script>

<style scoped>
.about-page {
  max-width: 900px;
  margin: 0 auto;
  padding: 40px 20px;
}

.about-hero {
  text-align: center;
  margin-bottom: 40px;
}

.about-hero h1 {
  font-size: 2.5rem;
  margin-bottom: 10px;
}

.tagline {
  font-size: 1.1rem;
  color: #555;
}

.about-content h2 {
  margin-top: 30px;
  margin-bottom: 10px;
  color: #1f3c88;
}

.about-content p {
  line-height: 1.6;
  color: #333;
}

.about-content ul {
  margin-top: 10px;
  padding-left: 20px;
}

.about-content li {
  margin-bottom: 8px;
}

.cta {
  margin-top: 40px;
  text-align: center;
}

.cta-button {
  display: inline-block;
  padding: 12px 24px;
  background-color: #1f3c88;
  color: #fff;
  text-decoration: none;
  border-radius: 6px;
  font-weight: bold;
}

.cta-button:hover {
  background-color: #162c66;
}
</style>
