<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white shadow-sm sticky top-0 z-10">
      <div class="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h1 class="text-xl font-bold text-gray-800">مدیریت حساب‌ها</h1>
            <p class="text-xs text-gray-500">صفحه اصلی</p>
          </div>
        </div>

        <button @click="handleLogout"
          class="flex items-center gap-1 text-red-600 hover:text-red-800 text-sm font-medium transition">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          خروج
        </button>
      </div>
    </header>

    <!-- Main content -->
    <main class="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <!-- Controls row -->
      <div class="bg-white rounded-xl shadow p-4">
        <div class="flex flex-wrap items-end justify-between gap-4 mb-4">
          <!-- Month selector -->
          <MonthSelector @change="handleMonthChange" />

          <!-- Add invoice button -->
          <button @click="openAddModal"
            class="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition shadow-sm">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            افزودن حساب جدید
          </button>

          <!-- Charts button -->
          <button @click="navigateToCharts"
            class="flex items-center gap-2 bg-purple-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-purple-700 transition shadow-sm">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            نمودارها
          </button>

          <button @click="navigateToUsers"
            class="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-emerald-700 transition shadow-sm">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5V4H2v16h5m10 0v-2a4 4 0 00-4-4H11a4 4 0 00-4 4v2m10 0H7m9-9a2 2 0 11-4 0 2 2 0 014 0zm-6 0a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            کاربران
          </button>
        </div>

        <!-- Search row -->
        <div class="flex flex-wrap items-end gap-3">
          <!-- Customer name search -->
          <div class="flex-1 min-w-[200px]">
            <label class="block text-sm font-medium text-gray-700 mb-1">جستجو: نام مشتری</label>
            <input
              v-model="searchCustomerName"
              type="text"
              placeholder="نام یا نام‌خانوادگی مشتری..."
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              @keydown.enter="performSearch"
            />
          </div>

          <!-- Date search -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">جستجو: تاریخ (شمسی)</label>
            <div class="w-48">
              <JalaliDatePicker v-model="searchDate" />
            </div>
          </div>

          <!-- Search and reset buttons -->
          <button @click="performSearch" class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition">جستجو</button>
          <button @click="clearSearch" class="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-300 transition">پاک کردن</button>

          <!-- Unshipped-only button -->
          <button
            :class="showNotShippedOnly ? 'bg-sky-500 text-white' : 'bg-gray-100 text-gray-700'"
            @click="toggleNotShippedMain"
            class="px-4 py-2 rounded-lg text-sm font-medium"
          >
            ارسال نشده
          </button>

          <!-- Unsettled-only button -->
          <button
            :class="showUnsettledOnly ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-700'"
            @click="toggleUnsettledMain"
            class="px-4 py-2 rounded-lg text-sm font-medium"
          >
            تسویه‌نشده
          </button>
        </div>
      </div>

      <!-- Summary stats -->
      <div class="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div class="bg-white rounded-xl shadow p-4 text-center">
          <p class="text-2xl font-bold text-blue-600">{{ totalAccountsCount }}</p>
          <p class="text-sm text-gray-500 mt-1">تعداد حساب‌ها</p>
        </div>
        <div class="bg-white rounded-xl shadow p-4 text-center">
          <p class="text-2xl font-bold text-green-600">{{ shippedCount }}</p>
          <p class="text-sm text-gray-500 mt-1">ارسال شده</p>
        </div>
        <div class="bg-white rounded-xl shadow p-4 text-center">
          <p class="text-2xl font-bold text-purple-600">{{ settledCount }}</p>
          <p class="text-sm text-gray-500 mt-1"> تسویه شده‌</p>
        </div>
        <div class="bg-white rounded-xl shadow p-4 text-center">
          <p class="text-lg font-bold text-green-600">{{ settledAmountFormatted }}</p>
          <p class="text-sm text-gray-500 mt-1"> مبلغ تسویه شده </p>
        </div>
        <div class="bg-white rounded-xl shadow p-4 text-center">
          <p class="text-lg font-bold text-rose-600">{{ remainingAmountFormatted }}</p>
          <p class="text-sm text-gray-500 mt-1"> مبلغ تسویه نشده </p>
        </div>
      </div>

      <!-- Invoice table -->
      <div class="bg-white rounded-xl shadow overflow-hidden">
        <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 class="font-semibold text-gray-700">
            حساب‌های {{ currentMonthLabel }}
          </h2>
          <span class="text-sm text-gray-400">{{ displayedInvoices.length }} حساب</span>
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

        <InvoiceTable v-else :invoices="displayedInvoices" :show-customer-column="true" :show-actions="true"
          @edit="openEditModal" @delete="openDeleteModal" @status-change="handleStatusChange"
          @customer-click="navigateToCustomer" />
      </div>
    </main>

    <!-- Invoice Form Modal -->
    <InvoiceForm :is-open="showInvoiceForm" :customer-id="null" :invoice-data="selectedInvoice"
      :customers-list="invoiceStore.customers" @save="handleSaveInvoice" @close="closeInvoiceForm" />

    <!-- Confirm Delete Modal -->
    <ConfirmModal :is-open="showConfirmDelete" title="حذف فاکتور"
      message="آیا از حذف این فاکتور اطمینان دارید؟ این عملیات قابل بازگشت نیست." :loading="deleting"
      @confirm="handleDeleteInvoice" @cancel="showConfirmDelete = false" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
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
import { toGregorianDate } from '../utils/dateConverter';

