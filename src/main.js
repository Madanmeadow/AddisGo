import { createApp } from "vue"
import App from "./App.vue"
import router from "./router"

// Bootstrap (installed via npm)
import "bootstrap/dist/css/bootstrap.min.css"
import "bootstrap/dist/js/bootstrap.bundle.min.js"

// Your custom styles
import "./assets/main.css"

createApp(App).use(router).mount("#app")
