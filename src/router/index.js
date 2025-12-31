import { createRouter, createWebHistory } from "vue-router"

import Home from "../pages/Home.vue"
import About from "../pages/About.vue"
import Services from "../pages/Services.vue"
import Contact from "../pages/contact.vue"

// Optional pages you have:
import Drivers from "../pages/Drivers.vue"
import Hotels from "../pages/Hotels.vue"

const routes = [
  { path: "/", name: "Home", component: Home },
  { path: "/about", name: "About", component: About },
  { path: "/services", name: "Services", component: Services },
  { path: "/contact", name: "Contact", component: Contact },

  // Optional
  { path: "/drivers", name: "Drivers", component: Drivers },
  { path: "/hotels", name: "Hotels", component: Hotels },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

export default router
