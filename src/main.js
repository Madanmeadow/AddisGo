
import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";

import "bootstrap/dist/css/bootstrap.min.css";
import "./assets/theme.css";

import reveal from "./directives/reveal";

const app = createApp(App);

app.directive("reveal", reveal);

app.use(router);
app.mount("#app");
