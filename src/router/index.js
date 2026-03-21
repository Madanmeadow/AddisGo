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

const routes = [
  { path: "/", redirect: "/login" },
  { path: "/login", component: Login },
  { path: "/register", component: Register },

  { path: "/dashboard", component: Dashboard },

  // inbox list
  { path: "/inbox", component: Inbox },

  // thread page
  { path: "/messages", component: Messages },

  // people directory
  { path: "/people", component: People },

  // live
  { path: "/live", component: Live },

  // calls
  { path: "/call", component: Call },
  { path: "/roomcall", component: RoomCall },
  { path: "/room-call", component: RoomCall }, // alias

  // profile
  { path: "/profile/:id?", component: Profile },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;







