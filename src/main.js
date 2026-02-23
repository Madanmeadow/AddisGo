import { createApp } from "vue";
import App from "./App.vue";

createApp(App).mount("#app");

// PWA Service Worker (only in production)
import { registerSW } from "virtual:pwa-register";
registerSW({ immediate: true });



