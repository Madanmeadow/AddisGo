<template>
  <div class="call-page">
    <div v-if="incomingCall && !inCall" class="incoming-overlay">
      <div class="incoming-box">
        <h2>{{ incomingName || "Incoming call" }}</h2>
        <p>{{ callKind === "video" ? "Video call" : "Audio call" }}</p>

        <div class="incoming-actions">
          <button class="btn accept" @click="acceptIncoming">Answer</button>
          <button class="btn reject" @click="rejectIncoming">Decline</button>
        </div>
      </div>
    </div>

    <div class="topbar">
      <div class="title">
        {{ callKind === "video" ? "Video Call" : "Audio Call" }}
      </div>
      <div class="status">{{ statusText }}</div>
    </div>

    <div class="videos" :class="{ audio: callKind === 'audio' }">
      <div class="video-card remote">
        <div class="badge">Remote</div>
        <video
          v-show="callKind === 'video' && remoteVideoVisible"
          ref="userVideo"
          autoplay
          playsinline
        ></video>
        <div v-if="!remoteVideoVisible" class="placeholder">
          <div class="avatar">{{ remoteInitial }}</div>
          <div class="name">{{ incomingName || targetName || "User" }}</div>
        </div>
      </div>

      <div class="video-card local">
        <div class="badge">You</div>
        <video
          v-show="callKind === 'video' && localVideoVisible"
          ref="myVideo"
          autoplay
          muted
          playsinline
        ></video>
        <div v-if="!localVideoVisible" class="placeholder">
          <div class="avatar">{{ myInitial }}</div>
          <div class="name">You</div>
        </div>
      </div>
    </div>

    <div class="controls">
      <button class="btn" @click="toggleMic" :disabled="!localStream">
        {{ micMuted ? "Mic Off" : "Mic" }}
      </button>

      <button
        v-if="callKind === 'video'"
        class="btn"
        @click="toggleCamera"
        :disabled="!localStream"
      >
        {{ camOff ? "Camera Off" : "Camera" }}
      </button>

      <button class="btn end" @click="endCall">
        End
      </button>
    </div>

    <div v-if="!incomingCall && !inCall && !roomId" class="start-box">
      <input
        v-model="toUserId"
        type="text"
        placeholder="Enter user id to call"
        class="input"
      />
      <select v-model="callKind" class="input">
        <option value="video">Video</option>
        <option value="audio">Audio</option>
      </select>
      <button class="btn start" @click="requestCall">Start Call</button>
    </div>
  </div>
</template>

<script>
import { io } from "socket.io-client"

const socket = io(import.meta.env.VITE_API_URL, {
  transports: ["websocket", "polling"],
  withCredentials: true,
  auth: {
    token: localStorage.getItem("token") || "",
  },
})

