<template>
  <aside class="app-shell__nav border-l border-gray-200">
    <div class="flex h-full flex-col px-3">
      <div class="py-6">
        <div class="flex items-center gap-3">
          <button type="button" class="app-shell__toggle" @click="$emit('toggle-sidebar', 'nav')">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2.5" /><path d="M15 4v16" /></svg>
          </button>
          <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <svg class="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25V13.5Zm0 2.25h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25V18Zm2.498-6.75h.007v.008h-.007v-.008Zm0 2.25h.007v.008h-.007V13.5Zm0 2.25h.007v.008h-.007v-.008Zm0 2.25h.007v.008h-.007V18Zm2.504-6.75h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V13.5Zm0 2.25h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V18Zm2.498-6.75h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V13.5ZM8.25 6h7.5v2.25h-7.5V6ZM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 0 0 2.25 2.25h10.5a2.25 2.25 0 0 0 2.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0 0 12 2.25Z" /></svg>
          </div>
          <div class="min-w-0 app-shell__label-block"><p class="text-sm font-bold text-gray-500">مدیریت</p><h1 class="truncate text-xl font-black text-slate-900">مدیریت مجموعه</h1></div>
        </div>
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto scrollbar-hide py-2">
        <div v-for="group in navGroups" :key="group.key" class="py-1 last-0">
          <button v-if="!group.items?.length" type="button" class="flex w-full rounded-lg text-right transition app-shell__menu-button px-4"
            :class="isGroupActive(group) ? 'app-shell__menu-button--active text-indigo-700' : 'text-slate-700 hover:bg-slate-50'"
            @click="$emit('navigate', group.to)">
            <span class="flex items-center justify-center gap-2 min-w-0"><span class="app-shell__menu-icon"><svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path v-for="(path, index) in group.icon" :key="`${group.key}-${index}`" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="path" /></svg></span><span class="truncate text-sm font-semibold app-shell__label-text">{{ group.label }}</span></span>
          </button>
          <template v-else>
            <button type="button" class="flex w-full items-center justify-between rounded-lg text-right transition app-shell__menu-button px-4"
              :class="isGroupActive(group) ? 'app-shell__menu-button--active text-indigo-700' : 'text-slate-700 hover:bg-slate-50'"
              @click="$emit('toggle-group', group.key)">
              <span class="flex items-center gap-2 min-w-0"><span class="app-shell__menu-icon"><svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path v-for="(path, index) in group.icon" :key="`${group.key}-${index}`" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="path" /></svg></span><span class="truncate text-sm font-semibold app-shell__label-text">{{ group.label }}</span></span>
              <span class="text-3xl leading-none app-shell__label-text"><svg class="h-5 w-5 transition-transform duration-300" :class="{ '-rotate-90': openGroups[group.key] }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6" /></svg></span>
            </button>
            <div v-if="openGroups[group.key]" class="mr-10 py-1 app-shell__submenu">
              <button v-for="item in group.items" :key="item.key" type="button" class="flex w-full px-6 items-center justify-between rounded-lg text-right text-sm transition app-shell__menu-button"
                :class="isActiveRoute(item) ? 'app-shell__menu-button--subactive font-bold text-blue-700' : 'bg-white text-zinc-700 hover:bg-slate-50 hover:text-blue-700'"
                @click="$emit('navigate', item.to)"><span class="flex items-center gap-2 min-w-0"><span class="truncate app-shell__label-text">{{ item.label }}</span></span></button>
            </div>
          </template>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { useRoute } from 'vue-router';

defineProps({ navGroups: { type: Array, required: true }, openGroups: { type: Object, required: true } });
defineEmits(['toggle-sidebar', 'toggle-group', 'navigate']);
const route = useRoute();

function isActiveRoute(item) {
  if (item.to === '/users' && route.path.startsWith('/customer/')) return true;
  return route.path === item.to;
}

function isGroupActive(group) {
  if (!group.items?.length && group.to) return route.path === group.to;
  return group.items.some((item) => isActiveRoute(item));
}
</script>
