<template>
  <Layout>
    <div class="live">
      <h2>🔴 Live SFU</h2>

      <video ref="videoEl" autoplay playsinline muted class="video"></video>

      <div class="controls">
        <button @click="start">Start Live</button>
        <button @click="join">Join Live</button>
      </div>

      <div class="info">
        Live ID: {{ liveId }}
      </div>
    </div>
  </Layout>
</template>

<script setup>
import { ref, onMounted } from "vue";
import io from "socket.io-client";
import * as mediasoupClient from "mediasoup-client";

const socket = io(import.meta.env.VITE_API_URL);

const videoEl = ref(null);
let device;
let transport;

const params = new URLSearchParams(window.location.search);
const liveId = params.get("liveId") || `live-${Date.now()}`;

let localStream;

/* ================= HOST ================= */
async function start() {
  localStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true,
  });

  videoEl.value.srcObject = localStream;

  socket.emit("sfu:join", { liveId, role: "host" }, async (data) => {
    device = new mediasoupClient.Device();
    await device.load({ routerRtpCapabilities: data.rtpCapabilities });

    socket.emit("sfu:createTransport", { liveId }, (t) => {
      transport = device.createSendTransport(t);

      transport.on("connect", ({ dtlsParameters }, cb) => {
        socket.emit("sfu:connectTransport", {
          liveId,
          dtlsParameters,
        });
        cb();
      });

      transport.on("produce", ({ kind, rtpParameters }, cb) => {
        socket.emit(
          "sfu:produce",
          {
            liveId,
            kind,
            rtpParameters,
          },
          ({ id }) => cb({ id })
        );
      });

      localStream.getTracks().forEach((track) => {
        transport.produce({ track });
      });
    });
  });
}

/* ================= VIEWER ================= */
async function join() {
  socket.emit("sfu:join", { liveId, role: "viewer" }, async (data) => {
    device = new mediasoupClient.Device();
    await device.load({ routerRtpCapabilities: data.rtpCapabilities });

    socket.emit("sfu:createTransport", { liveId }, (t) => {
      const recvTransport = device.createRecvTransport(t);

      recvTransport.on("connect", ({ dtlsParameters }, cb) => {
        socket.emit("sfu:connectTransport", {
          liveId,
          dtlsParameters,
        });
        cb();
      });

      // 🔥 get existing producers
      socket.emit("sfu:getProducers", { liveId }, async (producers) => {
        for (const producerId of producers) {
          consume(producerId, recvTransport);
        }
      });

      // 🔥 listen new producers
      socket.on("sfu:newProducer", ({ producerId }) => {
        consume(producerId, recvTransport);
      });
    });
  });
}

/* ================= CONSUME ================= */
function consume(producerId, transport) {
  socket.emit(
    "sfu:consume",
    {
      liveId,
      producerId,
      rtpCapabilities: device.rtpCapabilities,
    },
    async (data) => {
      const consumer = await transport.consume(data);

      const stream = new MediaStream([consumer.track]);
      videoEl.value.srcObject = stream;
    }
  );
}
</script>

<style scoped>
.live {
  padding: 20px;
  color: white;
}
.video {
  width: 100%;
  border-radius: 12px;
  background: black;
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