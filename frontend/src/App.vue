<template>
  <router-view v-slot="{ Component, route: currentRoute }">
    <AppShell
      v-if="currentRoute.meta.requiresAuth && authStore.isAuthenticated"
      :title="currentRoute.meta.title || ''"
      :subtitle="currentRoute.meta.subtitle || ''"
    >
      <component :is="Component" :key="currentRoute.fullPath" />
    </AppShell>
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
