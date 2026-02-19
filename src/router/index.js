import { createRouter, createWebHistory } from "vue-router";

// Lazy load views
const Home = () => import("../views/Home.vue");
const Login = () => import("../views/Login.vue");
const Register = () => import("../views/Register.vue");
const Dashboard = () => import("../views/Dashboard.vue");
const Inbox = () => import("../views/Inbox.vue");
const Chat = () => import("../views/Chat.vue");

const routes = [
  {
    path: "/",
    name: "Home",
    component: Home,
  },
  {
    path: "/login",
    name: "Login",
    component: Login,
  },
  {
    path: "/register",
    name: "Register",
    component: Register,
  },
  {
    path: "/dashboard",
    name: "Dashboard",
    component: Dashboard,
    meta: { requiresAuth: true },
  },
  {
    path: "/inbox",
    name: "Inbox",
    component: Inbox,
    meta: { requiresAuth: true },
  },
  {
    path: "/chat/:id",
    name: "Chat",
    component: Chat,
    props: true,
    meta: { requiresAuth: true },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// 🔐 Simple auth guard
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem("token");

  if (to.meta.requiresAuth && !token) {
    next("/login");
  } else {
    next();
  }
});

export default router;













