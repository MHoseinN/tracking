<template>
  <div>
    <Teleport to="#app-shell-actions">
      <button @click="exportReports"
        class="app-button border border-sky-100 bg-sky-50 text-sky-700 hover:bg-sky-100 focus:ring-sky-100">
        گزارش‌گیری
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0-4-4m4 4V4" />
        </svg>
      </button>
    </Teleport>

    <AppContentState v-if="loading" loading message="در حال بارگذاری آمار..."
      surface-class="border-0 bg-transparent py-24 shadow-none" text-class="text-gray-500" />

    <div v-else class="space-y-6">
      <div v-if="errorMessage" class="rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-700">
        {{ errorMessage }}
      </div>

      <section class="relative space-y-6 overflow-hidden rounded-lg border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <div class="relative flex flex-wrap items-start justify-between gap-4">
          <h2 class="text-3xl font-black text-slate-800">{{ sectionTitle }}</h2>
          <div class="min-w-[180px]">
            <CustomSelect :model-value="selectedYear" :options="yearSelectOptions"
              trigger-class="rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm shadow-sm transition hover:border-slate-300 hover:shadow-md"
              @update:model-value="selectedYear = $event" />
          </div>
        </div>

        <div class="relative grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <AppStatCard v-for="card in reportSummaryCards" :key="card.label" :label="card.label" :value="card.value"
            :value-class="card.valueClass" container-class="bg-white/90 shadow-md" />
        </div>

        <div class="relative grid gap-6">
          <div class="grid grid-cols-1 gap-6 2xl:grid-cols-2">
            <ReportChartPanel :title="incomeChartTitle" badge="درآمد" badge-class="bg-emerald-100 text-emerald-700"
              type="bar" :labels="chartSeries.labels" :data="chartSeries.income" color="rgb(34, 197, 94)"
              fill-color="rgba(34, 197, 94, 0.28)" />
            <ReportChartPanel :title="countChartTitle" badge="حجم" badge-class="bg-blue-100 text-blue-700"
              type="line" :labels="chartSeries.labels" :data="chartSeries.counts" color="rgb(59, 130, 246)"
              fill-color="rgba(59, 130, 246, 0.12)" />
          </div>

          <div class="mt-8 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div class="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <div class="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div>
                  <h3 class="text-base font-bold text-slate-800">جدول تحلیل دوره‌ای</h3>
                  <p class="mt-1 text-xs text-slate-500">نمای ریزتر از روند تعداد فاکتورها و درآمد</p>
                </div>
                <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {{ activeRows.length.toLocaleString('fa-IR') }} ردیف
                </span>
              </div>
              <div class="overflow-x-auto">
                <table class="w-full">
                  <thead class="border-b border-slate-100 bg-slate-50">
                    <tr>
                      <th class="px-6 py-3 text-right text-xs font-medium uppercase text-slate-600">{{ periodHeader }}</th>
                      <th class="px-6 py-3 text-right text-xs font-medium uppercase text-slate-600">تعداد فاکتورها</th>
                      <th class="px-6 py-3 text-right text-xs font-medium uppercase text-slate-600">درآمد</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="stat in activeRows" :key="stat.period" class="border-b border-slate-100 hover:bg-slate-50">
                      <td class="px-6 py-4 text-sm font-medium text-slate-700">{{ formatPeriodLabel(stat.period, displayMode) }}</td>
                      <td class="px-6 py-4 text-sm text-slate-600">{{ formatNumber(stat.invoice_count) }}</td>
                      <td class="px-6 py-4 text-sm text-slate-600">{{ formatNumber(stat.total_income) }}</td>
                    </tr>
                    <tr v-if="!activeRows.length">
                      <td colspan="3" class="px-6 py-10 text-center text-sm text-slate-400">داده‌ای برای نمایش وجود ندارد</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div class="grid gap-6">
              <div class="rounded-lg border border-slate-200 bg-slate-50 p-5">
                <div class="mb-4 flex items-center justify-between">
                  <h3 class="text-base font-bold text-slate-800">وضعیت عملیاتی</h3>
                  <span class="text-xs text-slate-500">ارسال و تسویه</span>
                </div>
                <div class="space-y-3">
                  <div v-for="item in operationalStatusRows" :key="item.label" class="rounded-lg bg-white px-4 py-3">
                    <div class="mb-2 flex items-center justify-between">
                      <p class="font-semibold text-slate-700">{{ item.label }}</p>
                      <p class="text-sm font-bold" :class="item.valueClass">{{ item.value }}</p>
                    </div>
                    <div class="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div class="h-full rounded-full" :class="item.barClass" :style="{ width: item.percent }"></div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="rounded-lg border border-slate-200 bg-slate-50 p-5">
                <div class="mb-4 flex items-center justify-between">
                  <h3 class="text-base font-bold text-slate-800">برترین مشتری‌ها</h3>
                  <span class="text-xs text-slate-500">بر اساس مبلغ فاکتور</span>
                </div>
                <div v-if="topCustomers.length" class="space-y-3">
                  <div v-for="customer in topCustomers" :key="customer.name" class="flex items-center justify-between rounded-lg bg-white px-4 py-3">
                    <div>
                      <p class="font-semibold text-slate-800">{{ customer.name }}</p>
                      <p class="text-xs text-slate-500">{{ formatNumber(customer.invoiceCount) }} فاکتور</p>
                    </div>
                    <p class="font-bold text-emerald-700">{{ formatNumber(customer.total) }}</p>
                  </div>
                </div>
                <p v-else class="rounded-lg bg-white px-4 py-8 text-center text-sm text-slate-400">داده کافی برای نمایش نیست</p>
              </div>

              <div class="rounded-lg border border-slate-200 bg-slate-50 p-5">
                <div class="mb-4 flex items-center justify-between">
                  <h3 class="text-base font-bold text-slate-800">مرور سریع</h3>
                  <span class="text-xs text-slate-500">خلاصه کاربردی</span>
                </div>
                <div class="space-y-4">
                  <div v-for="item in reportHighlights" :key="item.label" class="rounded-lg bg-white px-4 py-4">
                    <p class="text-xs text-slate-500">{{ item.label }}</p>
                    <p class="mt-2 text-lg font-bold" :class="item.valueClass">{{ item.value }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import AppContentState from '../AppContentState.vue';
import AppStatCard from '../AppStatCard.vue';
import CustomSelect from '../CustomSelect.vue';
import ReportChartPanel from './ReportChartPanel.vue';
import { exportRowsToExcel } from '../../utils/exportToExcel';
import { useReportsData } from '../../composables/useReportsData';

const {
  loading,
  errorMessage,
  selectedYear,
  yearSelectOptions,
  displayMode,
  activeRows,
  sectionTitle,
  incomeChartTitle,
  countChartTitle,
  periodHeader,
  reportSummaryCards,
  topCustomers,
  operationalStatusRows,
  reportHighlights,
  formatNumber,
  formatPeriodLabel
} = useReportsData();

const chartSeries = computed(() => {
  const rows = [...activeRows.value].sort((left, right) => String(left.period).localeCompare(String(right.period)));
  return {
    labels: rows.map((row) => formatPeriodLabel(row.period, displayMode.value)),
    income: rows.map((row) => Math.round(Number(row.total_income) || 0)),
    counts: rows.map((row) => Number(row.invoice_count) || 0)
  };
});

function exportReports() {
  exportRowsToExcel({
    fileName: selectedYear.value === 'all' ? 'reports-all-years' : `reports-${selectedYear.value}`,
    sheetTitle: sectionTitle.value,
    headers: [periodHeader.value, 'تعداد فاکتور', 'درآمد (تومان)'],
    rows: activeRows.value.map((row) => [
      formatPeriodLabel(row.period, displayMode.value),
      formatNumber(row.invoice_count),
      formatNumber(row.total_income)
    ])
  });
}
</script>
