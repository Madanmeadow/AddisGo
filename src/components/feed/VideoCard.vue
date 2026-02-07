<script setup>
import api from "@/services/api";
import { ref } from "vue";

const props = defineProps({
  video: Object,
});

const likes = ref(props.video.likes || 0);

const like = async () => {
  await api.post(`/videos/${props.video.id}/like`);
  likes.value++;
};
</script>

<template>
  <div class="video-card">
    <video controls autoplay muted loop>
      <source :src="video.url" type="video/mp4" />
    </video>

    <div class="actions">
      ❤️ {{ likes }}
      <button @click="like">Like</button>
    </div>
  </div>
</template>
