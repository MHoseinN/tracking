import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useInvoiceStore } from '../stores/invoiceStore';
import { PERSIAN_MONTHS, toPersianDate } from '../utils/dateConverter';

export function useReportsData(options = {}) {
  const invoiceStore = useInvoiceStore();
  const refreshIntervalSeconds = options.refreshIntervalSeconds || 30;
  const loading = ref(true);
  const errorMessage = ref('');
  const selectedYear = ref('all');
  const annualRows = ref([]);
  const detailRows = ref([]);
  const invoicesList = ref([]);
  let refreshTimer = null;

  const availableYears = computed(() => {
    const years = new Set();
    invoicesList.value.forEach((invoice) => {
      if (!invoice?.date) return;
      try {
        const year = toPersianDate(invoice.date).split('/')[0];
        if (year) years.add(Number(year));
      } catch (_error) {
        // Ignore malformed invoice dates while keeping the report usable.
      }
    });

    return Array.from(years)
      .sort((left, right) => right - left)
      .map((year) => String(year));
  });

  const yearSelectOptions = computed(() => ([
    { label: 'همه سال‌ها', value: 'all' },
    ...availableYears.value.map((year) => ({ label: year, value: year }))
  ]));
  const displayMode = computed(() => (selectedYear.value === 'all' ? 'year' : 'month'));
  const activeRows = computed(() => (selectedYear.value === 'all' ? annualRows.value : detailRows.value));
  const sectionTitle = computed(() => selectedYear.value === 'all' ? 'آمار سالانه' : `آمار سال ${selectedYear.value}`);
  const incomeChartTitle = computed(() => selectedYear.value === 'all' ? 'درآمد سالانه' : 'درآمد ماهانه در سال انتخاب‌شده');
  const countChartTitle = computed(() => selectedYear.value === 'all'
    ? 'تعداد فاکتورها در سال'
    : 'تعداد فاکتورها در ماه‌های سال انتخاب‌شده');
  const periodHeader = computed(() => (selectedYear.value === 'all' ? 'سال' : 'ماه'));
  const scopedInvoices = computed(() => {
    if (selectedYear.value === 'all') return invoicesList.value;
    return invoicesList.value.filter((invoice) => {
      try {
        return toPersianDate(invoice.date).startsWith(`${selectedYear.value}/`);
      } catch (_error) {
        return false;
      }
    });
  });

  const activeSummary = computed(() => {
    const totalIncome = activeRows.value.reduce((sum, row) => sum + (Number(row.total_income) || 0), 0);
    const totalInvoices = activeRows.value.reduce((sum, row) => sum + (Number(row.invoice_count) || 0), 0);
    const periodCount = activeRows.value.length || 1;
    return {
      totalIncome,
      totalInvoices,
      averageIncome: Math.round(totalIncome / periodCount),
      averageInvoices: Math.round(totalInvoices / periodCount)
    };
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
    const grouped = groupInvoicesByCustomer(invoices);
    const topCustomer = Array.from(grouped.values()).sort((left, right) => right.total - left.total)[0];

    return {
      averageTicket: Math.round(revenue / totalInvoices),
      shippedRate: `${Math.round((shipped / totalInvoices) * 100)}%`,
      settledRate: `${Math.round((settled / totalInvoices) * 100)}%`,
      topCustomerName: topCustomer?.name || 'بدون داده',
      unsettledAmount
    };
  });

  const reportSummaryCards = computed(() => ([
    { label: 'درآمد کل', value: formatNumber(activeSummary.value.totalIncome), valueClass: 'text-emerald-600' },
    { label: 'مبلغ تسویه نشده', value: formatNumber(advancedSummary.value.unsettledAmount), valueClass: 'text-rose-600' },
    { label: 'تعداد فاکتورها', value: formatNumber(activeSummary.value.totalInvoices), valueClass: 'text-blue-600' },
    { label: 'میانگین مبلغ فاکتور', value: formatNumber(advancedSummary.value.averageTicket), valueClass: 'text-violet-600' },
    { label: 'بهترین مشتری', value: advancedSummary.value.topCustomerName, valueClass: 'text-amber-600' }
  ]));

  const topCustomers = computed(() => Array.from(groupInvoicesByCustomer(scopedInvoices.value).values())
    .sort((left, right) => right.total - left.total)
    .slice(0, 5));

  const operationalStatusRows = computed(() => {
    const invoices = scopedInvoices.value;
    const total = invoices.length || 1;
    const shipped = invoices.filter((invoice) => invoice.is_shipped).length;
    const settled = invoices.filter((invoice) => invoice.is_settled).length;
    return [
      createStatusRow('ارسال شده', shipped, total, 'bg-cyan-500', 'text-cyan-700'),
      createStatusRow('ارسال نشده', invoices.length - shipped, total, 'bg-rose-500', 'text-rose-700'),
      createStatusRow('تسویه شده', settled, total, 'bg-emerald-500', 'text-emerald-700'),
      createStatusRow('تسویه نشده', invoices.length - settled, total, 'bg-amber-500', 'text-amber-700')
    ];
  });

  const reportHighlights = computed(() => ([
    { label: 'نرخ ارسال', value: advancedSummary.value.shippedRate, valueClass: 'text-cyan-700' },
    { label: 'نرخ تسویه', value: advancedSummary.value.settledRate, valueClass: 'text-emerald-700' },
    { label: 'میانگین تعداد فاکتور در هر دوره', value: `${formatNumber(activeSummary.value.averageInvoices)} فاکتور`, valueClass: 'text-slate-800' },
    { label: 'بازه فعال', value: selectedYear.value === 'all' ? 'همه سال‌ها' : `سال ${selectedYear.value}`, valueClass: 'text-slate-700' }
  ]));

  async function refreshStats(initialLoad = false) {
    if (initialLoad) loading.value = true;
    errorMessage.value = '';

    try {
      const invoices = await invoiceStore.fetchAllInvoices();
      invoicesList.value = Array.isArray(invoices) ? invoices : [];
      buildAnnualRows();

      if (selectedYear.value !== 'all' && !availableYears.value.includes(String(selectedYear.value))) {
        selectedYear.value = availableYears.value[0] || 'all';
      }
      buildSelectedYearRows();
    } catch (_error) {
      errorMessage.value = 'دریافت آمار نمودارها با خطا مواجه شد.';
    } finally {
      loading.value = false;
    }
  }

  function buildAnnualRows() {
    const grouped = new Map();
    invoicesList.value.forEach((invoice) => {
      if (!invoice?.date) return;
      try {
        const period = toPersianDate(invoice.date).split('/')[0];
        const current = grouped.get(period) || { invoice_count: 0, total_income: 0 };
        current.invoice_count += 1;
        current.total_income += Number(invoice.price) || 0;
        grouped.set(period, current);
      } catch (_error) {
        // Ignore malformed invoice dates.
      }
    });
    annualRows.value = Array.from(grouped.entries())
      .map(([period, data]) => ({ period, ...data }))
      .sort((left, right) => String(right.period).localeCompare(String(left.period)));
  }

  function buildSelectedYearRows() {
    if (selectedYear.value === 'all') {
      detailRows.value = [];
      return;
    }

    const grouped = new Map();
    invoicesList.value.forEach((invoice) => {
      if (!invoice?.date) return;
      try {
        const [year, month] = toPersianDate(invoice.date).split('/');
        if (String(year) !== String(selectedYear.value)) return;
        const period = `${year}-${month}`;
        const current = grouped.get(period) || { invoice_count: 0, total_income: 0 };
        current.invoice_count += 1;
        current.total_income += Number(invoice.price) || 0;
        grouped.set(period, current);
      } catch (_error) {
        // Ignore malformed invoice dates.
      }
    });
    detailRows.value = Array.from(grouped.entries())
      .map(([period, data]) => ({ period, ...data }))
      .sort((left, right) => left.period.localeCompare(right.period));
  }

  watch(selectedYear, () => {
    if (!loading.value) buildSelectedYearRows();
  });

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
    reportHighlights,
    refreshStats,
    formatNumber,
    formatPeriodLabel
  };
}

function groupInvoicesByCustomer(invoices) {
  const grouped = new Map();
  invoices.forEach((invoice) => {
    const name = invoice.customer_name || 'بدون نام';
    const current = grouped.get(name) || { name, total: 0, invoiceCount: 0 };
    current.total += Number(invoice.price) || 0;
    current.invoiceCount += 1;
    grouped.set(name, current);
  });
  return grouped;
}

function createStatusRow(label, count, total, barClass, valueClass) {
  return {
    label,
    value: `${count.toLocaleString('fa-IR')} فاکتور`,
    percent: `${Math.round((count / total) * 100)}%`,
    barClass,
    valueClass
  };
}

function formatNumber(value) {
  return Math.round(Number(value) || 0).toLocaleString('fa-IR');
}

function formatPeriodLabel(period, mode) {
  if (mode === 'year') return `سال ${Number(period).toLocaleString('fa-IR')}`;
  const [year, month] = String(period).split('-');
  return `${PERSIAN_MONTHS[Number(month) - 1] || month} ${Number(year).toLocaleString('fa-IR')}`;
}
