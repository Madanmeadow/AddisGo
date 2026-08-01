<template>
  <Layout>
    <div class="live">
      <h2>🔴 Live SFU</h2>

      <div class="grid">
        <div v-for="peer in peers" :key="peer.id" class="peer-card">
          <video
            :ref="el => setVideoRef(el, peer.id)"
            autoplay
            playsinline
            :muted="peer.id === 'me'"
          ></video>
          <span class="peer-label">{{ peer.id === 'me' ? 'You' : peer.id.slice(0, 8) }}</span>
        </div>
      </div>

      <div class="controls">
        <button @click="startCamera" :disabled="isPublishing">
          {{ isPublishing ? 'Camera On' : 'Start Camera' }}
        </button>
        <button @click="requestSpeak" :disabled="speakRequested">
          {{ speakRequested ? 'Pending...' : 'Request to Speak' }}
        </button>
        <button @click="stopCamera" v-if="isPublishing" class="danger">Stop</button>
      </div>

      <div v-if="error" class="error">{{ error }}</div>
    </div>
  </Layout>
</template>

<script setup>
import { ref, reactive, nextTick, onBeforeUnmount } from "vue";
import socket from "../socket";
import * as mediasoupClient from "mediasoup-client";

/* ================= STATE ================= */
const peers = reactive([]);
const videoRefs = new Map();
const consumers = new Map();      // producerId -> consumer
const recvTransport = ref(null);  // Single recvTransport for all consumers
const device = ref(null);
const sendTransport = ref(null);
const localStream = ref(null);
const isPublishing = ref(false);
const speakRequested = ref(false);
const error = ref(null);

const liveId = new URLSearchParams(window.location.search).get("liveId") || "test";
const role = new URLSearchParams(window.location.search).get("role") || "audience";

/* ================= REFS ================= */
function setVideoRef(el, id) {
  if (el) videoRefs.set(id, el);
}

function getPeer(id) {
  return peers.find(p => p.id === id);
}

function addPeer(id, stream) {
  // Prevent duplicates
  if (getPeer(id)) return;
  
  peers.push({ id, stream });
  
  // Use nextTick instead of setTimeout
  nextTick(() => {
    const video = videoRefs.get(id);
    if (video && stream) {
      video.srcObject = stream;
    }
  });
}

function removePeer(id) {
  const idx = peers.findIndex(p => p.id === id);
  if (idx !== -1) {
    const peer = peers[idx];
    peer.stream?.getTracks().forEach(t => t.stop());
    peers.splice(idx, 1);
  }
  videoRefs.delete(id);
}

/* ================= JOIN & DEVICE ================= */
socket.emit("sfu:join", { liveId, role }, async (data) => {
  if (data.error) {
    error.value = data.error;
    return;
  }
  
  try {
    device.value = new mediasoupClient.Device();
    await device.value.load({ routerRtpCapabilities: data.rtpCapabilities });
    
    // Create send transport if host/speaker
    if (role === "host" || role === "speaker") {
      createSendTransport();
    }
    
    // Create single receive transport for consuming
    createRecvTransport();
  } catch (err) {
    error.value = `Device load failed: ${err.message}`;
  }
});

/* ================= SEND TRANSPORT ================= */
function createSendTransport() {
  socket.emit("sfu:createTransport", { liveId, direction: "send" }, (params) => {
    if (params.error) {
      error.value = params.error;
      return;
    }

    sendTransport.value = device.value.createSendTransport(params);

    sendTransport.value.on("connect", ({ dtlsParameters }, callback, errback) => {
      socket.emit("sfu:connectTransport", { liveId, transportId: params.id, dtlsParameters }, (res) => {
        if (res.error) return errback(new Error(res.error));
        callback();
      });
    });

    sendTransport.value.on("produce", ({ kind, rtpParameters }, callback, errback) => {
      socket.emit(
        "sfu:produce",
        { liveId, transportId: params.id, kind, rtpParameters },
        (res) => {
          if (res.error) return errback(new Error(res.error));
          callback({ id: res.id });
        }
      );
    });

    sendTransport.value.on("connectionstatechange", (state) => {
      if (state === "failed" || state === "closed") {
        error.value = "Send transport failed";
      }
    });
  });
}

