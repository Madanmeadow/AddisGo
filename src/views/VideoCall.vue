<template>
  <div class="video-container">
    <video ref="myVideo" autoplay muted playsinline></video>
    <video ref="userVideo" autoplay playsinline></video>

    <button @click="startCall">Start Call 📹</button>
  </div>
</template>

<script>
import Peer from "simple-peer"
import { io } from "socket.io-client"

const socket = io(import.meta.env.VITE_API_URL)

export default {
  data() {
    return {
      stream: null,
      peer: null
    }
  },
  async mounted() {
    this.stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    })

    this.$refs.myVideo.srcObject = this.stream
  },
  methods: {
    startCall() {
      this.peer = new Peer({
        initiator: true,
        trickle: false,
        stream: this.stream
      })

      this.peer.on("signal", (data) => {
        socket.emit("call_user", {
          signal: data,
          userToCall: "TARGET_SOCKET_ID"
        })
      })

      this.peer.on("stream", (stream) => {
        this.$refs.userVideo.srcObject = stream
      })

      socket.on("call_accepted", (signal) => {
        this.peer.signal(signal)
      })
    }
  }
}
</script>
