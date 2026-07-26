<template>
  <div class="app-shell" :class="shellClassNames">
    <SidebarNavigation :nav-groups="navGroups" :open-groups="openGroups" @toggle-sidebar="toggleSidebar"
      @toggle-group="toggleGroup" @navigate="navigateTo" />

    <header class="app-shell__header z-[50]">
      <div class="flex h-full flex-col justify-center gap-4 px-4 lg:px-6">
        <div class="flex flex-col gap-4 xl:flex-row xl:items-center justify-between">
          <GlobalSearch />
          <HeaderActions />
        </div>
      </div>
    </header>

    <aside class="app-shell__actions" :class="{ 'app-shell__actions--collapsed': actionsCollapsed }">
      <div class="flex h-full flex-col gap-3" :class="actionsCollapsed ? 'justify-start py-3' : 'p-4'">
        <div class="flex items-center px-2 gap-5 app-shell__actions-header" :class="actionsCollapsed ? '' : ''">
          <div>
            <button type="button" class="app-shell__toggle" @click="toggleSidebar('actions')">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="4" width="18" height="16" rx="2.5" />
                <path d="M9 4v16" />
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
        <div v-if="contentReady">
          <slot />
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import GlobalSearch from '../components/GlobalSearch.vue';
import HeaderActions from '../components/HeaderActions.vue';
import SidebarNavigation from '../components/SidebarNavigation.vue';

defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' }
});

const router = useRouter();
const route = useRoute();

const navCollapsed = ref(false);
const actionsCollapsed = ref(false);
const contentReady = ref(false);


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
    to: '/accounts',
    icon: ["M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"],
    items: [
      { key: 'accounts', label: 'مدیریت حساب‌ها', to: '/accounts' },
      { key: 'reports', label: 'آمار', to: '/reports' }
    ]
  },
  {
    key: 'customers',
    label: 'کاربران',
    to: '/users',
    icon: ['M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z'],
    items: [
      { key: 'users', label: 'مدیریت کاربران', to: '/users' }
    ]
  },
  {
    key: 'inventory',
    label: 'رزرو',
    to: '/inventory',
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
    to: '/products',
    icon: ['m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9'],
    items: [
      { key: 'inventory-manage', label: 'مدیریت محصولات', to: '/products' }
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

const shellClassNames = computed(() => ({
  'app-shell--nav-collapsed': navCollapsed.value,
  'app-shell--actions-collapsed': actionsCollapsed.value
}));

function showProfile() {
  showProfileClicked.value = !showProfileClicked.value;
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
  } else if (route.path === '/products') {
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

onMounted(async () => {
  await nextTick();
  contentReady.value = true;
});

watch(() => route.fullPath, async () => {
  contentReady.value = false;
  await nextTick();
  contentReady.value = true;
});

</script>
