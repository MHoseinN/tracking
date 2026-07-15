<template>
  <div>
    <Teleport defer to="#app-shell-actions">
      <button @click="exportReports"
        class="app-button border border-sky-100 bg-sky-50 text-sky-700 hover:bg-sky-100 focus:ring-sky-100">
        گزارش‌گیری
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      </button>
    </Teleport>
    <AppContentState v-if="loading" loading message="در حال بارگذاری آمار..."
      surface-class="border-0 bg-transparent py-24 shadow-none" text-class="text-gray-500" />

    <div v-else class="space-y-6">
      <div v-if="errorMessage" class="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-4">
        {{ errorMessage }}
      </div>

      <section
        class="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] space-y-6">
        <div class="absolute inset-0 pointer-events-none">
        </div>
        <div class="relative flex flex-wrap items-start justify-between gap-4">
          <div class="space-y-2">
            <div>
              <h2 class="text-3xl font-black text-slate-800">{{ sectionTitle }}</h2>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <div class="min-w-[180px]">
              <CustomSelect :model-value="selectedYear" :options="yearSelectOptions"
                trigger-class="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm shadow-sm transition hover:border-slate-300 hover:shadow-md"
                @update:model-value="selectedYear = $event" />
            </div>
          </div>
        </div>

        <div class="relative grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <AppStatCard v-for="card in reportSummaryCards" :key="card.label" :label="card.label" :value="card.value"
            :value-class="card.valueClass" container-class="bg-white/90 shadow-md" />
        </div>

        <div class="relative grid gap-6">
          <div class="grid grid-cols-1 2xl:grid-cols-2 gap-6">
            <div class="rounded-xl border border-slate-200 bg-slate-50 p-5 h-[460px]">
              <div class="mb-4 flex items-center justify-between">
                <h3 class="font-bold text-slate-800">{{ incomeChartTitle }}</h3>
                <span class="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">درآمد</span>
              </div>
              <canvas ref="incomeChartCanvas" class="w-full h-[380px]"></canvas>
            </div>

            <div class="rounded-xl border border-slate-200 bg-slate-50 p-5 h-[460px]">
              <div class="mb-4 flex items-center justify-between">
                <h3 class="font-bold text-slate-800">{{ countChartTitle }}</h3>
                <span class="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">حجم</span>
              </div>
              <canvas ref="countChartCanvas" class="w-full h-[380px]"></canvas>
            </div>
          </div>

          <div class="grid gap-6 xl:grid-cols-[1.1fr_0.9fr] mt-8">
            <div class="overflow-hidden rounded-xl border border-slate-200 bg-white">
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
                      <th class="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase">{{ periodHeader }}
                      </th>
                      <th class="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase">تعداد فاکتورها
                      </th>
                      <th class="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase">درآمد</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="stat in activeRows" :key="stat.period"
                      class="border-b border-slate-100 hover:bg-slate-50">
                      <td class="px-6 py-4 text-sm font-medium text-slate-700">{{ formatPeriodLabel(stat.period,
                        displayMode) }}</td>
                      <td class="px-6 py-4 text-sm text-slate-600">{{ formatNumber(stat.invoice_count) }}</td>
                      <td class="px-6 py-4 text-sm text-slate-600">{{ formatNumber(stat.total_income) }}</td>
                    </tr>
                    <tr v-if="!activeRows.length">
                      <td colspan="3" class="px-6 py-10 text-center text-sm text-slate-400">داده‌ای برای نمایش وجود
                        ندارد</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div class="grid gap-6">
              <div class="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <div class="mb-4 flex items-center justify-between">
                  <h3 class="text-base font-bold text-slate-800">وضعیت عملیاتی</h3>
                  <span class="text-xs text-slate-500">ارسال و تسویه</span>
                </div>
                <div class="space-y-3">
                  <div v-for="item in operationalStatusRows" :key="item.label" class="rounded-xl bg-white px-4 py-3">
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

              <div class="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <div class="mb-4 flex items-center justify-between">
                  <h3 class="text-base font-bold text-slate-800">برترین مشتری‌ها</h3>
                  <span class="text-xs text-slate-500">بر اساس مبلغ فاکتور</span>
                </div>
                <div v-if="topCustomers.length" class="space-y-3">
                  <div v-for="customer in topCustomers" :key="customer.name"
                    class="flex items-center justify-between rounded-xl bg-white px-4 py-3">
                    <div>
                      <p class="font-semibold text-slate-800">{{ customer.name }}</p>
                      <p class="text-xs text-slate-500">{{ formatNumber(customer.invoiceCount) }} فاکتور</p>
                    </div>
                    <p class="font-bold text-emerald-700">{{ formatNumber(customer.total) }}</p>
                  </div>
                </div>
                <p v-else class="rounded-xl bg-white px-4 py-8 text-center text-sm text-slate-400">داده کافی برای
                  نمایش نیست</p>
              </div>

              <div class="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <div class="mb-4 flex items-center justify-between">
                  <h3 class="text-base font-bold text-slate-800">مرور سریع</h3>
                  <span class="text-xs text-slate-500">خلاصه کاربردی</span>
                </div>
                <div class="space-y-4">
                  <div v-for="item in reportHighlights" :key="item.label" class="rounded-xl bg-white px-4 py-4">
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
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useInvoiceStore } from '../../stores/invoiceStore';
import api from '../../utils/api';
import AppContentState from '../AppContentState.vue';
import AppStatCard from '../AppStatCard.vue';
import CustomSelect from '../CustomSelect.vue';
import { exportRowsToExcel } from '../../utils/exportToExcel';
import Chart from 'chart.js/auto';
import { PERSIAN_MONTHS, toPersianDate } from '../../utils/dateConverter';

