import { createRouter, createWebHistory } from "vue-router"

import Home from "../pages/Home.vue"
import Services from "../pages/Services.vue"
import Contact from "../pages/Contact.vue"

const routes = [
  {
    path: "/",
    name: "Home",
    component: Home,
  },
  {
    path: "/services",
    name: "Services",
    component: Services,
  },
  {
    path: "/contact",
    name: "Contact",
    component: Contact,
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
