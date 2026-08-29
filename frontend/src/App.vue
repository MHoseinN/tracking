<template>
  <router-view v-slot="{ Component, route: currentRoute }">
    <Login v-if="currentRoute.name === 'Login'" key="login" />
    <AppShell
      v-else-if="currentRoute.meta.requiresAuth && authStore.isAuthenticated"
      :title="currentRoute.meta.title || ''"
    >
      <component :is="Component" :key="currentRoute.fullPath" />
    </AppShell>
    <component v-else-if="!currentRoute.meta.requiresAuth" :is="Component" :key="currentRoute.fullPath" />
    <div v-else class="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">
      در حال انتقال به صفحه ورود...
    </div>
  </router-view>
</template>

<script setup>
import { onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import AppShell from './pages/AppShell.vue';
import Login from './pages/Login.vue';
import { useAuthStore } from './stores/authStore';

const authStore = useAuthStore();
const router = useRouter();

watch(() => authStore.isAuthenticated, (isAuthenticated) => {
  if (!isAuthenticated && router.currentRoute.value.meta.requiresAuth) {
    router.replace({ name: 'Login' });
  }
});

onMounted(() => {
  authStore.checkAuth();
});
</script>
