import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { VitePWA } from "vite-plugin-pwa";
import { resolve } from "path";

export default defineConfig({
  base: "/",
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },

  server: {
    port: 5173,
    host: true,
  },

  preview: {
    port: 4173,
    host: true,
  },

  css: {
    devSourcemap: true,
  },

  build: {
    target: "esnext",
    minify: "terser",
    sourcemap: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          vue: ["vue", "vue-router"],
          vendor: ["socket.io-client"],
        },
      },
    },
  },

  plugins: [
    vue(),

    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
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
        theme_color: "#060913",
        background_color: "#060913",
        display: "standalone",
        orientation: "portrait",
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

      workbox: {
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,

        // SPA fallback — critical for direct route access (/dashboard, /room-call, etc.)
        navigateFallback: "index.html",
        navigateFallbackDenylist: [
          /^\/api\//,
          /^\/posts/,
          /^\/users/,
          /^\/messages/,
          /^\/conversations/,
          /^\/reels/,
          /^\/upload/,
          /^\/likes/,
        ],

        globIgnores: ["**/*.mp3", "**/*.ogg", "**/*.wav"],

        runtimeCaching: [
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
              cacheName: "pulse-api",
              networkTimeoutSeconds: 8,
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 5 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ url }) =>
              url.pathname.endsWith(".mp3") ||
              url.pathname.endsWith(".ogg") ||
              url.pathname.endsWith(".wav"),
            handler: "NetworkOnly",
          },
          {
            urlPattern: ({ request }) => request.destination === "image",
            handler: "CacheFirst",
            options: {
              cacheName: "pulse-images",
              expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 14 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ request }) =>
              request.destination === "script" ||
              request.destination === "style" ||
              request.destination === "font",
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "pulse-assets",
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Cache video chunks with Range support
          {
            urlPattern: ({ url }) =>
              url.pathname.endsWith(".mp4") ||
              url.pathname.endsWith(".webm") ||
              url.pathname.endsWith(".m3u8"),
            handler: "CacheFirst",
            options: {
              cacheName: "pulse-video",
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 3 },
              rangeRequests: true,
              cacheableResponse: { statuses: [0, 200, 206] },
            },
          },
        ],
      },
    }),
  ],
});