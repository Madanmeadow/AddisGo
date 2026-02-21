<template>
  <Layout>
    <h2>📹 Live Video</h2>

    <div class="live-container">
      <video ref="video" autoplay playsinline></video>

      <div class="controls">
        <button @click="startCamera">Start Camera</button>
        <button @click="stopCamera">Stop</button>
      </div>
    </div>
  </Layout>
</template>

<script setup>
import { ref } from "vue";
import Layout from "../components/Layout.vue";

const video = ref(null);
let stream = null;

async function startCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    });

    video.value.srcObject = stream;
  } catch (err) {
    alert("Camera access denied");
  }
}

function stopCamera() {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
  }
}
</script>

<style scoped>
.live-container {
  margin-top: 40px;
  background: rgba(255,255,255,0.1);
  padding: 30px;
  border-radius: 20px;
}

video {
  width: 100%;
  border-radius: 20px;
  background: black;
}

.controls {
  margin-top: 20px;
  display: flex;
  gap: 20px;
}

button {
  padding: 10px 20px;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  background: linear-gradient(45deg, #ff416c, #ff4b2b);
  color: white;
}
</style>