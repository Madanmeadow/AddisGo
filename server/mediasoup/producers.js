// server/mediasoup/producers.js

export async function createProducer({
  transport,
  kind,
  rtpParameters,
  appData = {},
}) {
  const producer = await transport.produce({
    kind,
    rtpParameters,
    appData,
  });

  producer.on("transportclose", () => {
    producer.close();
  });

  return producer;
}