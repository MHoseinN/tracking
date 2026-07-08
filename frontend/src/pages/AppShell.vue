<template>
  <div class="app-shell">
    <aside class="app-shell__nav">
      <div class="flex h-full flex-col px-4 py-5">
        <div class="border-b border-slate-200 px-2 pb-5">
          <div class="flex items-center gap-3">
            <div
              class="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20">
              <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9 17V7m4 10V5m4 12V9M5 19h14" />
              </svg>
            </div>
            <div class="min-w-0">
              <p class="text-sm font-bold tracking-[0.28em] text-slate-400">مدیریت</p>
              <h1 class="mt-1 truncate text-xl font-black text-slate-900">حساب و رزرو</h1>
            </div>
          </div>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto px-1 pt-4 scrollbar-hide">
          <div v-for="group in navGroups" :key="group.key" class="mb-2 last:mb-0">
            <button v-if="!group.items?.length" type="button"
              class="flex w-full items-center justify-between rounded-2xl px-3 py-3 text-right transition"
              :class="isGroupActive(group) ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'"
              @click="navigateTo(group.to)">
              <span class="truncate text-sm font-semibold">{{ group.label }}</span>
            </button>

            <template v-else>
              <button type="button"
                class="flex w-full items-center justify-between gap-2 rounded-2xl px-3 py-3 text-right transition"
                :class="isGroupActive(group) ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'"
                @click="toggleGroup(group.key)">
                <span class="truncate text-sm font-semibold">{{ group.label }}</span>
                <span class="text-3xl leading-none">{{ openGroups[group.key] ? '−' : '+' }}</span>
              </button>

              <div v-if="openGroups[group.key]" class="mr-4 mt-2 space-y-2 border-r border-slate-200 pr-3">
                <button v-for="item in group.items" :key="item.key" type="button"
                  class="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-3 text-right text-sm transition"
                  :class="isActiveRoute(item) ? 'bg-slate-100 font-bold text-blue-700' : 'bg-white text-zinc-700 hover:bg-gray-100 hover:text-blue-700'"
                  @click="navigateTo(item.to)">
                  <span>{{ item.label }}</span>
                  <span v-if="item.badge"
                    class="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">{{ item.badge }}</span>
                </button>
              </div>
            </template>
          </div>
        </div>
      </div>
    </aside>

    <header class="app-shell__header">
      <div class="flex h-full flex-col justify-center gap-4 px-4 py-4 lg:px-6">
        <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div class="flex min-w-0 flex-1 flex-col gap-3">
            <div v-if="breadcrumbs.length" class="flex flex-wrap items-center gap-2">
              <button v-for="(crumb, index) in breadcrumbs" :key="crumb.key" type="button"
                class="inline-flex items-center gap-2 text-sm transition"
                :class="crumb.clickable ? 'font-semibold text-slate-600 hover:text-indigo-600' : 'font-bold text-slate-900'"
                :disabled="!crumb.clickable" @click="crumb.clickable ? navigateTo(crumb.to) : null">
                <span>{{ crumb.label }}</span>
                <svg v-if="index < breadcrumbs.length - 1" class="h-4 w-4 text-slate-300" fill="none" stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            <div class="min-w-0">
              <h2 class="app-section-title">{{ title }}</h2>
              <p v-if="subtitle" class="app-section-subtitle mt-1">{{ subtitle }}</p>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <div ref="searchRootRef" class="relative min-w-0 flex-1 xl:w-[30rem]">
              <div
                class="flex h-14 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 shadow-sm transition duration-200 focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-100">
                <svg class="h-5 w-5 shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z" />
                </svg>
                <input v-model.trim="globalSearch" type="text"
                  class="h-12 min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                  placeholder="جست‌وجوی سراسری در حساب‌، مشتری‌ و محصول" @focus="handleSearchFocus"
                  @keydown.esc="closeSearchResults" />
                <button v-if="globalSearch" type="button"
                  class="app-icon-button h-9 w-9 rounded-xl border-0 bg-slate-100" @click="clearSearch">
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div v-if="showSearchResults"
                class="absolute inset-x-0 top-[calc(100%+0.75rem)] z-[90] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.16)]">
                <div v-if="searchLoading" class="px-4 py-6 text-sm text-slate-500">در حال آماده‌سازی نتایج...</div>
                <div v-else-if="searchSections.length === 0" class="px-4 py-6 text-sm text-slate-500">نتیجه‌ای پیدا نشد.</div>
                <div v-else class="max-h-[420px] overflow-y-auto p-3">
                  <div v-for="section in searchSections" :key="section.title" class="mb-3 last:mb-0">
                    <p class="mb-2 px-2 text-xs font-bold tracking-[0.2em] text-slate-400">{{ section.title }}</p>
                    <button v-for="item in section.items" :key="item.key" type="button"
                      class="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-right transition hover:bg-slate-50"
                      @click="handleSearchSelection(item)">
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

            <div class="hidden items-center gap-2 lg:flex">
              <button type="button" :disabled="backupLoading"
                class="app-button border border-amber-200 bg-amber-100 text-amber-700 hover:bg-amber-200 focus:ring-amber-100"
                @click="handleManualBackup">
                {{ backupLoading ? 'در حال بکاپ...' : 'بکاپ' }}
              </button>
              <button type="button" class="app-button-danger" @click="handleLogout">خروج</button>
            </div>
          </div>
        </div>
      </div>
    </header>

    <aside class="app-shell__actions">
      <div class="flex h-full flex-col p-4">
        <div class="min-h-0 flex-1 overflow-y-auto scrollbar-hide">
          <div class="h-full rounded-2xl border border-dashed border-slate-200 bg-slate-50/60"></div>
        </div>
      </div>
    </aside>

    <main class="app-shell__main">
      <div class="min-h-full space-y-5 p-4 lg:p-6">
        <slot />
      </div>
    </main>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useToast } from 'vue-toastification';
