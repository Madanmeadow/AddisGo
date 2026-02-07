<script setup>
import api from "@/services/api";
const props = defineProps({ video: Object });

const react = async (type) => {
  await api.post(`/api/react/${props.video.id}`, { type });
};
</script>

<template>
  <button @click="react('like')">❤️ {{ video.reactions.like }}</button>
  <button @click="react('fire')">🔥 {{ video.reactions.fire }}</button>
  <button @click="react('laugh')">😂 {{ video.reactions.laugh }}</button>
  <button @click="react('wow')">😮 {{ video.reactions.wow }}</button>
</template>


<style>
.reactions {
  display: flex;
  gap: 12px;
  font-size: 18px;
}
</style>
