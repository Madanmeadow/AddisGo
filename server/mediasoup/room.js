// server/mediasoup/rooms.js

import { getMediasoupWorker } from "./workers.js";
import { mediaCodecs } from "./config.js";

export async function createRoom(liveId) {
  const worker = getMediasoupWorker();

  const router = await worker.createRouter({
    mediaCodecs,
  });

  return {
    liveId: String(liveId),

    router,

    peers: new Map(),

    transports: new Map(),

    producers: new Map(),

    consumers: new Map(),
  };
}