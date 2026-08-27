<template>
  <div class="flex shrink-0 items-center gap-2">
    <button type="button" class="ml-2 hidden rounded-lg px-2 py-1 text-right transition hover:bg-slate-100 xl:block"
      title="مدیریت پروفایل" @click="router.push('/profile')">
      <p class="text-xs font-semibold text-slate-700">{{ authStore.user?.display_name || authStore.user?.username }}</p>
      <p class="text-[11px] text-slate-400">{{ authStore.user?.role === 'MANAGER' ? 'مدیر' : 'ادمین' }}</p>
    </button>
    <AppIconButton class="hidden sm:inline-flex" label="گرفتن بکاپ" variant="warning" :loading="backupLoading"
      @click="handleManualBackup">
      <svg fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-5">
        <path stroke-linecap="round" stroke-linejoin="round"
          d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
      </svg>
    </AppIconButton>
    <AppIconButton label="خروج از حساب" variant="danger" @click="handleLogout">
      <svg fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-5">
        <path stroke-linecap="round" stroke-linejoin="round"
          d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
      </svg>
    </AppIconButton>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import { useAuthStore } from '../stores/authStore';
import { systemService } from '../modules/system/api/system.service';
import AppIconButton from './ui/AppIconButton.vue';

const router = useRouter();
const toast = useToast();
const authStore = useAuthStore();
const backupLoading = ref(false);

async function handleManualBackup() {
  if (backupLoading.value) return;
  backupLoading.value = true;
  try {
    const response = await systemService.createManualBackup();
    const fileName = response?.data?.fileName;
    toast.success(fileName ? `بکاپ با موفقیت گرفته شد ` : 'بکاپ با موفقیت گرفته شد');
  } catch (error) {
    toast.error(error.response?.data?.message || 'خطا در گرفتن بکاپ');
  } finally {
    backupLoading.value = false;
  }
}

async function handleLogout() {
  authStore.logout();
  await router.replace({ name: 'Login' });
}
</script>
