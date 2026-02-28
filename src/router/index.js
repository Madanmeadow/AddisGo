import { createRouter, createWebHistory } from "vue-router";

import Login from "../views/Login.vue";
import Register from "../views/Register.vue";
import Dashboard from "../views/Dashboard.vue";
import Messages from "../views/Messages.vue";
import Live from "../views/Live.vue";
import Call from "../views/Call.vue";
import Watch from "../views/Watch.vue";
import Profile from "../views/Profile.vue";

const routes = [
  { path: "/", redirect: "/login" },
  { path: "/login", component: Login },
  { path: "/register", component: Register },
  { path: "/dashboard", component: Dashboard },
  { path: "/messages", component: Messages },
  { path: "/live", component: Live },
  { path: "/watch/:id", name: "Watch", component: Watch },
  { path: "/profile/:id?", component: Profile },

  {
    path: "/call/:roomId",
    name: "Call",
    component: Call,
    props: route => ({
      roomId: route.params.roomId,
      role: route.query.role,
      kind: route.query.kind
    })
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem("token");
  const publicPages = ["/login", "/register"];
  const authRequired = !publicPages.includes(to.path);

  if (authRequired && !token) {
    return next("/login");
  }

  next();
});

export default router;









