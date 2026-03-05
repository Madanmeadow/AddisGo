import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";

// ✅ Global styles (world-class + accessible)
import "./style.css";

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
          // Optional: show a toast/button to refresh
          console.log("New version available. Refresh to update.");
          // updateSW(true); // uncomment if you want auto-refresh
        },
        onOfflineReady() {
          console.log("App ready to work offline.");
        },
      });
    })
    .catch(() => {});
}