import { useAuthStore } from '../stores/authStore';
import { useInvoiceStore } from '../stores/invoiceStore';
import { useInventoryStore } from '../stores/inventoryStore';
import api from '../utils/api';

defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' }
});

const router = useRouter();
const route = useRoute();
const toast = useToast();
const authStore = useAuthStore();
const invoiceStore = useInvoiceStore();
const inventoryStore = useInventoryStore();

const globalSearch = ref('');
const showSearchResults = ref(false);
const searchLoading = ref(false);
const backupLoading = ref(false);
const searchRootRef = ref(null);
const searchDataInitialized = ref(false);

const navGroups = [
  {
    key: 'home',
    label: 'خانه',
    to: '/home',
    items: []
  },
  {
    key: 'accounts',
    label: 'حساب',
    items: [
      { key: 'accounts', label: 'مدیربت حساب‌ها', to: '/accounts' },
      { key: 'reports', label: 'گزارش‌ها', to: '/reports' }
    ]
  },
  {
    key: 'customers',
    label: 'کاربران',
    items: [
      { key: 'users', label: 'مدیریت کاربران', to: '/users' }
    ]
  },
  {
    key: 'inventory',
    label: 'رزرو',
    items: [
      { key: 'dashInventory', label: 'داشبورد رزرو', to: '/inventory' },
      { key: 'inventory-manage', label: 'مدیریت محصولات', to: '/inventory/manage' },
      { key: 'inventory-new', label: 'سبد رزرو', to: '/inventory/reservations/new' },
      { key: 'inventory-active', label: 'رزروهای فعال', to: '/inventory/reservations/active' },
      { key: 'inventory-lab', label: 'لَب ماتریس', to: '/inventory/layout-lab' }
    ]
  }
];

const openGroups = ref({
  accounts: true,
  customers: true,
  inventory: true
});

const routeLabelMap = {
  '/home': 'خانه',
  '/accounts': 'حساب‌ها',
  '/reports': 'گزارش‌ها',
  '/users': 'مدیریت کاربران',
  '/inventory': 'داشبورد رزرو',
  '/inventory/manage': 'مدیریت محصولات',
  '/inventory/reservations/new': 'سبد رزرو',
  '/inventory/reservations/active': 'رزروهای فعال',
  '/inventory/layout-lab': 'لَب ماتریس'
};

const routeSearchItems = [
  { key: 'route-home', type: 'route', label: 'خانه', meta: 'نمای کلی سیستم', badge: 'صفحه', to: '/home' },
  { key: 'route-accounts', type: 'route', label: 'حساب‌ها', meta: 'مدیریت و جستجوی همه حساب‌ها', badge: 'صفحه', to: '/accounts' },
  { key: 'route-reports', type: 'route', label: 'گزارش‌ها', meta: 'تحلیل درآمد و فاکتورها', badge: 'صفحه', to: '/reports' },
  { key: 'route-users', type: 'route', label: 'مدیریت کاربران', meta: 'لیست و وضعیت حساب مشتری‌ها', badge: 'صفحه', to: '/users' },
  { key: 'route-inventory', type: 'route', label: 'داشبورد رزرو', meta: 'وضعیت موجودی و رزروها', badge: 'صفحه', to: '/inventory' },
  { key: 'route-products', type: 'route', label: 'مدیریت محصولات', meta: 'دسته‌بندی و محصولات انبار', badge: 'صفحه', to: '/inventory/manage' },
  { key: 'route-cart', type: 'route', label: 'سبد رزرو', meta: 'ایجاد رزرو جدید', badge: 'صفحه', to: '/inventory/reservations/new' },
  { key: 'route-active', type: 'route', label: 'رزروهای فعال', meta: 'آزادسازی و ویرایش رزروها', badge: 'صفحه', to: '/inventory/reservations/active' }
];

