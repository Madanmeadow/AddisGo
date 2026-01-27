import { defineStore } from 'pinia';
import { api } from '../api';

export const useUserStore = defineStore('user', {
  state: () => ({
    user: null,
    onboardingComplete: false,
    loading: true
  }),

  actions: {
    async fetchMe() {
      try {
        const res = await fetch('/api/v1/users/me', {
          credentials: 'include'
        });

        if (!res.ok) {
          this.user = null;
          this.loading = false;
          return;
        }

        const data = await res.json();
        this.user = data;
        this.onboardingComplete = data.onboarding_complete;
      } catch {
        this.user = null;
      } finally {
        this.loading = false;
      }
    },

    logout() {
      this.user = null;
      this.onboardingComplete = false;
    }
  }
});
