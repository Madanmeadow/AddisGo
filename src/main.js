import { createApp } from "vue"
import App from "./App.vue"
import router from "./router"

// Bootstrap CSS
import "bootstrap/dist/css/bootstrap.min.css"

// Our custom global CSS (create this file below)
import "./assets/main.css"

createApp(App).use(router).mount("#app")
