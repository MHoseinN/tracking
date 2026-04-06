import { defineStore } from 'pinia';
import api from '../utils/api';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: JSON.parse(localStorage.getItem('user')) || null,
    token: localStorage.getItem('token') || null,
    isAuthenticated: !!localStorage.getItem('token'),
    loading: false,
    error: null
  }),

  actions: {
    async login(username, password) {
      this.loading = true;
      this.error = null;

      try {
        const response = await api.post('/auth/login', { username, password });
        const { token, user } = response.data;

        this.token = token;
        this.user = user;
        this.isAuthenticated = true;

        // Persist to localStorage
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));

        return { success: true };
      } catch (err) {
        const message = err.response?.data?.message || 'خطا در ورود به سیستم';
        this.error = message;
        return { success: false, message };
      } finally {
        this.loading = false;
      }
    },

    logout() {
      this.token = null;
      this.user = null;
      this.isAuthenticated = false;

      localStorage.removeItem('token');
      localStorage.removeItem('user');
    },

    checkAuth() {
      const token = localStorage.getItem('token');
      if (token) {
        this.token = token;
        this.user = JSON.parse(localStorage.getItem('user'));
        this.isAuthenticated = true;
      } else {
        this.isAuthenticated = false;
      }
    }
  }
});
