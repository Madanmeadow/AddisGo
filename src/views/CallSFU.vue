<template>
  <Layout>
    <div class="call">
      <h2>📞 SFU Call</h2>

      <div class="grid">
        <video
          v-for="p in peers"
          :key="p.id"
          :ref="el => setVideo(el, p.id)"
          autoplay
          playsinline
          muted
        ></video>
      </div>

      <button @click="startCall">Start Call</button>
    </div>
  </Layout>
</template>

<script setup>
import { reactive } from "vue";
import socket from "../socket";
import * as mediasoupClient from "mediasoup-client";

const peers = reactive([]);
const videoMap = new Map();

let device, transport;
const roomId = "test-call";

/* VIDEO */
function setVideo(el, id) {
  if (el) videoMap.set(id, el);
}

function addPeer(id, stream) {
  peers.push({ id, stream });

  setTimeout(() => {
    const v = videoMap.get(id);
    if (v) v.srcObject = stream;
  }, 100);
}

/* JOIN */
socket.emit("call:sfu:join", { roomId }, async (data) => {
  device = new mediasoupClient.Device();
  await device.load({ routerRtpCapabilities: data.rtpCapabilities });

  createTransport();
});

/* TRANSPORT */
function createTransport() {
  socket.emit("call:sfu:createTransport", { roomId }, (params) => {
    transport = device.createSendTransport(params);

    transport.on("connect", ({ dtlsParameters }, cb) => {
      socket.emit("call:sfu:connectTransport", { roomId, dtlsParameters });
      cb();
    });

    transport.on("produce", ({ kind, rtpParameters }, cb) => {
      socket.emit(
        "call:sfu:produce",
        { roomId, kind, rtpParameters },
        ({ id }) => cb({ id })
      );
    });
  });
}

/* START */
async function startCall() {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true,
  });

  stream.getTracks().forEach((t) => transport.produce({ track: t }));

  addPeer("me", stream);
}

/* RECEIVE */
socket.on("call:sfu:newProducer", ({ producerId }) => {
  consume(producerId);
});

function consume(producerId) {
  socket.emit("call:sfu:createTransport", { roomId }, (params) => {
    const recv = device.createRecvTransport(params);

    recv.on("connect", ({ dtlsParameters }, cb) => {
      socket.emit("call:sfu:connectTransport", { roomId, dtlsParameters });
      cb();
    });

    socket.emit(
      "call:sfu:consume",
      { roomId, producerId, rtpCapabilities: device.rtpCapabilities },
      async (data) => {
        const consumer = await recv.consume(data);
        const stream = new MediaStream([consumer.track]);
        addPeer(producerId, stream);
      }
    );
  });
}
</script>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 10px;
}
video {
  width: 100%;
  background: black;
}
</style>