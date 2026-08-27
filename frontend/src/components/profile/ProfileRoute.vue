<template>
  <div class="space-y-6">
    <AppContentState v-if="loading" loading message="در حال دریافت پروفایل..."
      surface-class="border-0 bg-transparent py-24 shadow-none" />

    <template v-else>
      <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article v-for="period in performancePeriods" :key="period.key" class="app-panel p-5">
          <p class="text-sm font-black text-slate-800">{{ period.label }}</p>
          <div class="mt-4 grid grid-cols-2 divide-x divide-x-reverse divide-slate-200 rounded-lg border border-slate-200 bg-slate-50">
            <div class="p-3 text-center"><p class="text-xs text-slate-500">تحویل</p><p class="mt-1 text-xl font-black text-indigo-700">{{ formatNumber(performance[period.key]?.delivered) }}</p></div>
            <div class="p-3 text-center"><p class="text-xs text-slate-500">دریافت</p><p class="mt-1 text-xl font-black text-emerald-700">{{ formatNumber(performance[period.key]?.received) }}</p></div>
          </div>
        </article>
      </section>

      <form class="grid items-start gap-6 xl:grid-cols-2" @submit.prevent="saveProfile">
        <section class="app-panel p-6">
          <h2 class="text-lg font-black text-slate-900">مشخصات حساب</h2>
          <p class="mt-1 text-xs leading-6 text-slate-500">نام و شماره تماس خود را از این بخش مدیریت کنید.</p>
          <div class="mt-6 space-y-4">
            <AppFormField label="نام کاربری"><input :value="profile.username" disabled dir="ltr" class="app-input h-12 bg-slate-100 text-left" /></AppFormField>
            <AppFormField label="نقش"><input :value="profile.role === 'MANAGER' ? 'مدیر' : 'ادمین'" disabled class="app-input h-12 bg-slate-100" /></AppFormField>
            <AppFormField for-id="profile-display-name" label="نام نمایشی" required>
              <template #default="{ controlId }"><input :id="controlId" v-model.trim="form.display_name" maxlength="100" class="app-input h-12" /></template>
            </AppFormField>
            <AppFormField for-id="profile-phone" label="شماره تماس">
              <template #default="{ controlId }"><input :id="controlId" v-model.trim="form.phone" maxlength="50" dir="ltr" class="app-input h-12 text-left" /></template>
            </AppFormField>
          </div>
        </section>

        <section class="app-panel p-6">
          <h2 class="text-lg font-black text-slate-900">تغییر رمز عبور</h2>
          <p class="mt-1 text-xs leading-6 text-slate-500">اگر قصد تغییر رمز را ندارید، این فیلدها را خالی بگذارید.</p>
          <div class="mt-6 space-y-4">
            <AppFormField for-id="profile-current-password" label="رمز عبور فعلی">
              <template #default="{ controlId }"><input :id="controlId" v-model="form.current_password" type="password" maxlength="128" autocomplete="current-password" dir="ltr" class="app-input h-12 text-left" /></template>
            </AppFormField>
            <AppFormField for-id="profile-new-password" label="رمز عبور جدید" :error="passwordError">
              <template #default="{ controlId, describedBy }"><input :id="controlId" v-model="form.new_password" type="password" maxlength="128" autocomplete="new-password" dir="ltr" class="app-input h-12 text-left" :aria-describedby="describedBy" /></template>
            </AppFormField>
            <AppFormField for-id="profile-confirm-password" label="تکرار رمز عبور جدید">
              <template #default="{ controlId }"><input :id="controlId" v-model="form.confirm_password" type="password" maxlength="128" autocomplete="new-password" dir="ltr" class="app-input h-12 text-left" /></template>
            </AppFormField>
          </div>
          <div class="mt-6 flex justify-end"><AppButton type="submit" variant="primary" size="lg" :loading="saving">ذخیره پروفایل</AppButton></div>
        </section>
      </form>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useToast } from 'vue-toastification';
import AppContentState from '../AppContentState.vue';
import AppButton from '../ui/AppButton.vue';
import AppFormField from '../ui/AppFormField.vue';
import { getProfile } from '../../modules/auth/api/auth.service';
import { useAuthStore } from '../../stores/authStore';
import { getApiErrorMessage } from '../../utils/apiError';

const authStore = useAuthStore();
const toast = useToast();
const loading = ref(true);
const saving = ref(false);
const profile = ref({});
const performance = ref({});
const form = reactive({ display_name: '', phone: '', current_password: '', new_password: '', confirm_password: '' });
const performancePeriods = [
  { key: 'day', label: 'عملکرد امروز' }, { key: 'week', label: 'عملکرد این هفته' },
  { key: 'month', label: 'عملکرد این ماه' }, { key: 'year', label: 'عملکرد این سال' }
];
const passwordError = computed(() => {
  if (!form.new_password && !form.confirm_password) return '';
  if (form.new_password.length < 6) return 'رمز جدید باید حداقل ۶ کاراکتر باشد';
  if (form.new_password !== form.confirm_password) return 'تکرار رمز عبور با رمز جدید یکسان نیست';
  if (!form.current_password) return 'برای تغییر رمز، رمز فعلی را وارد کنید';
  return '';
});

function hydrate(data) {
  profile.value = data.user || {};
  performance.value = data.performance || {};
  form.display_name = profile.value.display_name || '';
  form.phone = profile.value.phone || '';
  form.current_password = ''; form.new_password = ''; form.confirm_password = '';
}
async function loadProfile() {
  loading.value = true;
  try { hydrate((await getProfile()).data); }
  catch (error) { toast.error(getApiErrorMessage(error, 'دریافت پروفایل با خطا مواجه شد')); }
  finally { loading.value = false; }
}
async function saveProfile() {
  if (!form.display_name) return toast.error('نام نمایشی را وارد کنید');
  if (passwordError.value) return toast.error(passwordError.value);
  saving.value = true;
  const result = await authStore.updateProfile({
    display_name: form.display_name, phone: form.phone || null,
    current_password: form.current_password || undefined, new_password: form.new_password || undefined
  });
  saving.value = false;
  if (!result.success) return toast.error(result.message);
  hydrate(result.data); toast.success('پروفایل ذخیره شد');
}
function formatNumber(value) { return Math.round(Number(value) || 0).toLocaleString('fa-IR'); }
onMounted(loadProfile);
</script>
