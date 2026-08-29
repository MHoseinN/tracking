<template>
  <div class="space-y-6">
    <AppContentState v-if="loading" loading message="در حال دریافت پروفایل..."
      surface-class="border-0 bg-transparent py-24 shadow-none" />

    <template v-else>
      <section class="app-panel p-6">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 class="text-lg font-black text-slate-900">مشخصات حساب</h2>
          </div>
          <AppButton variant="secondary" @click="passwordModalOpen = true">تغییر رمز عبور</AppButton>
        </div>

        <form class="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5" @submit.prevent="saveProfile">
          <AppFormField for-id="profile-first-name" label="نام" required>
            <template #default="{ controlId }"><input :id="controlId" v-model.trim="form.first_name" maxlength="50"
                class="app-input h-12" /></template>
          </AppFormField>
          <AppFormField for-id="profile-last-name" label="نام خانوادگی" required>
            <template #default="{ controlId }"><input :id="controlId" v-model.trim="form.last_name" maxlength="70"
                class="app-input h-12" /></template>
          </AppFormField>
          <AppFormField for-id="profile-username" label="نام کاربری" required>
            <template #default="{ controlId }"><input :id="controlId" v-model.trim="form.username" maxlength="50"
                autocomplete="username" dir="ltr" class="app-input h-12 text-left" /></template>
          </AppFormField>
          <AppFormField for-id="profile-phone" label="شماره تماس">
            <template #default="{ controlId }"><input :id="controlId" v-model.trim="form.phone" maxlength="50"
                autocomplete="tel" dir="ltr" class="app-input h-12 text-left" /></template>
          </AppFormField>
          <AppFormField label="نقش"><input :value="profile.role === 'MANAGER' ? 'مدیر' : 'ادمین'" disabled
              class="app-input h-12 bg-slate-100" /></AppFormField>
          <div class="flex items-end md:col-span-2 xl:col-span-3">
            <AppButton type="submit" variant="primary" size="lg" :loading="saving">ذخیره مشخصات</AppButton>
          </div>
        </form>
      </section>

      <section class="app-panel p-6">
        <UserPerformancePanel :fetch-performance="getProfilePerformance" />
      </section>
    </template>
  </div>

  <ChangePasswordModal :is-open="passwordModalOpen" :saving="passwordSaving" @close="passwordModalOpen = false"
    @submit="savePassword" />
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import { useToast } from 'vue-toastification';
import AppContentState from '../AppContentState.vue';
import AppButton from '../ui/AppButton.vue';
import AppFormField from '../ui/AppFormField.vue';
import ChangePasswordModal from './ChangePasswordModal.vue';
import UserPerformancePanel from './UserPerformancePanel.vue';
import { changePassword, getProfile, getProfilePerformance } from '../../modules/auth/api/auth.service';
import { useAuthStore } from '../../stores/authStore';
import { getApiErrorMessage } from '../../utils/apiError';

const authStore = useAuthStore();
const toast = useToast();
const loading = ref(true);
const saving = ref(false);
const passwordSaving = ref(false);
const passwordModalOpen = ref(false);
const profile = ref({});
const form = reactive({ first_name: '', last_name: '', username: '', phone: '' });

function hydrate(data) {
  profile.value = data.user || {};
  form.first_name = profile.value.first_name || '';
  form.last_name = profile.value.last_name || '';
  form.username = profile.value.username || '';
  form.phone = profile.value.phone || '';
}
async function loadProfile() {
  loading.value = true;
  try { hydrate((await getProfile()).data); }
  catch (error) { toast.error(getApiErrorMessage(error, 'دریافت پروفایل با خطا مواجه شد')); }
  finally { loading.value = false; }
}
async function saveProfile() {
  if (!form.first_name || !form.last_name) return toast.error('نام و نام خانوادگی را وارد کنید');
  if (form.username.length < 3) return toast.error('نام کاربری باید حداقل ۳ کاراکتر باشد');
  saving.value = true;
  const result = await authStore.updateProfile({
    first_name: form.first_name,
    last_name: form.last_name,
    username: form.username,
    phone: form.phone || null
  });
  saving.value = false;
  if (!result.success) return toast.error(result.message);
  hydrate(result.data);
  toast.success('مشخصات پروفایل ذخیره شد');
}
async function savePassword(payload) {
  passwordSaving.value = true;
  try {
    await changePassword(payload);
    passwordModalOpen.value = false;
    toast.success('رمز عبور با موفقیت تغییر کرد');
  } catch (error) {
    toast.error(getApiErrorMessage(error, 'تغییر رمز عبور با خطا مواجه شد'));
  } finally { passwordSaving.value = false; }
}
onMounted(loadProfile);
</script>
