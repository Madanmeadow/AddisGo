// server/mediasoup/workers.js

import * as mediasoup from "mediasoup";

export async function initMediasoupWorker() {
  global.mediasoupWorker = await mediasoup.createWorker({
    rtcMinPort: 20000,
    rtcMaxPort: 20200,
  });

  console.log("✅ Mediasoup Worker Ready");
}