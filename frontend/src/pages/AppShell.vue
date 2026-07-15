<template>
  <div class="app-shell" :class="shellClassNames">
    <aside class="app-shell__nav border-l border-gray-200">
      <div class="flex h-full flex-col px-3">
        <div class="py-6">
          <div class="flex items-center gap-3">
            <button type="button" class="app-shell__toggle" @click="toggleSidebar('nav')">
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  :d="navCollapsed ? 'm18.75 4.5-7.5 7.5 7.5 7.5m-6-15L5.25 12l7.5 7.5' : 'm5.25 4.5 7.5 7.5-7.5 7.5m6-15 7.5 7.5-7.5 7.5'" />
              </svg>
            </button>
            <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <svg class="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25V13.5Zm0 2.25h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25V18Zm2.498-6.75h.007v.008h-.007v-.008Zm0 2.25h.007v.008h-.007V13.5Zm0 2.25h.007v.008h-.007v-.008Zm0 2.25h.007v.008h-.007V18Zm2.504-6.75h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V13.5Zm0 2.25h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V18Zm2.498-6.75h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V13.5ZM8.25 6h7.5v2.25h-7.5V6ZM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 0 0 2.25 2.25h10.5a2.25 2.25 0 0 0 2.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0 0 12 2.25Z" />
              </svg>
            </div>
            <div class="min-w-0 app-shell__label-block">
              <p class="text-sm font-bold text-gray-500">مدیریت</p>
              <h1 class=" truncate text-xl font-black text-slate-900">حساب و رزرو</h1>
            </div>
          </div>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto scrollbar-hide py-2">
          <div v-for="group in navGroups" :key="group.key" class="py-1 last-0">
            <button v-if="!group.items?.length" type="button"
              class="flex w-full rounded-xl text-right transition app-shell__menu-button px-4"
              :class="isGroupActive(group) ? 'app-shell__menu-button--active text-indigo-700' : 'text-slate-700 hover:bg-slate-50'"
              @click="navigateTo(group.to)">
              <span class="flex items-center justify-center gap-2 min-w-0">
                <span class="app-shell__menu-icon">
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path v-for="(path, index) in group.icon" :key="`${group.key}-${index}`" stroke-linecap="round"
                      stroke-linejoin="round" stroke-width="2" :d="path" />
                  </svg>
                </span>
                <span class="truncate text-sm font-semibold app-shell__label-text">{{ group.label }}</span>
              </span>
            </button>

            <template v-else>
              <button type="button"
                class="flex w-full items-center justify-between rounded-xl  text-right transition app-shell__menu-button px-4"
                :class="isGroupActive(group) ? 'app-shell__menu-button--active text-indigo-700' : 'text-slate-700 hover:bg-slate-50'"
                @click="toggleGroup(group.key)">
                <span class="flex items-center gap-2 min-w-0">
                  <span class="app-shell__menu-icon">
                    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      //
                      <path v-for="(path, index) in group.icon" :key="`${group.key}-${index}`" stroke-linecap="round"
                        stroke-linejoin="round" stroke-width="2" :d="path" />

                    </svg>
                  </span>
                  <span class="truncate text-sm font-semibold app-shell__label-text">{{ group.label }}</span>
                </span>
                <span class="text-3xl leading-none app-shell__label-text">{{ openGroups[group.key] ? '-' : '+' }}</span>
              </button>

              <div v-if="openGroups[group.key]" class="mr-10 py-1 app-shell__submenu">
                <button v-for="item in group.items" :key="item.key" type="button"
                  class="flex w-full px-6 items-center justify-between rounded-xl text-right text-sm transition app-shell__menu-button"
                  :class="isActiveRoute(item) ? 'app-shell__menu-button--subactive font-bold text-blue-700' : 'bg-white text-zinc-700 hover:bg-slate-50 hover:text-blue-700'"
                  @click="navigateTo(item.to)">
                  <span class="flex items-center gap-2 min-w-0">
                    <span class="truncate app-shell__label-text">{{ item.label }}</span>
                  </span>
                </button>
              </div>
            </template>
          </div>
        </div>
      </div>
    </aside>

    <header class="app-shell__header z-[50]">
      <div class="flex h-full flex-col justify-center gap-4 px-4 lg:px-6">
        <div class="flex flex-col gap-4 xl:flex-row xl:items-center justify-between">
          <div ref="searchRootRef" class="relative flex-1">
            <div
              class="flex h-12 items-center w-[75%] gap-3 rounded-lg border border-gray-200 bg-white px-4 shadow-md transition duration-200 focus-within:ring-4 focus-within:ring-blue-100">
              <svg class="h-5 w-5 shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z" />
              </svg>
              <input v-model.trim="globalSearch" type="text"
                class="h-12 min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                placeholder="جست‌وجوی سراسری در حساب‌، مشتری‌ و محصول" @focus="handleSearchFocus"
                @keydown.esc="closeSearchResults" />
              <button v-if="globalSearch" type="button" class="app-icon-button h-9 w-9 rounded-xl border-0 bg-gray-300"
                @click="clearSearch">
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div v-if="showSearchResults"
              class="absolute inset-x-0 w-[75%] mt-1 z-[90] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-md">
              <div v-if="searchLoading" class="px-4 py-6 text-sm text-slate-500">در حال آماده‌سازی نتایج...</div>
              <div v-else-if="searchSections.length === 0" class="px-4 py-6 text-sm text-slate-500">نتیجه‌ای پیدا نشد.
              </div>
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

          <div class="hidden items-center gap-2 px-3 lg:flex justify-between">
            <div v-if="showProfileClicked"
              class="border-2 mt-6 border-gray-200 bg-neutral-100 px-4 py-2 z-[50] rounded-lg">
              <p>محمد حسین نعمتیان</p>
              <div class="rounded-xl bg-neutral-400 inline-block px-2 py-1">
                <p class="text-xs"> ادمین ارشد</p>
              </div>
            </div>
            <button type="button" @click="showProfile"
              class="app-button-secondary border border-gray-200 bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-100">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
                stroke="currentColor" class="size-5">
                <path stroke-linecap="round" stroke-linejoin="round"
                  d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
            </button>
            <button type="button" title="بکاپ" :disabled="backupLoading"
              class="app-button border border-amber-200 bg-amber-100 text-amber-700 hover:bg-amber-200 focus:ring-amber-100"
              @click="handleManualBackup">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
                stroke="currentColor" class="size-5">
                <path stroke-linecap="round" stroke-linejoin="round"
                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            </button>
            <button type="button" title="خروج" class="app-button-danger" @click="handleLogout">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
                stroke="currentColor" class="size-5">
                <path stroke-linecap="round" stroke-linejoin="round"
                  d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
              </svg>
            </button>
          </div>

        </div>
      </div>
    </header>

    <aside class="app-shell__actions" :class="{ 'app-shell__actions--collapsed': actionsCollapsed }">
      <div class="flex h-full flex-col gap-3" :class="actionsCollapsed ? 'justify-start py-3' : 'p-4'">
        <div class="flex items-center px-2 gap-5 app-shell__actions-header" :class="actionsCollapsed ? '' : ''">

          <div>
            <button type="button" class="app-shell__toggle" @click="toggleSidebar('actions')">
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  :d="actionsCollapsed ? 'm5.25 4.5 7.5 7.5-7.5 7.5m6-15 7.5 7.5-7.5 7.5' : 'm18.75 4.5-7.5 7.5 7.5 7.5m-6-15L5.25 12l7.5 7.5'" />
              </svg>
            </button>
          </div>
          <div :class="actionsCollapsed ? 'hidden' : ''">
            <h1>عملیات</h1>
          </div>
        </div>

        <div class="min-h-0 overflow-y-auto scrollbar-hide">
          <div id="app-shell-actions" class="flex flex-col gap-2 w-full h-full app-shell__actions-content"></div>
        </div>
      </div>
    </aside>

    <main class="app-shell__main scrollbar-hide">
      <div class="min-h-full space-y-5 p-4">
        <slot />
      </div>
    </main>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue';
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
const navCollapsed = ref(false);
const actionsCollapsed = ref(false);


