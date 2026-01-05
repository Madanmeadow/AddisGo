import { createApp } from "vue"
import App from "./App.vue"
import router from "./router"

// IMPORTANT: this makes your CSS load in dev AND Azure build
import "./style.css"

createApp(App).use(router).mount("#app")
