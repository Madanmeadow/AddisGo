<template>
  <nav class="navbar navbar-expand-lg navbar-dark py-3" style="background: rgba(0,0,0,0.35); border-bottom: 1px solid rgba(255,255,255,0.08);">
    <div class="container">
      <router-link class="navbar-brand d-flex align-items-center gap-2" to="/">
        <span class="brand-gradient fs-4">AddisGo</span>
      </router-link>

      <button
        class="navbar-toggler"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#nav"
        aria-controls="nav"
        aria-expanded="false"
        aria-label="Toggle navigation"
      >
        <span class="navbar-toggler-icon"></span>
      </button>

      <div id="nav" class="collapse navbar-collapse">
        <ul class="navbar-nav ms-auto gap-lg-2">
          <li class="nav-item">
            <router-link class="nav-link" to="/">Home</router-link>
          </li>
          <li class="nav-item">
            <router-link class="nav-link" to="/about">About</router-link>
          </li>
          <li class="nav-item">
            <router-link class="nav-link" to="/services">Services</router-link>
          </li>
          <li class="nav-item">
            <router-link class="nav-link" to="/contact">Contact</router-link>
          </li>
        </ul>
      </div>
    </div>
  </nav>
</template>

<script setup>
// If you want the navbar toggle to work, Bootstrap JS is needed.
// OPTIONAL: add in index.html <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
</script>
