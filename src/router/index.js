import { createRouter, createWebHistory } from "vue-router"

// ✅ IMPORT ALL PAGES (THIS WAS MISSING)
import Home from "../pages/Home.vue"
import About from "../pages/About.vue"
import Services from "../pages/Services.vue"
import Contact from "../pages/Contact.vue"
import Drivers from "../pages/Drivers.vue"
import Hotels from "../pages/Hotels.vue"

const routes = [
  {
    path: "/",
    name: "Home",
    component: Home,
  },
  {
    path: "/about",
    name: "About",
    component: About,
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
  {
    path: "/drivers",
    name: "Drivers",
    component: Drivers,
  },
  {
    path: "/hotels",
    name: "Hotels",
    component: Hotels,
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
r
