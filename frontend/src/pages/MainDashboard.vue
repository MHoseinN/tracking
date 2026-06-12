<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="max-w-7xl mx-auto bg-white shadow-sm sticky top-4 z-10 rounded-lg">
      <section
        class="relative overflow-visible border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.08)] rounded-lg">
        <div class="absolute inset-0 bg-gradient-to-br from-blue-100 to-emerald-100 pointer-events-none rounded-lg">
        </div>
        <div class="relative p-3 sm:p-5 space-y-5">
          <div class="flex gap-4 items-center justify-between">
            <div
              class="flex flex-wrap items-center gap-2 rounded-3xl border border-slate-200 bg-white/85 p-2 shadow-sm">
              <button @click="navigateToCharts"
                class="inline-flex h-12 items-center gap-2 rounded-2xl border border-violet-200 bg-violet-50 px-4 text-sm font-semibold text-violet-700 transition hover:-translate-y-0.5 hover:bg-violet-100">
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                نمودارها
              </button>
              <button @click="navigateToUsers"
                class="inline-flex h-12 items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-700 transition hover:-translate-y-0.5 hover:bg-emerald-100">
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M17 20h5V4H2v16h5m10 0v-2a4 4 0 00-4-4H11a4 4 0 00-4 4v2m10 0H7m9-9a2 2 0 11-4 0 2 2 0 014 0zm-6 0a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                کاربران
              </button>
            </div>
            <div
              class="flex flex-wrap items-center gap-2 rounded-3xl border border-slate-200 bg-white/85 p-2 shadow-sm">
              <button @click="openAddModal"
                class="inline-flex h-12 items-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:bg-blue-700">
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
                افزودن حساب جدید
              </button>
              <button @click="openAddCustomerModal"
                class="inline-flex h-12 items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-500 px-5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-emerald-600">
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M18 7v3m0 0v3m0-3h3m-3 0h-3M6 20a4 4 0 018 0M10 4a4 4 0 110 8 4 4 0 010-8z" />
                </svg>
                افزودن کاربر
              </button>
            </div>
            <div
              class="flex flex-wrap items-center gap-2 rounded-3xl border border-slate-200 bg-white/85 p-2 shadow-sm">
              <button @click="handleManualBackup" :disabled="backupLoading"
                class="inline-flex h-12 items-center gap-2 rounded-2xl border border-amber-200 bg-amber-200 px-3 text-sm font-semibold text-amber-700 transition hover:bg-amber-300 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60">
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                {{ backupLoading ? 'در حال بکاپ...' : 'بکاپ' }}
              </button>
              <button @click="handleLogout"
                class="inline-flex h-12 items-center gap-2 rounded-2xl border border-amber-200 bg-red-700 px-3 text-sm font-semibold text-white transition hover:bg-red-600 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 ">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                خروج
              </button>
            </div>
          </div>
        </div>
      </section>
    </header>

    <!-- Main content -->
    <main class="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <!-- Invoice table -->
      <div class="bg-white rounded-xl shadow overflow-hidden">
        <div class="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div class="rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-sm">
              <div
                class="grid gap-4 xl:grid-cols-[minmax(280px,1.2fr)_minmax(260px,0.9fr)_minmax(360px,1.2fr)_auto_auto] xl:items-end">
                <div class="space-y-2">
                  <div class="relative">
                    <svg class="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                      fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z" />
                    </svg>
                    <input v-model="searchCustomerName" type="text" placeholder="نام یا نام‌خانوادگی مشتری..."
                      class="h-12 w-full rounded-2xl border border-slate-200 bg-white px-10 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
                  </div>
                </div>

                <div class="space-y-2">
                  <div class="flex h-12 items-center gap-2 rounded-2xl bg-white px-2 focus:ring-blue-100">
                    <JalaliDatePicker v-model="searchDate" />
                    <button @click="clearSearch"
                      class="h-10 shrink-0 rounded-xl bg-slate-100 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-200">
                      -
                    </button>
                  </div>
                </div>
                <div class="space-y-2">
                  <div
                    class="min-h-12 rounded-2xl border border-slate-200 bg-white px-2 py-1 focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-100">
                    <MonthSelector @change="handleMonthChange" />
                  </div>
                </div>
                <button
                  :class="showNotShippedOnly ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/15' : 'bg-sky-50 text-sky-700 border border-sky-200'"
                  @click="toggleNotShippedMain"
                  class="h-12 whitespace-nowrap rounded-2xl px-4 text-sm font-semibold transition hover:-translate-y-0.5">
                  ارسال نشده
                </button>

                <button
                  :class="showUnsettledOnly ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/15' : 'bg-amber-50 text-amber-700 border border-amber-200'"
                  @click="toggleUnsettledMain"
                  class="h-12 whitespace-nowrap rounded-2xl px-4 text-sm font-semibold transition hover:-translate-y-0.5">
                  تسویه‌نشده
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Loading state -->
        <div v-if="invoiceStore.loading" class="flex items-center justify-center py-16">
          <div class="flex flex-col items-center gap-3">
            <svg class="animate-spin h-10 w-10 text-blue-500" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
            <span class="text-gray-500">در حال بارگذاری...</span>
          </div>
        </div>

        <InvoiceTable v-else :invoices="paginatedInvoices" :show-customer-column="true" :show-actions="true"
          @edit="openEditModal" @delete="openDeleteModal" @status-change="handleStatusChange"
          @customer-click="navigateToCustomer" />

        <div v-if="!invoiceStore.loading && totalRows > 0"
          class="px-5 py-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white">
          <div class="flex items-center justify-between gap-8">
            <div>
              <p class="text-sm text-gray-500">
                نمایش
                <span class="font-medium text-gray-700">{{ (rowStartIndex + 1).toLocaleString('fa-IR') }}</span>
                تا
                <span class="font-medium text-gray-700">{{ Math.min(rowStartIndex + pageSize,
                  totalRows).toLocaleString('fa-IR') }}</span>
                از
                <span class="font-medium text-gray-700">{{ totalRows.toLocaleString('fa-IR') }}</span>
              </p>
            </div>

            <div class="flex items-center gap-3">
              <div class="flex items-center gap-2 text-sm text-gray-500">
                <select v-model.number="pageSize"
                  class="border border-gray-300 rounded-md px-2 py-1 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option v-for="size in pageSizeOptions" :key="size" :value="size">{{ size.toLocaleString('fa-IR') }}
                  </option>
                </select>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button @click="goToPage(currentPage - 1)" :disabled="currentPage === 1"
              class="px-3 py-1.5 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
              قبلی
            </button>

            <span class="text-sm text-gray-600">
              صفحه {{ currentPage.toLocaleString('fa-IR') }} از {{ totalPages.toLocaleString('fa-IR') }}
            </span>

            <button @click="goToPage(currentPage + 1)" :disabled="currentPage === totalPages"
              class="px-3 py-1.5 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
              بعدی
            </button>
          </div>
        </div>
      </div>
    </main>

    <!-- Invoice Form Modal -->
    <InvoiceForm :is-open="showInvoiceForm" :customer-id="null" :invoice-data="selectedInvoice"
      :customers-list="invoiceStore.customers" @save="handleSaveInvoice" @close="closeInvoiceForm" />

    <CustomerFormModal :is-open="showCustomerForm" :existing-customers="invoiceStore.customers"
      @close="closeCustomerForm" @saved="handleCustomerSaved" />

    <!-- Confirm Delete Modal -->
    <ConfirmModal :is-open="showConfirmDelete" title="حذف فاکتور"
      message="آیا از حذف این فاکتور اطمینان دارید؟ این عملیات قابل بازگشت نیست." :loading="deleting"
      @confirm="handleDeleteInvoice" @cancel="showConfirmDelete = false" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import { useAuthStore } from '../stores/authStore';
