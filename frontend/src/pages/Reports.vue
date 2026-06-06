<template>
  <div class="min-h-screen bg-gray-50">
    <header class="bg-white shadow-sm sticky top-0 z-10">
      <div class="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <div>
            <h1 class="text-xl font-bold text-gray-800">نمودارها و آمار</h1>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-3">


          <div class="text-right hidden sm:block">
            <p class="text-xs text-gray-500">آخرین بروزرسانی</p>
            <p class="text-sm font-medium text-gray-500">{{ lastUpdatedLabel }}</p>
          </div>

          <button @click="refreshStats" :disabled="refreshing"
            class="flex items-center gap-1 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-60">
            <svg class="w-4 h-4" :class="refreshing ? 'animate-spin' : ''" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M4 4v5h.582m15.356 2A8 8 0 004.582 9m0 0H9m11 11v-5h-.581m0 0A8.001 8.001 0 004.582 15m15.356 2H15" />
            </svg>
            بروزرسانی
          </button>

          <button @click="goBack"
            class="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
            <span>بازگشت</span>
            <svg class="h-5 w-5 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </header>

    <main class="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <div v-if="loading" class="flex items-center justify-center py-24">
        <div class="flex flex-col items-center gap-3">
          <svg class="animate-spin h-10 w-10 text-blue-500" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
          <span class="text-gray-500">در حال بارگذاری آمار...</span>
        </div>
      </div>

      <div v-else class="space-y-6">
        <div v-if="errorMessage" class="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-4">
          {{ errorMessage }}
        </div>

        <section class="bg-white rounded-xl shadow p-5 space-y-5">

          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 class="text-lg font-semibold text-gray-800">{{ sectionTitle }}</h2>
            </div>
            <div class="min-w-[180px]">
              <select v-model="selectedYear"
                class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="all">همه سال‌ها</option>
                <option v-for="year in availableYears" :key="year" :value="year">{{ year }}</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="bg-gray-50 rounded-xl p-4 text-center">
              <p class="text-2xl font-bold text-green-600">{{ formatNumber(activeSummary.totalIncome) }}</p>
              <p class="text-sm text-gray-500 mt-1">کل درآمد</p>
            </div>
            <div class="bg-gray-50 rounded-xl p-4 text-center">
              <p class="text-2xl font-bold text-blue-600">{{ formatNumber(activeSummary.totalInvoices) }}</p>
              <p class="text-sm text-gray-500 mt-1">کل فاکتورها</p>
            </div>
            <div class="bg-gray-50 rounded-xl p-4 text-center">
              <p class="text-2xl font-bold text-purple-600">{{ formatNumber(activeSummary.averageIncome) }}</p>
              <p class="text-sm text-gray-500 mt-1">میانگین درآمد</p>
            </div>
            <div class="bg-gray-50 rounded-xl p-4 text-center">
              <p class="text-2xl font-bold text-orange-600">{{ formatNumber(activeSummary.averageInvoices) }}</p>
              <p class="text-sm text-gray-500 mt-1">میانگین فاکتور</p>
            </div>
          </div>

          <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div class="bg-gray-50 rounded-xl p-4 h-[360px]">
              <h3 class="font-semibold text-gray-700 mb-3">{{ incomeChartTitle }}</h3>
              <canvas ref="incomeChartCanvas" class="w-full h-[300px]"></canvas>
            </div>

            <div class="bg-gray-50 rounded-xl p-4 h-[360px]">
              <h3 class="font-semibold text-gray-700 mb-3">{{ countChartTitle }}</h3>
              <canvas ref="countChartCanvas" class="w-full h-[300px]"></canvas>
            </div>
          </div>

          <div class="overflow-x-auto rounded-xl border border-gray-100">
            <table class="w-full">
              <thead class="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th class="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">{{ periodHeader }}</th>
                  <th class="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">تعداد فاکتورها</th>
                  <th class="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">درآمد (تومان)</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="stat in activeRows" :key="stat.period" class="border-b border-gray-100 hover:bg-gray-50">
                  <td class="px-6 py-4 text-sm text-gray-700 font-medium">{{ formatPeriodLabel(stat.period, displayMode)
                  }}</td>
                  <td class="px-6 py-4 text-sm text-gray-600">{{ formatNumber(stat.invoice_count) }}</td>
                  <td class="px-6 py-4 text-sm text-gray-600">{{ formatNumber(stat.total_income) }}</td>
                </tr>
                <tr v-if="!activeRows.length">
                  <td colspan="3" class="px-6 py-10 text-center text-sm text-gray-400">داده‌ای برای نمایش وجود ندارد
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/authStore';
import api from '../utils/api';
import Chart from 'chart.js/auto';
import {
  getCurrentPersianDate,
  getPersianYearGregorianRange,
  PERSIAN_MONTHS,
  toPersianDate
} from '../utils/dateConverter';

