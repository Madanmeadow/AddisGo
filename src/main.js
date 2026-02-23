import { createApp } from "vue";
import App from "./App.vue";

// If you use Vue Router, this MUST be here:
import router from "./router";

const app = createApp(App);
app.use(router);
app.mount("#app");

// ✅ PWA: only register in production (prevents dev white screen)
// Also safe if plugin is missing temporarily.
if (import.meta.env.PROD) {
  import("virtual:pwa-register")
    .then(({ registerSW }) => {
      registerSW({
        immediate: true,
        onNeedRefresh() {
          // optional: auto refresh on update
          // window.location.reload();
        },
        onOfflineReady() {
          // optional: console.log("App ready to work offline");
        },
      });
    })
    .catch(() => {
      // If PWA plugin not active or build issue, don't crash the app
    });
}

