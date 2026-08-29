<template>
  <button type="button" class="global-search-trigger" @click="openSearch">
    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
        d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15z" />
    </svg>
    <span title="Ctrl + K">جستجوی سراسری</span>
  </button>

  <Teleport to="body">
    <div v-if="showResults" class="global-search-backdrop" @mousedown.self="closeResults">
      <section ref="searchRoot" class="global-search-dialog" role="dialog" aria-modal="true" aria-label="جستجوی سراسری">
        <div class="global-search-input-wrap">
          <svg class="h-5 w-5 shrink-0 text-emerald-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15z" />
          </svg>
          <input ref="searchInput" v-model.trim="query" type="search" placeholder="جستجو در مشتری، لیست یا محصول..."
            @keydown.esc="closeResults" />
          <kbd>Esc</kbd>
        </div>

        <div class="global-search-results">
          <div v-if="loading" class="px-4 py-8 text-center text-sm text-slate-500">در حال آماده‌سازی نتایج...</div>
          <div v-else-if="!query" class="px-4 py-8 text-center text-sm text-slate-500">برای شروع جستجو، نام مشتری، شماره
            لیست یا محصول را بنویسید.</div>
          <div v-else-if="sections.length === 0" class="px-4 py-8 text-center text-sm text-slate-500">نتیجه‌ای پیدا نشد.
          </div>
          <div v-else class="max-h-[60vh] overflow-y-auto p-3">
            <div v-for="section in sections" :key="section.title" class="mb-3 last:mb-0">
              <p class="mb-2 px-2 text-xs font-bold text-emerald-800/70">{{ section.title }}</p>
              <button v-for="item in section.items" :key="item.key" type="button" class="global-search-result"
                @click="selectItem(item)">
                <div class="min-w-0">
                  <p class="truncate text-sm font-semibold text-slate-800">{{ item.label }}</p>
                  <p v-if="item.meta" class="mt-1 truncate text-xs text-slate-500">{{ item.meta }}</p>
                </div>
                <span class="app-badge bg-emerald-50 text-emerald-800">{{ item.badge }}</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import { useInvoiceStore } from '../stores/invoiceStore';
import { useProductCatalogStore } from '../stores/productCatalogStore';
import { useDeliveryListStore } from '../stores/deliveryListStore';

const router = useRouter();
const toast = useToast();
const invoiceStore = useInvoiceStore();
const productCatalogStore = useProductCatalogStore();
const deliveryListStore = useDeliveryListStore();
const query = ref('');
const showResults = ref(false);
const loading = ref(false);
const searchRoot = ref(null);
const searchInput = ref(null);
const dataInitialized = ref(false);

const routeItems = [
  { key: 'route-home', type: 'route', label: 'خانه', meta: 'نمای کلی سیستم', badge: 'صفحه', to: '/home' },
  { key: 'route-lists', type: 'route', label: ' لیست‌ها', meta: 'تحویل، برگشت، فاکتور و تسویه', badge: 'صفحه', to: '/lists' },
  { key: 'route-reports', type: 'route', label: 'آمار', meta: 'تحلیل درآمد و فاکتورها', badge: 'صفحه', to: '/reports' },
  { key: 'route-users', type: 'route', label: 'مشتریان', meta: 'فهرست و اطلاعات مشتریان', badge: 'صفحه', to: '/users' },
  { key: 'route-products', type: 'route', label: 'محصولات', meta: 'دسته‌بندی، قیمت و وضعیت محصولات', badge: 'صفحه', to: '/products' }
];