/* ================= RECEIVE TRANSPORT ================= */
function createRecvTransport() {
  socket.emit("sfu:createTransport", { liveId, direction: "recv" }, (params) => {
    if (params.error) {
      error.value = params.error;
      return;
    }

    recvTransport.value = device.value.createRecvTransport(params);

    recvTransport.value.on("connect", ({ dtlsParameters }, callback, errback) => {
      socket.emit("sfu:connectTransport", { liveId, transportId: params.id, dtlsParameters }, (res) => {
        if (res.error) return errback(new Error(res.error));
        callback();
      });
    });

    recvTransport.value.on("connectionstatechange", (state) => {
      if (state === "failed") {
        error.value = "Receive transport failed";
      }
    });
  });
}

/* ================= START CAMERA ================= */
async function startCamera() {
  if (!sendTransport.value) {
    error.value = "Transport not ready";
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: { echoCancellation: true, noiseSuppression: true }
    });

    localStream.value = stream;

    // Produce all tracks
    const producers = [];
    for (const track of stream.getTracks()) {
      const producer = await sendTransport.value.produce({ track });
      producers.push(producer);
    }

    // Store producers for cleanup
    localStream.value._producers = producers;

    addPeer("me", stream);
    isPublishing.value = true;
  } catch (err) {
    error.value = `Camera failed: ${err.message}`;
  }
}

function stopCamera() {
  // Stop producers
  localStream.value?._producers?.forEach(p => p.close());
  
  // Stop tracks
  localStream.value?.getTracks().forEach(t => t.stop());
  localStream.value = null;
  
  removePeer("me");
  isPublishing.value = false;
}

/* ================= CONSUME ================= */
socket.on("sfu:newProducer", ({ producerId, peerId }) => {
  if (producerId && !consumers.has(producerId)) {
    consume(producerId, peerId || producerId);
  }
});

socket.on("sfu:producerClosed", ({ producerId }) => {
  const consumer = consumers.get(producerId);
  if (consumer) {
    consumer.close();
    consumers.delete(producerId);
  }
  removePeer(producerId);
});

async function consume(producerId, peerId) {
  if (!recvTransport.value) {
    console.warn("Recv transport not ready");
    return;
  }

  socket.emit(
    "sfu:consume",
    {
      liveId,
      producerId,
      rtpCapabilities: device.value.rtpCapabilities,
    },
    async (data) => {
      if (data.error) {
        console.error("Consume failed:", data.error);
        return;
      }

      try {
        const consumer = await recvTransport.value.consume(data);
        consumers.set(producerId, consumer);
        
        const stream = new MediaStream([consumer.track]);
        addPeer(producerId, stream);

        // Resume consumer (required by some mediasoup versions)
        socket.emit("sfu:resumeConsumer", { liveId, consumerId: consumer.id });
      } catch (err) {
        console.error("Consume error:", err);
      }
    }
  );
}

/* ================= REQUEST TO SPEAK ================= */
function requestSpeak() {
  socket.emit("sfu:requestSpeak", { liveId }, (res) => {
    if (res?.granted) {
      // Server granted speaking rights — create send transport if needed
      if (!sendTransport.value) createSendTransport();
    }
  });
  speakRequested.value = true;
}

/* ================= CLEANUP ================= */
onBeforeUnmount(() => {
  // Close all consumers
  consumers.forEach(c => c.close());
  consumers.clear();
  
  // Close transports
  sendTransport.value?.close();
  recvTransport.value?.close();
  
  // Stop local stream
  localStream.value?.getTracks().forEach(t => t.stop());
  
  // Remove all peers
  peers.splice(0, peers.length);
  
  socket.off("sfu:newProducer");
  socket.off("sfu:producerClosed");
});
</script>

<style scoped>
.live {
  padding: 15px;
  color: white;
  max-width: 1200px;
  margin: 0 auto;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.peer-card {
  position: relative;
  background: #1a1a2e;
  border-radius: 12px;
  overflow: hidden;
}

video {
  width: 100%;
  aspect-ratio: 16/9;
  background: black;
  display: block;
}

.peer-label {
  position: absolute;
  bottom: 8px;
  left: 8px;
  background: rgba(0,0,0,0.7);
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.controls {
  margin-top: 20px;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

button {
  padding: 10px 20px;
  border-radius: 8px;
  border: none;
  background: #4f46e5;
  color: white;
  cursor: pointer;
  font-weight: 500;
  transition: opacity 0.2s;
}

button:hover:not(:disabled) {
  opacity: 0.9;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

button.danger {
  background: #dc2626;
}

.error {
  margin-top: 15px;
  padding: 10px;
  background: #fee2e2;
  color: #991b1b;
  border-radius: 8px;
}
</style>