const showProfileClicked = ref(false);

const navGroups = [
  {
    key: 'home',
    label: 'خانه',
    to: '/home',
    icon: ['M3 10.5 12 3l9 7.5', 'M5.25 9.75v10.5h13.5V9.75', 'M9.75 20.25v-6h4.5v6'],
    items: []
  },
  {
    key: 'accounts',
    label: 'حساب',
    icon: ["M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"],
    items: [
      { key: 'accounts', label: 'مدیریت حساب‌ها', to: '/accounts' },
      { key: 'reports', label: 'آمار', to: '/reports' }
    ]
  },
  {
    key: 'customers',
    label: 'کاربران',
    icon: ['M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z'],
    items: [
      { key: 'users', label: 'مدیریت کاربران', to: '/users' }
    ]
  },
  {
    key: 'inventory',
    label: 'رزرو',
    icon: ['M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75V15Zm0 2.25h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5V15Zm0 2.25h.008v.008H7.5v-.008Zm6.75-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008Zm2.25-4.5h.008v.008H16.5v-.008Zm0 2.25h.008v.008H16.5V15Z'],
    items: [
      { key: 'dashInventory', label: 'داشبورد رزرو', to: '/inventory' },
      { key: 'inventory-new', label: 'سبد رزرو', to: '/inventory/reservations/new' },
      { key: 'inventory-active', label: 'رزروهای فعال', to: '/inventory/reservations/active' }
    ]
  },
  {
    key: 'products',
    label: 'محصولات',
    icon: ['m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9'],
    items: [
      { key: 'inventory-manage', label: 'مدیریت محصولات', to: '/inventory/manage' }
    ]
  }
];

