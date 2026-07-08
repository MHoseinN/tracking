<template>
  <router-view v-slot="{ Component, route: currentRoute }">
    <AppShell
      v-if="currentRoute.meta.requiresAuth && authStore.isAuthenticated"
      :title="currentRoute.meta.title || ''"
      :subtitle="currentRoute.meta.subtitle || ''"
    >
      <component :is="Component" :key="currentRoute.fullPath" />
    </AppShell>
    <div
      v-if="currentRoute.meta.requiresAuth && authStore.isAuthenticated"
      id="app-shell-actions"
      class="app-shell-actions-portal"
    >
      <p class="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-500">
        اکشنی برای این صفحه تعریف نشده است.
      </p>
    </div>
    <component :is="Component" v-else :key="currentRoute.fullPath" />
  </router-view>
</template>

<script setup>
import { onMounted } from 'vue';
import AppShell from './pages/AppShell.vue';
import { useAuthStore } from './stores/authStore';

const authStore = useAuthStore();

onMounted(() => {
  authStore.checkAuth();
});
</script>