export default {
  name: "VideoCall",
  data() {
    return {
      pc: null,
      localStream: null,
      remoteStream: null,

      roomId: "",
      callKind: "video",
      toUserId: "",

      targetName: "",
      incomingCall: false,
      incomingName: "",
      incomingFromUserId: "",
      inCall: false,

      mySocketId: "",
      joined: false,
      madeOffer: false,
      callReady: false,

      micMuted: false,
      camOff: false,

      statusText: "Ready",
    }
  },

  computed: {
    localVideoVisible() {
      if (this.callKind === "audio") return false
      return !!this.localStream?.getVideoTracks()?.some((t) => t.enabled)
    },
    remoteVideoVisible() {
      if (this.callKind === "audio") return false
      return !!this.remoteStream?.getVideoTracks()?.length
    },
    myInitial() {
      const user = JSON.parse(localStorage.getItem("user") || "{}")
      const n = user?.username || user?.display_name || "Y"
      return String(n).charAt(0).toUpperCase()
    },
    remoteInitial() {
      const n = this.incomingName || this.targetName || "U"
      return String(n).charAt(0).toUpperCase()
    },
  },

  async mounted() {
    try {
      await this.setupLocalMedia()
      this.registerSocketEvents()
    } catch (err) {
      console.error("mount error:", err)
      alert("Camera/mic permission failed.")
    }
  },

  beforeUnmount() {
    this.cleanupCall()

    socket.off("connect")
    socket.off("call:incoming")
    socket.off("call:ringing")
    socket.off("call:status")
    socket.off("call:accepted")
    socket.off("call:ready")
    socket.off("call:peer-joined")
    socket.off("call:webrtc:offer")
    socket.off("call:webrtc:answer")
    socket.off("call:webrtc:ice")
    socket.off("call:ended")
    socket.off("call:error")
    socket.off("call:busy")
  },

  methods: {
    async setupLocalMedia() {
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video:
          this.callKind === "audio"
            ? false
            : {
                facingMode: "user",
                width: { ideal: 1280 },
                height: { ideal: 720 },
                frameRate: { ideal: 24, max: 30 },
              },
      }

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints)

      if (this.$refs.myVideo && this.callKind === "video") {
        this.$refs.myVideo.srcObject = this.localStream
      }
    },

    async recreateLocalMediaForKind() {
      if (this.localStream) {
        this.localStream.getTracks().forEach((t) => t.stop())
      }
      this.localStream = null
      await this.setupLocalMedia()
    },

    registerSocketEvents() {
      socket.on("connect", () => {
        this.mySocketId = socket.id
        console.log("socket connected:", socket.id)
      })

      socket.on("call:ringing", ({ roomId, kind }) => {
        this.roomId = String(roomId)
        this.callKind = kind || "audio"
        this.statusText = "Ringing..."
      })

      socket.on("call:status", ({ calleeOnline }) => {
        this.statusText = calleeOnline ? "Calling..." : "User offline, queued"
      })

      socket.on("call:incoming", async (payload) => {
        this.roomId = String(payload.roomId)
        this.callKind = payload.kind || "audio"
        this.incomingCall = true
        this.incomingName = payload.fromName || "User"
        this.incomingFromUserId = String(payload.fromUserId || "")
        this.statusText = "Incoming call"

        await this.recreateLocalMediaForKind()
      })

      socket.on("call:accepted", async ({ roomId, kind }) => {
        this.roomId = String(roomId)
        this.callKind = kind || "audio"
        this.statusText = "Accepted, joining..."

        await this.recreateLocalMediaForKind()

        socket.emit("call:join", { roomId: this.roomId })
      })

      socket.on("call:ready", async ({ roomId, kind }) => {
        this.roomId = String(roomId)
        this.callKind = kind || "audio"
        this.callReady = true
        this.statusText = "Connecting..."

        if (!this.pc) {
          await this.createPeerConnection()
        }

        // only first side makes offer once
        if (!this.madeOffer) {
          this.madeOffer = true
          const offer = await this.pc.createOffer()
          await this.pc.setLocalDescription(offer)

          socket.emit("call:webrtc:offer", {
            roomId: this.roomId,
            offer: this.pc.localDescription,
          })
        }
      })

      socket.on("call:peer-joined", async () => {
        if (!this.pc) {
          await this.createPeerConnection()
        }
      })

      socket.on("call:webrtc:offer", async ({ roomId, offer, from }) => {
        try {
          this.roomId = String(roomId)

          if (!this.pc) {
            await this.createPeerConnection()
          }

          await this.pc.setRemoteDescription(new RTCSessionDescription(offer))

          const answer = await this.pc.createAnswer()
          await this.pc.setLocalDescription(answer)

          socket.emit("call:webrtc:answer", {
            roomId: this.roomId,
            answer: this.pc.localDescription,
            to: from,
          })
        } catch (err) {
          console.error("offer error:", err)
        }
      })

      socket.on("call:webrtc:answer", async ({ answer }) => {
        try {
          if (!this.pc) return
          await this.pc.setRemoteDescription(new RTCSessionDescription(answer))
          this.inCall = true
          this.statusText = "Connected"
        } catch (err) {
          console.error("answer error:", err)
        }
      })

      socket.on("call:webrtc:ice", async ({ candidate }) => {
        try {
          if (!this.pc || !candidate) return
          await this.pc.addIceCandidate(new RTCIceCandidate(candidate))
        } catch (err) {
          console.error("ice error:", err)
        }
      })

      socket.on("call:ended", ({ reason }) => {
        console.log("call ended:", reason)
        this.statusText = "Call ended"
        this.cleanupCall(false)
      })

      socket.on("call:error", ({ message }) => {
        alert(message || "Call error")
        this.statusText = message || "Call error"
      })

      socket.on("call:busy", ({ message }) => {
        alert(message || "User busy")
        this.statusText = message || "Busy"
      })
    },

    async createPeerConnection() {
      this.pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      })

      this.remoteStream = new MediaStream()

      if (this.$refs.userVideo) {
        this.$refs.userVideo.srcObject = this.remoteStream
      }

      this.localStream.getTracks().forEach((track) => {
        this.pc.addTrack(track, this.localStream)
      })

      this.pc.ontrack = (event) => {
        const [stream] = event.streams
        if (!stream) return

        this.remoteStream = stream

        if (this.$refs.userVideo) {
          this.$refs.userVideo.srcObject = stream
          this.$refs.userVideo.play?.().catch(() => {})
        }

        this.inCall = true
        this.statusText = "Connected"
      }

      this.pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("call:webrtc:ice", {
            roomId: this.roomId,
            candidate: event.candidate,
          })
        }
      }

      this.pc.onconnectionstatechange = () => {
        const state = this.pc?.connectionState
        console.log("pc state:", state)

        if (state === "connected") {
          this.inCall = true
          this.statusText = "Connected"
        } else if (state === "connecting") {
          this.statusText = "Connecting..."
        } else if (state === "disconnected") {
          this.statusText = "Reconnecting..."
        } else if (state === "failed") {
          this.statusText = "Connection failed"
        } else if (state === "closed") {
          this.statusText = "Closed"
        }
      }
    },

    async requestCall() {
      if (!this.toUserId) {
        alert("Enter user id to call")
        return
      }

      this.statusText = "Starting..."
      this.incomingCall = false
      this.inCall = false
      this.madeOffer = false
      this.callReady = false

      socket.emit("call:request", {
        toUserId: this.toUserId,
        kind: this.callKind,
      })
    },

    async acceptIncoming() {
      if (!this.roomId) return

      this.incomingCall = false
      this.statusText = "Joining..."
      socket.emit("call:accept", { roomId: this.roomId })
      socket.emit("call:join", { roomId: this.roomId })
    },

    rejectIncoming() {
      if (!this.roomId) return
      socket.emit("call:reject", { roomId: this.roomId })
      this.cleanupCall(false)
    },

    endCall() {
      if (this.roomId) {
        socket.emit("call:end", { roomId: this.roomId })
      }
      this.cleanupCall(false)
    },

    toggleMic() {
      if (!this.localStream) return
      const tracks = this.localStream.getAudioTracks()
      this.micMuted = !this.micMuted
      tracks.forEach((t) => {
        t.enabled = !this.micMuted
      })
    },

    toggleCamera() {
      if (!this.localStream) return
      const tracks = this.localStream.getVideoTracks()
      this.camOff = !this.camOff
      tracks.forEach((t) => {
        t.enabled = !this.camOff
      })
    },

    cleanupCall(resetRoom = true) {
      this.incomingCall = false
      this.inCall = false
      this.callReady = false
      this.madeOffer = false
      this.joined = false

      if (this.pc) {
        try {
          this.pc.close()
        } catch {}
        this.pc = null
      }

      if (this.$refs.userVideo) {
        this.$refs.userVideo.srcObject = null
      }

      this.remoteStream = null

      if (resetRoom) {
        this.roomId = ""
        this.incomingName = ""
        this.incomingFromUserId = ""
      }
    },
  },
}
</script>

