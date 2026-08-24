<template>
  <Teleport to="body">
    <div v-if="isOpen" class="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/50 p-4">
      <div class="max-h-[94vh] w-full max-w-7xl overflow-y-auto rounded-lg bg-white shadow-2xl">
        <div class="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-5">
          <div>
            <h2 class="text-xl font-black text-slate-900">ثبت مرجوعی اقلام</h2>
            <p class="mt-1 text-xs text-slate-500">{{ list?.list_number }} — {{ list?.customer_name }}</p>
          </div>
          <button type="button" class="app-icon-button" :disabled="saving" @click="$emit('close')">✕</button>
        </div>

        <form @submit.prevent="submitReturn">
          <div class="space-y-5 p-6">
            <section class="grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 md:grid-cols-3">
              <label class="space-y-2">
                <span class="text-sm font-semibold text-slate-700">تاریخ برگشت</span>
                <JalaliDatePicker v-model="returnedDate" input-class="h-12 bg-white" />
              </label>
              <label class="space-y-2">
                <span class="text-sm font-semibold text-slate-700">ساعت برگشت</span>
                <input v-model="returnedTime" type="time" class="h-12 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm" />
              </label>
              <div class="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-center">
                <p class="text-xs text-indigo-600">روز محاسبه‌شده سیستم</p>
                <p class="mt-2 text-xl font-black text-indigo-800">{{ formatNumber(systemDays) }} روز</p>
                <p class="mt-1 text-[11px] text-indigo-500">ساعت مرزی {{ cutoffTime }}</p>
              </div>
            </section>

            <div class="overflow-x-auto rounded-lg border border-slate-200">
              <table class="w-full min-w-[1250px]">
                <thead class="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th class="px-3 py-3 text-right text-xs font-bold text-slate-500">محصول</th>
                    <th class="px-3 py-3 text-right text-xs font-bold text-slate-500">مانده</th>
                    <th class="px-3 py-3 text-right text-xs font-bold text-slate-500">سالم</th>
                    <th class="px-3 py-3 text-right text-xs font-bold text-slate-500">خسارت</th>
                    <th class="px-3 py-3 text-right text-xs font-bold text-slate-500">مفقودی</th>
                    <th class="px-3 py-3 text-right text-xs font-bold text-slate-500">روز نهایی</th>
                    <th class="px-3 py-3 text-right text-xs font-bold text-slate-500">دلیل تغییر روز</th>
                    <th class="px-3 py-3 text-right text-xs font-bold text-slate-500">شرح خسارت/مفقودی</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in rows" :key="row.delivery_list_item_id" class="border-b border-slate-100 last:border-0">
                    <td class="px-3 py-4 text-sm font-bold text-slate-800">{{ row.product_name_snapshot }}</td>
                    <td class="px-3 py-4 text-sm font-bold text-orange-700">{{ formatNumber(row.remaining_quantity) }}</td>
                    <td class="px-3 py-4"><input v-model.number="row.healthy_quantity" type="number" min="0" :max="row.remaining_quantity" class="h-10 w-20 rounded-lg border border-slate-200 px-2 text-sm" /></td>
                    <td class="px-3 py-4"><input v-model.number="row.damaged_quantity" type="number" min="0" :max="row.remaining_quantity" class="h-10 w-20 rounded-lg border border-slate-200 px-2 text-sm" /></td>
                    <td class="px-3 py-4"><input v-model.number="row.lost_quantity" type="number" min="0" :max="row.remaining_quantity" class="h-10 w-20 rounded-lg border border-slate-200 px-2 text-sm" /></td>
                    <td class="px-3 py-4"><input v-model.number="row.final_charged_days" type="number" min="1" class="h-10 w-20 rounded-lg border border-slate-200 px-2 text-sm" /></td>
                    <td class="px-3 py-4"><input v-model.trim="row.day_override_reason" type="text" maxlength="1000" :disabled="Number(row.final_charged_days) === systemDays" placeholder="در صورت تغییر روز" class="h-10 w-48 rounded-lg border border-slate-200 px-3 text-xs disabled:bg-slate-100" /></td>
                    <td class="px-3 py-4"><input v-model.trim="row.damage_notes" type="text" maxlength="2000" :disabled="!hasIssue(row)" placeholder="برای خسارت یا مفقودی" class="h-10 w-56 rounded-lg border border-slate-200 px-3 text-xs disabled:bg-slate-100" /></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <label class="block space-y-2">
              <span class="text-sm font-semibold text-slate-700">توضیحات این نوبت برگشت</span>
              <textarea v-model.trim="notes" rows="2" maxlength="5000" class="w-full rounded-lg border border-slate-200 p-3 text-sm"></textarea>
            </label>
            <p v-if="errorMessage" class="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{{ errorMessage }}</p>
          </div>

          <div class="sticky bottom-0 flex justify-end gap-3 border-t border-slate-100 bg-white px-6 py-4">
            <button type="button" class="app-button-secondary" :disabled="saving" @click="$emit('close')">انصراف</button>
            <button type="submit" class="app-button-primary bg-emerald-600 hover:bg-emerald-700" :disabled="saving">
              {{ saving ? 'در حال ثبت...' : 'ثبت مرجوعی' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import JalaliDatePicker from '../JalaliDatePicker.vue';
import { calculateBillingDays } from '../../utils/billingDays';
import { getCurrentPersianDate, toGregorianDate } from '../../utils/dateConverter';

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  list: { type: Object, default: null },
  saving: { type: Boolean, default: false }
});
const emit = defineEmits(['close', 'save']);
const returnedDate = ref('');
const returnedTime = ref('');
const notes = ref('');
const rows = ref([]);
const errorMessage = ref('');

