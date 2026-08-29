<template>
  <div class="app-shell" :class="shellClassNames">
    <SidebarNavigation
      :nav-groups="navGroups"
      :open-groups="openGroups"
      :mobile-open="mobileNavOpen"
      @toggle-sidebar="toggleSidebar"
      @toggle-group="toggleGroup"
      @navigate="navigateTo"
      @close-mobile="mobileNavOpen = false"
    />

    <button
      v-if="mobileActionsOpen"
      type="button"
      class="app-shell__backdrop lg:hidden"
      aria-label="بستن نوار عملیات"
      @click="mobileActionsOpen = false"
    />

    <aside
      class="app-shell__actions"
      :class="{
        'app-shell__actions--collapsed': actionsCollapsed,
        'app-shell__actions--mobile-open': mobileActionsOpen
      }"
    >
      <div class="flex h-full flex-col gap-3" :class="actionsCollapsed ? 'justify-start py-3' : 'p-4'">
        <div class="app-shell__actions-header flex items-center gap-3 px-2">
          <button type="button" class="app-shell__toggle" @click="toggleSidebar('actions')">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="3" y="4" width="18" height="16" rx="2.5" />
              <path d="M9 4v16" />
            </svg>
            <span class="sr-only">بستن یا جمع کردن نوار عملیات</span>
          </button>
          <h2 class="app-shell__label-text text-base font-black text-emerald-950">عملیات این صفحه</h2>
        </div>

        <div class="app-shell__actions-search app-shell__label-text">
          <GlobalSearch />
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto scrollbar-hide">
          <div id="app-shell-actions" class="app-shell__actions-content flex w-full flex-col gap-2" />
        </div>

        <div class="app-shell__account app-shell__label-text">
          <button type="button" class="app-shell__account-summary" @click="router.push('/profile')">
            <span class="app-shell__account-avatar" aria-hidden="true">
              <svg class="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"
                  d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.25a7.5 7.5 0 0 1 15 0" />
              </svg>
            </span>
            <span class="min-w-0 text-right">
              <strong class="block truncate text-sm text-emerald-950">{{ displayName }}</strong>
              <small class="text-xs text-emerald-700/70">{{ roleLabel }}</small>
            </span>
          </button>
          <button type="button" class="app-shell__profile-button" @click="router.push('/profile')">پروفایل</button>
          <button type="button" class="app-shell__logout-button" @click="handleLogout">
            <span>خروج</span>
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"
                d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
            </svg>
          </button>
        </div>
      </div>
    </aside>

    <div class="app-shell__mobile-controls lg:hidden">
      <AppIconButton label="باز کردن منوی اصلی" @click="mobileNavOpen = true">
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
      </AppIconButton>
      <AppIconButton label="باز کردن نوار عملیات" @click="mobileActionsOpen = true">
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-width="2" d="M4 7h16M4 12h10M4 17h7" /></svg>
      </AppIconButton>
    </div>

    <main class="app-shell__main scrollbar-hide">
      <div class="app-shell__content">
        <div v-if="contentReady" class="min-w-0">
          <nav v-if="breadcrumbs.length" class="app-shell__breadcrumb" aria-label="مسیر صفحه">
            <template v-for="(item, index) in breadcrumbs" :key="`${item.to}-${index}`">
              <span v-if="index" class="app-shell__breadcrumb-separator" aria-hidden="true">‹</span>
              <button type="button" class="app-shell__breadcrumb-link"
                :class="{ 'app-shell__breadcrumb-link--current': index === breadcrumbs.length - 1 }"
                :aria-current="index === breadcrumbs.length - 1 ? 'page' : undefined"
                @click="navigateTo(item.to)">{{ item.label }}</button>
            </template>
          </nav>
          <slot />
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import GlobalSearch from '../components/GlobalSearch.vue';
import SidebarNavigation from '../components/SidebarNavigation.vue';
import AppIconButton from '../components/ui/AppIconButton.vue';
import { useAuthStore } from '../stores/authStore';

const props = defineProps({
  title: { type: String, default: '' }
});

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const navCollapsed = ref(false);
const actionsCollapsed = ref(false);
const mobileNavOpen = ref(false);
const mobileActionsOpen = ref(false);
const contentReady = ref(false);

