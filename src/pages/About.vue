<template>
  <section class="page-hero">
    <div class="container">
      <h1 class="mb-2">About AddisGo</h1>
      <p class="lead mb-0">
        I build clean, modern websites that load fast, look great on mobile, and deploy smoothly on Azure.
      </p>
    </div>
  </section>

  <section class="section-soft">
    <div class="container py-5">
      <div class="row g-4 align-items-stretch">
        <div class="col-lg-7">
          <div class="card soft-card h-100">
            <div class="card-body p-4">
              <h3 class="mb-3">My mission</h3>
              <p class="mb-3">
                AddisGo is focused on simple, high-quality web builds: clear layouts, strong spacing,
                and professional sections that help people trust your business.
              </p>
              <p class="mb-0">
                I use <strong>Vue 3</strong> + <strong>Vue Router</strong> + <strong>Bootstrap 5</strong>, and deploy using
                <strong>Azure Static Web Apps</strong> with GitHub CI/CD.
              </p>
            </div>
          </div>
        </div>

        <div class="col-lg-5">
          <div class="card soft-card h-100">
            <div class="card-body p-4">
              <h3 class="mb-3">What I’m good at</h3>

              <div class="pill-wrap">
                <span class="pill">Vue 3</span>
                <span class="pill">Vue Router</span>
                <span class="pill">Bootstrap 5</span>
                <span class="pill">APIs</span>
                <span class="pill">Azure Deploy</span>
                <span class="pill">GitHub</span>
              </div>

              <hr class="my-4" />

              <h5 class="mb-2">What you can expect</h5>
              <ul class="mb-0">
                <li>Fast turnaround</li>
                <li>Mobile-first layout</li>
                <li>Clean code & comments</li>
                <li>Professional look</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div class="row g-4 mt-1">
        <div class="col-lg-4">
          <div class="mini-card">
            <h5>Simple & clean</h5>
            <p class="mb-0">No messy pages — easy navigation and clear sections.</p>
          </div>
        </div>
        <div class="col-lg-4">
          <div class="mini-card">
            <h5>Mobile first</h5>
            <p class="mb-0">Looks great on phone, tablet, and desktop.</p>
          </div>
        </div>
        <div class="col-lg-4">
          <div class="mini-card">
            <h5>Deployed on Azure</h5>
            <p class="mb-0">CI/CD from GitHub → Azure for smooth updates.</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.page-hero {
  background: linear-gradient(180deg, #0b1f3a 0%, #123a67 100%);
  color: #fff;
  padding: 3.5rem 0;
}

.section-soft {
  background: #f5f7fb;
}

.soft-card {
  border: 0;
  border-radius: 14px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.06);
}

.pill-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.pill {
  background: rgba(77, 171, 247, 0.12);
  color: #0b1f3a;
  padding: 8px 12px;
  border-radius: 999px;
  font-weight: 600;
}

.mini-card {
  background: #fff;
  border-radius: 14px;
  padding: 1.25rem;
  border: 1px solid rgba(0,0,0,0.06);
}
</style>