const createClosedGroups = () => ({
  accounts: false,
  customers: false,
  inventory: false,
  products: false
});

const openGroups = ref(createClosedGroups());

const routeSearchItems = [
  { key: 'route-home', type: 'route', label: 'خانه', meta: 'نمای کلی سیستم', badge: 'صفحه', to: '/home' },
  { key: 'route-accounts', type: 'route', label: 'حساب‌ها', meta: 'مدیریت و جستجوی همه حساب‌ها', badge: 'صفحه', to: '/accounts' },
  { key: 'route-reports', type: 'route', label: 'آمار', meta: 'تحلیل درآمد و فاکتورها', badge: 'صفحه', to: '/reports' },
  { key: 'route-users', type: 'route', label: 'مدیریت کاربران', meta: 'لیست و وضعیت حساب مشتری‌ها', badge: 'صفحه', to: '/users' },
  { key: 'route-inventory', type: 'route', label: 'داشبورد رزرو', meta: 'وضعیت موجودی و رزروها', badge: 'صفحه', to: '/inventory' },
  { key: 'route-products', type: 'route', label: 'مدیریت محصولات', meta: 'دسته‌بندی و محصولات انبار', badge: 'صفحه', to: '/inventory/manage' },
  { key: 'route-cart', type: 'route', label: 'سبد رزرو', meta: 'ایجاد رزرو جدید', badge: 'صفحه', to: '/inventory/reservations/new' },
  { key: 'route-active', type: 'route', label: 'رزروهای فعال', meta: 'آزادسازی و ویرایش رزروها', badge: 'صفحه', to: '/inventory/reservations/active' }
];

const shellClassNames = computed(() => ({
  'app-shell--nav-collapsed': navCollapsed.value,
  'app-shell--actions-collapsed': actionsCollapsed.value
}));

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

function showProfile() {
  showProfileClicked.value = !showProfileClicked.value;
}

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
  if (navCollapsed.value) return;

  const nextState = !openGroups.value[key];
  openGroups.value = createClosedGroups();
  openGroups.value[key] = nextState;
}

function syncOpenGroupWithRoute() {
  const nextState = createClosedGroups();

  if (route.path === '/reports' || route.path === '/accounts') {
    nextState.accounts = true;
  } else if (route.path === '/users' || route.path.startsWith('/customer/')) {
    nextState.customers = true;
  } else if (route.path === '/inventory' || route.path === '/inventory/reservations/new' || route.path === '/inventory/reservations/active') {
    nextState.inventory = true;
  } else if (route.path === '/inventory/manage') {
    nextState.products = true;
  }

  openGroups.value = nextState;
}

function toggleSidebar(sidebar) {
  if (sidebar === 'nav') {
    navCollapsed.value = !navCollapsed.value;
    return;
  }

  actionsCollapsed.value = !actionsCollapsed.value;
}

function navigateTo(path) {
  if (!path || route.path === path) return;
  router.push(path);
}

watch(() => route.path, syncOpenGroupWithRoute, { immediate: true });

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
