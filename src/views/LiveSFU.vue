<template>
  <Layout>
    <div class="live">
      <h2>🔴 Live SFU Grid</h2>

      <div class="grid">
        <video
          v-for="peer in peers"
          :key="peer.userId"
          ref="videoEl"
          autoplay
          playsinline
          :muted="peer.userId === localUserId"
        ></video>
      </div>

      <div class="controls">
        <button v-if="role==='audience'" @click="requestSpeak">Request to Speak</button>
        <button v-if="role==='host'" @click="startRecording">Start Recording</button>
        <button v-if="role==='host'" @click="stopRecording">Stop Recording</button>
      </div>
    </div>
  </Layout>
</template>

<script setup>
import { ref, onMounted, reactive } from "vue";
import io from "socket.io-client";
import * as mediasoupClient from "mediasoup-client";

const socket = io(import.meta.env.VITE_API_URL);

const localUserId = ref(null);
const liveId = new URLSearchParams(window.location.search).get("liveId") || `live-${Date.now()}`;
const role = ref("audience"); // audience | host | speaker
const peers = reactive([]);

let device, transport, localStream;

onMounted(async () => {
  localUserId.value = String(Math.floor(Math.random()*9999)); // demo userId
  joinLive();
});

async function joinLive() {
  socket.emit("sfu:join", { liveId, role: role.value }, async (data) => {
    device = new mediasoupClient.Device();
    await device.load({ routerRtpCapabilities: data.rtpCapabilities });

    socket.emit("sfu:createTransport", { liveId }, async (t) => {
      transport = device.createSendTransport(t);

      transport.on("connect", ({ dtlsParameters }, cb) => {
        socket.emit("sfu:connectTransport", { liveId, dtlsParameters });
        cb();
      });

      transport.on("produce", ({ kind, rtpParameters }, cb) => {
        socket.emit("sfu:produce", { liveId, kind, rtpParameters }, ({ id }) => cb({ id }));
      });

      if (role.value !== "audience") {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStream.getTracks().forEach(track => transport.produce({ track }));
        addPeer(localUserId.value, localStream, role.value);
      }
    });
  });

  socket.on("sfu:newProducer", ({ producerId }) => {
    consume(producerId);
  });

  socket.on("sfu:gridUpdate", (updatedPeers) => {
    peers.splice(0, peers.length, ...updatedPeers);
  });

  socket.on("sfu:approvedSpeaker", () => {
    role.value = "speaker";
    startSpeaking();
  });
}

function addPeer(userId, stream, role) {
  peers.push({ userId, stream, role });
}

async function consume(producerId) {
  const recvTransport = device.createRecvTransport(await new Promise(res => {
    socket.emit("sfu:createTransport", { liveId }, res);
  }));

  recvTransport.on("connect", ({ dtlsParameters }, cb) => {
    socket.emit("sfu:connectTransport", { liveId, dtlsParameters });
    cb();
  });

  socket.emit("sfu:consume", { liveId, producerId, rtpCapabilities: device.rtpCapabilities }, async (data) => {
    const consumer = await recvTransport.consume(data);
    const stream = new MediaStream([consumer.track]);
    addPeer(data.producerId, stream, "speaker");
  });
}

function requestSpeak() {
  socket.emit("sfu:requestSpeak", { liveId });
}

function startSpeaking() {
  role.value = "speaker";
  joinLive();
}

function startRecording() {
  socket.emit("sfu:startRecording", { liveId });
}

function stopRecording() {
  socket.emit("sfu:stopRecording", { liveId });
}
</script>

<style scoped>
.live { padding:20px; color:white; }
.grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(120px,1fr)); gap:8px; }
video { width:100%; border-radius:8px; background:black; }
.controls { margin-top:15px; display:flex; gap:10px; }
button { padding:8px 12px; border-radius:6px; }
</style>