import { createRouter, createWebHistory } from "vue-router";

import Login from "../views/Login.vue";
import Register from "../views/Register.vue";
import Dashboard from "../views/Dashboard.vue";
import Inbox from "../views/Inbox.vue";
import Messages from "../views/Messages.vue";
import Live from "../views/Live.vue";
import Call from "../views/Call.vue";
import RoomCall from "../views/RoomCall.vue";
import Profile from "../views/Profile.vue";
import People from "../views/People.vue";

// ✅ ADD THIS (lazy load new SFU live)
const LiveSFU = () => import("../views/LiveSFU.vue");

const routes = [
  { path: "/", redirect: "/login" },
  { path: "/login", component: Login },
  { path: "/register", component: Register },

  { path: "/dashboard", component: Dashboard },

  { path: "/inbox", component: Inbox },
  { path: "/messages", component: Messages },

  { path: "/people", component: People },

  { path: "/live", component: Live },

  // ✅ NEW ROUTE (DO NOT REMOVE OLD LIVE)
  { path: "/live-sfu", component: LiveSFU },

  { path: "/call-sfu", component: () => import("../views/CallSFU.vue") },
  { path: "/call", component: Call },
  { path: "/roomcall", component: RoomCall },
  { path: "/room-call", component: RoomCall },

  { path: "/profile/:id?", component: Profile },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;






