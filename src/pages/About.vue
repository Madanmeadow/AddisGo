<template>
  <section class="container py-5">
    <div class="mb-4">
      <h1 class="section-title">About <span class="brand-gradient">AddisGo</span></h1>
      <p class="lead lead-muted mb-0">
        AddisGo is a modern web build style: clean design, fast performance, and smooth navigation —
        using Vue + Azure.
      </p>
    </div>

    <div class="row g-4">
      <div class="col-lg-7">
        <div class="section-soft p-4 h-100">
          <h4 class="section-title mb-3">Mission</h4>
          <p class="lead-muted">
            Build websites that are simple, professional, and mobile-first — without clutter.
            The goal is a site that loads fast, looks clean, and makes it easy for people to contact you.
          </p>

          <hr style="border-color: rgba(255,255,255,0.12);" />

          <h5 class="section-title mb-2">How we work</h5>
          <ul class="mb-0 lead-muted">
            <li><strong>Step 1:</strong> Understand your business + your goal (contact, bookings, sales).</li>
            <li><strong>Step 2:</strong> Build a clean layout with sections that make sense.</li>
            <li><strong>Step 3:</strong> Make it responsive + good spacing on mobile.</li>
            <li><strong>Step 4:</strong> Deploy to Azure + connect your domain when ready.</li>
          </ul>
        </div>
      </div>

      <div class="col-lg-5">
        <div class="card card-hover h-100">
          <div class="card-body p-4">
            <h4 class="section-title mb-3">Tech Stack</h4>
            <ul class="lead-muted">
              <li>Vue 3 + Vue Router</li>
              <li>Bootstrap 5 for layout</li>
              <li>Azure Static Web Apps for hosting</li>
              <li>GitHub Actions for CI/CD</li>
            </ul>

            <div class="section-soft p-3 mt-3">
              <div class="small" style="color: rgba(233,238,252,0.7);">
                <strong>Focus:</strong> clarity, speed, and “looks professional”.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Values -->
    <div class="mt-5">
      <h3 class="section-title mb-3">Values</h3>
      <div class="row g-4">
        <div class="col-md-4">
          <div class="card card-hover h-100">
            <div class="card-body p-4">
              <h5>Clean Design</h5>
              <p class="text-muted mb-0">Simple layout, good spacing, and modern style that works anywhere.</p>
            </div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="card card-hover h-100">
            <div class="card-body p-4">
              <h5>Mobile First</h5>
              <p class="text-muted mb-0">Looks great on phones, with comfortable spacing and readable text.</p>
            </div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="card card-hover h-100">
            <div class="card-body p-4">
              <h5>Deploy Ready</h5>
              <p class="text-muted mb-0">CI/CD and Azure hosting so it’s stable, shareable, and professional.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
</script>
