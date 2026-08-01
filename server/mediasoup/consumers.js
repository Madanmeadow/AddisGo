// server/mediasoup/consumers.js

export async function createConsumer({
  router,
  transport,
  producer,
  rtpCapabilities,
}) {
  if (
    !router.canConsume({
      producerId: producer.id,
      rtpCapabilities,
    })
  ) {
    throw new Error("Client cannot consume this producer");
  }

  const consumer = await transport.consume({
    producerId: producer.id,
    rtpCapabilities,
    paused: true,
  });

  consumer.on("transportclose", () => {
    consumer.close();
  });

  return consumer;
}