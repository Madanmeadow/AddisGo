// server/mediasoup/peer.js

export function createPeer(socket, role = "viewer") {
  return {
    socketId: socket.id,

    userId: socket.data?.user?.id || null,

    username: socket.data?.user?.username || "Guest",

    role,

    transports: new Set(),

    producers: new Set(),

    consumers: new Set(),
  };
}