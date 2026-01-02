<template>
  <header class="navbar">
    <div class="brand">AddisGo</div>

    <nav>
      <a href="#home">Home</a>
      <a href="#services">Services</a>
      <a href="#contact">Contact</a>
    </nav>
  </header>
</template>

<style scoped>
.navbar {
  position: sticky;
  top: 0;
  background: #1e5bff;
  color: white;
  display: flex;
  justify-content: space-between;
  padding: 16px 24px;
  z-index: 100;
}

.navbar a {
  color: white;
  margin-left: 20px;
  text-decoration: none;
  font-weight: 500;
}

.navbar a:hover {
  text-decoration: underline;
}
</style>
