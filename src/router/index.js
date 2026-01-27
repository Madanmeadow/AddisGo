import { createRouter, createWebHistory } from 'vue-router';
import { useUserStore } from '../stores/userStore';

import Login from '../views/Login.vue';
import Onboarding from '../views/Onboarding.vue';
import Profile from '../views/Profile.vue';
import WriteVoice from '../views/WriteVoice.vue';
import Inbox from '../views/Inbox.vue';

const routes = [
  { path: '/', redirect: '/profile' },
  { path: '/login', component: Login },
  { path: '/onboarding', component: Onboarding },
  { path: '/profile', component: Profile },
  { path: '/write', component: WriteVoice },
  { path: '/inbox', component: Inbox }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach(async (to) => {
  const store = useUserStore();

  if (store.loading) {
    await store.fetchMe();
  }

  if (!store.user && to.path !== '/login') {
    return '/login';
  }

  if (store.user && !store.onboardingComplete && to.path !== '/onboarding') {
    return '/onboarding';
  }
});

export default router;
