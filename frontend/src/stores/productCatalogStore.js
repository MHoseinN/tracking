import { defineStore } from 'pinia';
import { productService } from '../modules/products/api/product.service';
import { getApiErrorMessage } from '../utils/apiError';
import { withActionResult } from '../utils/actionResult';

export const useProductCatalogStore = defineStore('productCatalog', {
  state: () => ({
    products: [],
    categories: [],
    categoryTree: [],
    loading: false,
    error: null
  }),

  actions: {
    async fetchCatalog() {
      this.loading = true;
      this.error = null;
      try {
        const response = await productService.getCatalog();
        this.products = response.data.products || [];
        this.categories = response.data.categories || [];
        this.categoryTree = response.data.category_tree || [];
        return response.data;
      } catch (error) {
        this.error = getApiErrorMessage(error, 'خطا در دریافت محصولات');
        throw error;
      } finally {
        this.loading = false;
      }
    },

    createProduct(payload) {
      return withActionResult(() => productService.createProduct(payload), 'خطا در ثبت محصول');
    },
    updateProduct(id, payload) {
      return withActionResult(() => productService.updateProduct(id, payload), 'خطا در ویرایش محصول');
    },
    deleteProduct(id) {
      return withActionResult(() => productService.deleteProduct(id), 'خطا در حذف محصول');
    },
    createCategory(payload) {
      return withActionResult(() => productService.createCategory(payload), 'خطا در ثبت دسته‌بندی');
    },
    updateCategory(id, payload) {
      return withActionResult(() => productService.updateCategory(id, payload), 'خطا در ویرایش دسته‌بندی');
    },
    deleteCategory(id) {
      return withActionResult(() => productService.deleteCategory(id), 'خطا در حذف دسته‌بندی');
    }
  }
});
