import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";

const app = createApp(App);
app.use(router);
app.mount("#app");

// ✅ PWA: only in production, and safe
if (import.meta.env.PROD) {
  import("virtual:pwa-register")
    .then(({ registerSW }) => {
      const updateSW = registerSW({
        immediate: true,
        onNeedRefresh() {
          // Optional: auto reload when a new version is ready
          // updateSW(true);
          console.log("New version available. Refresh to update.");
        },
        onOfflineReady() {
          console.log("App ready to work offline.");
        },
      });
    })
    .catch(() => {});
}