const { randomBytes } = require("crypto");

/* =========================================================
   STATE
========================================================= */
const rooms = new Map(); // roomId -> { roomId, name, hostUserId, participants }

function generateRoomId() {
  return "zoom-" + randomBytes(4).toString("hex");
}

function getPublicRoomList() {
  return Array.from(rooms.values()).map((r) => ({
    roomId: r.roomId,
    name: r.name,
    participantCount: r.participants.size,
    hostUserId: r.hostUserId,
  }));
}

function broadcastRoomList(io) {
  io.emit("zoom:room-list", getPublicRoomList());
}

/* =========================================================
   MODULE
========================================================= */
module.exports = function initZoomServer(io) {
  io.on("connection", (socket) => {
    // Track which zoom room this socket is currently in
    let myZoomRoomId = null;

    /* ----------------  CREATE  ---------------- */
    socket.on("zoom:create", (data, callback) => {
      try {
        const name = (data?.name || "Meeting").trim().slice(0, 60);

        // Pull user from auth middleware (see integration note below)
        const userId = String(socket.user?.id || socket.id);
        const username =
          socket.user?.username ||
          socket.user?.display_name ||
          socket.user?.name ||
          "Host";

        const roomId = generateRoomId();

        const room = {
          roomId,
          name,
          hostUserId: userId,
          participants: new Map(), // socketId -> { userId, username, socketId }
        };

        rooms.set(roomId, room);

        // Host enters the room
        socket.join(roomId);
        myZoomRoomId = roomId;
        room.participants.set(socket.id, { userId, username, socketId: socket.id });

        broadcastRoomList(io);

        if (typeof callback === "function") {
          callback({ roomId, name });
        } else {
          socket.emit("zoom:created", { roomId, name });
        }
      } catch (err) {
        console.error("[zoom:create]", err);
        if (typeof callback === "function") {
          callback({ error: "Server error creating room" });
        }
      }
    });

    /* ----------------  JOIN  ---------------- */
    socket.on("zoom:join", (data, callback) => {
      try {
        const roomId = data?.roomId;
        if (!roomId || !rooms.has(roomId)) {
          if (typeof callback === "function") {
            return callback({ error: "Room not found" });
          }
          return;
        }

        const room = rooms.get(roomId);

        const userId = String(socket.user?.id || socket.id);
        const username =
          socket.user?.username ||
          socket.user?.display_name ||
          socket.user?.name ||
          "Guest";

        // Prevent duplicate join under same socket
        if (room.participants.has(socket.id)) {
          const others = Array.from(room.participants.values())
            .filter((p) => p.socketId !== socket.id)
            .map((p) => ({ userId: p.userId, username: p.username }));

          if (typeof callback === "function") {
            callback({ roomId, participants: others });
          }
          return;
        }

        socket.join(roomId);
        myZoomRoomId = roomId;

        // Notify existing participants BEFORE adding this socket
        // so they initiate a new PeerConnection to this newcomer
        socket.to(roomId).emit(`zoom:user-joined:${roomId}`, {
          userId,
          username,
        });

        room.participants.set(socket.id, { userId, username, socketId: socket.id });

        const others = Array.from(room.participants.values())
          .filter((p) => p.socketId !== socket.id)
          .map((p) => ({ userId: p.userId, username: p.username }));

        broadcastRoomList(io);

        if (typeof callback === "function") {
          callback({ roomId, participants: others });
        }
      } catch (err) {
        console.error("[zoom:join]", err);
        if (typeof callback === "function") {
          callback({ error: "Server error joining room" });
        }
      }
    });

    /* ----------------  LEAVE  ---------------- */
    socket.on("zoom:leave", (data) => {
      const roomId = data?.roomId || myZoomRoomId;
      if (roomId) leaveRoom(roomId);
    });

    /* ----------------  LIST  ---------------- */
    socket.on("zoom:list", (_data, callback) => {
      const list = getPublicRoomList();
      if (typeof callback === "function") {
        callback({ rooms: list });
      } else {
        socket.emit("zoom:room-list", list);
      }
    });

    /* ----------------  SIGNAL  ---------------- */
    socket.on("zoom:signal", (data) => {
      try {
        const { roomId, toUserId, signal } = data || {};
        if (!roomId || !toUserId || !signal) return;

        const room = rooms.get(roomId);
        if (!room) return;

        const sender = room.participants.get(socket.id);
        if (!sender) return; // sender not in this room

        // Find target by userId (not socketId)
        const target = Array.from(room.participants.values()).find(
          (p) => p.userId === String(toUserId)
        );
        if (!target) return;

        // Relay directly to target socket
        io.to(target.socketId).emit(`zoom:signal:${roomId}`, {
          fromUserId: sender.userId,
          signal,
        });
      } catch (err) {
        console.error("[zoom:signal]", err);
      }
    });

    /* ----------------  DISCONNECT  ---------------- */
    socket.on("disconnect", () => {
      if (myZoomRoomId) leaveRoom(myZoomRoomId);
    });

    /* ----------------  HELPERS  ---------------- */
    function leaveRoom(roomId) {
      const room = rooms.get(roomId);
      if (!room) return;

      const participant = room.participants.get(socket.id);
      if (!participant) return;

      room.participants.delete(socket.id);
      socket.leave(roomId);

      // Notify remaining peers
      socket.to(roomId).emit(`zoom:user-left:${roomId}`, {
        userId: participant.userId,
      });

      // Destroy empty room
      if (room.participants.size === 0) {
        rooms.delete(roomId);
      }

      myZoomRoomId = null;
      broadcastRoomList(io);
    }
  });
};