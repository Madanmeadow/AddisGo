<template>
  <button @click="share">🔗 {{ video.shares }}</button>
</template>

<script setup>
import { api } from "@/services/api";

const props = defineProps({ video: Object });

const share = async () => {
  const url = `${window.location.origin}/video/${props.video.id}`;

  if (navigator.share) {
    await navigator.share({
      title: "AddisGo",
      url,
    });
  } else {
    await navigator.clipboard.writeText(url);
    alert("Link copied!");
  }

  await api.post(`/api/share/${props.video.id}`);
};
</script>