const returnedAt = computed(() => combineDateTime(returnedDate.value, returnedTime.value));
const systemDays = computed(() => calculateBillingDays({
  deliveredAt: props.list?.delivered_at,
  returnedAt: returnedAt.value,
  cutoffMinutes: props.list?.billing_cutoff_minutes_snapshot,
  nightBefore: props.list?.night_before
}));
const cutoffTime = computed(() => {
  const minutes = Number(props.list?.billing_cutoff_minutes_snapshot) || 0;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
});

watch(() => props.isOpen, (open) => { if (open) resetForm(); });
watch(systemDays, (days, previousDays) => {
  rows.value.forEach((row) => {
    if (!row.final_charged_days || Number(row.final_charged_days) === Number(previousDays)) {
      row.final_charged_days = days;
    }
  });
});

function resetForm() {
  const now = new Date();
  const today = getCurrentPersianDate();
  returnedDate.value = `${today.year}/${String(today.month).padStart(2, '0')}/${String(today.day).padStart(2, '0')}`;
  returnedTime.value = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  notes.value = '';
  errorMessage.value = '';
  rows.value = (props.list?.items || []).filter((item) => Number(item.remaining_quantity) > 0).map((item) => ({
    delivery_list_item_id: item.id,
    product_name_snapshot: item.product_name_snapshot,
    remaining_quantity: Number(item.remaining_quantity),
    healthy_quantity: 0,
    damaged_quantity: 0,
    lost_quantity: 0,
    final_charged_days: systemDays.value,
    day_override_reason: '',
    damage_notes: ''
  }));
}

function submitReturn() {
  errorMessage.value = '';
  if (!returnedDate.value || !returnedTime.value) return setError('تاریخ و ساعت برگشت الزامی است');
  if (Date.parse(returnedAt.value) < Date.parse(props.list?.delivered_at)) return setError('زمان برگشت نمی‌تواند قبل از زمان تحویل باشد');
  const selectedRows = rows.value.filter((row) => totalReturned(row) > 0);
  if (!selectedRows.length) return setError('حداقل تعداد برگشتی یک قلم را وارد کنید');
  for (const row of selectedRows) {
    if (totalReturned(row) > row.remaining_quantity) return setError(`تعداد «${row.product_name_snapshot}» از مانده بیشتر است`);
    if (hasIssue(row) && !row.damage_notes) return setError(`شرح خسارت یا مفقودی «${row.product_name_snapshot}» را وارد کنید`);
    if (Number(row.final_charged_days) !== systemDays.value && !row.day_override_reason) return setError(`دلیل تغییر تعداد روز «${row.product_name_snapshot}» را وارد کنید`);
  }
  emit('save', {
    returned_at: returnedAt.value,
    notes: notes.value || null,
    items: selectedRows.map((row) => ({
      delivery_list_item_id: row.delivery_list_item_id,
      healthy_quantity: Number(row.healthy_quantity) || 0,
      damaged_quantity: Number(row.damaged_quantity) || 0,
      lost_quantity: Number(row.lost_quantity) || 0,
      final_charged_days: Math.max(1, Math.round(Number(row.final_charged_days) || systemDays.value)),
      day_override_reason: row.day_override_reason || null,
      damage_notes: row.damage_notes || null
    }))
  });
}

function totalReturned(row) { return (Number(row.healthy_quantity) || 0) + (Number(row.damaged_quantity) || 0) + (Number(row.lost_quantity) || 0); }
function hasIssue(row) { return (Number(row.damaged_quantity) || 0) > 0 || (Number(row.lost_quantity) || 0) > 0; }
function setError(message) { errorMessage.value = message; }
function combineDateTime(date, time) {
  if (!date || !time) return null;
  return `${toGregorianDate(date)}T${time}:00+03:30`;
}
function formatNumber(value) { return Number(value || 0).toLocaleString('fa-IR'); }
</script>
