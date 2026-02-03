<template>
  <div class="page">
    <h1>Write Your Voice ✍️</h1>
    <p>Your words can move people.</p>

    <textarea
      placeholder="Write what you want the world to hear…"
      rows="6"
    />

    <div class="actions">
      <button class="primary">Publish</button>
      <button class="secondary" @click="$router.push('/dashboard')">
        Cancel
      </button>
    </div>
  </div>
</template>

<style scoped>
.page {
  max-width: 700px;
  margin: auto;
  padding: 40px;
}
textarea {
  width: 100%;
  border-radius: 10px;
  padding: 15px;
  border: none;
  font-size: 16px;
}
.actions {
  margin-top: 20px;
  display: flex;
  gap: 10px;
}
</style>
