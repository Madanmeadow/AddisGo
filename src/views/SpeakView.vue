<template>
  <div class="page">
    <h1>🎤 Speak Your Voice</h1>
    <p>Your voice matters. Press record when ready.</p>

    <div class="controls">
      <button @click="startRecording" :disabled="recording">
        ▶ Start Recording
      </button>

      <button @click="stopRecording" :disabled="!recording">
        ⏹ Stop
      </button>
    </div>

    <audio v-if="audioUrl" :src="audioUrl" controls></audio>
  </div>
</template>

<script setup>
import { ref } from "vue";

const recording = ref(false);
const audioUrl = ref(null);
let mediaRecorder;
let chunks = [];

const startRecording = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  mediaRecorder = new MediaRecorder(stream);
  mediaRecorder.start();
  recording.value = true;

  mediaRecorder.ondataavailable = e => chunks.push(e.data);

  mediaRecorder.onstop = () => {
    const blob = new Blob(chunks, { type: "audio/webm" });
    audioUrl.value = URL.createObjectURL(blob);
    chunks = [];
  };
};

const stopRecording = () => {
  mediaRecorder.stop();
  recording.value = false;
};
</script>

<style scoped>
.page {
  padding: 40px;
  text-align: center;
}

.controls {
  margin: 20px 0;
}

button {
  padding: 12px 20px;
  margin: 0 10px;
  font-size: 16px;
}
</style>
