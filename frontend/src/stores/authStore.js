
import { defineStore } from "pinia";
import { getCurrentUser, login as loginRequest, updateProfile as updateProfileRequest } from '../modules/auth/api/auth.service';
import { getApiErrorMessage } from '../utils/apiError';
import { cancelPendingRequests } from '../utils/api';

export const useAuthStore = defineStore("auth", {
  state: () => ({
    user: JSON.parse(localStorage.getItem("user")) || null,
    token: localStorage.getItem("token") || null,
    isAuthenticated: !!localStorage.getItem("token"),
    loading: false,
    error: null,
    sessionValidated: false,
  }),

  actions: {
    async login(username, password) {
      this.loading = true;
      this.error = null;

      try {
        const response = await loginRequest({ username, password });
        const { token, user } = response.data;

        this.token = token;
        this.user = user;
        this.isAuthenticated = true;
        this.sessionValidated = true;

        // Persist to localStorage
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));

        return { success: true };
      } catch (err) {
        const message = getApiErrorMessage(err, 'خطا در ورود به سیستم');
        this.error = message;
        return { success: false, message };
      } finally {
        this.loading = false;
      }
    },

    logout() {
      cancelPendingRequests();
      this.token = null;
      this.user = null;
      this.isAuthenticated = false;
      this.sessionValidated = false;

      localStorage.removeItem("token");
      localStorage.removeItem("user");
    },

    checkAuth() {
      const token = localStorage.getItem("token");
      if (token) {
        this.token = token;
        try {
          this.user = JSON.parse(localStorage.getItem("user")) || null;
        } catch (_error) {
          this.user = null;
        }
        this.isAuthenticated = true;
      } else {
        this.isAuthenticated = false;
      }
    },

    async refreshCurrentUser() {
      if (!this.token) return false;

      try {
        const response = await getCurrentUser();
        this.user = response.data.user;
        this.isAuthenticated = true;
        this.sessionValidated = true;
        localStorage.setItem("user", JSON.stringify(this.user));
        return true;
      } catch (_error) {
        this.logout();
        return false;
      }
    },

    async updateProfile(payload) {
      try {
        const response = await updateProfileRequest(payload);
        this.user = response.data.user;
        localStorage.setItem('user', JSON.stringify(this.user));
        return { success: true, data: response.data };
      } catch (error) {
        return { success: false, message: getApiErrorMessage(error, 'ذخیره پروفایل با خطا مواجه شد') };
      }
    }
  },
});
