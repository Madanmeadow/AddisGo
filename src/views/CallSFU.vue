<template>
  <Layout>
    <div class="call">
      <h2>📞 SFU Call</h2>

      <div v-if="connectionError" class="error-banner">
        {{ connectionError }}
        <button class="close" @click="connectionError = null">×</button>
      </div>

      <div class="grid">
        <div 
          v-for="peer in peers" 
          :key="peer.id" 
          class="peer-card"
          :class="{ 'peer-card--self': peer.id === 'me' }"
        >
          <video
            :ref="el => setVideoRef(el, peer.id)"
            autoplay
            playsinline
            :muted="peer.id === 'me'"
          ></video>
          <span class="peer-label">
            {{ peer.id === 'me' ? 'You' : peer.displayName || peer.id.slice(0, 8) }}
          </span>
        </div>
      </div>

      <div class="controls">
        <button 
          @click="startCall" 
          :disabled="isCalling || !deviceLoaded"
          class="btn-primary"
        >
          {{ isCalling ? 'In Call' : 'Start Call' }}
        </button>
        
        <button 
          v-if="isCalling" 
          @click="endCall" 
          class="btn-danger"
        >
          End Call
        </button>
      </div>

      <div class="status-bar">
        <span class="status-dot" :class="connectionState"></span>
        {{ connectionState }}
        <span v-if="peers.length > 0">• {{ peers.length }} participant{{ peers.length !== 1 ? 's' : '' }}</span>
      </div>
    </div>
  </Layout>
</template>

<script setup>
import { reactive, ref, onBeforeUnmount, onMounted, nextTick } from "vue";
import { useRoute } from "vue-router";
import socket from "../socket";
import * as mediasoupClient from "mediasoup-client";

const route = useRoute();

// Config
const roomId = String(route.query.roomId || route.params.roomId || "test-call");

// State
const peers = reactive([]);
const videoRefs = new Map();
const consumers = new Map();        // producerId -> consumer
const recvTransports = new Map();   // producerId -> recvTransport (or use single)
const connectionError = ref(null);
const isCalling = ref(false);
const deviceLoaded = ref(false);
const connectionState = ref("disconnected");

// Mediasoup state
let device = null;
let sendTransport = null;
let localStream = null;
let localProducers = [];

/* ================= DOM REFS ================= */
function setVideoRef(el, id) {
  if (el) videoRefs.set(id, el);
}

function getPeer(id) {
  return peers.find(p => p.id === id);
}

function addPeer(id, stream, meta = {}) {
  // Prevent duplicates
  if (getPeer(id)) {
    // Update existing peer's stream
    const peer = getPeer(id);
    peer.stream = stream;
    const video = videoRefs.get(id);
    if (video) video.srcObject = stream;
    return;
  }

  peers.push({ id, stream, ...meta });

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

/* ================= DEVICE & TRANSPORT ================= */
async function initDevice() {
  return new Promise((resolve, reject) => {
    socket.emit("call:sfu:join", { roomId }, async (data) => {
      if (data.error) {
        connectionError.value = data.error;
        reject(new Error(data.error));
        return;
      }

      try {
        device = new mediasoupClient.Device();
        await device.load({ routerRtpCapabilities: data.rtpCapabilities });
        deviceLoaded.value = true;
        resolve();
      } catch (err) {
        connectionError.value = `Device load failed: ${err.message}`;
        reject(err);
      }
    });
  });
}

function createSendTransport() {
  return new Promise((resolve, reject) => {
    socket.emit("call:sfu:createTransport", { roomId, direction: "send" }, (params) => {
      if (params.error) {
        connectionError.value = params.error;
        reject(new Error(params.error));
        return;
      }

      try {
        sendTransport = device.createSendTransport(params);

        sendTransport.on("connect", ({ dtlsParameters }, callback, errback) => {
          socket.emit(
            "call:sfu:connectTransport", 
            { roomId, transportId: params.id, dtlsParameters },
            (res) => {
              if (res?.error) return errback(new Error(res.error));
              callback();
            }
          );
        });

        sendTransport.on("produce", ({ kind, rtpParameters }, callback, errback) => {
          socket.emit(
            "call:sfu:produce",
            { roomId, transportId: params.id, kind, rtpParameters },
            (res) => {
              if (res?.error) return errback(new Error(res.error));
              callback({ id: res.id });
            }
          );
        });

        sendTransport.on("connectionstatechange", (state) => {
          connectionState.value = state;
          if (state === "failed" || state === "closed") {
            connectionError.value = "Send transport failed";
          }
        });

        resolve(sendTransport);
      } catch (err) {
        reject(err);
      }
    });
  });
}

/* Option A: Single recv transport for all consumers (recommended) */
let sharedRecvTransport = null;

function createRecvTransport() {
  return new Promise((resolve, reject) => {
    socket.emit("call:sfu:createTransport", { roomId, direction: "recv" }, (params) => {
      if (params.error) {
        reject(new Error(params.error));
        return;
      }

      try {
        sharedRecvTransport = device.createRecvTransport(params);

        sharedRecvTransport.on("connect", ({ dtlsParameters }, callback, errback) => {
          socket.emit(
            "call:sfu:connectTransport",
            { roomId, transportId: params.id, dtlsParameters },
            (res) => {
              if (res?.error) return errback(new Error(res.error));
              callback();
            }
          );
        });

        sharedRecvTransport.on("connectionstatechange", (state) => {
          if (state === "failed") {
            console.error("Receive transport failed");
          }
        });

        resolve(sharedRecvTransport);
      } catch (err) {
        reject(err);
      }
    });
  });
}

/* ================= START CALL ================= */
async function startCall() {
  if (!device) {
    await initDevice();
  }

  if (!sendTransport) {
    await createSendTransport();
  }

  if (!sharedRecvTransport) {
    await createRecvTransport();
  }

  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: { echoCancellation: true, noiseSuppression: true },
    });

    // Produce tracks
    const producers = [];
    for (const track of localStream.getTracks()) {
      const producer = await sendTransport.produce({ track });
      producers.push(producer);
    }
    localProducers = producers;

    addPeer("me", localStream, { displayName: "You" });
    isCalling.value = true;
    connectionState.value = "connected";
  } catch (err) {
    connectionError.value = `Failed to start call: ${err.message}`;
    console.error(err);
  }
}

