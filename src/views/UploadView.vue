<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const file = ref(null);
const loading = ref(false);
const success = ref(false);

const uploadVideo = async () => {
  if (!file.value) return;

  loading.value = true;

  const formData = new FormData();
  formData.append("video", file.value);

  try {
    const res = await fetch("http://localhost:5000/api/upload", {
      method: "POST",
      body: formData
    });

    const data = await res.json();

    if (data.success) {
      success.value = true;

      // 🔥 AUTO REDIRECT AFTER UPLOAD
      setTimeout(() => {
        router.push("/explore");
      }, 1200);
    }
  } catch (err) {
    console.error(err);
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="upload-page">
    <h1>Upload Video</h1>

    <input type="file" accept="video/*" @change="e => file = e.target.files[0]" />

    <button @click="uploadVideo" :disabled="loading">
      {{ loading ? "Uploading..." : "Upload" }}
    </button>

    <p v-if="success" class="success">✅ Uploaded! Redirecting…</p>
  </div>
</template>

<style scoped>
.upload-page {
  text-align: center;
  padding: 40px;
}

button {
  margin-top: 12px;
  padding: 10px 18px;
}

.success {
  margin-top: 12px;
  color: green;
}
</style>
