<template>
  <div class="video-page">
    <div class="video-grid">
      <div class="video-card">
        <div class="label">You</div>
        <video ref="myVideo" autoplay muted playsinline></video>
      </div>

      <div class="video-card">
        <div class="label">Remote</div>
        <video ref="userVideo" autoplay playsinline></video>
      </div>
    </div>

    <div class="controls">
      <button v-if="!callAccepted && !incomingCall" @click="startCall" class="btn primary">
        Start Call 📹
      </button>

      <button v-if="incomingCall && !callAccepted" @click="answerCall" class="btn success">
        Answer 📲
      </button>

      <button v-if="callAccepted || incomingCall" @click="endCall" class="btn danger">
        End ❌
      </button>
    </div>

    <div v-if="incomingCall && !callAccepted" class="incoming-box">
      Incoming call...
    </div>
  </div>
</template>

<script>
import Peer from "simple-peer"
import { io } from "socket.io-client"

const socket = io(import.meta.env.VITE_API_URL, {
  transports: ["websocket", "polling"],
})

export default {
  data() {
    return {
      stream: null,
      peer: null,

      mySocketId: "",
      targetSocketId: "",

      incomingCall: false,
      callAccepted: false,
      callerSignal: null,
      callerId: null,
    }
  },

  async mounted() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })

      if (this.$refs.myVideo) {
        this.$refs.myVideo.srcObject = this.stream
      }

      socket.on("connect", () => {
        this.mySocketId = socket.id
        console.log("✅ socket connected:", socket.id)
      })

      socket.on("incoming_call", ({ from, signal }) => {
        console.log("📞 incoming call from:", from)
        this.incomingCall = true
        this.callerId = from
        this.callerSignal = signal
      })

      socket.on("call_accepted", (signal) => {
        console.log("✅ call accepted")
        this.callAccepted = true
        if (this.peer) {
          this.peer.signal(signal)
        }
      })

      socket.on("call_ended", () => {
        console.log("📴 call ended by other user")
        this.cleanupCall()
      })
    } catch (err) {
      console.error("Failed to access camera/mic:", err)
      alert("Camera or microphone permission failed.")
    }
  },

  beforeUnmount() {
    this.cleanupCall()

    socket.off("connect")
    socket.off("incoming_call")
    socket.off("call_accepted")
    socket.off("call_ended")

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop())
    }
  },

  methods: {
    startCall() {
      if (!this.stream) {
        alert("Camera/mic not ready yet.")
        return
      }

      if (!this.targetSocketId) {
        alert("Set a real target socket id first.")
        return
      }

      this.peer = new Peer({
        initiator: true,
        trickle: false,
        stream: this.stream,
      })

      this.peer.on("signal", (data) => {
        socket.emit("call_user", {
          userToCall: this.targetSocketId,
          from: this.mySocketId,
          signal: data,
        })
      })

      this.peer.on("stream", (remoteStream) => {
        console.log("🎥 remote stream received")
        if (this.$refs.userVideo) {
          this.$refs.userVideo.srcObject = remoteStream
        }
      })

      this.peer.on("error", (err) => {
        console.error("Peer error:", err)
      })

      this.peer.on("close", () => {
        console.log("Peer closed")
      })
    },

    answerCall() {
      if (!this.stream || !this.callerSignal) {
        alert("No incoming call data found.")
        return
      }

      this.callAccepted = true
      this.incomingCall = false

      this.peer = new Peer({
        initiator: false,
        trickle: false,
        stream: this.stream,
      })

      this.peer.on("signal", (data) => {
        socket.emit("answer_call", {
          to: this.callerId,
          signal: data,
        })
      })

      this.peer.on("stream", (remoteStream) => {
        console.log("🎥 remote stream received on answer side")
        if (this.$refs.userVideo) {
          this.$refs.userVideo.srcObject = remoteStream
        }
      })

      this.peer.on("error", (err) => {
        console.error("Peer error:", err)
      })

      this.peer.signal(this.callerSignal)
    },

    endCall() {
      if (this.callerId) {
        socket.emit("end_call", { to: this.callerId })
      }
      if (this.targetSocketId) {
        socket.emit("end_call", { to: this.targetSocketId })
      }

      this.cleanupCall()
    },

    cleanupCall() {
      this.incomingCall = false
      this.callAccepted = false
      this.callerSignal = null
      this.callerId = null

      if (this.peer) {
        this.peer.destroy()
        this.peer = null
      }

      if (this.$refs.userVideo) {
        this.$refs.userVideo.srcObject = null
      }
    },
  },
}
</script>

<style scoped>
.video-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #09111f 0%, #050b16 100%);
  color: white;
  padding: 20px;
}

.video-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
}

.video-card {
  background: rgba(255, 255, 255, 0.06);
  border-radius: 20px;
  padding: 14px;
  position: relative;
  overflow: hidden;
}

.label {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 2;
  background: rgba(0, 0, 0, 0.45);
  padding: 6px 12px;
  border-radius: 999px;
  font-weight: 700;
  font-size: 13px;
}

video {
  width: 100%;
  height: 420px;
  object-fit: cover;
  border-radius: 16px;
  background: black;
}

.controls {
  margin-top: 20px;
  display: flex;
  gap: 12px;
  justify-content: center;
}

.btn {
  border: 0;
  border-radius: 14px;
  padding: 14px 20px;
  font-weight: 800;
  color: white;
  cursor: pointer;
}

.primary {
  background: #3b82f6;
}

.success {
  background: #16a34a;
}

.danger {
  background: #e11d48;
}

.incoming-box {
  margin-top: 18px;
  text-align: center;
  font-weight: 700;
  color: #ffd166;
}

@media (max-width: 768px) {
  .video-grid {
    grid-template-columns: 1fr;
  }

  video {
    height: 300px;
  }
}
</style>