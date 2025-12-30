<template>
  <nav class="navbar navbar-expand-lg navbar-dark bg-dark py-3 shadow-sm">
    <div class="container">
      <!-- Brand -->
      <RouterLink class="navbar-brand fw-bold brand-gradient" to="/">
        AddisGo
      </RouterLink>

      <!-- Mobile toggle -->
      <button
        class="navbar-toggler"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#mainNav"
        aria-controls="mainNav"
        aria-expanded="false"
        aria-label="Toggle navigation"
      >
        <span class="navbar-toggler-icon"></span>
      </button>

      <!-- Links -->
      <div class="collapse navbar-collapse" id="mainNav">
        <ul class="navbar-nav ms-auto align-items-lg-center gap-lg-2">
          <li class="nav-item">
            <RouterLink class="nav-link" active-class="active" to="/">Home</RouterLink>
          </li>

          <li class="nav-item">
            <RouterLink class="nav-link" active-class="active" to="/about">About</RouterLink>
          </li>

          <li class="nav-item">
            <RouterLink class="nav-link" active-class="active" to="/services">Services</RouterLink>
          </li>

          <li class="nav-item">
            <RouterLink class="nav-link" active-class="active" to="/contact">Contact</RouterLink>
          </li>

          <li class="nav-item ms-lg-2">
            <RouterLink class="btn btn-primary btn-sm px-3" to="/contact">
              Get in touch
            </RouterLink>
          </li>
        </ul>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { RouterLink } from "vue-router"
</script>

<style scoped>
.brand-gradient{
  background: linear-gradient(90deg, #57d2ff, #8a7dff, #ff6bd6);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  letter-spacing: 0.2px;
}
.nav-link{
  opacity: 0.85;
}
.nav-link.active{
  opacity: 1;
  text-decoration: underline;
  text-underline-offset: 6px;
}
</style>