<style scoped>
.call-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #071120 0%, #040814 100%);
  color: white;
  padding: 16px;
}

.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.title {
  font-size: 22px;
  font-weight: 900;
}

.status {
  opacity: 0.8;
  font-size: 14px;
}

.videos {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.videos.audio {
  grid-template-columns: 1fr;
}

.video-card {
  position: relative;
  background: rgba(255,255,255,0.06);
  border-radius: 22px;
  overflow: hidden;
  min-height: 360px;
}

video {
  width: 100%;
  height: 100%;
  min-height: 360px;
  object-fit: cover;
  background: #000;
}

.badge {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 2;
  background: rgba(0,0,0,0.4);
  padding: 6px 12px;
  border-radius: 999px;
  font-weight: 800;
}

.placeholder {
  min-height: 360px;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 14px;
  background: radial-gradient(circle at top, rgba(255,255,255,0.08), transparent 30%);
}

.avatar {
  width: 90px;
  height: 90px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 34px;
  font-weight: 900;
  background: linear-gradient(135deg, #ff5b7f, #7c73ff);
}

.name {
  font-size: 18px;
  font-weight: 700;
}

.controls {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 18px;
  flex-wrap: wrap;
}

.btn {
  border: 0;
  border-radius: 16px;
  padding: 14px 18px;
  font-weight: 800;
  cursor: pointer;
}

.start {
  background: #2563eb;
  color: white;
}

.accept {
  background: #16a34a;
  color: white;
}

.reject,
.end {
  background: #e11d48;
  color: white;
}

.input {
  width: 100%;
  max-width: 340px;
  padding: 14px 16px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.08);
  color: white;
}

.start-box {
  display: grid;
  gap: 12px;
  justify-items: center;
  margin-top: 24px;
}

.incoming-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.62);
  display: grid;
  place-items: center;
  z-index: 50;
}

.incoming-box {
  background: #101826;
  padding: 24px;
  border-radius: 20px;
  text-align: center;
  width: min(90vw, 360px);
}

.incoming-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 14px;
}

@media (max-width: 768px) {
  .videos {
    grid-template-columns: 1fr;
  }

  .video-card,
  video,
  .placeholder {
    min-height: 280px;
  }
}
</style>