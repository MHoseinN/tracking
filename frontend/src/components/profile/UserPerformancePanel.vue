<template>
  <section class="space-y-4">
    <div class="performance-toolbar">
      <h2 class="shrink-0 text-lg font-black text-slate-900">آمار تحویل و دریافت من</h2>

      <div class="performance-controls">
        <div class="inline-flex shrink-0 rounded-lg border border-slate-200 bg-slate-50 p-1">
          <button v-for="option in viewOptions" :key="option.value" type="button"
            class="rounded-md px-4 py-2 text-sm font-bold transition"
            :class="viewMode === option.value ? 'bg-white text-emerald-800 shadow-sm ring-1 ring-stone-200' : 'text-slate-500 hover:text-emerald-900'"
            @click="viewMode = option.value">{{ option.label }}</button>
        </div>

        <label v-if="viewMode === 'overview'" class="performance-filter-field app-filter-field">
          <span class="app-filter-label">سال آماری</span>
          <CustomSelect v-model="selectedYear" :options="yearOptions" trigger-class="app-filter-control" />
        </label>

        <template v-else>
          <label class="performance-filter-field performance-filter-field--wide app-filter-field"><span
              class="app-filter-label">نوع بازه</span>
            <CustomSelect v-model="filters.mode" :options="modeOptions" trigger-class="app-filter-control" />
          </label>
          <label v-if="filters.mode === 'day'" class="performance-filter-field app-filter-field">
            <span class="app-filter-label">تاریخ</span>
            <JalaliDatePicker v-model="filters.day" input-class="app-filter-control !h-11" />
          </label>
          <template v-if="filters.mode === 'month'">
            <label class="performance-filter-field app-filter-field"><span class="app-filter-label">ماه</span>
              <CustomSelect v-model="filters.month" :options="monthOptions" trigger-class="app-filter-control" />
            </label>
            <label class="performance-filter-field app-filter-field"><span class="app-filter-label">سال ماه</span>
              <CustomSelect v-model="filters.monthYear" :options="yearOptions" trigger-class="app-filter-control" />
            </label>
          </template>
          <label v-if="filters.mode === 'year'" class="performance-filter-field app-filter-field"><span
              class="app-filter-label">سال</span>
            <CustomSelect v-model="filters.year" :options="yearFilterOptions" trigger-class="app-filter-control" />
          </label>
          <template v-if="filters.mode === 'range'">
            <label class="performance-filter-field app-filter-field"><span class="app-filter-label">از تاریخ</span>
              <JalaliDatePicker v-model="filters.from" input-class="app-filter-control !h-11" />
            </label>
            <label class="performance-filter-field app-filter-field"><span class="app-filter-label">تا تاریخ</span>
              <JalaliDatePicker v-model="filters.to" input-class="app-filter-control !h-11" />
            </label>
          </template>
        </template>
      </div>
    </div>

    <p v-if="rangeError" class="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700">
      {{
        rangeError }}</p>

    <AppDataTable class="performance-table" :column-count="3" :loading="loading" :empty="!tableRows.length"
      min-width="100%" loading-message="در حال محاسبه عملکرد..." empty-message="آماری برای این بازه وجود ندارد.">
      <template #head>
        <tr>
          <th>بازه نمایش</th>
          <th>تعداد تحویل</th>
          <th>تعداد دریافت</th>
        </tr>
      </template>
      <tr v-for="row in tableRows" :key="row.key" class="app-table-row">
        <td class="font-black text-slate-800">{{ rowLabel(row) }}</td>
        <td class="text-center font-black text-teal-700">{{ formatNumber(row.delivered) }}</td>
        <td class="text-center font-black text-emerald-700">{{ formatNumber(row.received) }}</td>
      </tr>
    </AppDataTable>
    <p v-if="viewMode === 'custom'" class="text-xs leading-6 text-slate-500">با تغییر هر فیلتر، آمار بدون نیاز به دکمه
      به‌روزرسانی می‌شود.</p>
  </section>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue';
import { useToast } from 'vue-toastification';
import CustomSelect from '../CustomSelect.vue';
import JalaliDatePicker from '../JalaliDatePicker.vue';
import AppDataTable from '../ui/AppDataTable.vue';
import { formatYear, getCurrentPersianDate, PERSIAN_MONTHS } from '../../utils/dateConverter';
import { getApiErrorMessage } from '../../utils/apiError';

const props = defineProps({ fetchPerformance: { type: Function, required: true } });
const toast = useToast();
const today = getCurrentPersianDate();
const todayText = `${today.year}/${String(today.month).padStart(2, '0')}/${String(today.day).padStart(2, '0')}`;
const viewMode = ref('overview');
const selectedYear = ref(today.year);
const filters = reactive({ mode: 'day', day: todayText, month: today.month, monthYear: today.year, year: today.year, from: todayText, to: todayText });
const loading = ref(false);
const overviewRows = ref([]);
const customPerformance = ref({ delivered: 0, received: 0 });
const availableYears = ref([String(today.year)]);
let requestSequence = 0;
let timer = null;