const router = useRouter();
const authStore = useAuthStore();

const loading = ref(true);
const refreshing = ref(false);
const errorMessage = ref('');
const lastUpdated = ref(null);
const selectedYear = ref('all');

const annualRows = ref([]);
const detailRows = ref([]);
const invoicesList = ref([]);

const incomeChartCanvas = ref(null);
const countChartCanvas = ref(null);

let incomeChart = null;
let countChart = null;
let refreshTimer = null;

const refreshIntervalSeconds = 30;

const availableYears = computed(() => {
  // Extract distinct Persian years from invoice dates (dynamic)
  const set = new Set();
  for (const inv of invoicesList.value || []) {
    if (!inv || !inv.date) continue;
    try {
      const py = toPersianDate(inv.date).split('/')[0];
      if (py) set.add(Number(py));
    } catch (e) {
      // ignore parsing errors
    }
  }

  const arr = Array.from(set).sort((a, b) => b - a);
  return arr.map((y) => String(y));
});

const displayMode = computed(() => (selectedYear.value === 'all' ? 'year' : 'month'));
const activeRows = computed(() => (selectedYear.value === 'all' ? annualRows.value : detailRows.value));

const sectionTitle = computed(() =>
  selectedYear.value === 'all' ? 'آمار سالانه' : `آمار سال ${selectedYear.value}`
);

const sectionSubtitle = computed(() =>
  selectedYear.value === 'all'
    ? 'درآمد و تعداد فاکتورها برای هر سال نمایش داده می‌شود.'
    : 'درآمد و تعداد فاکتورها به تفکیک ماه برای سال انتخاب‌شده نمایش داده می‌شود.'
);

const sectionHint = computed(() =>
  selectedYear.value === 'all'
    ? 'سال مورد نظر را از لیست بالا انتخاب کنید تا جزئیات همان سال نمایش داده شود.'
    : 'برای دیدن مقایسه همه سال‌ها، گزینه همه سال‌ها را انتخاب کنید.'
);

const incomeChartTitle = computed(() =>
  selectedYear.value === 'all' ? 'درآمد سالانه' : 'درآمد ماهانه در سال انتخاب‌شده'
);

const countChartTitle = computed(() =>
  selectedYear.value === 'all' ? 'تعداد فاکتورها در سال' : 'تعداد فاکتورها در ماه‌های سال انتخاب‌شده'
);

const periodHeader = computed(() => (selectedYear.value === 'all' ? 'سال' : 'ماه'));

const activeSummary = computed(() => {
  const totalIncome = activeRows.value.reduce((sum, row) => sum + (Number(row.total_income) || 0), 0);
  const totalInvoices = activeRows.value.reduce((sum, row) => sum + (Number(row.invoice_count) || 0), 0);
  const count = activeRows.value.length || 1;

  return {
    totalIncome,
    totalInvoices,
    averageIncome: Math.round(totalIncome / count),
    averageInvoices: Math.round(totalInvoices / count)
  };
});

const lastUpdatedLabel = computed(() => {
  if (!lastUpdated.value) return 'هنوز بروزرسانی نشده';
  return lastUpdated.value.toLocaleTimeString('fa-IR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
});

function formatNumber(value) {
  return Math.round(Number(value) || 0).toLocaleString('fa-IR');
}

function formatPeriodLabel(period, mode) {
  if (mode === 'year') {
    // period may already be a Persian year string (we compute annualRows per Persian year)
    const py = String(period);
    return `سال ${Number(py).toLocaleString('fa-IR')}`;
  }

  // period is already Persian YYYY-MM; render directly as Persian month + year.
  const [py, pm] = String(period).split('-');
  const monthIndex = Number(pm) - 1;
  const monthName = PERSIAN_MONTHS[monthIndex] || pm;
  return `${monthName} ${Number(py).toLocaleString('fa-IR')}`;
}

function buildSeries(rows, mode) {
  const sorted = [...rows].sort((a, b) => String(a.period).localeCompare(String(b.period)));
  return {
    labels: sorted.map((row) => formatPeriodLabel(row.period, mode)),
    income: sorted.map((row) => Math.round(Number(row.total_income) || 0)),
    counts: sorted.map((row) => Number(row.invoice_count) || 0)
  };
}

function destroyChart(chart) {
  if (chart) chart.destroy();
}
function renderChart(canvasRef, chartInstance, type, labels, data, label, color, fillColor) {
  if (!canvasRef.value) return chartInstance;

  const context = canvasRef.value.getContext('2d');
  destroyChart(chartInstance);

  return new Chart(context, {
    type,
    data: {
      labels,
      datasets: [
        {
          label,
          data,
          borderColor: color,
          backgroundColor: fillColor,
          borderWidth: 2,
          fill: type === 'line',
          tension: 0.35,
          pointRadius: type === 'line' ? 4 : undefined,
          pointBackgroundColor: color,
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          borderRadius: type === 'bar' ? 6 : undefined
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          labels: { usePointStyle: true }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback(value) {
              return formatNumber(value);
            }
          }
        }
      }
    }
  });
}

