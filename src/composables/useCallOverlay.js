// src/composables/useCallOverlay.js
import { ref, computed } from "vue"

const minimized = ref(false)
const inCall = ref(false)
const roomId = ref("")
const kind = ref("video")
const partnerName = ref("User")
const statusText = ref("Ready")

const localStream = ref(null)
const remoteStream = ref(null)

const expandPath = ref("/call")
const expandQuery = ref({})

const overlayX = ref(16)
const overlayY = ref(110)

function syncCallOverlay(payload = {}) {
  if ("inCall" in payload) inCall.value = !!payload.inCall
  if ("roomId" in payload) roomId.value = String(payload.roomId || "")
  if ("kind" in payload) kind.value = payload.kind || "video"
  if ("partnerName" in payload) partnerName.value = payload.partnerName || "User"
  if ("statusText" in payload) statusText.value = payload.statusText || "Ready"
  if ("localStream" in payload) localStream.value = payload.localStream || null
  if ("remoteStream" in payload) remoteStream.value = payload.remoteStream || null
  if ("expandPath" in payload) expandPath.value = payload.expandPath || "/call"
  if ("expandQuery" in payload) expandQuery.value = payload.expandQuery || {}
}

function minimizeCall() {
  minimized.value = true
}

function expandCall() {
  minimized.value = false
}

function hideOverlay() {
  minimized.value = false
}

function resetOverlay() {
  minimized.value = false
  inCall.value = false
  roomId.value = ""
  kind.value = "video"
  partnerName.value = "User"
  statusText.value = "Ready"
  localStream.value = null
  remoteStream.value = null
  expandPath.value = "/call"
  expandQuery.value = {}
}

const overlayVisible = computed(() => minimized.value && inCall.value)

export function useCallOverlay() {
  return {
    minimized,
    inCall,
    roomId,
    kind,
    partnerName,
    statusText,
    localStream,
    remoteStream,
    expandPath,
    expandQuery,
    overlayX,
    overlayY,
    overlayVisible,
    syncCallOverlay,
    minimizeCall,
    expandCall,
    hideOverlay,
    resetOverlay,
  }
}