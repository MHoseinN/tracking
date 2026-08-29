<template>
  <div>
    <Teleport to="#app-shell-actions">
      <button type="button" class="app-button-primary w-full" :disabled="loading || saving" @click="openConfirm">
        ذخیره تنظیمات
      </button>
      <button type="button" class="app-button-secondary w-full" :disabled="backupLoading" @click="showBackupConfirm = true">
        {{ backupLoading ? 'در حال تهیه بکاپ...' : 'دریافت فایل بکاپ' }}
      </button>
      <button type="button" class="app-button-secondary w-full" @click="router.push('/home')">بازگشت به خانه</button>
    </Teleport>

    <AppContentState v-if="loading" loading message="در حال دریافت تنظیمات..." />
    <section v-else class="app-panel p-6">
      <h2 class="text-xl font-black text-slate-900">تنظیمات مجموعه و محاسبه فاکتور</h2>

      <div class="mt-6 space-y-6 rounded-lg border border-emerald-200 bg-emerald-50 p-5">
        <label class="block max-w-xl space-y-2">
          <span class="text-sm font-bold text-emerald-950">نام مجموعه</span>
          <input v-model.trim="collectionName" type="text" maxlength="120"
            class="h-12 w-full rounded-lg border border-emerald-200 bg-white px-4 text-base font-bold text-emerald-950"
            placeholder="نام مجموعه برای نمایش روی فاکتور" />
        </label>
        <label class="block max-w-xs space-y-2">
          <span class="text-sm font-bold text-emerald-950">ساعت مرزی</span>
          <input v-model="billingCutoffTime" type="time"
            class="h-12 w-full rounded-lg border border-emerald-200 bg-white px-4 text-lg font-bold text-emerald-950" />
        </label>
      </div>

      <div class="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-5">
        <h3 class="font-black text-amber-950">پشتیبان‌گیری اطلاعات</h3>
        <p class="mt-2 text-sm leading-7 text-amber-800">فایل پشتیبان شامل اطلاعات عملیاتی مجموعه است. پیش از تغییرات مهم یا انتقال سیستم، نسخه جدید تهیه کنید.</p>
        <button type="button" class="app-button-secondary mt-4" :disabled="backupLoading" @click="showBackupConfirm = true">ایجاد نسخه پشتیبان</button>
      </div>
    </section>

    <ConfirmModal :is-open="showConfirm" title="ذخیره تنظیمات مجموعه"
      :message="`نام «${collectionName || 'نامشخص'}» و ساعت مرزی ${billingCutoffTime || 'نامشخص'} ذخیره شوند؟`"
      :loading="saving" confirm-text="بله، ذخیره شود" loading-text="در حال ذخیره..."
      @confirm="saveSettings" @cancel="showConfirm = false" />
    <ConfirmModal :is-open="showBackupConfirm" title="ایجاد نسخه پشتیبان"
      message="از اطلاعات فعلی سیستم یک فایل پشتیبان جدید ساخته شود؟"
      :loading="backupLoading" confirm-text="بله، بکاپ ساخته شود" loading-text="در حال تهیه بکاپ..."
      @confirm="createBackup" @cancel="showBackupConfirm = false" />
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import AppContentState from '../AppContentState.vue';
import ConfirmModal from '../ConfirmModal.vue';
import { settingsService } from '../../modules/settings/api/settings.service';
import { systemService } from '../../modules/system/api/system.service';
import { getApiErrorMessage } from '../../utils/apiError';

const router = useRouter();
const toast = useToast();
const loading = ref(true);
const saving = ref(false);
const showConfirm = ref(false);
const showBackupConfirm = ref(false);
const backupLoading = ref(false);
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

async function createBackup() {
  if (backupLoading.value) return;
  backupLoading.value = true;
  try {
    const response = await systemService.createManualBackup();
    showBackupConfirm.value = false;
    toast.success(response?.data?.fileName ? `فایل پشتیبان ${response.data.fileName} ساخته شد` : 'نسخه پشتیبان ساخته شد');
  } catch (error) {
    toast.error(getApiErrorMessage(error, 'تهیه نسخه پشتیبان انجام نشد'));
  } finally { backupLoading.value = false; }
}
</script>
