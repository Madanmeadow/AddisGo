import { createRouter, createWebHistory } from "vue-router"

import Home from "../pages/Home.vue"
import Drivers from "../pages/Drivers.vue"
import Hotels from "../pages/Hotels.vue"

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", component: Home },
    { path: "/drivers", component: Drivers },
    { path: "/hotels", component: Hotels },
  ],
})
