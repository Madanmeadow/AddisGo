<template>
  <Layout>
    <div class="live">
      <h2>🔴 Live SFU</h2>

      <div class="grid">
        <div v-for="peer in peers" :key="peer.id">
          <video
            :ref="el => setVideo(el, peer.id)"
            autoplay
            playsinline
            muted
          ></video>
        </div>
      </div>

      <div class="controls">
        <button @click="startCamera">Start Camera</button>
        <button @click="requestSpeak">Request to Speak</button>
      </div>
    </div>
  </Layout>
</template>

<script setup>
import { ref, reactive } from "vue";
import socket from "../socket";
import * as mediasoupClient from "mediasoup-client";

const peers = reactive([]);
const videoMap = new Map();

let device;
let sendTransport;

const liveId = new URLSearchParams(window.location.search).get("liveId") || "test";

/* ================= VIDEO REF ================= */
function setVideo(el, id) {
  if (el) videoMap.set(id, el);
}

/* ================= JOIN ================= */
socket.emit("sfu:join", { liveId, role: "host" }, async (data) => {
  device = new mediasoupClient.Device();
  await device.load({ routerRtpCapabilities: data.rtpCapabilities });

  createTransport();
});

/* ================= CREATE TRANSPORT ================= */
function createTransport() {
  socket.emit("sfu:createTransport", { liveId }, (params) => {
    sendTransport = device.createSendTransport(params);

    sendTransport.on("connect", ({ dtlsParameters }, cb) => {
      socket.emit("sfu:connectTransport", { liveId, dtlsParameters });
      cb();
    });

    sendTransport.on("produce", ({ kind, rtpParameters }, cb) => {
      socket.emit(
        "sfu:produce",
        { liveId, kind, rtpParameters },
        ({ id }) => cb({ id })
      );
    });
  });
}

/* ================= START CAMERA ================= */
async function startCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true,
  });

  stream.getTracks().forEach((track) => {
    sendTransport.produce({ track });
  });

  addPeer("me", stream);
}

/* ================= ADD PEER ================= */
function addPeer(id, stream) {
  peers.push({ id, stream });

  setTimeout(() => {
    const video = videoMap.get(id);
    if (video) video.srcObject = stream;
  }, 100);
}

/* ================= RECEIVE ================= */
socket.on("sfu:newProducer", ({ producerId }) => {
  consume(producerId);
});

async function consume(producerId) {
  socket.emit("sfu:createTransport", { liveId }, (params) => {
    const recvTransport = device.createRecvTransport(params);

    recvTransport.on("connect", ({ dtlsParameters }, cb) => {
      socket.emit("sfu:connectTransport", { liveId, dtlsParameters });
      cb();
    });

    socket.emit(
      "sfu:consume",
      {
        liveId,
        producerId,
        rtpCapabilities: device.rtpCapabilities,
      },
      async (data) => {
        const consumer = await recvTransport.consume(data);
        const stream = new MediaStream([consumer.track]);
        addPeer(producerId, stream);
      }
    );
  });
}

/* ================= REQUEST ================= */
function requestSpeak() {
  socket.emit("sfu:requestSpeak", { liveId });
}
</script>

<style scoped>
.live {
  padding: 15px;
  color: white;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 10px;
}

video {
  width: 100%;
  background: black;
  border-radius: 10px;
}

.controls {
  margin-top: 15px;
  display: flex;
  gap: 10px;
}

button {
  padding: 10px;
  border-radius: 8px;
}
</style>