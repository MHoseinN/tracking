<template>
  <div>
    <Teleport to="#app-shell-actions">
      <button type="button" class="app-button-primary w-full" :disabled="loading || saving" @click="openConfirm">
        ذخیره ساعت مرزی
      </button>
      <button type="button" class="app-button-secondary w-full" @click="router.push('/home')">بازگشت به خانه</button>
    </Teleport>

    <AppContentState v-if="loading" loading message="در حال دریافت تنظیمات..." />
    <section v-else class="app-panel max-w-3xl p-6">
      <h2 class="text-xl font-black text-slate-900">تنظیم ساعت مرزی محاسبه روز</h2>
      <p class="mt-2 text-sm leading-7 text-slate-500">
        برگشت دقیقاً در این ساعت روز اضافه ایجاد نمی‌کند؛ از یک دقیقه بعد، روز جدید محاسبه می‌شود.
      </p>

      <div class="mt-6 rounded-lg border border-indigo-200 bg-indigo-50 p-5">
        <label class="block max-w-xs space-y-2">
          <span class="text-sm font-bold text-indigo-900">ساعت مرزی</span>
          <input v-model="billingCutoffTime" type="time"
            class="h-12 w-full rounded-lg border border-indigo-200 bg-white px-4 text-lg font-bold text-indigo-900" />
        </label>
        <p class="mt-4 text-xs leading-6 text-indigo-700">
          این مقدار فقط هنگام ایجاد لیست جدید در آن لیست ذخیره می‌شود. لیست‌های قبلی با ساعت مرزی زمان ایجاد خودشان محاسبه می‌شوند.
        </p>
      </div>
    </section>

    <ConfirmModal :is-open="showConfirm" title="تغییر ساعت مرزی"
      :message="`ساعت مرزی لیست‌های جدید روی ${billingCutoffTime || 'نامشخص'} تنظیم شود؟`"
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

onMounted(async () => {
  try { billingCutoffTime.value = (await settingsService.getSettings()).data.billing_cutoff_time || '11:00'; }
  catch (error) { toast.error(getApiErrorMessage(error, 'دریافت تنظیمات انجام نشد')); }
  finally { loading.value = false; }
});

function openConfirm() {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(billingCutoffTime.value || '')) {
    return toast.error('ساعت مرزی معتبر وارد کنید');
  }
  showConfirm.value = true;
}

async function saveSettings() {
  if (saving.value) return;
  saving.value = true;
  try {
    const settings = (await settingsService.updateBillingCutoff(billingCutoffTime.value)).data;
    billingCutoffTime.value = settings.billing_cutoff_time;
    showConfirm.value = false;
    toast.success('ساعت مرزی ذخیره شد');
  } catch (error) {
    toast.error(getApiErrorMessage(error, 'ذخیره ساعت مرزی انجام نشد'));
  } finally {
    saving.value = false;
  }
}
</script>
