<template>
  <button v-if="mobileOpen" type="button" class="app-shell__backdrop lg:hidden" aria-label="بستن منوی اصلی"
    @click="$emit('close-mobile')" />
  <aside class="app-shell__nav" :class="{ 'app-shell__nav--mobile-open': mobileOpen }">
    <div class="flex h-full flex-col px-3">
      <div class="border-b border-white/10 py-6">
        <div class="flex items-center gap-3">
          <button type="button" class="app-shell__toggle" @click="$emit('toggle-sidebar', 'nav')">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="16" rx="2.5" />
              <path d="M15 4v16" />
            </svg>
          </button>
          <div class="min-w-0 app-shell__label-block">
            <h1 class="truncate text-lg font-black text-white">موسسه الهدی</h1>
            <p class="mt-1 truncate text-[11px] font-medium text-emerald-100/70">مدیریت هوشمند اجاره‌ها</p>
          </div>
        </div>
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto scrollbar-hide py-2">
        <div v-for="group in navGroups" :key="group.key" class="py-1 last-0">
          <button v-if="!group.items?.length" type="button"
            class="flex w-full rounded-lg text-right transition app-shell__menu-button px-4"
            :class="isGroupActive(group) ? 'app-shell__menu-button--active' : ''"
            :aria-current="isGroupActive(group) ? 'page' : undefined" @click="$emit('navigate', group.to)">
            <span class="flex items-center justify-center gap-2 min-w-0"><span class="app-shell__menu-icon"><svg
                  class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path v-for="(path, index) in group.icon" :key="`${group.key}-${index}`" stroke-linecap="round"
                    stroke-linejoin="round" stroke-width="2" :d="path" />
                </svg></span><span class="truncate text-sm font-semibold app-shell__label-text">{{ group.label
                }}</span></span>
          </button>
          <template v-else>
            <button type="button"
              class="flex w-full items-center justify-between rounded-lg text-right transition app-shell__menu-button px-4"
              :class="isGroupActive(group) ? 'app-shell__menu-button--active' : ''"
              @click="$emit('toggle-group', group.key)">
              <span class="flex items-center gap-2 min-w-0"><span class="app-shell__menu-icon"><svg class="h-5 w-5"
                    fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path v-for="(path, index) in group.icon" :key="`${group.key}-${index}`" stroke-linecap="round"
                      stroke-linejoin="round" stroke-width="2" :d="path" />
                  </svg></span><span class="truncate text-sm font-semibold app-shell__label-text">{{ group.label
                  }}</span></span>
              <span class="text-3xl leading-none app-shell__label-text"><svg
                  class="h-5 w-5 transition-transform duration-300" :class="{ '-rotate-90': openGroups[group.key] }"
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"
                  stroke-linejoin="round">
                  <path d="m15 18-6-6 6-6" />
                </svg></span>
            </button>
            <div v-if="openGroups[group.key]" class="mr-10 py-1 app-shell__submenu">
              <button v-for="item in group.items" :key="item.key" type="button"
                class="flex w-full px-6 items-center justify-between rounded-lg text-right text-sm transition app-shell__menu-button"
                :class="isActiveRoute(item) ? 'app-shell__menu-button--subactive font-bold' : ''"
                @click="$emit('navigate', item.to)"><span class="flex items-center gap-2 min-w-0"><span
                    class="truncate app-shell__label-text">{{ item.label }}</span></span></button>
            </div>
          </template>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { useRoute } from 'vue-router';

defineProps({
  navGroups: { type: Array, required: true },
  openGroups: { type: Object, required: true },
  mobileOpen: { type: Boolean, default: false }
});
defineEmits(['toggle-sidebar', 'toggle-group', 'navigate', 'close-mobile']);
const route = useRoute();

function isActiveRoute(item) {
  if (item.to === '/users' && route.path.startsWith('/customer/')) return true;
  if (item.to === '/lists' && route.path.startsWith('/lists')) return true;
  return route.path === item.to;
}

function isGroupActive(group) {
  if (!group.items?.length && group.to) {
    if (group.to === '/users') return route.path === '/users' || route.path.startsWith('/customer/');
    if (group.to === '/lists') return route.path.startsWith('/lists');
    return route.path === group.to;
  }
  return group.items.some((item) => isActiveRoute(item));
}
</script>
