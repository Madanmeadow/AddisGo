<template>
  <div class="dashboard">
    <h1>Dashboard</h1>

    <p v-if="user">
      Welcome, <strong>{{ user.email }}</strong> 👋
    </p>

    <p v-else>Loading user...</p>

    <button @click="logout">Logout</button>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'

const router = useRouter()
const auth = useAuthStore()

const user = auth.user

function logout() {
  auth.logout()
  router.push('/login')
}
</script>

<style scoped>
.dashboard {
  padding: 2rem;
}
</style>