const sections = computed(() => {
  const normalizedQuery = query.value.trim().toLowerCase();
  if (!normalizedQuery) return [];
  const routes = routeItems.filter((item) => item.label.toLowerCase().includes(normalizedQuery) || item.meta.toLowerCase().includes(normalizedQuery));
  const lists = (deliveryListStore.lists || []).filter((list) => [list.list_number, list.customer_name]
    .some((value) => String(value || '').toLowerCase().includes(normalizedQuery))).slice(0, 6).map((list) => ({
      key: `list-${list.id}`, type: 'route', label: list.list_number || `لیست ${list.id}`,
      meta: list.customer_name || 'بدون نام مشتری', badge: 'لیست', to: `/lists/${list.id}`
    }));
  const customers = (invoiceStore.customers || []).filter((customer) => [customer.name, customer.phone]
    .some((value) => String(value || '').toLowerCase().includes(normalizedQuery))).slice(0, 6).map((customer) => ({
      key: `customer-${customer.id}`, type: 'customer', label: customer.name, meta: 'باز کردن صفحه اختصاصی مشتری', badge: 'مشتری', id: customer.id
    }));
  const products = (productCatalogStore.products || []).filter((product) => String(product.name || '').toLowerCase().includes(normalizedQuery) || String(product.category_name || '').toLowerCase().includes(normalizedQuery)).slice(0, 6).map((product) => ({
    key: `product-${product.id}`, type: 'product', label: product.name, meta: product.category_name || 'بدون دسته‌بندی', badge: 'محصول', to: '/products'
  }));
  return [{ title: 'صفحه‌ها', items: routes }, { title: 'لیست‌ها', items: lists }, { title: 'مشتری‌ها', items: customers }, { title: 'محصولات', items: products }].filter((section) => section.items.length);
});

async function openSearch() {
  showResults.value = true;
  await nextTick();
  searchInput.value?.focus();
  if (dataInitialized.value) return;
  loading.value = true;
  try {
    await Promise.all([
      invoiceStore.customers?.length ? Promise.resolve() : invoiceStore.fetchCustomers(),
      deliveryListStore.lists?.length ? Promise.resolve() : deliveryListStore.fetchLists({ silent: true }),
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
function handleShortcut(event) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    if (showResults.value) closeResults();
    else openSearch();
  }
}

window.addEventListener('keydown', handleShortcut);
onBeforeUnmount(() => window.removeEventListener('keydown', handleShortcut));
</script>

<style scoped>
.global-search-trigger {
  display: flex;
  width: 100%;
  height: 3rem;
  align-items: center;
  justify-content: center;
  gap: .55rem;
  border-radius: .65rem;
  border: 1px solid #d8c59f;
  background: #f3ead7;
  padding: 0 .75rem;
  color: #185844;
  font-size: .78rem;
  font-weight: 800;
  box-shadow: 0 8px 20px rgb(89 72 38 / .1);
  transition: .2s;
}

.global-search-trigger:hover {
  border-color: #c8ae78;
  background: #eadcbc;
}

.global-search-trigger kbd {
  margin-right: auto;
  border-radius: .35rem;
  background: rgb(255 255 255 / .62);
  padding: .2rem .4rem;
  font-size: .65rem;
  direction: ltr;
}

.global-search-backdrop {
  position: fixed;
  inset: 0;
  z-index: 210;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  background: rgb(2 44 34 / .42);
  padding: 12vh 1rem 1rem;
  backdrop-filter: blur(3px);
}

.global-search-dialog {
  width: min(42rem, 100%);
  overflow: hidden;
  border: 1px solid #a7c7b7;
  border-radius: .85rem;
  background: white;
  box-shadow: 0 30px 80px rgb(2 44 34 / .3);
}

.global-search-input-wrap {
  display: flex;
  height: 4rem;
  align-items: center;
  gap: .75rem;
  border-bottom: 1px solid #d6e3dc;
  padding: 0 1rem;
}

.global-search-input-wrap input {
  min-width: 0;
  flex: 1;
  background: transparent;
  color: #1e293b;
  outline: none;
}

.global-search-input-wrap kbd {
  border: 1px solid #d6e3dc;
  border-radius: .35rem;
  background: #f7faf8;
  padding: .2rem .45rem;
  color: #64748b;
  font-size: .65rem;
}

.global-search-results {
  min-height: 8rem;
  background: #fff;
}

.global-search-result {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: .75rem;
  border-radius: .55rem;
  padding: .7rem .75rem;
  text-align: right;
  transition: .15s;
}

.global-search-result:hover {
  background: #f0f7f3;
}
</style>