import { useInvoiceStore } from '../stores/invoiceStore';
import { PERSIAN_MONTHS, getPersianMonthGregorianRange, getPersianYearGregorianRange } from '../utils/dateConverter';

import MonthSelector from '../components/MonthSelector.vue';
import InvoiceTable from '../components/InvoiceTable.vue';
import InvoiceForm from '../components/InvoiceForm.vue';
import ConfirmModal from '../components/ConfirmModal.vue';
import JalaliDatePicker from '../components/JalaliDatePicker.vue';
import CustomerFormModal from '../components/CustomerFormModal.vue';
import { toGregorianDate } from '../utils/dateConverter';
import api from '../utils/api';

const router = useRouter();
const toast = useToast();
const authStore = useAuthStore();
const invoiceStore = useInvoiceStore();

// State
const showInvoiceForm = ref(false);
const showCustomerForm = ref(false);
const selectedInvoice = ref(null);
const showConfirmDelete = ref(false);
const deleteTargetId = ref(null);
const deleting = ref(false);
const currentFilter = ref({ persianYear: null, persianMonth: null });
const searchDate = ref('');
const searchCustomerName = ref('');
const showUnsettledOnly = ref(false);
const showNotShippedOnly = ref(false);
const currentPage = ref(1);
const pageSize = ref(15);
const pageSizeOptions = [10, 15, 20, 50, 100];
const backupLoading = ref(false);
let searchDebounceTimer = null;


