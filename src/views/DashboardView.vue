<template>
  <div class="dashboard">
    <h1>Your Dashboard</h1>

    <div class="cards">
      <div class="card">📹 My Videos</div>
      <div class="card">⬆️ Upload New Video</div>
      <div class="card">📊 Analytics (soon)</div>
    </div>
  </div>
</template>

<script setup></script>

<style scoped>
.dashboard {
  padding: 40px;
}

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.card {
  padding: 30px;
  border-radius: 12px;
  background: #f4f6ff;
  text-align: center;
  font-weight: 600;
}
</style>

