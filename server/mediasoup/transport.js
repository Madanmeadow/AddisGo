// server/mediasoup/transport.js

export async function createTransport(router) {
  return await router.createWebRtcTransport({
    listenInfos: [
      {
        protocol: "udp",
        ip: "0.0.0.0",
        announcedAddress: process.env.MEDIASOUP_ANNOUNCED_IP,
      },
      {
        protocol: "tcp",
        ip: "0.0.0.0",
        announcedAddress: process.env.MEDIASOUP_ANNOUNCED_IP,
      },
    ],

    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
  });
}