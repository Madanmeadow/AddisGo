<template>
  <div class="page">
    <h2>Contact</h2>

    <form class="form">
      <label>Name</label>
      <input required />

      <label>Email</label>
      <input type="email" required />

      <label>Message</label>
      <textarea required></textarea>

      <button>Send Message</button>
    </form>
  </div>
</template>

<style scoped>
.page {
  max-width: 700px;
  margin: 0 auto;
  background: white;
  padding: 40px;
  border-radius: 8px;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

input,
textarea {
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

button {
  background: #1e5bd7;
  color: white;
  padding: 10px;
  border: none;
  border-radius: 4px;
}
</style>

