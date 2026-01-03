import { createApp } from "vue"
import App from "./App.vue"
import router from "./router"

import "./style.css"   // ✅ IMPORTANT: this is what makes styling load everywhere (dev + production)

createApp(App).use(router).mount("#app")