const displayedInvoices = computed(() => {
  let invoices = invoiceStore.currentInvoices;

  if (showNotShippedOnly.value) {
    invoices = invoices.filter((invoice) => !invoice.is_shipped);
  }

  if (showUnsettledOnly.value) {
    invoices = invoices.filter((invoice) => !invoice.is_settled);
  }

  return invoices;
});

const totalRows = computed(() => displayedInvoices.value.length);
const totalPages = computed(() => Math.max(1, Math.ceil(totalRows.value / pageSize.value)));
const rowStartIndex = computed(() => (currentPage.value - 1) * pageSize.value);
const paginatedInvoices = computed(() =>
  displayedInvoices.value.slice(rowStartIndex.value, rowStartIndex.value + pageSize.value)
);

watch(pageSize, () => {
  currentPage.value = 1;
});

watch([displayedInvoices, totalPages], () => {
  if (currentPage.value > totalPages.value) {
    currentPage.value = totalPages.value;
  }

  if (currentPage.value < 1) {
    currentPage.value = 1;
  }
});

const currentMonthLabel = computed(() => {
  if (!currentFilter.value.persianYear) return 'جاری';
  if (!currentFilter.value.persianMonth) return `همه ماه‌های ${currentFilter.value.persianYear}`;
  const monthName = PERSIAN_MONTHS[currentFilter.value.persianMonth - 1];
  return `${monthName} ${currentFilter.value.persianYear}`;
});

// Load initial data
onMounted(async () => {
  await Promise.all([
    invoiceStore.fetchCustomers(),
    invoiceStore.fetchAllInvoices()
  ]);
});

// Handle month change from MonthSelector
async function handleMonthChange({ persianYear, persianMonth }) {
  currentFilter.value = { persianYear, persianMonth };
  currentPage.value = 1;
  await performSearch({ silentInvalidDate: true });
}

function getPersianPeriodRange(persianYear, persianMonth) {
  return persianMonth
    ? getPersianMonthGregorianRange(persianYear, persianMonth)
    : getPersianYearGregorianRange(persianYear);
}

async function loadInvoicesForPersianPeriod(persianYear, persianMonth) {
  try {
    const { startDate, endDate } = getPersianPeriodRange(persianYear, persianMonth);

    if (startDate && endDate) {
      // Use search API to filter by date range
      await invoiceStore.searchInvoices({
        start_date: startDate,
        end_date: endDate
      });
    } else {
      await invoiceStore.fetchInvoices();
    }
  } catch (err) {
    console.error('Failed to load invoices:', err);
    toast.error('خطا در بارگذاری فاکتورها');
  }
}

async function performSearch(options = {}) {
  const { silentInvalidDate = false } = options;
  currentPage.value = 1;
  const params = {};

  if (searchCustomerName.value.trim()) {
    params.q = searchCustomerName.value.trim();
  }

  if (searchDate.value) {
    const greg = toGregorianDate(searchDate.value);
    if (!greg) {
      if (!silentInvalidDate) {
        toast.error('تاریخ انتخاب شده معتبر نیست');
      }
      return;
    }
    params.start_date = greg;
    params.end_date = greg;
  } else if (currentFilter.value.persianYear) {
    const { startDate, endDate } = getPersianPeriodRange(
      currentFilter.value.persianYear,
      currentFilter.value.persianMonth
    );

    if (startDate && endDate) {
      params.start_date = startDate;
      params.end_date = endDate;
    }
  }

  if (Object.keys(params).length === 0) {
    await invoiceStore.fetchInvoices();
    return;
  }

  try {
    await invoiceStore.searchInvoices(params);
  } catch (err) {
    toast.error('خطا در جستجو');
  }
}

