<script setup>
import api from "@/services/api";
const props = defineProps({ video: Object });

const share = async () => {
  await api.post(`/api/share/${props.video.id}`);
  alert("Shared!");
};
</script>

<template>
  <button @click="share">🔗 {{ video.shares }}</button>
</template>
