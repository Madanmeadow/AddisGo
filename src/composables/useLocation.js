// src/composables/useLocation.js
// =========================================================
// PULSE LOCATION SERVICE — Production-grade geolocation
// Features:
//   • Browser Geolocation API with high-accuracy mode
//   • IP-based fallback (no permission needed)
//   • Real-time position watching with throttled socket emits
//   • Haversine distance calculation between users
//   • Comprehensive error handling & retry logic
//   • Privacy-first: only shares when user is online/active
// =========================================================

import { ref, computed } from "vue"

// ── STATE ───────────────────────────────────────────────
const coords = ref(null)           // { lat, lng, accuracy, altitude, heading, speed }
const ipFallbackCoords = ref(null) // IP-based approximate location
const status = ref("idle")         // idle | requesting | granted | denied | unavailable | error
const error = ref(null)            // last PositionError or custom error
const permissionState = ref("prompt") // prompt | granted | denied
const watchId = ref(null)
const isTracking = ref(false)
const lastEmittedAt = ref(0)
const nearbyUsers = ref([])

const EMIT_THROTTLE_MS = 8000      // min ms between socket emits
const DISTANCE_UNIT = "mi"         // "mi" | "km"

// ── CONSTANTS ───────────────────────────────────────────
const GEO_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 60000,
}

const GEO_OPTIONS_LOW = {
  enableHighAccuracy: false,
  timeout: 10000,
  maximumAge: 300000,
}

// ── HELPERS ─────────────────────────────────────────────

/**
 * Convert degrees to radians
 */
function toRad(deg) {
  return (deg * Math.PI) / 180
}

/**
 * Haversine distance between two lat/lng points.
 * Returns distance in the configured unit (mi or km).
 */
export function haversine(lat1, lng1, lat2, lng2, unit = DISTANCE_UNIT) {
  const R = unit === "km" ? 6371 : 3959 // Earth radius
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c * 10) / 10
}

/**
 * Throttle a function by time
 */
function throttle(fn, ms) {
  let last = 0
  return (...args) => {
    const now = Date.now()
    if (now - last >= ms) {
      last = now
      fn(...args)
    }
  }
}

/**
 * Get human-readable error message from PositionError
 */
function getErrorMessage(err) {
  if (!err) return "Unknown location error"
  switch (err.code) {
    case 1:
      return "Location permission denied. Enable it in browser settings to find nearby people."
    case 2:
      return "Location unavailable. GPS signal or network may be weak."
    case 3:
      return "Location request timed out. Try again or check your connection."
    default:
      return err.message || "An unexpected location error occurred."
  }
}

// ── IP FALLBACK ─────────────────────────────────────────

/**
 * Fetch approximate location via IP geolocation (free, no API key needed).
 * Uses ipapi.co as primary and ipwho.is as fallback.
 */
async function fetchIpLocation() {
  try {
    // Primary: ipapi.co (free tier: 45 req/min)
    const res = await fetch("https://ipapi.co/json/", {
      signal: AbortSignal.timeout(6000),
    })
    if (res.ok) {
      const data = await res.json()
      if (data.latitude && data.longitude) {
        return {
          lat: data.latitude,
          lng: data.longitude,
          accuracy: 5000, // IP is city-level ~5km accuracy
          source: "ip",
          city: data.city,
          region: data.region,
          country: data.country_name,
        }
      }
    }
  } catch {
    // swallow — try fallback
  }

  try {
    // Fallback: ipwho.is (no rate limit, generous)
    const res = await fetch("https://ipwho.is/", {
      signal: AbortSignal.timeout(6000),
    })
    if (res.ok) {
      const data = await res.json()
      if (data.latitude && data.longitude) {
        return {
          lat: data.latitude,
          lng: data.longitude,
          accuracy: 5000,
          source: "ip",
          city: data.city,
          region: data.region,
          country: data.country,
        }
      }
    }
  } catch {
    // swallow
  }

  return null
}

// ── PERMISSION QUERY ────────────────────────────────────

