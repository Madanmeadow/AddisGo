VitePWA({
  registerType: "autoUpdate",

  // 🔥 THIS FIXES THE ERROR
  devOptions: {
    enabled: false,
  },

  workbox: {
    swDest: "sw.js",
  },

  manifest: {
    name: "MeDan",
    short_name: "MeDan",
    description: "Where short videos meet real stories",
    theme_color: "#6366f1",
    background_color: "#ffffff",
    display: "standalone",
    start_url: "/",
    icons: [
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  },
})

