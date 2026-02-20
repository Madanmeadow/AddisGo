<template>
  <div class="home">
    <h1>🔥 Welcome to AddisGo</h1>
    <p>The future social platform.</p>

    <div class="actions">
      <router-link to="/login">
        <button>Login</button>
      </router-link>

      <router-link to="/register">
        <button class="secondary">Register</button>
      </router-link>
    </div>
  </div>
</template>

<script>
export default {}
</script>

<style scoped>
.home {
  min-height:100vh;
  display:flex;
  flex-direction:column;
  justify-content:center;
  align-items:center;
  background:linear-gradient(135deg,#161637,#24246b);
  color:white;
  text-align:center;
}

.actions {
  margin-top:30px;
  display:flex;
  gap:20px;
}

button {
  padding:12px 24px;
  border:none;
  border-radius:12px;
  background:linear-gradient(45deg,#ff416c,#ff4b2b);
  color:white;
  cursor:pointer;
}

.secondary {
  background:#444;
}
</style>