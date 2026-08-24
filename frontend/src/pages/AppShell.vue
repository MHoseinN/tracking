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
import { useAuthStore } from '../stores/authStore';

defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' }
});

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const navCollapsed = ref(false);
const actionsCollapsed = ref(false);
const contentReady = ref(false);


const showProfileClicked = ref(false);

const baseNavGroups = [
  {
    key: 'home',
    label: 'خانه',
    to: '/home',
    icon: ['M3 10.5 12 3l9 7.5', 'M5.25 9.75v10.5h13.5V9.75', 'M9.75 20.25v-6h4.5v6'],
    items: []
  },
  {
    key: 'lists',
    label: 'لیست‌های تحویل',
    to: '/lists',
    icon: ['M9 12.75 11.25 15 15 9.75', 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z'],
    items: [
      { key: 'lists-drafts', label: 'پیش‌نویس‌ها', to: '/lists' }
    ]
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
    label: 'مشتریان',
    to: '/users',
    icon: ['M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z'],
    items: [
      { key: 'users', label: 'مدیریت مشتریان', to: '/users' }
    ]
  },
  {
    key: 'products',
    label: 'محصولات',
    to: '/products',
    icon: ['m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9'],
    items: [
      { key: 'products-manage', label: 'مدیریت محصولات', to: '/products' }
    ]
  },
  {
    key: 'admins',
    label: 'ادمین‌ها',
    to: '/admins',
    roles: ['MANAGER'],
    icon: ['M16.5 10.5V6.75a4.5 4.5 0 0 0-9 0v3.75', 'M6.75 10.5h10.5A2.25 2.25 0 0 1 19.5 12.75v6A2.25 2.25 0 0 1 17.25 21H6.75A2.25 2.25 0 0 1 4.5 18.75v-6a2.25 2.25 0 0 1 2.25-2.25Z'],
    items: [
      { key: 'admins-manage', label: 'مدیریت ادمین‌ها', to: '/admins' }
    ]
  },
  {
    key: 'settings',
    label: 'تنظیمات',
    to: '/settings',
    roles: ['MANAGER'],
    icon: ['M9.594 3.94c.09-.542.56-.94 1.11-.94h2.592c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.245c.275.476.163 1.079-.26 1.43l-1.003.827c-.293.241-.438.613-.43.992a6.759 6.759 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.245a1.125 1.125 0 0 1-1.369.49l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.245a1.125 1.125 0 0 1 .26-1.43l1.004-.827c.292-.24.437-.613.43-.991a6.93 6.93 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.245a1.125 1.125 0 0 1 1.369-.49l1.217.456c.355.133.75.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.213-1.281Z', 'M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z'],
    items: [
      { key: 'settings-billing', label: 'ساعت مرزی', to: '/settings' }
    ]
  }
];

const navGroups = computed(() => baseNavGroups.filter((group) => (
  !group.roles || group.roles.includes(authStore.user?.role)
)));

const createClosedGroups = () => ({
  lists: false,
  accounts: false,
  customers: false,
  products: false,
  admins: false,
  settings: false
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

  if (route.path.startsWith('/lists')) {
    nextState.lists = true;
  } else if (route.path === '/reports' || route.path === '/accounts') {
    nextState.accounts = true;
  } else if (route.path === '/users' || route.path.startsWith('/customer/')) {
    nextState.customers = true;
  } else if (route.path === '/products') {
    nextState.products = true;
  } else if (route.path === '/admins') {
    nextState.admins = true;
  } else if (route.path === '/settings') {
    nextState.settings = true;
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
