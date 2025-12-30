<template>
  <div class="container py-4">
    <h1 class="display-5 fw-bold">AddisGo</h1>
    <p class="lead text-muted">
      Clean, modern website — built with Vue + Azure Static Web Apps.
    </p>

    <div class="d-flex gap-2">
      <RouterLink class="btn btn-primary" to="/contact">Get in touch</RouterLink>
      <RouterLink class="btn btn-outline-secondary" to="/services">View services</RouterLink>
    </div>

    <hr class="my-4" />

    <h2 class="h4 fw-bold mb-3">What we do</h2>
    <div class="row g-3">
      <div class="col-md-4">
        <div class="card h-100 shadow-sm rounded-4">
          <div class="card-body">
            <h3 class="h5 fw-bold">Websites</h3>
            <p class="text-muted mb-0">Simple business sites, landing pages, portfolios.</p>
          </div>
        </div>
      </div>

      <div class="col-md-4">
        <div class="card h-100 shadow-sm rounded-4">
          <div class="card-body">
            <h3 class="h5 fw-bold">Fixes & Improvements</h3>
            <p class="text-muted mb-0">Bug fixes, design cleanup, performance.</p>
          </div>
        </div>
      </div>

      <div class="col-md-4">
        <div class="card h-100 shadow-sm rounded-4">
          <div class="card-body">
            <h3 class="h5 fw-bold">Deployments</h3>
            <p class="text-muted mb-0">Azure deploy, custom domains, CI/CD.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
