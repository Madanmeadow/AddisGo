export const BUILD_ID =
  (typeof __BUILD_ID__ !== "undefined" && __BUILD_ID__) ? String(__BUILD_ID__) : String(Date.now());