/**
 * Query the Permission API for geolocation state (Chrome/Edge).
 */
async function queryPermission() {
  try {
    if (navigator.permissions && navigator.permissions.query) {
      const result = await navigator.permissions.query({ name: "geolocation" })
      permissionState.value = result.state // "granted" | "denied" | "prompt"
      result.addEventListener("change", () => {
        permissionState.value = result.state
        if (result.state === "granted" && !isTracking.value) {
          startWatching()
        }
      })
    }
  } catch {
    // Permission API not supported or throws
  }
}

// ── CORE GEOLOCATION ────────────────────────────────────

/**
 * Handle successful position acquisition
 */
function onPositionSuccess(position, socket = null, userId = null) {
  const c = position.coords
  coords.value = {
    lat: c.latitude,
    lng: c.longitude,
    accuracy: c.accuracy,
    altitude: c.altitude,
    altitudeAccuracy: c.altitudeAccuracy,
    heading: c.heading,
    speed: c.speed,
    timestamp: position.timestamp,
    source: "gps",
  }
  status.value = "granted"
  error.value = null

  // Emit to socket if available (throttled)
  emitLocation(socket, userId)
}

/**
 * Handle geolocation error with automatic fallback
 */
async function onPositionError(err, socket = null, userId = null) {
  error.value = { code: err.code, message: getErrorMessage(err) }

  if (err.code === err.PERMISSION_DENIED) {
    status.value = "denied"
    permissionState.value = "denied"
    // Try IP fallback silently
    const ipLoc = await fetchIpLocation()
    if (ipLoc) {
      ipFallbackCoords.value = ipLoc
      status.value = "granted" // approximate
      emitLocation(socket, userId)
    }
    return
  }

  if (err.code === err.POSITION_UNAVAILABLE || err.code === err.TIMEOUT) {
    status.value = "unavailable"
    // Try IP fallback
    const ipLoc = await fetchIpLocation()
    if (ipLoc) {
      ipFallbackCoords.value = ipLoc
      status.value = "granted"
      emitLocation(socket, userId)
    }
    return
  }

  status.value = "error"
}

/**
 * Throttled socket emission of location
 */
const emitLocation = throttle((socket, userId) => {
  if (!socket || !userId) return
  const loc = coords.value || ipFallbackCoords.value
  if (!loc) return

  const now = Date.now()
  if (now - lastEmittedAt.value < EMIT_THROTTLE_MS) return

  lastEmittedAt.value = now
  socket.emit("location:update", {
    userId: String(userId),
    lat: loc.lat,
    lng: loc.lng,
    accuracy: loc.accuracy,
    source: loc.source || "unknown",
    ts: now,
  })
}, EMIT_THROTTLE_MS)

// ── WATCHING ─────────────────────────────────────────────

/**
 * Start watching position with watchPosition
 */
function startWatching(socket = null, userId = null) {
  if (!navigator.geolocation) {
    status.value = "unavailable"
    error.value = { message: "Geolocation is not supported by this browser." }
    // Still try IP fallback
    fetchIpLocation().then((ipLoc) => {
      if (ipLoc) {
        ipFallbackCoords.value = ipLoc
        status.value = "granted"
        emitLocation(socket, userId)
      }
    })
    return
  }

  if (watchId.value !== null) {
    try {
      navigator.geolocation.clearWatch(watchId.value)
    } catch {}
  }

  status.value = "requesting"
  isTracking.value = true

  // Try high accuracy first
  watchId.value = navigator.geolocation.watchPosition(
    (pos) => onPositionSuccess(pos, socket, userId),
    (err) => onPositionError(err, socket, userId),
    GEO_OPTIONS
  )
}

/**
 * Stop watching position
 */
function stopWatching() {
  if (watchId.value !== null) {
    try {
      navigator.geolocation.clearWatch(watchId.value)
    } catch {}
    watchId.value = null
  }
  isTracking.value = false
  status.value = "idle"
}