const router = useRouter();
const invoiceStore = useInvoiceStore();

const loading = ref(true);
const errorMessage = ref('');
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
const yearSelectOptions = computed(() => ([
  { label: 'همه سال‌ها', value: 'all' },
  ...availableYears.value.map((year) => ({ label: year, value: year }))
]));

const displayMode = computed(() => (selectedYear.value === 'all' ? 'year' : 'month'));
const activeRows = computed(() => (selectedYear.value === 'all' ? annualRows.value : detailRows.value));

const sectionTitle = computed(() =>
  selectedYear.value === 'all' ? 'آمار سالانه' : `آمار سال ${selectedYear.value}`
);

const reportLeadText = computed(() =>
  selectedYear.value === 'all'
    ? 'خلاصه درآمد، تعداد فاکتور، نرخ ارسال و نرخ تسویه برای همه سال‌ها در یک نمای یکپارچه نمایش داده می‌شود.'
    : `در این نما فقط داده‌های سال ${selectedYear.value} دیده می‌شود تا روند ماهانه و عملکرد مشتری‌ها شفاف‌تر بررسی شود.`
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

const reportSummaryCards = computed(() => ([
  {
    label: 'درآمد کل',
    value: formatNumber(activeSummary.value.totalIncome),
    valueClass: 'text-emerald-600',
  },
  {
    label: 'مبلغ تسویه نشده',
    value: formatNumber(advancedSummary.value.unsettledAmount),
    valueClass: 'text-rose-600',
  },
  {
    label: 'تعداد فاکتورها',
    value: formatNumber(activeSummary.value.totalInvoices),
    valueClass: 'text-blue-600',
  },
  {
    label: 'میانگین مبلغ فاکتور',
    value: formatNumber(advancedSummary.value.averageTicket),
    valueClass: 'text-violet-600',
  },
  {
    label: 'بهترین مشتری',
    value: advancedSummary.value.topCustomerName,
    valueClass: 'text-amber-600',
  },


]));

const scopedInvoices = computed(() => {
  if (selectedYear.value === 'all') return invoicesList.value;
  return invoicesList.value.filter((invoice) => {
    try {
      return toPersianDate(invoice.date).startsWith(`${selectedYear.value}/`);
    } catch (error) {
      return false;
    }
  });
});

const advancedSummary = computed(() => {
  const invoices = scopedInvoices.value;
  const totalInvoices = invoices.length || 1;
  const shipped = invoices.filter((invoice) => invoice.is_shipped).length;
  const settled = invoices.filter((invoice) => invoice.is_settled).length;
  const unsettledAmount = invoices
    .filter((invoice) => !invoice.is_settled)
    .reduce((sum, invoice) => sum + (Number(invoice.price) || 0), 0);
  const revenue = invoices.reduce((sum, invoice) => sum + (Number(invoice.price) || 0), 0);
  const grouped = new Map();

  for (const invoice of invoices) {
    const key = invoice.customer_name || 'بدون نام';
    const current = grouped.get(key) || { name: key, total: 0, invoiceCount: 0 };
    current.total += Number(invoice.price) || 0;
    current.invoiceCount += 1;
    grouped.set(key, current);
  }

  const topCustomer = Array.from(grouped.values()).sort((a, b) => b.total - a.total)[0];

  return {
    averageTicket: Math.round(revenue / totalInvoices),
    shippedRate: `${Math.round((shipped / totalInvoices) * 100)}%`,
    settledRate: `${Math.round((settled / totalInvoices) * 100)}%`,
    topCustomerName: topCustomer?.name || 'بدون داده',
    unsettledAmount
  };
});

const topCustomers = computed(() => {
  const grouped = new Map();

  for (const invoice of scopedInvoices.value) {
    const key = invoice.customer_name || 'بدون نام';
    const current = grouped.get(key) || { name: key, total: 0, invoiceCount: 0 };
    current.total += Number(invoice.price) || 0;
    current.invoiceCount += 1;
    grouped.set(key, current);
  }

  return Array.from(grouped.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
});

const operationalStatusRows = computed(() => {
  const invoices = scopedInvoices.value;
  const total = invoices.length || 1;
  const shipped = invoices.filter((invoice) => invoice.is_shipped).length;
  const unshipped = invoices.length - shipped;
  const settled = invoices.filter((invoice) => invoice.is_settled).length;
  const unsettled = invoices.length - settled;

  return [
    {
      label: 'ارسال شده',
      value: `${shipped.toLocaleString('fa-IR')} فاکتور`,
      percent: `${Math.round((shipped / total) * 100)}%`,
      barClass: 'bg-cyan-500',
      valueClass: 'text-cyan-700'
    },
    {
      label: 'ارسال نشده',
      value: `${unshipped.toLocaleString('fa-IR')} فاکتور`,
      percent: `${Math.round((unshipped / total) * 100)}%`,
      barClass: 'bg-rose-500',
      valueClass: 'text-rose-700'
    },
    {
      label: 'تسویه شده',
      value: `${settled.toLocaleString('fa-IR')} فاکتور`,
      percent: `${Math.round((settled / total) * 100)}%`,
      barClass: 'bg-emerald-500',
      valueClass: 'text-emerald-700'
    },
    {
      label: 'تسویه نشده',
      value: `${unsettled.toLocaleString('fa-IR')} فاکتور`,
      percent: `${Math.round((unsettled / total) * 100)}%`,
      barClass: 'bg-amber-500',
      valueClass: 'text-amber-700'
    }
  ];
});

const reportHighlights = computed(() => ([
  {
    label: 'نرخ ارسال',
    value: advancedSummary.value.shippedRate,
    valueClass: 'text-cyan-700'
  },
  {
    label: 'نرخ تسویه',
    value: advancedSummary.value.settledRate,
    valueClass: 'text-emerald-700'
  },
  {
    label: 'میانگین تعداد فاکتور در هر دوره',
    value: `${formatNumber(activeSummary.value.averageInvoices)} فاکتور`,
    valueClass: 'text-slate-800'
  },
  {
    label: 'بازه فعال',
    value: selectedYear.value === 'all' ? 'همه سال‌ها' : `سال ${selectedYear.value}`,
    valueClass: 'text-slate-700'
  }
]));

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
  }

  errorMessage.value = '';

  try {
    await loadAnnualStats();

    if (selectedYear.value !== 'all' && !availableYears.value.includes(String(selectedYear.value))) {
      selectedYear.value = availableYears.value[0] || 'all';
    }

    await loadSelectedYearStats();
    await nextTick();
    destroyCharts();
    renderCharts();
  } catch (err) {
    console.error('Failed to fetch stats:', err);
    errorMessage.value = 'دریافت آمار نمودارها با خطا مواجه شد.';
  } finally {
    loading.value = false;
  }
}

function goBack() {
  router.back();
}

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

watch(selectedYear, async () => {
  if (loading.value) return;

  try {
    await loadSelectedYearStats();
    await nextTick();
    destroyCharts();
    renderCharts();
  } catch (err) {
    console.error('Failed to change selected year:', err);
    errorMessage.value = 'تغییر سال با خطا مواجه شد.';
  }
});

onMounted(async () => {
  await Promise.all([
    invoiceStore.fetchCustomers(),
    invoiceStore.fetchAllInvoices()
  ]);
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
