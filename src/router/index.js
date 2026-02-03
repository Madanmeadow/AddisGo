import { createRouter, createWebHistory } from 'vue-router'

import Login from '../views/Login.vue'
import Register from '../views/Register.vue'
import Dashboard from '../views/Dashboard.vue'

const routes = [
  { path: '/', redirect: '/login' },

  { path: '/login', component: Login },
  { path: '/register', component: Register },

  {
    path: '/dashboard',
    component: Dashboard,
    meta: { requiresAuth: true }
  },

  // fallback (VERY important)
  { path: '/:pathMatch(.*)*', redirect: '/login' }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')

  // Not logged in → protect dashboard
  if (to.meta.requiresAuth && !token) {
    return next('/login')
  }

  // Logged in → block login/register
  if ((to.path === '/login' || to.path === '/register') && token) {
    return next('/dashboard')
  }

  next()
})

export default router
