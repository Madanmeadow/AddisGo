<template>
  <nav class="navbar">
    <div class="nav-left">
      <span class="logo">Addis<span>Go</span></span>
    </div>

    <div class="nav-right">
      <button v-if="isLoggedIn" @click="logout" class="logout-btn">
        Logout
      </button>
    </div>
  </nav>
</template>

<script>
import { useRouter } from "vue-router";

export default {
  name: "Navbar",
  setup() {
    const router = useRouter();

    const isLoggedIn = () => {
      return !!localStorage.getItem("token");
    };

    const logout = () => {
      localStorage.removeItem("token");
      router.push("/login");
    };

    return {
      isLoggedIn,
      logout,
    };
  },
};
</script>

<style scoped>
.navbar {
  height: 64px;
  padding: 0 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;

  background: linear-gradient(
    135deg,
    #2563eb,
    #14b8a6
  );

  color: white;
  box-shadow: 0 6px 20px rgba(0,0,0,0.25);
}

.logo {
  font-size: 22px;
  font-weight: 800;
  letter-spacing: 0.5px;
}

.logo span {
  color: #e0f2fe;
}

.logout-btn {
  background: rgba(255,255,255,0.15);
  border: none;
  color: white;
  padding: 10px 18px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: background 0.2s ease;
}

.logout-btn:hover {
  background: rgba(255,255,255,0.25);
}
</style>