const viewOptions = [{ value: 'overview', label: 'نمای کلی' }, { value: 'custom', label: 'فیلتر دلخواه' }];
const modeOptions = [
  { value: 'day', label: 'روز انتخابی' }, { value: 'month', label: 'ماه انتخابی' },
  { value: 'year', label: 'سال انتخابی / همه سال‌ها' }, { value: 'range', label: 'بازه شروع تا پایان' }
];
const monthOptions = PERSIAN_MONTHS.map((label, index) => ({ value: index + 1, label }));
const yearOptions = computed(() => {
  const years = new Set(availableYears.value.map(String));
  for (let year = today.year; year >= today.year - 15; year -= 1) years.add(String(year));
  return [...years].sort((a, b) => Number(b) - Number(a)).map((year) => ({ value: Number(year), label: formatYear(year) }));
});
const yearFilterOptions = computed(() => [{ value: 'all', label: 'همه سال‌ها' }, ...yearOptions.value]);
const rangeError = computed(() => {
  if (viewMode.value !== 'custom' || filters.mode !== 'range') return '';
  if (!filters.from || !filters.to) return 'تاریخ شروع و پایان را انتخاب کنید.';
  return filters.from.replaceAll('/', '-') > filters.to.replaceAll('/', '-') ? 'تاریخ شروع نباید بعد از تاریخ پایان باشد.' : '';
});
const customRequestParams = computed(() => {
  if (filters.mode === 'day') return { from: filters.day, to: filters.day };
  if (filters.mode === 'month') {
    const prefix = `${filters.monthYear}/${String(filters.month).padStart(2, '0')}`;
    return { from: `${prefix}/01`, to: `${prefix}/31` };
  }
  if (filters.mode === 'year') return filters.year === 'all' ? {} : { from: `${filters.year}/01/01`, to: `${filters.year}/12/31` };
  return { from: filters.from, to: filters.to };
});
const activeRequest = computed(() => viewMode.value === 'overview'
  ? { view: 'overview', year: selectedYear.value }
  : customRequestParams.value);
const customLabel = computed(() => {
  if (filters.mode === 'day') return filters.day === todayText ? 'امروز' : filters.day;
  if (filters.mode === 'month') return `${PERSIAN_MONTHS[Number(filters.month) - 1]} ${formatYear(filters.monthYear)}`;
  if (filters.mode === 'year') return filters.year === 'all' ? 'همه سال‌ها' : `سال ${formatYear(filters.year)}`;
  return `${filters.from || '—'} تا ${filters.to || '—'}`;
});
const tableRows = computed(() => viewMode.value === 'overview'
  ? overviewRows.value
  : [{ key: 'custom', label: customLabel.value, ...customPerformance.value }]);

function rowLabel(row) {
  if (row.label) return row.label;
  if (row.key === 'today') return 'امروز';
  if (row.key === 'yesterday') return 'دیروز';
  if (row.key === 'last_7_days') return '۷ روز اخیر';
  if (row.type === 'month') return `${PERSIAN_MONTHS[Number(row.month) - 1]} ${formatYear(row.year)}`;
  if (row.type === 'year') return `جمع سال ${formatYear(row.year)}`;
  return `${row.from} تا ${row.to}`;
}
async function loadPerformance() {
  if (rangeError.value) return;
  const sequence = ++requestSequence;
  loading.value = true;
  try {
    const response = await props.fetchPerformance(activeRequest.value);
    if (sequence !== requestSequence) return;
    if (viewMode.value === 'overview') overviewRows.value = response.data.rows || [];
    else customPerformance.value = response.data.performance || { delivered: 0, received: 0 };
    if (response.data.available_years?.length) availableYears.value = response.data.available_years;
  } catch (error) {
    if (sequence === requestSequence) toast.error(getApiErrorMessage(error, 'دریافت آمار عملکرد با خطا مواجه شد'));
  } finally {
    if (sequence === requestSequence) loading.value = false;
  }
}
watch(activeRequest, () => {
  clearTimeout(timer);
  if (rangeError.value) { requestSequence += 1; loading.value = false; return; }
  timer = setTimeout(loadPerformance, 120);
}, { immediate: true, deep: true });
function formatNumber(value) { return Math.round(Number(value) || 0).toLocaleString('fa-IR'); }
</script>

<style scoped>
.performance-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.performance-controls {
  display: flex;
  min-width: 0;
  flex: 1 1 auto;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: flex-end;
  gap: .75rem;
}

.performance-filter-field {
  position: relative;
  display: flex;
  width: 11rem;
  flex: 0 0 11rem;
  flex-direction: column;
  padding-top: .4rem;
}

.performance-filter-field > .app-filter-label {
  position: absolute;
  top: 0;
  right: .8rem;
  z-index: 2;
  background: white;
  padding: 0 .35rem;
  color: #475569;
  font-size: .68rem;
  font-weight: 800;
  line-height: .85rem;
}

.performance-filter-field--wide {
  width: 14rem;
  flex-basis: 14rem;
}

@media (min-width: 1280px) {

  .performance-toolbar,
  .performance-controls {
    flex-wrap: nowrap;
  }
}

.performance-table :deep(.app-table) {
  width: 100%;
  table-layout: fixed;
}

.performance-table :deep(.app-table-wrapper) {
  overflow-x: hidden;
}

.performance-table :deep(th),
.performance-table :deep(td) {
  width: 33.333%;
}
</style>
