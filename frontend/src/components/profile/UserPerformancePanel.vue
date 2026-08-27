<template>
  <section class="space-y-4">
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <label class="space-y-1">
        <span class="text-xs font-bold text-slate-600">نوع بازه</span>
        <CustomSelect v-model="filters.mode" :options="modeOptions" trigger-class="app-filter-control" />
      </label>

      <label v-if="filters.mode === 'day'" class="space-y-1">
        <span class="text-xs font-bold text-slate-600">امروز یا تاریخ انتخابی</span>
        <JalaliDatePicker v-model="filters.day" input-class="app-filter-control !h-11" />
      </label>

      <template v-if="filters.mode === 'month'">
        <label class="space-y-1"><span class="text-xs font-bold text-slate-600">ماه</span>
          <CustomSelect v-model="filters.month" :options="monthOptions" trigger-class="app-filter-control" />
        </label>
        <label class="space-y-1"><span class="text-xs font-bold text-slate-600">سال ماه</span>
          <CustomSelect v-model="filters.monthYear" :options="yearOptions" trigger-class="app-filter-control" />
        </label>
      </template>

      <label v-if="filters.mode === 'year'" class="space-y-1">
        <span class="text-xs font-bold text-slate-600">سال</span>
        <CustomSelect v-model="filters.year" :options="yearFilterOptions" trigger-class="app-filter-control" />
      </label>

      <template v-if="filters.mode === 'range'">
        <label class="space-y-1"><span class="text-xs font-bold text-slate-600">از تاریخ</span>
          <JalaliDatePicker v-model="filters.from" input-class="app-filter-control !h-11" />
        </label>
        <label class="space-y-1"><span class="text-xs font-bold text-slate-600">تا تاریخ</span>
          <JalaliDatePicker v-model="filters.to" input-class="app-filter-control !h-11" />
        </label>
      </template>
    </div>

    <p v-if="rangeError" class="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700">
      {{ rangeError }}
    </p>

    <AppDataTable class="performance-table" :column-count="3" :loading="loading" :empty="false"
      min-width="100%" loading-message="در حال محاسبه عملکرد...">
      <template #head><tr><th>بازه نمایش</th><th>تعداد تحویل</th><th>تعداد دریافت</th></tr></template>
      <tr class="app-table-row">
        <td class="font-black text-slate-800">{{ rangeLabel }}</td>
        <td class="text-center text-lg font-black text-indigo-700">{{ formatNumber(performance.delivered) }}</td>
        <td class="text-center text-lg font-black text-emerald-700">{{ formatNumber(performance.received) }}</td>
      </tr>
    </AppDataTable>
    <p class="text-xs leading-6 text-slate-500">با تغییر هر فیلتر، آمار بدون نیاز به دکمه و به‌صورت خودکار به‌روزرسانی می‌شود.</p>
  </section>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue';
import { useToast } from 'vue-toastification';
import CustomSelect from '../CustomSelect.vue';
import JalaliDatePicker from '../JalaliDatePicker.vue';
import AppDataTable from '../ui/AppDataTable.vue';
import { getCurrentPersianDate, PERSIAN_MONTHS } from '../../utils/dateConverter';
import { getApiErrorMessage } from '../../utils/apiError';

const props = defineProps({ fetchPerformance: { type: Function, required: true } });
const toast = useToast();
const today = getCurrentPersianDate();
const todayText = `${today.year}/${String(today.month).padStart(2, '0')}/${String(today.day).padStart(2, '0')}`;
const filters = reactive({
  mode: 'day', day: todayText, month: today.month, monthYear: today.year,
  year: today.year, from: todayText, to: todayText
});
const loading = ref(false);
const performance = ref({ delivered: 0, received: 0 });
const availableYears = ref([String(today.year)]);
let requestSequence = 0;
let timer = null;

const modeOptions = [
  { value: 'day', label: 'روز انتخابی' }, { value: 'month', label: 'ماه انتخابی' },
  { value: 'year', label: 'سال انتخابی / همه سال‌ها' }, { value: 'range', label: 'بازه شروع تا پایان' }
];
const monthOptions = PERSIAN_MONTHS.map((label, index) => ({ value: index + 1, label }));
const yearOptions = computed(() => {
  const years = new Set(availableYears.value.map(String));
  for (let year = today.year; year >= today.year - 15; year -= 1) years.add(String(year));
  return [...years].sort((a, b) => Number(b) - Number(a)).map((year) => ({ value: Number(year), label: year }));
});
const yearFilterOptions = computed(() => [
  { value: 'all', label: 'همه سال‌ها' }, ...yearOptions.value
]);
const rangeError = computed(() => {
  if (filters.mode !== 'range') return '';
  if (!filters.from || !filters.to) return 'تاریخ شروع و پایان را انتخاب کنید.';
  return filters.from.replaceAll('/', '-') > filters.to.replaceAll('/', '-') ? 'تاریخ شروع نباید بعد از تاریخ پایان باشد.' : '';
});
const requestParams = computed(() => {
  if (filters.mode === 'day') return { from: filters.day, to: filters.day };
  if (filters.mode === 'month') {
    const prefix = `${filters.monthYear}/${String(filters.month).padStart(2, '0')}`;
    return { from: `${prefix}/01`, to: `${prefix}/31` };
  }
  if (filters.mode === 'year') {
    return filters.year === 'all' ? {} : { from: `${filters.year}/01/01`, to: `${filters.year}/12/31` };
  }
  return { from: filters.from, to: filters.to };
});
const rangeLabel = computed(() => {
  if (filters.mode === 'day') return filters.day === todayText ? 'امروز' : filters.day;
  if (filters.mode === 'month') return `${PERSIAN_MONTHS[Number(filters.month) - 1]} ${filters.monthYear}`;
  if (filters.mode === 'year') return filters.year === 'all' ? 'همه سال‌ها' : `سال ${filters.year}`;
  return `${filters.from || '—'} تا ${filters.to || '—'}`;
});

async function loadPerformance() {
  if (rangeError.value) return;
  const sequence = ++requestSequence;
  loading.value = true;
  try {
    const response = await props.fetchPerformance(requestParams.value);
    if (sequence !== requestSequence) return;
    performance.value = response.data.performance || { delivered: 0, received: 0 };
    if (response.data.available_years?.length) availableYears.value = response.data.available_years;
  } catch (error) {
    if (sequence === requestSequence) toast.error(getApiErrorMessage(error, 'دریافت آمار عملکرد با خطا مواجه شد'));
  } finally {
    if (sequence === requestSequence) loading.value = false;
  }
}

watch(requestParams, () => {
  clearTimeout(timer);
  if (rangeError.value) {
    requestSequence += 1;
    loading.value = false;
    return;
  }
  timer = setTimeout(loadPerformance, 120);
}, { immediate: true, deep: true });
function formatNumber(value) { return Math.round(Number(value) || 0).toLocaleString('fa-IR'); }
</script>

<style scoped>
.performance-table :deep(.app-table) { width: 100%; table-layout: fixed; }
.performance-table :deep(.app-table-wrapper) { overflow-x: hidden; }
.performance-table :deep(th), .performance-table :deep(td) { width: 33.333%; }
</style>
