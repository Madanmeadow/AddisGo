// server/mediasoup/workers.js
import * as mediasoup from "mediasoup";

let worker;

export async function initMediasoupWorker() {
  worker = await mediasoup.createWorker({
    rtcMinPort: 20000,
    rtcMaxPort: 20200,
  });

  worker.on("died", () => {
    console.error("❌ Mediasoup worker died");
    process.exit(1);
  });

  global.mediasoupWorker = worker;

  console.log("✅ Mediasoup Worker Ready");
}