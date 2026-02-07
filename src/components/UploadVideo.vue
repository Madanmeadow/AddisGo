<script setup>
import { ref } from "vue";
import api from "@/services/api";

const file = ref(null);

const upload = async () => {
  const formData = new FormData();
  formData.append("video", file.value);

  await api.post("/videos/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  alert("Uploaded!");
};
</script>

<template>
  <input type="file" @change="e => file.value = e.target.files[0]" />
  <button @click="upload">Upload</button>
</template>
