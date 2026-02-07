<template>
  <nav class="bottom-nav">
    <router-link to="/dashboard">🏠</router-link>
    <button @click="$emit('upload')">➕</button>
    <router-link to="/profile">👤</router-link>
  </nav>
</template>

<style>
.bottom-nav {
  position: fixed;
  bottom: 0;
  width: 100%;
  display: flex;
  justify-content: space-around;
  background: black;
  color: white;
}
</style>
