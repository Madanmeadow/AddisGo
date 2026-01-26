import { createRouter, createWebHistory } from 'vue-router'
import Login from '../app/Login.vue'
import Register from '../app/Register.vue'
import Feed from '../app/Feed.vue'
import { supabase } from '../lib/supabase'

const routes = [
  { path: '/', redirect: '/app' },

  { path: '/login', component: Login },
  { path: '/register', component: Register },

  {
    path: '/app',
    component: Feed,
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach(async (to, _, next) => {
  const { data } = await supabase.auth.getSession()
  const user = data.session?.user

  if (to.meta.requiresAuth && !user) {
    next('/login')
  } else {
    next()
  }
})

export default router
🚪 STEP 1D — Login Page