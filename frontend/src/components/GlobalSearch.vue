<template>
  <div ref="searchRoot" class="relative flex-1">
    <div
      class="flex h-12 w-[75%] items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 shadow-md transition duration-200 focus-within:ring-4 focus-within:ring-blue-100">
      <svg class="h-5 w-5 shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z" />
      </svg>
      <input v-model.trim="query" type="text"
        class="h-12 min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
        placeholder="جست‌وجوی سراسری در حساب‌، مشتری‌ و محصول" @focus="handleFocus" @keydown.esc="closeResults" />
      <button v-if="query" type="button" class="app-icon-button h-9 w-9 rounded-lg border-0 bg-gray-300"
        @click="clearSearch">
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <div v-if="showResults"
      class="absolute inset-x-0 z-[90] mt-1 w-[75%] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-md">
      <div v-if="loading" class="px-4 py-6 text-sm text-slate-500">در حال آماده‌سازی نتایج...</div>
      <div v-else-if="sections.length === 0" class="px-4 py-6 text-sm text-slate-500">نتیجه‌ای پیدا نشد.</div>
      <div v-else class="max-h-[420px] overflow-y-auto p-3">
        <div v-for="section in sections" :key="section.title" class="mb-3 last:mb-0">
          <p class="mb-2 px-2 text-xs font-bold tracking-[0.2em] text-slate-400">{{ section.title }}</p>
          <button v-for="item in section.items" :key="item.key" type="button"
            class="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-3 text-right transition hover:bg-slate-50"
            @click="selectItem(item)">
            <div class="min-w-0">
              <p class="truncate text-sm font-semibold text-slate-800">{{ item.label }}</p>
              <p v-if="item.meta" class="mt-1 truncate text-xs text-slate-500">{{ item.meta }}</p>
            </div>
            <span class="app-badge bg-slate-100 text-slate-600">{{ item.badge }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import { useInvoiceStore } from '../stores/invoiceStore';
import { useProductCatalogStore } from '../stores/productCatalogStore';

const router = useRouter();
const toast = useToast();
const invoiceStore = useInvoiceStore();
const productCatalogStore = useProductCatalogStore();
const query = ref('');
const showResults = ref(false);
const loading = ref(false);
const searchRoot = ref(null);
const dataInitialized = ref(false);

const routeItems = [
  { key: 'route-home', type: 'route', label: 'خانه', meta: 'نمای کلی سیستم', badge: 'صفحه', to: '/home' },
  { key: 'route-lists', type: 'route', label: 'لیست‌های تحویل', meta: 'پیش‌نویس‌ها و ثبت اقلام تحویلی', badge: 'صفحه', to: '/lists' },
  { key: 'route-accounts', type: 'route', label: 'حساب‌ها', meta: 'مدیریت و جستجوی همه حساب‌ها', badge: 'صفحه', to: '/accounts' },
  { key: 'route-reports', type: 'route', label: 'آمار', meta: 'تحلیل درآمد و فاکتورها', badge: 'صفحه', to: '/reports' },
  { key: 'route-users', type: 'route', label: 'مدیریت کاربران', meta: 'لیست و وضعیت حساب مشتری‌ها', badge: 'صفحه', to: '/users' },
  { key: 'route-products', type: 'route', label: 'مدیریت محصولات', meta: 'دسته‌بندی، قیمت و وضعیت محصولات', badge: 'صفحه', to: '/products' }
];

const sections = computed(() => {
  const normalizedQuery = query.value.trim().toLowerCase();
  if (!normalizedQuery) return [];
  const routes = routeItems.filter((item) => item.label.toLowerCase().includes(normalizedQuery) || item.meta.toLowerCase().includes(normalizedQuery));
  const customers = (invoiceStore.customers || []).filter((customer) => String(customer.name || '').toLowerCase().includes(normalizedQuery)).slice(0, 6).map((customer) => ({
    key: `customer-${customer.id}`, type: 'customer', label: customer.name, meta: 'باز کردن صفحه اختصاصی مشتری', badge: 'مشتری', id: customer.id
  }));
  const products = (productCatalogStore.products || []).filter((product) => String(product.name || '').toLowerCase().includes(normalizedQuery) || String(product.category_name || '').toLowerCase().includes(normalizedQuery)).slice(0, 6).map((product) => ({
    key: `product-${product.id}`, type: 'product', label: product.name, meta: product.category_name || 'بدون دسته‌بندی', badge: 'محصول', to: '/products'
  }));
  return [{ title: 'صفحه‌ها', items: routes }, { title: 'مشتری‌ها', items: customers }, { title: 'محصولات', items: products }].filter((section) => section.items.length);
});

async function handleFocus() {
  showResults.value = true;
  if (dataInitialized.value) return;
  loading.value = true;
  try {
    await Promise.all([
      invoiceStore.customers?.length ? Promise.resolve() : invoiceStore.fetchCustomers(),
      productCatalogStore.products?.length ? Promise.resolve() : productCatalogStore.fetchCatalog()
    ]);
    dataInitialized.value = true;
  } catch (_error) {
    toast.error('آماده‌سازی جست‌وجوی سراسری با خطا مواجه شد');
  } finally {
    loading.value = false;
  }
}

function closeResults() { showResults.value = false; }
function clearSearch() { query.value = ''; closeResults(); }
function selectItem(item) {
  router.push(item.type === 'customer' ? `/customer/${item.id}` : item.to);
  clearSearch();
}
function handleClickOutside(event) {
  if (showResults.value && !searchRoot.value?.contains(event.target)) closeResults();
}

document.addEventListener('mousedown', handleClickOutside);
onBeforeUnmount(() => document.removeEventListener('mousedown', handleClickOutside));
</script>
