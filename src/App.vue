<script setup>
import { onMounted, ref } from 'vue'

const health = ref(null)

onMounted(async () => {
  const res = await fetch('/api/health')
  health.value = await res.json()
})
</script>

<template>
  <div style="padding: 40px">
    <h1>AddisGo Frontend</h1>
    <pre>{{ health }}</pre>
  </div>
</template>
