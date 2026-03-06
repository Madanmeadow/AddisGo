import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/",
  plugins: [
    vue(),
    VitePWA({
      registerType: "autoUpdate",
      devOptions: { enabled: false },

      // ✅ Make sure these exist in /public
      includeAssets: [
        "favicon.ico",
        "apple-touch-icon.png",
        "sounds/ringtone.mp3",
        "sounds/ringback.mp3",
      ],

      manifest: {
        name: "Pulse",
        short_name: "Pulse",
        description: "Your Social Universe",
        theme_color: "#0b1220",
        background_color: "#0b1220",
        display: "standalone",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },

      // ✅ THE IMPORTANT PART (fix 416 + keep PWA stable)
      workbox: {
        // Don’t precache mp3 files (Range requests + SW cache can cause 416)
        globIgnores: ["**/*.mp3", "**/*.ogg", "**/*.wav"],

        runtimeCaching: [
          // ✅ API calls: Network first (so you always get fresh server data)
          {
            urlPattern: ({ url }) =>
              url.pathname.startsWith("/posts") ||
              url.pathname.startsWith("/users") ||
              url.pathname.startsWith("/messages") ||
              url.pathname.startsWith("/conversations") ||
              url.pathname.startsWith("/reels") ||
              url.pathname.startsWith("/upload") ||
              url.pathname.startsWith("/likes") ||
              url.pathname.startsWith("/api"),
            handler: "NetworkFirst",
            options: {
              cacheName: "addisgo-api",
              networkTimeoutSeconds: 8,
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 5 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },

          // ✅ MP3: Network only (prevents 416 issues)
          {
            urlPattern: ({ url }) =>
              url.pathname.endsWith(".mp3") ||
              url.pathname.endsWith(".ogg") ||
              url.pathname.endsWith(".wav"),
            handler: "NetworkOnly",
          },

          // ✅ Images: Cache first
          {
            urlPattern: ({ request }) => request.destination === "image",
            handler: "CacheFirst",
            options: {
              cacheName: "addisgo-images",
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },

          // ✅ JS/CSS/fonts: Stale-while-revalidate
          {
            urlPattern: ({ request }) =>
              request.destination === "script" ||
              request.destination === "style" ||
              request.destination === "font",
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "addisgo-assets",
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
});