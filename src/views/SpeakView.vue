<template>
  <div class="page">
    <h1>🎤 Speak Your Voice</h1>
    <p>Your voice matters. Press record when ready.</p>

    <button @click="startRecording">▶ Start</button>
    <button @click="stopRecording">⏹ Stop</button>

    <audio v-if="audioUrl" :src="audioUrl" controls />
  </div>
</template>

<script setup>
import { ref } from "vue";

let mediaRecorder;
let chunks = [];
const audioUrl = ref(null);

const startRecording = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  mediaRecorder = new MediaRecorder(stream);
  mediaRecorder.start();

  chunks = [];
  mediaRecorder.ondataavailable = e => chunks.push(e.data);
};

const stopRecording = () => {
  mediaRecorder.stop();
  mediaRecorder.onstop = () => {
    const blob = new Blob(chunks, { type: "audio/webm" });
    audioUrl.value = URL.createObjectURL(blob);
  };
};
</script>

<style scoped>
.page {
  padding: 40px;
  text-align: center;
}
</style>
