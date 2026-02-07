<template>
  <div class="reactions">
    <button @click="react('like')">❤️ {{ r.like }}</button>
    <button @click="react('fire')">🔥 {{ r.fire }}</button>
    <button @click="react('laugh')">😂 {{ r.laugh }}</button>
    <button @click="react('wow')">😮 {{ r.wow }}</button>
  </div>
</template>

<script setup>
import { api } from "@/services/api";

const props = defineProps({ video: Object });
const r = props.video.reactions;

const react = async (type) => {
  await api.post(`/api/react/${props.video.id}`, { type });
};
</script>

<style>
.reactions {
  display: flex;
  gap: 12px;
  font-size: 18px;
}
</style>