const baseNavGroups = [
  { key: 'home', label: 'خانه', to: '/home', icon: ['M3 10.5 12 3l9 7.5', 'M5.25 9.75v10.5h13.5V9.75', 'M9.75 20.25v-6h4.5v6'], items: [] },
  { key: 'profile', label: 'پروفایل من', to: '/profile', icon: ['M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z', 'M4.5 20.25a7.5 7.5 0 0 1 15 0'], items: [] },
  { key: 'lists', label: ' لیست‌ها', to: '/lists', icon: ['M9 12.75 11.25 15 15 9.75', 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z'], items: [] },
  { key: 'customers', label: 'مشتریان', to: '/users', icon: ['M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z'], items: [] },
  { key: 'products', label: 'محصولات', to: '/products', icon: ['m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9'], items: [] },
  { key: 'reports', label: 'آمار', to: '/reports', icon: ['M3 3v18h18', 'M7 16l4-5 3 3 5-7'], items: [] },
  { key: 'admins', label: 'ادمین‌ها', to: '/admins', roles: ['MANAGER'], icon: ['M16.5 10.5V6.75a4.5 4.5 0 0 0-9 0v3.75', 'M6.75 10.5h10.5A2.25 2.25 0 0 1 19.5 12.75v6A2.25 2.25 0 0 1 17.25 21H6.75A2.25 2.25 0 0 1 4.5 18.75v-6a2.25 2.25 0 0 1 2.25-2.25Z'], items: [] },
  { key: 'settings', label: 'تنظیمات', to: '/settings', roles: ['MANAGER'], icon: ['M9.594 3.94c.09-.542.56-.94 1.11-.94h2.592c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.245c.275.476.163 1.079-.26 1.43l-1.003.827c-.293.241-.438.613-.43.992a6.759 6.759 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.245a1.125 1.125 0 0 1-1.369.49l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.245a1.125 1.125 0 0 1 .26-1.43l1.004-.827c.292-.24.437-.613.43-.991a6.93 6.93 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.245a1.125 1.125 0 0 1 1.369-.49l1.217.456c.355.133.75.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.213-1.281Z', 'M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z'], items: [] }
];

const navGroups = computed(() => baseNavGroups.filter((group) => !group.roles || group.roles.includes(authStore.user?.role)));
const openGroups = ref({});
const shellClassNames = computed(() => ({
  'app-shell--nav-collapsed': navCollapsed.value,
  'app-shell--actions-collapsed': actionsCollapsed.value
}));
const displayName = computed(() => authStore.user?.display_name
  || [authStore.user?.first_name, authStore.user?.last_name].filter(Boolean).join(' ')
  || authStore.user?.username
  || 'کاربر سیستم');
const roleLabel = computed(() => authStore.user?.role === 'MANAGER' ? 'مدیر' : 'ادمین');
const breadcrumbs = computed(() => {
  const home = { label: 'خانه', to: '/home' };
  const current = { label: props.title || 'صفحه جاری', to: route.fullPath };
  if (route.path === '/home') return [home];
  if (route.path.startsWith('/customer/')) return [home, { label: 'مشتریان', to: '/users' }, current];
  if (route.path.startsWith('/lists/') && route.path !== '/lists') {
    return [home, { label: 'مدیریت لیست‌ها', to: '/lists' }, current];
  }
  return [home, current];
});

function toggleGroup(key) {
  openGroups.value = { ...openGroups.value, [key]: !openGroups.value[key] };
}

function isMobileViewport() {
  return typeof window !== 'undefined' && window.innerWidth < 1024;
}

function toggleSidebar(sidebar) {
  if (isMobileViewport()) {
    if (sidebar === 'nav') mobileNavOpen.value = !mobileNavOpen.value;
    else mobileActionsOpen.value = !mobileActionsOpen.value;
    return;
  }
  if (sidebar === 'nav') navCollapsed.value = !navCollapsed.value;
  else actionsCollapsed.value = !actionsCollapsed.value;
}

function closeMobilePanels() {
  mobileNavOpen.value = false;
  mobileActionsOpen.value = false;
}

function navigateTo(path) {
  closeMobilePanels();
  if (!path || route.path === path) return;
  router.push(path);
}

async function handleLogout() {
  authStore.logout();
  await router.replace({ name: 'Login' });
}

onMounted(async () => {
  await nextTick();
  contentReady.value = true;
});

watch(() => route.fullPath, async () => {
  closeMobilePanels();
  contentReady.value = false;
  await nextTick();
  contentReady.value = true;
});
</script>