const breadcrumbs = computed(() => {
  const items = [{ key: 'crumb-root', label: 'خانه', to: '/home', clickable: route.path !== '/home' }];

  if (route.path === '/home') {
    items[0].clickable = false;
    return items;
  }

  if (route.path.startsWith('/customer/')) {
    items.push({ key: 'crumb-accounts', label: 'حساب‌ها', to: '/accounts', clickable: true });
    items.push({ key: 'crumb-customer', label: 'صفحه مشتری', to: route.path, clickable: false });
    return items;
  }

  if (route.path.startsWith('/inventory')) {
    items.push({ key: 'crumb-inventory', label: 'داشبورد رزرو', to: '/inventory', clickable: route.path !== '/inventory' });
  }

  if (route.path !== '/inventory') {
    const label = routeLabelMap[route.path];
    if (label && !items.some((item) => item.to === route.path)) {
      items.push({ key: `crumb-${route.path}`, label, to: route.path, clickable: false });
    }
  }

  return items;
});

const searchSections = computed(() => {
  const query = globalSearch.value.trim().toLowerCase();
  if (!query) return [];

  const routes = routeSearchItems.filter((item) =>
    item.label.toLowerCase().includes(query) || item.meta.toLowerCase().includes(query)
  );
  const customers = (invoiceStore.customers || [])
    .filter((customer) => String(customer.name || '').toLowerCase().includes(query))
    .slice(0, 6)
    .map((customer) => ({
      key: `customer-${customer.id}`,
      type: 'customer',
      label: customer.name,
      meta: 'باز کردن صفحه اختصاصی مشتری',
      badge: 'مشتری',
      id: customer.id
    }));
  const products = (inventoryStore.lookups.products || [])
    .filter((product) =>
      String(product.name || '').toLowerCase().includes(query)
      || String(product.category_name || '').toLowerCase().includes(query)
    )
    .slice(0, 6)
    .map((product) => ({
      key: `product-${product.id}`,
      type: 'product',
      label: product.name,
      meta: product.category_name || 'بدون دسته‌بندی',
      badge: 'محصول',
      to: '/inventory/manage'
    }));

  return [
    { title: 'صفحه‌ها', items: routes },
    { title: 'مشتری‌ها', items: customers },
    { title: 'محصولات', items: products }
  ].filter((section) => section.items.length > 0);
});

function isActiveRoute(item) {
  if (item.to === '/users' && route.path.startsWith('/customer/')) return true;
  return route.path === item.to;
}

function isGroupActive(group) {
  if (!group.items?.length && group.to) {
    return route.path === group.to;
  }
  return group.items.some((item) => isActiveRoute(item));
}

function toggleGroup(key) {
  openGroups.value[key] = !openGroups.value[key];
}

function navigateTo(path) {
  if (!path || route.path === path) return;
  router.push(path);
}

async function ensureSearchData() {
  if (searchDataInitialized.value) return;
  searchLoading.value = true;
  try {
    await Promise.all([
      invoiceStore.customers?.length ? Promise.resolve() : invoiceStore.fetchCustomers(),
      inventoryStore.lookups.products?.length ? Promise.resolve() : inventoryStore.fetchLookups()
    ]);
    searchDataInitialized.value = true;
  } catch (_error) {
    toast.error('آماده‌سازی جست‌وجوی سراسری با خطا مواجه شد');
  } finally {
    searchLoading.value = false;
  }
}

async function handleSearchFocus() {
  showSearchResults.value = true;
  await ensureSearchData();
}

function closeSearchResults() {
  showSearchResults.value = false;
}

function clearSearch() {
  globalSearch.value = '';
  closeSearchResults();
}

function handleSearchSelection(item) {
  if (item.type === 'customer') {
    router.push(`/customer/${item.id}`);
  } else if (item.to) {
    router.push(item.to);
  }
  clearSearch();
}

async function handleManualBackup() {
  if (backupLoading.value) return;
  backupLoading.value = true;
  try {
    const response = await api.post('/backups/manual');
    const fileName = response?.data?.fileName;
    toast.success(fileName ? `بکاپ با موفقیت گرفته شد: ${fileName}` : 'بکاپ با موفقیت گرفته شد');
  } catch (err) {
    toast.error(err.response?.data?.message || 'خطا در گرفتن بکاپ');
  } finally {
    backupLoading.value = false;
  }
}

function handleLogout() {
  authStore.logout();
  router.push('/login');
}

function handleClickOutside(event) {
  if (!showSearchResults.value) return;
  if (!searchRootRef.value?.contains(event.target)) {
    closeSearchResults();
  }
}

document.addEventListener('mousedown', handleClickOutside);

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleClickOutside);
});
</script>
