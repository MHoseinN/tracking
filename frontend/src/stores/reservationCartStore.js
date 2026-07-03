import { defineStore } from 'pinia';

const STORAGE_KEY = 'tracking-main-reservation-cart';

function normalizeItems(items) {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => ({
      product_id: Number(item.product_id),
      product_name: String(item.product_name || '').trim(),
      category_name: String(item.category_name || '').trim(),
      quantity: Math.max(1, Number(item.quantity) || 1)
    }))
    .filter((item) => item.product_id > 0);
}

export const useReservationCartStore = defineStore('reservationCart', {
  state: () => ({
    initialized: false,
    items: []
  }),

  getters: {
    totalQuantity(state) {
      return state.items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    },
    uniqueProductsCount(state) {
      return state.items.length;
    }
  },

  actions: {
    initialize() {
      if (this.initialized) return;
      this.initialized = true;

      if (typeof window === 'undefined') return;

      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          this.items = normalizeItems(JSON.parse(raw));
        }
      } catch (_error) {
        this.items = [];
      }
    },

    persist() {
      if (typeof window === 'undefined') return;
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.items));
    },

    addProduct(product, quantity = 1, maxQuantity = Number.POSITIVE_INFINITY) {
      this.initialize();

      const productId = Number(product?.id || product?.product_id);
      if (!productId) return { success: false, message: 'محصول معتبر نیست' };

      const safeQuantity = Math.max(1, Number(quantity) || 1);
      const max = Math.max(0, Number.isFinite(Number(maxQuantity)) ? Number(maxQuantity) : Number.POSITIVE_INFINITY);

      const existing = this.items.find((item) => item.product_id === productId);
      const nextQuantity = (existing?.quantity || 0) + safeQuantity;

      if (nextQuantity > max) {
        return { success: false, message: 'تعداد انتخابی از موجودی آزاد بیشتر است' };
      }

      if (existing) {
        existing.quantity = nextQuantity;
      } else {
        this.items.push({
          product_id: productId,
          product_name: product?.name || product?.product_name || 'محصول بدون نام',
          category_name: product?.category_name || '',
          quantity: safeQuantity
        });
      }

      this.persist();
      return { success: true };
    },

    setQuantity(productId, quantity) {
      this.initialize();
      const target = this.items.find((item) => item.product_id === Number(productId));
      if (!target) return;

      const nextQuantity = Math.max(1, Number(quantity) || 1);
      target.quantity = nextQuantity;
      this.persist();
    },

    increment(productId) {
      this.setQuantity(productId, this.getProductQuantity(productId) + 1);
    },

    decrement(productId) {
      const current = this.getProductQuantity(productId);
      if (current <= 1) {
        this.removeProduct(productId);
        return;
      }
      this.setQuantity(productId, current - 1);
    },

    removeProduct(productId) {
      this.initialize();
      this.items = this.items.filter((item) => item.product_id !== Number(productId));
      this.persist();
    },

    clear() {
      this.initialize();
      this.items = [];
      this.persist();
    },

    getProductQuantity(productId) {
      this.initialize();
      return this.items.find((item) => item.product_id === Number(productId))?.quantity || 0;
    },

    syncProductMeta(products = []) {
      this.initialize();
      const productMap = new Map(products.map((product) => [Number(product.id), product]));

      this.items = this.items.map((item) => {
        const product = productMap.get(Number(item.product_id));
        if (!product) return item;

        return {
          ...item,
          product_name: product.name || item.product_name,
          category_name: product.category_name || item.category_name
        };
      });

      this.persist();
    }
  }
});
