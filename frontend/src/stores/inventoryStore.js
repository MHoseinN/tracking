import { defineStore } from 'pinia';
import { inventoryService } from '../modules/inventory/api/inventory.service';
import { getApiErrorMessage } from '../utils/apiError';
import { withActionResult } from '../utils/actionResult';

function normalizeInventoryData(data = {}) {
  return {
    ...data,
    categories: Array.isArray(data.categories) ? data.categories : [],
    category_tree: Array.isArray(data.category_tree)
      ? data.category_tree
      : Array.isArray(data.categoryTree) ? data.categoryTree : [],
    customers: Array.isArray(data.customers) ? data.customers : [],
    products: Array.isArray(data.products) ? data.products : []
  };
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

  getters: {
    productsForInventory: (state) => state.lookups.products.length
      ? state.lookups.products
      : state.dashboard.products
  },

  actions: {
    async fetchDashboard(params = {}) {
      this.loading = true;
      this.error = null;
      try {
        const response = await inventoryService.getDashboard(params);
        this.dashboard = normalizeInventoryData(response.data);
        return this.dashboard;
      } catch (error) {
        this.error = getApiErrorMessage(error, 'خطا در دریافت اطلاعات انبار');
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async fetchLookups(params = {}) {
      this.lookupLoading = true;
      try {
        const response = await inventoryService.getLookups(params);
        this.lookups = normalizeInventoryData(response.data);
        return this.lookups;
      } catch (error) {
        this.error = getApiErrorMessage(error, 'خطا در دریافت اطلاعات پایه');
        throw error;
      } finally {
        this.lookupLoading = false;
      }
    },

    async fetchActiveReservations() {
      this.loading = true;
      try {
        const response = await inventoryService.getActiveReservations();
        this.activeReservations = response.data.orders || [];
        return response.data;
      } catch (error) {
        this.error = getApiErrorMessage(error, 'خطا در دریافت رزروهای فعال');
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async createProduct(payload) {
      return withActionResult(() => inventoryService.createProduct(payload), 'خطا در ثبت محصول');
    },

    async createCategory(payload) {
      return withActionResult(() => inventoryService.createCategory(payload), 'خطا در ثبت دسته‌بندی');
    },

    async updateCategory(id, payload) {
      return withActionResult(() => inventoryService.updateCategory(id, payload), 'خطا در ویرایش دسته‌بندی');
    },

    async deleteCategory(id) {
      return withActionResult(() => inventoryService.deleteCategory(id), 'خطا در حذف دسته‌بندی');
    },

    async updateProduct(id, payload) {
      return withActionResult(() => inventoryService.updateProduct(id, payload), 'خطا در ویرایش محصول');
    },

    async deleteProduct(id) {
      return withActionResult(() => inventoryService.deleteProduct(id), 'خطا در حذف محصول');
    },

    async createReservation(payload) {
      return withActionResult(() => inventoryService.createReservation(payload), 'خطا در ثبت رزرو');
    },

    async updateReservationOrder(reservationOrderId, payload) {
      return withActionResult(() => inventoryService.updateReservationOrder(reservationOrderId, payload), 'خطا در ویرایش رزرو');
    },

    async updateUnitAssignment(unitId, payload) {
      return withActionResult(() => inventoryService.updateUnitAssignment(unitId, payload), 'خطا در ویرایش رزرو');
    },

    async deleteUnitAssignment(unitId, reservationItemId) {
      return withActionResult(() => inventoryService.deleteUnitAssignment(unitId, reservationItemId), 'خطا در آزادسازی محصول');
    },

    async restoreUnitAssignment(unitId, reservationItemId) {
      return withActionResult(() => inventoryService.restoreUnitAssignment(unitId, reservationItemId), 'خطا در بازگردانی محصول');
    },

    async releaseReservationOrder(reservationOrderId) {
      return withActionResult(() => inventoryService.releaseReservationOrder(reservationOrderId), 'خطا در آزادسازی رزرو');
    },

    async restoreReservationOrder(reservationOrderId) {
      return withActionResult(() => inventoryService.restoreReservationOrder(reservationOrderId), 'خطا در بازگردانی رزرو');
    },

    async releaseAllReservations() {
      return withActionResult(() => inventoryService.releaseAllReservations(), 'خطا در آزادسازی همه رزروها');
    },

    async restoreAllReservations() {
      return withActionResult(() => inventoryService.restoreAllReservations(), 'خطا در بازگردانی همه رزروها');
    }
  }
});
