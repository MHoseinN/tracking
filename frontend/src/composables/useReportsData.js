import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { reportService } from '../modules/reports/api/report.service';
import { PERSIAN_MONTHS } from '../utils/dateConverter';

const emptyReport = () => ({
  available_years: [],
  summary: {
    total_invoiced_toman: 0,
    total_paid_toman: 0,
    outstanding_toman: 0,
    credit_toman: 0,
    invoice_count: 0,
    list_count: 0,
    average_invoice_toman: 0
  },
  period_rows: [],
  operational: {
    invoice_send: { NOT_SENT: 0, SENT: 0 },
    settlement: { UNPAID: 0, PARTIAL: 0, PAID: 0 },
    list_status: { DRAFT: 0, DELIVERED: 0, REMAINING: 0, NEEDS_FOLLOW_UP: 0, COMPLETED: 0 }
  },
  top_customers: []
});

export function useReportsData(options = {}) {
  const refreshIntervalSeconds = options.refreshIntervalSeconds || 30;
  const loading = ref(true);
  const errorMessage = ref('');
  const selectedYear = ref('all');
  const report = ref(emptyReport());
  let refreshTimer = null;
  let requestSequence = 0;

  const availableYears = computed(() => (report.value.available_years || []).map(String));
  const yearSelectOptions = computed(() => ([
    { label: 'همه سال‌ها', value: 'all' },
    ...availableYears.value.map((year) => ({ label: year, value: year }))
  ]));
  const displayMode = computed(() => (selectedYear.value === 'all' ? 'year' : 'month'));
  const activeRows = computed(() => report.value.period_rows || []);
  const sectionTitle = computed(() => selectedYear.value === 'all' ? 'آمار سالانه' : `آمار سال ${selectedYear.value}`);
  const incomeChartTitle = computed(() => selectedYear.value === 'all'
    ? 'مبلغ فاکتورهای صادرشده در هر سال'
    : 'مبلغ فاکتورهای صادرشده در هر ماه');
  const countChartTitle = computed(() => selectedYear.value === 'all'
    ? 'تعداد فاکتورها در هر سال'
    : 'تعداد فاکتورها در هر ماه');
  const periodHeader = computed(() => (selectedYear.value === 'all' ? 'سال' : 'ماه'));

  const reportSummaryCards = computed(() => {
    const summary = report.value.summary;
    return [
      { label: 'جمع فاکتورها', value: formatCurrency(summary.total_invoiced_toman), valueClass: 'text-indigo-700' },
      { label: 'مبلغ دریافت‌شده', value: formatCurrency(summary.total_paid_toman), valueClass: 'text-emerald-600' },
      { label: 'مانده قابل دریافت', value: formatCurrency(summary.outstanding_toman), valueClass: 'text-rose-600' },
      { label: 'تعداد فاکتورها', value: formatNumber(summary.invoice_count), valueClass: 'text-blue-600' },
      { label: 'تعداد لیست‌ها', value: formatNumber(summary.list_count), valueClass: 'text-violet-600' },
      { label: 'بهترین مشتری', value: report.value.top_customers?.[0]?.customer_name || '—', valueClass: 'text-sky-700' }
    ];
  });

  const topCustomers = computed(() => (report.value.top_customers || []).map((customer) => ({
    id: customer.customer_id,
    name: customer.customer_name,
    invoiceCount: customer.invoice_count,
    total: customer.total_invoiced_toman
  })));

  const operationalStatusRows = computed(() => {
    const send = report.value.operational.invoice_send;
    const settlement = report.value.operational.settlement;
    const invoiceTotal = Number(report.value.summary.invoice_count) || 0;
    const listTotal = Number(report.value.summary.list_count) || 0;
    return [
      createStatusRow('فاکتور ارسال‌شده', send.SENT, invoiceTotal, 'bg-cyan-500', 'text-cyan-700'),
      createStatusRow('فاکتور ارسال‌نشده', send.NOT_SENT, invoiceTotal, 'bg-rose-500', 'text-rose-700'),
      createStatusRow('تسویه کامل', settlement.PAID, listTotal, 'bg-emerald-500', 'text-emerald-700'),
      createStatusRow('تسویه جزئی', settlement.PARTIAL, listTotal, 'bg-amber-500', 'text-amber-700'),
      createStatusRow('تسویه‌نشده', settlement.UNPAID, listTotal, 'bg-slate-500', 'text-slate-700')
    ];
  });

  const listStatusRows = computed(() => {
    const statuses = report.value.operational.list_status;
    const total = Number(report.value.summary.list_count) || 0;
    return [
      createStatusRow('پیش‌نویس', statuses.DRAFT, total, 'bg-violet-500', 'text-violet-700'),
      createStatusRow('تحویل‌شده', statuses.DELIVERED, total, 'bg-blue-500', 'text-blue-700'),
      createStatusRow('مانده', statuses.REMAINING, total, 'bg-amber-500', 'text-amber-700'),
      createStatusRow('نیاز به پیگیری', statuses.NEEDS_FOLLOW_UP, total, 'bg-rose-500', 'text-rose-700'),
      createStatusRow('تکمیل', statuses.COMPLETED, total, 'bg-emerald-500', 'text-emerald-700')
    ];
  });

  const reportHighlights = computed(() => {
    const summary = report.value.summary;
    const send = report.value.operational.invoice_send;
    const settlement = report.value.operational.settlement;
    const invoiceTotal = Number(summary.invoice_count) || 0;
    const listTotal = Number(summary.list_count) || 0;
    return [
      { label: 'نرخ ارسال فاکتور', value: formatPercent(send.SENT, invoiceTotal), valueClass: 'text-cyan-700' },
      { label: 'نرخ تسویه کامل', value: formatPercent(settlement.PAID, listTotal), valueClass: 'text-emerald-700' },
      { label: 'میانگین مبلغ فاکتور', value: formatCurrency(summary.average_invoice_toman), valueClass: 'text-indigo-700' },
      { label: 'بازه فعال', value: selectedYear.value === 'all' ? 'همه سال‌ها' : `سال ${selectedYear.value}`, valueClass: 'text-slate-700' }
    ];
  });

  async function refreshStats(initialLoad = false) {
    const sequence = ++requestSequence;
    if (initialLoad) loading.value = true;
    errorMessage.value = '';
    try {
      const params = selectedYear.value === 'all' ? {} : { persian_year: selectedYear.value };
      const response = await reportService.getOverview(params);
      if (sequence !== requestSequence) return;
      report.value = response.data || emptyReport();
      if (selectedYear.value !== 'all' && !availableYears.value.includes(String(selectedYear.value))) {
        selectedYear.value = availableYears.value[0] || 'all';
      }
    } catch (_error) {
      if (sequence !== requestSequence) return;
      errorMessage.value = 'دریافت گزارش‌های مدل جدید با خطا مواجه شد.';
    } finally {
      if (sequence === requestSequence) loading.value = false;
    }
  }

  watch(selectedYear, () => refreshStats());
  onMounted(() => {
    refreshStats(true);
    refreshTimer = window.setInterval(() => refreshStats(), refreshIntervalSeconds * 1000);
  });
  onBeforeUnmount(() => {
    if (refreshTimer) window.clearInterval(refreshTimer);
  });

  return {
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
    listStatusRows,
    reportHighlights,
    refreshStats,
    formatNumber,
    formatCurrency,
    formatPeriodLabel
  };
}

function createStatusRow(label, countValue, totalValue, barClass, valueClass) {
  const count = Number(countValue) || 0;
  const total = Number(totalValue) || 0;
  return {
    label,
    value: `${formatNumber(count)} مورد`,
    percent: formatPercent(count, total),
    barClass,
    valueClass
  };
}

function formatPercent(value, total) {
  return `${total > 0 ? Math.round((Number(value || 0) / total) * 100) : 0}%`;
}

function formatNumber(value) {
  return Math.round(Number(value) || 0).toLocaleString('fa-IR');
}

function formatCurrency(value) {
  return `${formatNumber(value)} تومان`;
}

function formatPeriodLabel(period, mode) {
  if (mode === 'year') return `سال ${Number(period).toLocaleString('fa-IR')}`;
  const [year, month] = String(period).split('-');
  return `${PERSIAN_MONTHS[Number(month) - 1] || month} ${Number(year).toLocaleString('fa-IR')}`;
}
