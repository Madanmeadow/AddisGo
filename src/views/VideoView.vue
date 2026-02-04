<template>
  <div class="page">
    <h1>🎥 Record Your Voice — on video</h1>
    <video ref="video" autoplay playsinline></video>
    <div>
      <button @click="start">Start</button>
      <button @click="stop">Stop</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";

const video = ref(null);
let stream;

const start = async () => {
  stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  video.value.srcObject = stream;
};

const stop = () => {
  stream.getTracks().forEach(t => t.stop());
};
</script>

<style scoped>
.page {
  padding: 40px;
  text-align: center;
}
video {
  width: 320px;
  border-radius: 12px;
}
</style>
