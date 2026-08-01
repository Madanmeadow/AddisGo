import socket from "../socket";
import { Device } from "mediasoup-client";

function emitAsync(event, data = {}) {
  return new Promise((resolve) => {
    socket.emit(event, data, (res) => resolve(res));
  });
}

export class LiveSfuClient {
  constructor() {
    this.device = null;
    this.liveId = "";
    this.sendTransport = null;
    this.recvTransport = null;
    this.localStream = null;
    this.remoteStream = new MediaStream();
    this.consumers = new Map();
    this.bound = false;
    this._onProducerAdded = null;
  }

  async init(liveId) {
    this.liveId = String(liveId || "").trim();
    if (!this.liveId) throw new Error("liveId required");

    const res = await emitAsync("sfu:getRouterRtpCapabilities", { liveId: this.liveId });

    if (!res?.ok) {
      throw new Error(res?.error || "Failed to get RTP capabilities");
    }

    this.device = new Device();
    await this.device.load({ routerRtpCapabilities: res.rtpCapabilities });

    this.bindSocket();
  }

  bindSocket() {
    if (this.bound) return;
    this.bound = true;

    this._onProducerAdded = async ({ producerId }) => {
      if (!producerId || !this.recvTransport) return;
      try {
        await this.consume(producerId);
      } catch (e) {
        console.error("[SFU producerAdded consume error]", e);
      }
    };

    socket.on("sfu:producerAdded", this._onProducerAdded);

    socket.on("sfu:producerAdded:sync", async ({ producers }) => {
      const list = Array.isArray(producers) ? producers : [];
      for (const p of list) {
        if (!p?.producerId || !this.recvTransport) continue;
        try {
          await this.consume(p.producerId);
        } catch (e) {
          console.error("[SFU producer sync consume error]", e);
        }
      }
    });
  }

  async createSendTransport() {
    const res = await emitAsync("sfu:createWebRtcTransport", {
      liveId: this.liveId,
      direction: "send",
    });

    if (!res?.ok) {
      throw new Error(res?.error || "Failed to create send transport");
    }

    this.sendTransport = this.device.createSendTransport(res.transportOptions);

    this.sendTransport.on("connect", async ({ dtlsParameters }, cb, errback) => {
      try {
        const reply = await emitAsync("sfu:connectWebRtcTransport", {
          transportId: this.sendTransport.id,
          dtlsParameters,
          liveId: this.liveId,
        });
        if (!reply?.ok) throw new Error(reply?.error || "Send transport connect failed");
        cb();
      } catch (err) {
        errback(err);
      }
    });

    this.sendTransport.on("produce", async ({ kind, rtpParameters, appData }, cb, errback) => {
      try {
        const reply = await emitAsync("sfu:produce", {
          transportId: this.sendTransport.id,
          kind,
          rtpParameters,
          appData,
          liveId: this.liveId,
        });
        if (!reply?.ok) throw new Error(reply?.error || "Produce failed");
        cb({ id: reply.producerId });
      } catch (err) {
        errback(err);
      }
    });
  }

  async createRecvTransport() {
    const res = await emitAsync("sfu:createWebRtcTransport", {
      liveId: this.liveId,
      direction: "recv",
    });

    if (!res?.ok) {
      throw new Error(res?.error || "Failed to create recv transport");
    }

    this.recvTransport = this.device.createRecvTransport(res.transportOptions);

    this.recvTransport.on("connect", async ({ dtlsParameters }, cb, errback) => {
      try {
        const reply = await emitAsync("sfu:connectWebRtcTransport", {
          transportId: this.recvTransport.id,
          dtlsParameters,
          liveId: this.liveId,
        });
        if (!reply?.ok) throw new Error(reply?.error || "Recv transport connect failed");
        cb();
      } catch (err) {
        errback(err);
      }
    });
  }

  async startHost() {
    await this.createSendTransport();

    this.localStream = await navigator.mediaDevices.getUserMedia({
    video: {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      frameRate: { ideal: 30, max: 30 },
      facingMode: "user",
    },
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });

    const videoTrack = this.localStream.getVideoTracks()[0];
    const audioTrack = this.localStream.getAudioTracks()[0];

    if (videoTrack) {
      await this.sendTransport.produce({
      track: videoTrack,
      appData: {
        mediaTag: "host-video",
      },

      encodings: [
        {
          maxBitrate: 2500000,
          scalabilityMode: "L1T3",
        },
      ],

      codecOptions: {
        videoGoogleStartBitrate: 1500,
      },
    });

    }
    if (audioTrack) {
      await this.sendTransport.produce({
        track: audioTrack,
        appData: { mediaTag: "host-audio" },
      });
    }

    return this.localStream;
  }

  async startViewer() {
    await this.createRecvTransport();
    return this.remoteStream;
  }

  async consume(producerId) {
    const res = await emitAsync("sfu:consume", {
      liveId: this.liveId,
      transportId: this.recvTransport.id,
      producerId,
      rtpCapabilities: this.device.rtpCapabilities,
    });

    if (!res?.ok) {
      throw new Error(res?.error || "Consume failed");
    }

    const opts = res.consumerOptions;

    const consumer = await this.recvTransport.consume({
      id: opts.id,
      producerId,
      kind: opts.kind,
      rtpParameters: opts.rtpParameters,
    });

    this.remoteStream.addTrack(consumer.track);
    this.consumers.set(consumer.id, consumer);

    await emitAsync("sfu:resumeConsumer", {
      consumerId: consumer.id,
      liveId: this.liveId,
    });

    return consumer;
  }

  close() {
    try {
      if (this._onProducerAdded) {
        socket.off("sfu:producerAdded", this._onProducerAdded);
      }
      this.sendTransport?.close();
      this.recvTransport?.close();
      this.localStream?.getTracks().forEach((t) => t.stop());
    } catch {}
  }
}