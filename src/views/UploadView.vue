<template>
  <div class="upload">
    <h1>Upload Video</h1>

    <form @submit.prevent="handleUpload">
      <input type="file" accept="video/*" @change="onFileChange" required />
      <button type="submit">Upload</button>
    </form>

    <p v-if="loading">Uploading...</p>
    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="success" class="success">Upload successful 🎉</p>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { uploadVideo } from "@/services/videoService";

const file = ref(null);
const loading = ref(false);
const error = ref("");
const success = ref(false);

function onFileChange(e) {
  file.value = e.target.files[0];
}

async function handleUpload() {
  if (!file.value) return;

  loading.value = true;
  error.value = "";
  success.value = false;

  try {
    const formData = new FormData();
    formData.append("video", file.value);

    await uploadVideo(formData);
    success.value = true;
  } catch (err) {
    error.value = "Upload failed";
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.upload {
  max-width: 400px;
  margin: 60px auto;
  text-align: center;
}
.error {
  color: red;
}
.success {
  color: green;
}
</style>

