<template>
  <div class="auth-container">
    <div class="auth-card">
      <h1>Welcome back to MeDan</h1>

      <input type="email" placeholder="Email" />
      <input type="password" placeholder="Password" />

      <button class="primary">Login</button>

      <p>
        No account?
        <router-link to="/register">Sign up</router-link>
      </p>
    </div>
  </div>
</template>

<style scoped>
.auth-container {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #f9fafb;
}

.auth-card {
  background: white;
  padding: 40px;
  width: 360px;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.05);
}

.auth-card h1 {
  margin-bottom: 24px;
  text-align: center;
}

.auth-card input {
  width: 100%;
  padding: 12px;
  margin-bottom: 14px;
  border-radius: 8px;
  border: 1px solid #ddd;
}

.primary {
  width: 100%;
  padding: 12px;
  background: #7c3aed;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}

p {
  text-align: center;
  margin-top: 16px;
}
</style>

