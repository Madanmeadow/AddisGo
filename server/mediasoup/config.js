// server/mediasoup/config.js
export const mediaCodecs = [
  {
    kind: "audio",
    mimeType: "audio/opus",
    clockRate: 48000,
    channels: 2,
  },
  {
    kind: "video",
    mimeType: "video/VP8",
    clockRate: 90000,
    parameters: {
      "x-google-start-bitrate": 1000,
    },
  },
];

export const webRtcTransportOptions = {
  listenInfos: [
    {
      protocol: "udp",
      ip: "0.0.0.0",
      announcedAddress: process.env.MEDIASOUP_ANNOUNCED_IP || undefined,
    },
    {
      protocol: "tcp",
      ip: "0.0.0.0",
      announcedAddress: process.env.MEDIASOUP_ANNOUNCED_IP || undefined,
    },
  ],
  enableUdp: true,
  enableTcp: true,
  preferUdp: true,
};