<script setup>
import { ref } from "vue";
import api from "@/services/api";

const file = ref(null);

const pick = e => file.value = e.target.files[0];

const upload = async () => {
  const fd = new FormData();
  fd.append("video", file.value);
  await api.post("/api/upload", fd);
  location.reload();
};
</script>

<template>
  <input type="file" accept="video/*" @change="pick" />
  <button @click="upload">Upload</button>
</template>
