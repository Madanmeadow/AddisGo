// server/mediasoup/workers.js
import mediasoup from "mediasoup";

let worker = null;

export async function initMediasoupWorker() {
  if (worker) return worker;

  worker = await mediasoup.createWorker({
    logLevel: "warn",
    rtcMinPort: Number(process.env.MEDIASOUP_MIN_PORT || 40000),
    rtcMaxPort: Number(process.env.MEDIASOUP_MAX_PORT || 40100),
  });

  worker.on("died", () => {
    console.error("[SFU] worker died");
    process.exit(1);
  });

  console.log("[SFU] worker ready");
  return worker;
}

export function getMediasoupWorker() {
  if (!worker) {
    throw new Error("Mediasoup worker not initialized");
  }
  return worker;
}