<script setup>
import { ref, onMounted } from 'vue'
import { healthCheck } from './services/api'

const status = ref(null)
const error = ref(null)

onMounted(async () => {
  try {
    status.value = await healthCheck()
  } catch (e) {
    error.value = e.message
  }
})
</script>

<template>
  <h1>AddisGo Frontend</h1>

  <pre v-if="status">{{ status }}</pre>
  <p v-if="error" style="color:red">{{ error }}</p>
</template>

