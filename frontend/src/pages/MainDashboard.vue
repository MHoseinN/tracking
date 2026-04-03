<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white shadow-sm sticky top-0 z-10">
      <div class="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
          </div>
          <div>
            <h1 class="text-xl font-bold text-gray-800">مدیریت فاکتورها</h1>
            <p class="text-xs text-gray-500">صفحه اصلی</p>
          </div>
        </div>

        <!-- User info + logout -->
        <div class="flex items-center gap-3">
          <span class="text-sm text-gray-600 hidden sm:block">
            خوش آمدید، {{ authStore.user?.username }}
          </span>
          <button
            @click="handleLogout"
            class="flex items-center gap-1 text-red-600 hover:text-red-800 text-sm font-medium transition"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
            </svg>
            خروج
          </button>
        </div>
      </div>
    </header>

    <!-- Main content -->
    <main class="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <!-- Controls row -->
      <div class="bg-white rounded-xl shadow p-4 flex flex-wrap items-center justify-between gap-4">
        <!-- Month selector -->
        <MonthSelector @change="handleMonthChange" />

        <!-- Add invoice button -->
        <button
          @click="openAddModal"
          class="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition shadow-sm"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          افزودن فاکتور جدید
        </button>
      </div>

      <!-- Summary stats -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div class="bg-white rounded-xl shadow p-4 text-center">
          <p class="text-2xl font-bold text-blue-600">{{ invoiceStore.currentInvoices.length }}</p>
          <p class="text-sm text-gray-500 mt-1">تعداد فاکتورها</p>
        </div>
        <div class="bg-white rounded-xl shadow p-4 text-center">
          <p class="text-2xl font-bold text-green-600">{{ shippedCount }}</p>
          <p class="text-sm text-gray-500 mt-1">ارسال شده</p>
        </div>
        <div class="bg-white rounded-xl shadow p-4 text-center">
          <p class="text-2xl font-bold text-purple-600">{{ settledCount }}</p>
          <p class="text-sm text-gray-500 mt-1">تسویه شده</p>
        </div>
        <div class="bg-white rounded-xl shadow p-4 text-center">
          <p class="text-lg font-bold text-orange-600">{{ totalPriceFormatted }}</p>
          <p class="text-sm text-gray-500 mt-1">مجموع مبلغ</p>
        </div>
      </div>

      <!-- Invoice table -->
      <div class="bg-white rounded-xl shadow overflow-hidden">
        <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 class="font-semibold text-gray-700">
            فاکتورهای {{ currentMonthLabel }}
          </h2>
          <span class="text-sm text-gray-400">{{ invoiceStore.currentInvoices.length }} فاکتور</span>
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

        <InvoiceTable
          v-else
          :invoices="invoiceStore.currentInvoices"
          :show-customer-column="true"
          :show-actions="true"
          @edit="openEditModal"
          @delete="openDeleteModal"
          @customer-click="navigateToCustomer"
        />
      </div>
    </main>

    <!-- Invoice Form Modal -->
    <InvoiceForm
      :is-open="showInvoiceForm"
      :customer-id="null"
      :invoice-data="selectedInvoice"
      :customers-list="invoiceStore.customers"
      @save="handleSaveInvoice"
      @close="closeInvoiceForm"
    />

    <!-- Confirm Delete Modal -->
    <ConfirmModal
      :is-open="showConfirmDelete"
      title="حذف فاکتور"
      message="آیا از حذف این فاکتور اطمینان دارید؟ این عملیات قابل بازگشت نیست."
      :loading="deleting"
      @confirm="handleDeleteInvoice"
      @cancel="showConfirmDelete = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import { useAuthStore } from '../stores/authStore';
import { useInvoiceStore } from '../stores/invoiceStore';
import { PERSIAN_MONTHS, getCurrentPersianDate } from '../utils/dateConverter';

import MonthSelector from '../components/MonthSelector.vue';
import InvoiceTable from '../components/InvoiceTable.vue';
import InvoiceForm from '../components/InvoiceForm.vue';
import ConfirmModal from '../components/ConfirmModal.vue';

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

// Computed stats
const shippedCount = computed(() =>
  invoiceStore.currentInvoices.filter(i => i.is_shipped).length
);

const settledCount = computed(() =>
  invoiceStore.currentInvoices.filter(i => i.is_settled).length
);

const totalPriceFormatted = computed(() => {
  const total = invoiceStore.currentInvoices.reduce((sum, i) => sum + (i.price || 0), 0);
  return total.toLocaleString('fa-IR') + ' تومان';
});

const currentMonthLabel = computed(() => {
  if (!currentFilter.value.persianMonth) return 'جاری';
  const monthName = PERSIAN_MONTHS[currentFilter.value.persianMonth - 1];
  return `${monthName} ${currentFilter.value.persianYear}`;
});

// Load initial data
onMounted(async () => {
  await invoiceStore.fetchCustomers();
});

// Handle month change from MonthSelector
async function handleMonthChange({ persianYear, persianMonth }) {
  currentFilter.value = { persianYear, persianMonth };
  await loadInvoicesForPersianMonth(persianYear, persianMonth);
}

async function loadInvoicesForPersianMonth(persianYear, persianMonth) {
  // Convert Persian year/month to Gregorian for API
  // We'll pass the Persian year/month and let the backend handle it via date range
  // Actually we pass Gregorian year/month derived from the range
  try {
    // Get the Gregorian dates range for this Persian month
    const { getPersianMonthGregorianRange } = await import('../utils/dateConverter');
    const { startDate, endDate } = getPersianMonthGregorianRange(persianYear, persianMonth);

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
  // Reload invoices for current month
  if (currentFilter.value.persianYear) {
    await loadInvoicesForPersianMonth(currentFilter.value.persianYear, currentFilter.value.persianMonth);
  }
}

// Delete invoice
async function handleDeleteInvoice() {
  if (!deleteTargetId.value) return;

  deleting.value = true;
  const result = await invoiceStore.deleteInvoice(deleteTargetId.value);
  deleting.value = false;

  if (result.success) {
    toast.error('فاکتور با موفقیت حذف شد', { type: 'success' });
    showConfirmDelete.value = false;
    deleteTargetId.value = null;
    // Reload
    if (currentFilter.value.persianYear) {
      await loadInvoicesForPersianMonth(currentFilter.value.persianYear, currentFilter.value.persianMonth);
    }
  } else {
    toast.error(result.message);
  }
}

// Navigate to customer detail page
function navigateToCustomer(customerId) {
  router.push(`/customer/${customerId}`);
}

// Logout
function handleLogout() {
  authStore.logout();
  router.push('/login');
}
</script>
