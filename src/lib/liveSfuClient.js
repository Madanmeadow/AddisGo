// src/lib/liveSfuClient.js
import socket from "../socket";
import { createLoadedDevice } from "./mediasoupDevice";

function ackEmit(event, payload = {}) {
  return new Promise((resolve) => {
    socket.emit(event, payload, (res) => resolve(res));
  });
}

export class LiveSfuClient {
  constructor() {
    this.device = null;
    this.liveId = "";
    this.role = "";
    this.sendTransport = null;
    this.recvTransport = null;
    this.localStream = null;
    this.remoteStream = new MediaStream();
    this.producers = new Map(); // kind -> producer
    this.consumers = new Map(); // consumerId -> consumer
    this.knownProducerIds = new Set();

    this.onProducerAdded = null;
    this.onProducerClosed = null;
  }

  async init({ liveId }) {
    this.liveId = String(liveId || "").trim();
    if (!this.liveId) throw new Error("liveId required");

    const caps = await ackEmit("sfu:getRouterRtpCapabilities", {
      liveId: this.liveId,
    });

    if (!caps?.ok) {
      throw new Error(caps?.error || "Failed to get router RTP capabilities");
    }

    this.device = await createLoadedDevice(caps.rtpCapabilities);
    this.bindSocketEvents();
    return this.device;
  }

  bindSocketEvents() {
    socket.off("sfu:producerAdded", this._handleProducerAdded);
    socket.off("sfu:producerAdded:sync", this._handleProducerSync);
    socket.off("sfu:producerClosed", this._handleProducerClosed);
    socket.off("sfu:consumerClosed", this._handleConsumerClosed);

    this._handleProducerAdded = async (payload) => {
      if (!payload?.producerId) return;
      if (this.knownProducerIds.has(payload.producerId)) return;

      this.knownProducerIds.add(payload.producerId);
      if (this.recvTransport && payload.role !== "host" ? true : true) {
        try {
          await this.consumeProducer(payload.producerId);
        } catch (e) {
          console.error("[SFU consume producerAdded]", e);
        }
      }

      if (typeof this.onProducerAdded === "function") {
        this.onProducerAdded(payload);
      }
    };

    this._handleProducerSync = async (payload) => {
      const list = Array.isArray(payload?.producers) ? payload.producers : [];
      for (const item of list) {
        if (!item?.producerId) continue;
        if (this.knownProducerIds.has(item.producerId)) continue;
        this.knownProducerIds.add(item.producerId);

        if (this.recvTransport) {
          try {
            await this.consumeProducer(item.producerId);
          } catch (e) {
            console.error("[SFU consume sync]", e);
          }
        }
      }
    };

    this._handleProducerClosed = (payload) => {
      const producerId = String(payload?.producerId || "");
      if (!producerId) return;

      for (const [consumerId, consumer] of this.consumers.entries()) {
        if (String(consumer.producerId) === producerId) {
          try { consumer.close(); } catch {}
          this.consumers.delete(consumerId);
        }
      }

      this.knownProducerIds.delete(producerId);

      if (typeof this.onProducerClosed === "function") {
        this.onProducerClosed(payload);
      }
    };

    this._handleConsumerClosed = (payload) => {
      const consumerId = String(payload?.consumerId || "");
      if (!consumerId) return;

      const consumer = this.consumers.get(consumerId);
      if (consumer) {
        try { consumer.close(); } catch {}
        this.consumers.delete(consumerId);
      }
    };

    socket.on("sfu:producerAdded", this._handleProducerAdded);
    socket.on("sfu:producerAdded:sync", this._handleProducerSync);
    socket.on("sfu:producerClosed", this._handleProducerClosed);
    socket.on("sfu:consumerClosed", this._handleConsumerClosed);
  }