/* ================= END CALL ================= */
function endCall() {
  // Close local producers
  localProducers.forEach(p => p.close());
  localProducers = [];

  // Stop local stream
  if (localStream) {
    localStream.getTracks().forEach(t => t.stop());
    localStream = null;
  }

  // Close all consumers
  consumers.forEach((consumer, producerId) => {
    consumer.close();
    removePeer(producerId);
  });
  consumers.clear();

  // Close recv transports
  recvTransports.forEach(t => t.close());
  recvTransports.clear();
  if (sharedRecvTransport) {
    sharedRecvTransport.close();
    sharedRecvTransport = null;
  }

  // Close send transport
  if (sendTransport) {
    sendTransport.close();
    sendTransport = null;
  }

  removePeer("me");
  isCalling.value = false;
  connectionState.value = "disconnected";

  // Notify server
  socket.emit("call:sfu:leave", { roomId });
}

/* ================= CONSUME ================= */
async function consume(producerId, peerId) {
  if (!sharedRecvTransport) {
    console.warn("Recv transport not ready");
    return;
  }

  // Prevent duplicate consumption
  if (consumers.has(producerId)) return;

  socket.emit(
    "call:sfu:consume",
    {
      roomId,
      producerId,
      rtpCapabilities: device.rtpCapabilities,
    },
    async (data) => {
      if (data.error) {
        console.error("Consume failed:", data.error);
        return;
      }

      try {
        const consumer = await sharedRecvTransport.consume(data);
        consumers.set(producerId, consumer);

        // Resume consumer (required by Mediasoup)
        socket.emit("call:sfu:resumeConsumer", { roomId, consumerId: consumer.id });

        const stream = new MediaStream([consumer.track]);
        addPeer(producerId, stream, { displayName: peerId });

        // Handle producer close
        consumer.on("trackended", () => {
          console.log("Consumer track ended:", producerId);
          cleanupConsumer(producerId);
        });

        consumer.on("transportclose", () => {
          console.log("Consumer transport closed:", producerId);
          cleanupConsumer(producerId);
        });
      } catch (err) {
        console.error("Consume error:", err);
      }
    }
  );
}

function cleanupConsumer(producerId) {
  const consumer = consumers.get(producerId);
  if (consumer) {
    consumer.close();
    consumers.delete(producerId);
  }
  removePeer(producerId);
}

/* ================= SOCKET HANDLERS ================= */
const handlers = {
  "call:sfu:newProducer": ({ producerId, peerId }) => {
    if (producerId && !consumers.has(producerId)) {
      consume(producerId, peerId);
    }
  },

  "call:sfu:producerClosed": ({ producerId }) => {
    cleanupConsumer(producerId);
  },

  "call:sfu:peerLeft": ({ peerId }) => {
    // If server maps peerId to producerIds, clean them all
    consumers.forEach((consumer, producerId) => {
      // You may need server to send producerId in peerLeft, or track mapping
      if (consumer.appData?.peerId === peerId) {
        cleanupConsumer(producerId);
      }
    });
  },
};

/* ================= LIFECYCLE ================= */
onMounted(async () => {
  // Register handlers
  Object.entries(handlers).forEach(([event, handler]) => {
    socket.on(event, handler);
  });

  // Pre-init device
  try {
    await initDevice();
    await createRecvTransport(); // Pre-create so we're ready to consume
  } catch (err) {
    // Non-fatal, will retry on startCall
    console.log("Pre-init failed, will retry on call start");
  }
});

onBeforeUnmount(() => {
  // Remove handlers
  Object.entries(handlers).forEach(([event, handler]) => {
    socket.off(event, handler);
  });

  endCall();
});
</script>

<style scoped>
.call {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.error-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 12px;
  margin-bottom: 16px;
  color: #fca5a5;
}

.error-banner .close {
  background: none;
  border: none;
  color: inherit;
  font-size: 20px;
  cursor: pointer;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}

.peer-card {
  position: relative;
  background: #0f172a;
  border-radius: 16px;
  overflow: hidden;
  aspect-ratio: 16/9;
}

.peer-card--self {
  border: 2px solid #22c55e;
}

video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  background: black;
  display: block;
}

.peer-label {
  position: absolute;
  bottom: 8px;
  left: 8px;
  background: rgba(0, 0, 0, 0.7);
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
}

.controls {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

button {
  padding: 12px 24px;
  border-radius: 12px;
  border: none;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}

button:hover:not(:disabled) {
  opacity: 0.9;
}

button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-primary {
  background: #4f46e5;
  color: white;
}

.btn-danger {
  background: #ef4444;
  color: white;
}

.status-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #6b7280;
}

.status-dot.connected {
  background: #22c55e;
  animation: pulse 2s infinite;
}

.status-dot.connecting {
  background: #f59e0b;
  animation: pulse 1s infinite;
}

.status-dot.failed {
  background: #ef4444;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
</style>