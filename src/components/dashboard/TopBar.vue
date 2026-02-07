<script setup>
import { ref } from "vue";
import UploadModal from "./UploadModal.vue";

const showUpload = ref(false);
</script>

<template>
  <header class="topbar">
    <h3>For You</h3>
    <button @click="showUpload = true">➕ Upload</button>

    <UploadModal v-if="showUpload" @close="showUpload = false" />
  </header>
</template>

<style scoped>
.topbar {
  display: flex;
  justify-content: space-between;
  padding: 15px;
  background: #111;
}
</style>
