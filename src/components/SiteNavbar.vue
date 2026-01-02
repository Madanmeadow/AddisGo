<template>
  <header class="topbar">
    <div class="brand">AddisGo</div>

    <nav class="nav">
      <a href="#home">Home</a>
      <a href="#services">Services</a>
      <a href="#contact">Contact</a>
    </nav>
  </header>
</template>

<style scoped>
.topbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 70px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  background: #1f5bd8;
  color: white;
  z-index: 999;
}

.brand {
  font-weight: 700;
  font-size: 20px;
}

.nav a {
  color: white;
  text-decoration: none;
  margin-left: 18px;
  font-weight: 600;
}

.nav a:hover {
  text-decoration: underline;
}
</style>
