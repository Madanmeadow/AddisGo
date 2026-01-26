import { createRouter, createWebHistory } from "vue-router"
import Home from "../pages/Home.vue"
import About from "../pages/About.vue"
import Contact from "../pages/Contact.vue"
// import Login from "../pages/Login.vue" // coming next

const routes = [
    { path: "/", component: Home },
    { path: "/about", component: About },
    { path: "/contact", component: Contact },

    // STEP 1D – Login Page (future)
    // { path: "/login", component: Login },
]

const router = createRouter({
    history: createWebHistory(),
    routes,
})

// Auth guard (future – Supabase)
router.beforeEach(async (to, from, next) => {
  const user = null // placeholder for auth user

  if (to.meta.requiresAuth && !user) {
next("/login")
} else {
   next()
}
})

export default router