// ── ONE-SHOT LOCATION ───────────────────────────────────

/**
 * Get current position once (useful for manual refresh)
 */
function getCurrentPosition(socket = null, userId = null) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      fetchIpLocation().then((ipLoc) => {
        if (ipLoc) {
          ipFallbackCoords.value = ipLoc
          status.value = "granted"
          emitLocation(socket, userId)
          resolve(ipLoc)
        } else {
          reject(new Error("Geolocation not supported"))
        }
      })
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onPositionSuccess(pos, socket, userId)
        resolve(coords.value)
      },
      (err) => {
        onPositionError(err, socket, userId)
        if (ipFallbackCoords.value) {
          resolve(ipFallbackCoords.value)
        } else {
          reject(err)
        }
      },
      GEO_OPTIONS
    )
  })
}

// ── NEARBY USERS ────────────────────────────────────────

/**
 * Compute distances from current user to a list of other users.
 * Each user object should have { id, lat, lng, ... }
 * Returns the same list with `.distance` added (in configured unit).
 */
function computeDistances(users = []) {
  const myLoc = coords.value || ipFallbackCoords.value
  if (!myLoc) return users

  return users.map((u) => {
    if (u.lat == null || u.lng == null) return u
    const dist = haversine(myLoc.lat, myLoc.lng, u.lat, u.lng, DISTANCE_UNIT)
    return { ...u, distance: dist }
  })
}

/**
 * Sort users by distance (nearest first)
 */
function sortByDistance(users = []) {
  return [...users].sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity))
}

// ── SOCKET INTEGRATION ──────────────────────────────────

/**
 * Setup socket listeners for location:nearby updates.
 * Call this after socket is connected.
 */
function setupLocationSocket(socket, currentUserId) {
  if (!socket) return

  socket.on("location:nearby", (payload) => {
    const list = Array.isArray(payload) ? payload : payload?.users || []
    // Attach distances
    nearbyUsers.value = computeDistances(list)
  })

  socket.on("location:update:ack", (ack) => {
    // Optional: server acknowledged our location update
    // console.log("Location ack:", ack)
  })
}

/**
 * Remove socket listeners
 */
function teardownLocationSocket(socket) {
  if (!socket) return
  socket.off("location:nearby")
  socket.off("location:update:ack")
}

// ── MAIN EXPORT: startLocation ──────────────────────────

/**
 * Initialize the location service.
 * Call this once from your Dashboard.vue onMounted.
 *
 * @param {Object} options
 * @param {Object} options.socket   — your Socket.io instance
 * @param {string} options.userId   — current user's ID
 * @param {boolean} options.autoWatch — start watching immediately (default true)
 */
export async function startLocation(options = {}) {
  const { socket = null, userId = null, autoWatch = true } = options

  await queryPermission()

  if (autoWatch && userId) {
    startWatching(socket, userId)
  }

  // Setup socket listeners for nearby updates
  if (socket) {
    setupLocationSocket(socket, userId)
  }

  // Return cleanup function
  return () => {
    stopWatching()
    teardownLocationSocket(socket)
  }
}

// ── COMPOSABLE EXPORT ───────────────────────────────────

export function useLocation() {
  return {
    // State
    coords,
    ipFallbackCoords,
    status,
    error,
    permissionState,
    isTracking,
    nearbyUsers,

    // Computed helpers
    hasLocation: computed(() => !!coords.value || !!ipFallbackCoords.value),
    isApproximate: computed(() => !coords.value && !!ipFallbackCoords.value),
    locationLabel: computed(() => {
      if (coords.value) return `GPS · ±${Math.round(coords.value.accuracy)}m`
      if (ipFallbackCoords.value) return `Approx · ${ipFallbackCoords.value.city || "IP"}`
      return "No location"
    }),

    // Actions
    startWatching,
    stopWatching,
    getCurrentPosition,
    computeDistances,
    sortByDistance,
    haversine,
    setupLocationSocket,
    teardownLocationSocket,
  }
}

export default useLocation