function renderCharts() {
  const series = buildSeries(activeRows.value, displayMode.value);

  incomeChart = renderChart(
    incomeChartCanvas,
    incomeChart,
    'bar',
    series.labels,
    series.income,
    incomeChartTitle.value,
    'rgb(34, 197, 94)',
    'rgba(34, 197, 94, 0.28)'
  );

  countChart = renderChart(
    countChartCanvas,
    countChart,
    'line',
    series.labels,
    series.counts,
    countChartTitle.value,
    'rgb(59, 130, 246)',
    'rgba(59, 130, 246, 0.12)'
  );
}

function destroyCharts() {
  destroyChart(incomeChart);
  destroyChart(countChart);
  incomeChart = null;
  countChart = null;
}

async function loadAnnualStats() {
  // Fetch all invoices (used to compute available Persian years and aggregates)
  try {
    const invResp = await api.get('/invoices');
    invoicesList.value = Array.isArray(invResp.data) ? invResp.data : invResp.data || [];
  } catch (e) {
    invoicesList.value = [];
  }

  // Aggregate invoices per Persian year locally to avoid boundary issues
  const agg = new Map();
  for (const inv of invoicesList.value) {
    if (!inv || !inv.date) continue;
    try {
      const pd = toPersianDate(inv.date); // YYYY/MM/DD
      const py = pd.split('/')[0];
      const curr = agg.get(py) || { invoice_count: 0, total_income: 0 };
      curr.invoice_count += 1;
      curr.total_income += Number(inv.price) || 0;
      agg.set(py, curr);
    } catch (e) {
      // ignore parse errors
    }
  }

  const results = Array.from(agg.entries()).map(([period, data]) => ({ period, invoice_count: data.invoice_count, total_income: data.total_income }));
  annualRows.value = results.sort((a, b) => String(b.period).localeCompare(String(a.period)));
}

async function loadSelectedYearStats() {
  if (selectedYear.value === 'all') {
    detailRows.value = [];
    return;
  }
  // Aggregate months for selected Persian year locally from invoicesList
  const py = String(selectedYear.value);
  const monthAgg = new Map();

  for (const inv of invoicesList.value) {
    if (!inv || !inv.date) continue;
    try {
      const pd = toPersianDate(inv.date); // YYYY/MM/DD
      const [ipy, ipm] = pd.split('/');
      if (String(ipy) !== py) continue;
      const key = `${ipy}-${ipm}`; // e.g., 1405-01
      const curr = monthAgg.get(key) || { invoice_count: 0, total_income: 0 };
      curr.invoice_count += 1;
      curr.total_income += Number(inv.price) || 0;
      monthAgg.set(key, curr);
    } catch (e) {
      // ignore
    }
  }

  const rows = Array.from(monthAgg.entries()).map(([period, data]) => ({ period, invoice_count: data.invoice_count, total_income: data.total_income }));
  // ensure months sorted by month number
  detailRows.value = rows.sort((a, b) => a.period.localeCompare(b.period));
}

async function refreshStats(initialLoad = false) {
  if (initialLoad) {
    loading.value = true;
  } else {
    refreshing.value = true;
  }

  errorMessage.value = '';

  try {
    await loadAnnualStats();

    if (selectedYear.value !== 'all' && !availableYears.value.includes(String(selectedYear.value))) {
      selectedYear.value = availableYears.value[0] || 'all';
    }

    await loadSelectedYearStats();
    lastUpdated.value = new Date();

    await nextTick();
    destroyCharts();
    renderCharts();
  } catch (err) {
    console.error('Failed to fetch stats:', err);
    errorMessage.value = 'دریافت آمار نمودارها با خطا مواجه شد.';
  } finally {
    loading.value = false;
    refreshing.value = false;
  }
}

function goBack() {
  router.back();
}

function handleLogout() {
  authStore.logout();
  router.push('/login');
}

watch(selectedYear, async () => {
  if (loading.value) return;
  refreshing.value = true;

  try {
    await loadSelectedYearStats();
    await nextTick();
    destroyCharts();
    renderCharts();
  } catch (err) {
    console.error('Failed to change selected year:', err);
    errorMessage.value = 'تغییر سال با خطا مواجه شد.';
  } finally {
    refreshing.value = false;
  }
});

onMounted(() => {
  refreshStats(true);
  refreshTimer = window.setInterval(() => {
    refreshStats(false);
  }, refreshIntervalSeconds * 1000);
});

onBeforeUnmount(() => {
  if (refreshTimer) {
    window.clearInterval(refreshTimer);
  }

  destroyCharts();
});
</script>