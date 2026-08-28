<template>
  <div>
    <Teleport to="#app-shell-actions">
      <button type="button" class="app-button-primary w-full" :disabled="loading || saving" @click="openConfirm">
        ذخیره تنظیمات
      </button>
      <button type="button" class="app-button-secondary w-full" @click="router.push('/home')">بازگشت به خانه</button>
    </Teleport>

    <AppContentState v-if="loading" loading message="در حال دریافت تنظیمات..." />
    <section v-else class="app-panel p-6">
      <h2 class="text-xl font-black text-slate-900">تنظیمات مجموعه و محاسبه فاکتور</h2>

      <div class="mt-6 space-y-6 rounded-lg border border-indigo-200 bg-indigo-50 p-5">
        <label class="block max-w-xl space-y-2">
          <span class="text-sm font-bold text-indigo-900">نام مجموعه</span>
          <input v-model.trim="collectionName" type="text" maxlength="120"
            class="h-12 w-full rounded-lg border border-indigo-200 bg-white px-4 text-base font-bold text-indigo-900"
            placeholder="نام مجموعه برای نمایش روی فاکتور" />
        </label>
        <label class="block max-w-xs space-y-2">
          <span class="text-sm font-bold text-indigo-900">ساعت مرزی</span>
          <input v-model="billingCutoffTime" type="time"
            class="h-12 w-full rounded-lg border border-indigo-200 bg-white px-4 text-lg font-bold text-indigo-900" />
        </label>
      </div>
    </section>

    <ConfirmModal :is-open="showConfirm" title="ذخیره تنظیمات مجموعه"
      :message="`نام «${collectionName || 'نامشخص'}» و ساعت مرزی ${billingCutoffTime || 'نامشخص'} ذخیره شوند؟`"
      :loading="saving" confirm-text="بله، ذخیره شود" loading-text="در حال ذخیره..."
      @confirm="saveSettings" @cancel="showConfirm = false" />
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import AppContentState from '../AppContentState.vue';
import ConfirmModal from '../ConfirmModal.vue';
import { settingsService } from '../../modules/settings/api/settings.service';
import { getApiErrorMessage } from '../../utils/apiError';

const router = useRouter();
const toast = useToast();
const loading = ref(true);
const saving = ref(false);
const showConfirm = ref(false);
const billingCutoffTime = ref('11:00');
const collectionName = ref('');

onMounted(async () => {
  try {
    const settings = (await settingsService.getSettings()).data;
    billingCutoffTime.value = settings.billing_cutoff_time || '11:00';
    collectionName.value = settings.collection_name || '';
  }
  catch (error) { toast.error(getApiErrorMessage(error, 'دریافت تنظیمات انجام نشد')); }
  finally { loading.value = false; }
});

function openConfirm() {
  if (collectionName.value.length < 2) return toast.error('نام مجموعه را وارد کنید');
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(billingCutoffTime.value || '')) {
    return toast.error('ساعت مرزی معتبر وارد کنید');
  }
  showConfirm.value = true;
}

async function saveSettings() {
  if (saving.value) return;
  saving.value = true;
  try {
    const settings = (await settingsService.updateGeneralSettings({
      collection_name: collectionName.value,
      billing_cutoff_time: billingCutoffTime.value
    })).data;
    collectionName.value = settings.collection_name;
    billingCutoffTime.value = settings.billing_cutoff_time;
    showConfirm.value = false;
    toast.success('تنظیمات مجموعه ذخیره شد');
  } catch (error) {
    toast.error(getApiErrorMessage(error, 'ذخیره تنظیمات انجام نشد'));
  } finally {
    saving.value = false;
  }
}
</script>
