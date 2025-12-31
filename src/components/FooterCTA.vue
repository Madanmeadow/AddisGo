<template>
  <section class="cta-wrap py-5">
    <div class="container">
      <div class="cta-card p-4 p-md-5">
        <div class="row align-items-center g-4">
          <div class="col-md-8">
            <h3 class="fw-bold mb-2">{{ title }}</h3>
            <p class="mb-0 text-muted">{{ text }}</p>
          </div>
          <div class="col-md-4 text-md-end">
            <RouterLink to="/contact" class="btn btn-primary btn-glow btn-lg">
              Let’s talk
            </RouterLink>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
defineProps({
  title: { type: String, default: "Ready to start? Let’s talk." },
  text: { type: String, default: "Tell me what you need — I’ll reply with a clear plan and next steps." },
})
</script>

<style scoped>
.cta-wrap {
  background: #0b1220;
}
.cta-card {
  background: rgba(255,255,255,0.95);
  border-radius: 1rem;
  box-shadow: 0 12px 30px rgba(0,0,0,0.2);
}
</style>