  async createSendTransport() {
    const res = await ackEmit("sfu:createWebRtcTransport", {
      liveId: this.liveId,
      direction: "send",
    });

    if (!res?.ok) {
      throw new Error(res?.error || "Failed to create send transport");
    }

    this.sendTransport = this.device.createSendTransport(res.transportOptions);

    this.sendTransport.on("connect", async ({ dtlsParameters }, callback, errback) => {
      try {
        const reply = await ackEmit("sfu:connectWebRtcTransport", {
          liveId: this.liveId,
          transportId: this.sendTransport.id,
          dtlsParameters,
        });

        if (!reply?.ok) throw new Error(reply?.error || "Send transport connect failed");
        callback();
      } catch (err) {
        errback(err);
      }
    });

    this.sendTransport.on("produce", async ({ kind, rtpParameters, appData }, callback, errback) => {
      try {
        const reply = await ackEmit("sfu:produce", {
          liveId: this.liveId,
          transportId: this.sendTransport.id,
          kind,
          rtpParameters,
          appData,
        });

        if (!reply?.ok) throw new Error(reply?.error || "Produce failed");
        callback({ id: reply.producerId });
      } catch (err) {
        errback(err);
      }
    });

    this.sendTransport.on("connectionstatechange", (state) => {
      console.log("[SFU send transport]", state);
    });

    return this.sendTransport;
  }

  async createRecvTransport() {
    const res = await ackEmit("sfu:createWebRtcTransport", {
      liveId: this.liveId,
      direction: "recv",
    });

    if (!res?.ok) {
      throw new Error(res?.error || "Failed to create recv transport");
    }

    this.recvTransport = this.device.createRecvTransport(res.transportOptions);

    this.recvTransport.on("connect", async ({ dtlsParameters }, callback, errback) => {
      try {
        const reply = await ackEmit("sfu:connectWebRtcTransport", {
          liveId: this.liveId,
          transportId: this.recvTransport.id,
          dtlsParameters,
        });

        if (!reply?.ok) throw new Error(reply?.error || "Recv transport connect failed");
        callback();
      } catch (err) {
        errback(err);
      }
    });

    this.recvTransport.on("connectionstatechange", (state) => {
      console.log("[SFU recv transport]", state);
    });

    return this.recvTransport;
  }

  async startHostMedia() {
    if (!this.sendTransport) {
      await this.createSendTransport();
    }

    this.localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    const videoTrack = this.localStream.getVideoTracks()[0];
    const audioTrack = this.localStream.getAudioTracks()[0];

    if (videoTrack) {
      const producer = await this.sendTransport.produce({
        track: videoTrack,
        appData: {
          mediaTag: "host-video",
        },
      });
      this.producers.set("video", producer);
    }

    if (audioTrack) {
      const producer = await this.sendTransport.produce({
        track: audioTrack,
        appData: {
          mediaTag: "host-audio",
        },
      });
      this.producers.set("audio", producer);
    }

    return this.localStream;
  }

  async startAudienceMedia() {
    if (!this.recvTransport) {
      await this.createRecvTransport();
    }
    return this.remoteStream;
  }

  async consumeProducer(producerId) {
    if (!this.recvTransport) {
      await this.createRecvTransport();
    }

    const reply = await ackEmit("sfu:consume", {
      liveId: this.liveId,
      transportId: this.recvTransport.id,
      producerId,
      rtpCapabilities: this.device.rtpCapabilities,
    });

    if (!reply?.ok) {
      throw new Error(reply?.error || "Consume failed");
    }

    const { id, kind, rtpParameters } = reply.consumerOptions;

    const consumer = await this.recvTransport.consume({
      id,
      producerId,
      kind,
      rtpParameters,
    });

    this.consumers.set(consumer.id, consumer);
    this.remoteStream.addTrack(consumer.track);

    const resumeReply = await ackEmit("sfu:resumeConsumer", {
      liveId: this.liveId,
      consumerId: consumer.id,
    });

    if (!resumeReply?.ok) {
      throw new Error(resumeReply?.error || "Resume consumer failed");
    }

    return consumer;
  }

  close() {
    try {
      socket.off("sfu:producerAdded", this._handleProducerAdded);
      socket.off("sfu:producerAdded:sync", this._handleProducerSync);
      socket.off("sfu:producerClosed", this._handleProducerClosed);
      socket.off("sfu:consumerClosed", this._handleConsumerClosed);
    } catch {}

    for (const producer of this.producers.values()) {
      try { producer.close(); } catch {}
    }
    for (const consumer of this.consumers.values()) {
      try { consumer.close(); } catch {}
    }

    try { this.sendTransport?.close(); } catch {}
    try { this.recvTransport?.close(); } catch {}

    if (this.localStream) {
      for (const track of this.localStream.getTracks()) {
        try { track.stop(); } catch {}
      }
    }

    this.producers.clear();
    this.consumers.clear();
    this.knownProducerIds.clear();
    this.localStream = null;
    this.remoteStream = new MediaStream();
    this.sendTransport = null;
    this.recvTransport = null;
    this.device = null;
  }
}