<template>
  <div>
    <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
      <div class="container">
        <RouterLink class="navbar-brand fw-bold" to="/">AddisGo</RouterLink>

        <button
          class="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#nav"
        >
          <span class="navbar-toggler-icon"></span>
        </button>

        <div id="nav" class="collapse navbar-collapse">
          <ul class="navbar-nav ms-auto">
            <li class="nav-item">
              <RouterLink class="nav-link" to="/" active-class="active" exact-active-class="active">Home</RouterLink>
            </li>
            <li class="nav-item">
              <RouterLink class="nav-link" to="/about" active-class="active">About</RouterLink>
            </li>
            <li class="nav-item">
              <RouterLink class="nav-link" to="/services" active-class="active">Services</RouterLink>
            </li>
            <li class="nav-item">
              <RouterLink class="nav-link" to="/contact" active-class="active">Contact</RouterLink>
            </li>
          </ul>
        </div>
      </div>
    </nav>

    <main>
      <RouterView />
    </main>

    <footer class="border-top py-4 mt-4">
      <div class="container text-muted small d-flex justify-content-between">
        <span>© {{ new Date().getFullYear() }} AddisGo</span>
        <span>Built with Vue + Azure</span>
      </div>
    </footer>
  </div>
</template>