const router = useRouter();
const toast = useToast();
const authStore = useAuthStore();
const invoiceStore = useInvoiceStore();

// State
const showInvoiceForm = ref(false);
const selectedInvoice = ref(null);
const showConfirmDelete = ref(false);
const deleteTargetId = ref(null);
const deleting = ref(false);
const currentFilter = ref({ persianYear: null, persianMonth: null });
const searchDate = ref('');
const searchCustomerName = ref('');
const showUnsettledOnly = ref(false);
const showNotShippedOnly = ref(false);

// Computed stats
const totalAccountsCount = computed(() => invoiceStore.allInvoices.length);

const shippedCount = computed(() =>
  invoiceStore.allInvoices.filter(i => i.is_shipped).length
);

const settledCount = computed(() =>
  invoiceStore.allInvoices.filter(i => i.is_settled).length
);

const settledAmount = computed(() =>
  invoiceStore.allInvoices
    .filter(i => i.is_settled)
    .reduce((sum, i) => sum + (Number(i.price) || 0), 0)
);

const remainingAmount = computed(() =>
  invoiceStore.allInvoices
    .filter(i => !i.is_settled)
    .reduce((sum, i) => sum + (Number(i.price) || 0), 0)
);

const settledAmountFormatted = computed(() =>
  settledAmount.value.toLocaleString('fa-IR') + ' تومان'
);

const remainingAmountFormatted = computed(() =>
  remainingAmount.value.toLocaleString('fa-IR') + ' تومان'
);

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
  await loadInvoicesForPersianPeriod(persianYear, persianMonth);
}

async function loadInvoicesForPersianPeriod(persianYear, persianMonth) {
  try {
    const { startDate, endDate } = persianMonth
      ? getPersianMonthGregorianRange(persianYear, persianMonth)
      : getPersianYearGregorianRange(persianYear);

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

async function performSearch() {
  const params = {};

  if (searchCustomerName.value.trim()) {
    params.q = searchCustomerName.value.trim();
  }

  if (searchDate.value) {
    const greg = toGregorianDate(searchDate.value);
    if (!greg) {
      toast.error('تاریخ انتخاب شده معتبر نیست');
      return;
    }
    params.start_date = greg;
    params.end_date = greg;
  }

  // If no search criteria, return to current filter
  if (!searchCustomerName.value.trim() && !searchDate.value) {
    if (currentFilter.value.persianYear) {
      await loadInvoicesForPersianPeriod(currentFilter.value.persianYear, currentFilter.value.persianMonth);
    } else {
      await invoiceStore.fetchInvoices();
    }
    return;
  }

  try {
    await invoiceStore.searchInvoices(params);
  } catch (err) {
    toast.error('خطا در جستجو');
  }
}

async function clearSearch() {
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
}

// Toggle not-shipped-only view on main dashboard
async function toggleNotShippedMain() {
  showNotShippedOnly.value = !showNotShippedOnly.value;
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
  // Reload invoices for current month
  if (currentFilter.value.persianYear) {
    await loadInvoicesForPersianPeriod(currentFilter.value.persianYear, currentFilter.value.persianMonth);
  } else {
    await invoiceStore.fetchInvoices();
  }
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
    // Reload
    if (currentFilter.value.persianYear) {
      await loadInvoicesForPersianPeriod(currentFilter.value.persianYear, currentFilter.value.persianMonth);
    } else {
      await invoiceStore.fetchInvoices();
    }
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

// Logout
function handleLogout() {
  authStore.logout();
  router.push('/login');
}
</script>
