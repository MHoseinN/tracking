import { defineStore } from 'pinia';
import api from '../utils/api';

function getErrorMessage(error, fallback) {
  return error.response?.data?.message || fallback;
}

export const useInventoryStore = defineStore('inventory', {
  state: () => ({
    dashboard: {
      range: { start_date: '', end_date: '' },
      summary: {
        total_products: 0,
        total_quantity: 0,
        total_reserved: 0,
        total_available: 0,
        fully_booked_products: 0,
        categories_count: 0,
        reserved_units_count: 0
      },
      categories: [],
      products: [],
      units: []
    },
    lookups: {
      categories: [],
      category_tree: [],
      customers: [],
      products: []
    },
    activeReservations: [],
    loading: false,
    lookupLoading: false,
    error: null
  }),

  actions: {
    async fetchDashboard(params = {}) {
      this.loading = true;
      this.error = null;
      try {
        const response = await api.get('/inventory/dashboard', { params });
        this.dashboard = response.data;
        return response.data;
      } catch (error) {
        this.error = getErrorMessage(error, 'خطا در دریافت اطلاعات انبار');
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async fetchLookups(params = {}) {
      this.lookupLoading = true;
      try {
        const response = await api.get('/inventory/lookups', { params });
        this.lookups = response.data;
        return response.data;
      } catch (error) {
        this.error = getErrorMessage(error, 'خطا در دریافت اطلاعات پایه');
        throw error;
      } finally {
        this.lookupLoading = false;
      }
    },

    async fetchActiveReservations() {
      this.loading = true;
      try {
        const response = await api.get('/inventory/reservations/active');
        this.activeReservations = response.data.orders || [];
        return response.data;
      } catch (error) {
        this.error = getErrorMessage(error, 'خطا در دریافت رزروهای فعال');
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async createProduct(payload) {
      try {
        const response = await api.post('/inventory/products', payload);
        return { success: true, data: response.data };
      } catch (error) {
        return { success: false, message: getErrorMessage(error, 'خطا در ثبت محصول') };
      }
    },

    async createCategory(payload) {
      try {
        const response = await api.post('/inventory/categories', payload);
        return { success: true, data: response.data };
      } catch (error) {
        return { success: false, message: getErrorMessage(error, 'خطا در ثبت دسته‌بندی') };
      }
    },

    async updateCategory(id, payload) {
      try {
        const response = await api.put(`/inventory/categories/${id}`, payload);
        return { success: true, data: response.data };
      } catch (error) {
        return { success: false, message: getErrorMessage(error, 'خطا در ویرایش دسته‌بندی') };
      }
    },

    async deleteCategory(id) {
      try {
        await api.delete(`/inventory/categories/${id}`);
        return { success: true };
      } catch (error) {
        return { success: false, message: getErrorMessage(error, 'خطا در حذف دسته‌بندی') };
      }
    },

    async updateProduct(id, payload) {
      try {
        const response = await api.put(`/inventory/products/${id}`, payload);
        return { success: true, data: response.data };
      } catch (error) {
        return { success: false, message: getErrorMessage(error, 'خطا در ویرایش محصول') };
      }
    },

    async deleteProduct(id) {
      try {
        await api.delete(`/inventory/products/${id}`);
        return { success: true };
      } catch (error) {
        return { success: false, message: getErrorMessage(error, 'خطا در حذف محصول') };
      }
    },

    async createReservation(payload) {
      try {
        const response = await api.post('/inventory/reservations', payload);
        return { success: true, data: response.data };
      } catch (error) {
        return { success: false, message: getErrorMessage(error, 'خطا در ثبت رزرو') };
      }
    },

    async updateUnitAssignment(unitId, payload) {
      try {
        const response = await api.put(`/inventory/units/${unitId}/assignment`, payload);
        return { success: true, data: response.data };
      } catch (error) {
        return { success: false, message: getErrorMessage(error, 'خطا در ویرایش رزرو') };
      }
    },

    async deleteUnitAssignment(unitId, reservationItemId) {
      try {
        await api.delete(`/inventory/units/${unitId}/assignment`, {
          params: { reservationItemId }
        });
        return { success: true };
      } catch (error) {
        return { success: false, message: getErrorMessage(error, 'خطا در آزادسازی محصول') };
      }
    },

    async releaseReservationOrder(reservationOrderId) {
      try {
        await api.post(`/inventory/reservations/${reservationOrderId}/release`);
        return { success: true };
      } catch (error) {
        return { success: false, message: getErrorMessage(error, 'خطا در آزادسازی رزرو') };
      }
    },

    async releaseAllReservations() {
      try {
        await api.post('/inventory/reservations/release-all');
        return { success: true };
      } catch (error) {
        return { success: false, message: getErrorMessage(error, 'خطا در آزادسازی همه رزروها') };
      }
    }
  }
});
