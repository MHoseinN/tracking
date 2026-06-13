<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="max-w-7xl mx-auto bg-white shadow-sm sticky top-2 z-10 rounded-lg">
      <section
        class="relative overflow-visible border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.08)] rounded-lg">
        <div class="absolute inset-0 bg-gradient-to-br from-blue-50 to-emerald-50 pointer-events-none rounded-lg">
        </div>
        <div class="relative p-3 sm:p-5 space-y-5">
          <div class="flex gap-4 items-center justify-between">
            <div
              class="flex flex-wrap items-center gap-2 rounded-3xl border border-slate-200 bg-white/85 p-2 shadow-sm">
              <button @click="navigateToCharts"
                class="inline-flex h-12 items-center gap-2 rounded-2xl border border-violet-200 bg-violet-50 px-4 text-sm font-semibold text-violet-700 transition hover:-translate-y-0.5 hover:bg-violet-100">
                نمودارها
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </button>
              <button @click="navigateToUsers"
                class="inline-flex h-12 items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-700 transition hover:-translate-y-0.5 hover:bg-emerald-100">
                کاربران
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M17 20h5V4H2v16h5m10 0v-2a4 4 0 00-4-4H11a4 4 0 00-4 4v2m10 0H7m9-9a2 2 0 11-4 0 2 2 0 014 0zm-6 0a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </button>
            </div>
            <div
              class="flex flex-wrap items-center gap-2 rounded-3xl border border-slate-200 bg-white/85 p-2 shadow-sm">
              <button @click="openAddModal"
                class="inline-flex h-12 items-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:bg-blue-700">
                افزودن حساب
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
              </button>
              <button @click="openAddCustomerModal"
                class="inline-flex h-12 items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-500 px-5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-emerald-600">
                افزودن کاربر
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M18 7v3m0 0v3m0-3h3m-3 0h-3M6 20a4 4 0 018 0M10 4a4 4 0 110 8 4 4 0 010-8z" />
                </svg>
              </button>
            </div>
            <div
              class="flex flex-wrap items-center gap-2 rounded-3xl border border-slate-200 bg-white/85 p-2 shadow-sm">
              <button @click="handleManualBackup" :disabled="backupLoading"
                class="inline-flex h-12 items-center gap-2 rounded-2xl border border-amber-200 bg-amber-200 px-3 text-sm font-semibold text-amber-700 transition hover:bg-amber-300 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60">
                {{ backupLoading ? 'در حال بکاپ...' : 'بکاپ' }}
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
              <button @click="handleLogout"
                class="inline-flex h-12 items-center gap-2 rounded-2xl border border-amber-200 bg-red-700 px-3 text-sm font-semibold text-white transition hover:bg-red-600 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 ">
                خروج
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
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
        <div class="px-4 py-4 flex flex-wrap items-center justify-center gap-3">
          <div>
            <div class="rounded-3xl bg-white/95">
              <InvoiceSearchBar :text-model-value="searchCustomerName" :date-model-value="searchDate"
                :filter-model-value="statusFilter" text-placeholder="نام یا نام‌خانوادگی مشتری..."
                @update:text-model-value="searchCustomerName = $event" @update:date-model-value="searchDate = $event"
                @update:filter-model-value="statusFilter = $event" @clear="clearSearch" />
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

import InvoiceTable from '../components/InvoiceTable.vue';
import InvoiceForm from '../components/InvoiceForm.vue';
import ConfirmModal from '../components/ConfirmModal.vue';
import CustomerFormModal from '../components/CustomerFormModal.vue';
import InvoiceSearchBar from '../components/InvoiceSearchBar.vue';
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
const searchDate = ref('');
const searchCustomerName = ref('');
const statusFilter = ref('all');
const currentPage = ref(1);
const pageSize = ref(15);
const pageSizeOptions = [10, 15, 20, 50, 100];
const backupLoading = ref(false);

const displayedInvoices = computed(() => {
  const customerQuery = searchCustomerName.value.trim().toLowerCase();
  const gregorianDate = searchDate.value ? toGregorianDate(searchDate.value) : '';

  return invoiceStore.allInvoices.filter((invoice) => {
    const matchesCustomer = !customerQuery
      || String(invoice.customer_name || '').toLowerCase().includes(customerQuery);
    const matchesDate = !gregorianDate || invoice.date === gregorianDate;
    const matchesStatus = statusFilter.value === 'all'
      || (statusFilter.value === 'not_shipped' && !invoice.is_shipped)
      || (statusFilter.value === 'unsettled' && !invoice.is_settled);

    return matchesCustomer && matchesDate && matchesStatus;
  });
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

// Load initial data
onMounted(async () => {
  await Promise.all([
    invoiceStore.fetchCustomers(),
    invoiceStore.fetchAllInvoices()
  ]);
});

async function clearSearch() {
  currentPage.value = 1;
  searchCustomerName.value = '';
  searchDate.value = '';
  statusFilter.value = 'all';
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

watch([searchCustomerName, searchDate, statusFilter], () => {
  currentPage.value = 1;
});
</script>
