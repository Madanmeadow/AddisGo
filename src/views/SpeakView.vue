<template>
  <div class="page">
    <h1>Speak Your Voice 🎤</h1>
    <p>Your voice matters. Say what needs to be heard.</p>

    <div class="card">
      <p>🎙 Voice recording coming next</p>
      <button @click="$router.push('/dashboard')">
        ← Back to Dashboard
      </button>
    </div>
  </div>
</template>

<style scoped>
.page {
  text-align: center;
  padding: 40px;
}
.card {
  background: #ffffffdd;
  padding: 30px;
  border-radius: 12px;
  max-width: 500px;
  margin: 30px auto;
}
</style>
