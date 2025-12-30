import { createRouter, createWebHistory } from "vue-router"

import Home from "../pages/Home.vue"
import About from "../pages/About.vue"
import Services from "../pages/Services.vue"
import Contact from "../pages/Contact.vue"

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", component: Home },
    { path: "/about", component: About },
    { path: "/services", component: Services },
    { path: "/contact", component: Contact },
  ],
  scrollBehavior() {
    return { top: 0 }
  },
})

export default router