function scheduleRealtimeSearch() {
  currentPage.value = 1;
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer);
  }

  searchDebounceTimer = setTimeout(async () => {
    await performSearch({ silentInvalidDate: true });
  }, 300);
}

async function clearSearch() {
  currentPage.value = 1;
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = null;
  }
  searchCustomerName.value = '';
  searchDate.value = '';
  if (currentFilter.value.persianYear) {
    await loadInvoicesForPersianPeriod(currentFilter.value.persianYear, currentFilter.value.persianMonth);
  } else {
    await invoiceStore.fetchInvoices();
  }
}

// Toggle unsettled-only view on main dashboard (all invoices)
async function toggleUnsettledMain() {
  showUnsettledOnly.value = !showUnsettledOnly.value;
  currentPage.value = 1;
}

// Toggle not-shipped-only view on main dashboard
async function toggleNotShippedMain() {
  showNotShippedOnly.value = !showNotShippedOnly.value;
  currentPage.value = 1;
}

function goToPage(page) {
  if (page < 1 || page > totalPages.value) return;
  currentPage.value = page;
}

// Modal handlers
function openAddModal() {
  selectedInvoice.value = null;
  showInvoiceForm.value = true;
}

function openEditModal(invoice) {
  selectedInvoice.value = invoice;
  showInvoiceForm.value = true;
}

function closeInvoiceForm() {
  showInvoiceForm.value = false;
  selectedInvoice.value = null;
}

function openAddCustomerModal() {
  showCustomerForm.value = true;
}

function closeCustomerForm() {
  showCustomerForm.value = false;
}

async function handleCustomerSaved() {
  await invoiceStore.fetchCustomers();
}

function openDeleteModal(invoiceId) {
  deleteTargetId.value = invoiceId;
  showConfirmDelete.value = true;
}

// Save invoice (add or edit)
async function handleSaveInvoice({ data, isEdit }) {
  let result;

  if (isEdit && selectedInvoice.value) {
    result = await invoiceStore.updateInvoice(selectedInvoice.value.id, data);
    if (result.success) {
      toast.success('فاکتور با موفقیت ویرایش شد');
    } else {
      toast.error(result.message);
      return;
    }
  } else {
    result = await invoiceStore.addInvoice(data);
    if (result.success) {
      toast.success('فاکتور با موفقیت اضافه شد');
    } else {
      toast.error(result.message);
      return;
    }
  }

  closeInvoiceForm();
  await invoiceStore.fetchAllInvoices();
  await performSearch({ silentInvalidDate: true });
}

// Delete invoice
async function handleDeleteInvoice() {
  if (!deleteTargetId.value) return;

  deleting.value = true;
  const result = await invoiceStore.deleteInvoice(deleteTargetId.value);
  deleting.value = false;

  if (result.success) {
    toast.success('فاکتور با موفقیت حذف شد');
    showConfirmDelete.value = false;
    deleteTargetId.value = null;
    await invoiceStore.fetchAllInvoices();
    await performSearch({ silentInvalidDate: true });
  } else {
    toast.error(result.message);
  }
}

async function handleStatusChange() {
  await invoiceStore.fetchAllInvoices();
}

// Navigate to customer detail page
function navigateToCustomer(customerId) {
  router.push(`/customer/${customerId}`);
}

// Navigate to charts page
function navigateToCharts() {
  router.push('/reports');
}

// Navigate to users management page
function navigateToUsers() {
  router.push('/users');
}

async function handleManualBackup() {
  if (backupLoading.value) return;

  backupLoading.value = true;
  try {
    const response = await api.post('/backups/manual');
    const fileName = response?.data?.fileName;
    toast.success(fileName ? `بکاپ با موفقیت گرفته شد: ${fileName}` : 'بکاپ با موفقیت گرفته شد');
  } catch (err) {
    const message = err.response?.data?.message || 'خطا در گرفتن بکاپ';
    toast.error(message);
  } finally {
    backupLoading.value = false;
  }
}

// Logout
function handleLogout() {
  authStore.logout();
  router.push('/login');
}

watch(searchCustomerName, () => {
  scheduleRealtimeSearch();
});

watch(searchDate, () => {
  scheduleRealtimeSearch();
});
</script>
