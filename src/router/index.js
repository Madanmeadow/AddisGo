import { createRouter, createWebHashHistory } from "vue-router"

import Home from "../pages/Home.vue"
import Services from "../pages/Services.vue"
import Contact from "../pages/Contact.vue"
import About from "../pages/About.vue"
import Drivers from "../pages/Drivers.vue"
import Hotels from "../pages/Hotels.vue"

const router = createRouter({
  history: createWebHashHistory(), // best for static hosting
  routes: [
    { path: "/", component: Home },
    { path: "/services", component: Services },
    { path: "/contact", component: Contact },
    { path: "/about", component: About },
    { path: "/drivers", component: Drivers },
    { path: "/hotels", component: Hotels },
  ],
  scrollBehavior() {
    return { top: 0 }
  },
})

export default router
