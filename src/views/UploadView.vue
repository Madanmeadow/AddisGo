<template>
  <div class="upload-page">
    <h1>Upload Video</h1>

    <input type="file" accept="video/*" @change="handleFile" />

    <button @click="uploadVideo" :disabled="!file || loading">
      {{ loading ? "Uploading..." : "Upload" }}
    </button>

    <p v-if="videoUrl">
      Uploaded 🎉
      <br />
      <a :href="videoUrl" target="_blank">{{ videoUrl }}</a>
    </p>
  </div>
</template>

<script setup>
import { ref } from "vue";

const file = ref(null);
const loading = ref(false);
const videoUrl = ref("");

const handleFile = (e) => {
  file.value = e.target.files[0];
};

const uploadVideo = async () => {
  if (!file.value) return;

  loading.value = true;

  const formData = new FormData();
  formData.append("video", file.value);

  const res = await fetch("http://localhost:5000/api/upload", {
    method: "POST",
    body: formData,
  });

  const data = await res.json();
  videoUrl.value = "http://localhost:5000" + data.videoUrl;

  loading.value = false;
};
</script>

<style scoped>
.upload-page {
  padding: 40px;
}
button {
  margin-top: 12px;
}
</style>
