<template>
  <div class="min-h-screen bg-gray-50">
    <header class="bg-white shadow-sm sticky top-0 z-10">
      <div class="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div>
            <h1 class="text-xl font-bold text-gray-800">مدیریت کاربران</h1>
          </div>
        </div>

        <div class="flex items-center gap-2">
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

    <main class="max-w-7xl mx-auto px-4 py-6 space-y-5">
      <div v-if="errorMessage" class="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
        {{ errorMessage }}
      </div>

      <section
        class="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <div class="absolute inset-0 bg-gradient-to-br from-blue-50/70 via-white to-emerald-50/70 pointer-events-none">
        </div>
        <div class="relative p-5 space-y-5">
          <div class="flex items-center gap-4 flex-row-reverse justify-between">
            <div class="flex gap-3 items-center justify-between">
              <button type="button" @click="openAddModal"
                class="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-blue-700">
                افزودن کاربر
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
              </button>
              <button type="button" @click="exportCustomers"
                class="inline-flex items-center justify-center gap-2 rounded-2xl border border-sky-200 bg-sky-50  px-4 py-4 text-sm font-semibold text-sky-700 transition hover:-translate-y-0.5 hover:bg-sky-100">
                گزارش‌
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
            </div>
            <div class="grid grid-cols-5 gap-3">
              <div class="rounded-3xl border text-center border-slate-200 bg-white/90 px-12 py-4 shadow-sm">
                <p class="text-xs font-medium text-slate-500">تمامی کاربران</p>
                <p class="mt-3 text-3xl font-black text-slate-800">{{ formatNumber(totalCustomers) }}</p>
              </div>

              <button v-for="item in statusSummary" :key="item.label" type="button"
                @click="statusFilter = item.filterValue" :class="[
                  'rounded-3xl border px-4 py-4 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md',
                  item.containerClass,
                  statusFilter === item.filterValue ? 'ring-2 ring-offset-2 ring-slate-300' : ''
                ]">
                <p :class="['text-xs font-medium', item.labelClass]">{{ item.label }}</p>
                <p :class="['mt-3 text-3xl font-black', item.valueClass]">{{ formatNumber(item.count) }}</p>
              </button>
            </div>
          </div>



          <div class="rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-sm">
            <div class="grid gap-3 xl:grid-cols-[minmax(0,1fr)_240px_auto] xl:items-center">
              <div class="relative">
                <svg class="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M21 21l-4.35-4.35m1.1-5.4a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" />
                </svg>
                <input v-model="searchQuery" type="search"
                  placeholder="جستجو بر اساس نام، نام خانوادگی، شماره تماس، معرف یا وضعیت حساب..."
                  class="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 pr-10 pl-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <CustomSelect :model-value="statusFilter" :options="accountStatusFilterOptions"
                trigger-class="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm shadow-sm transition hover:border-slate-300 hover:shadow-md"
                @update:model-value="statusFilter = $event" />
              <button type="button" @click="clearFilters"
                class="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">
                پاک کردن فیلترها
              </button>
            </div>
          </div>
        </div>
      </section>

      <div class="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h3 class="text-base font-bold text-slate-800">لیست کاربران</h3>
          </div>
          <div class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {{ currentStatusFilterLabel }}
          </div>
        </div>

        <div v-if="loading" class="flex items-center justify-center py-16 text-gray-500">در حال بارگذاری...</div>

        <div v-else class="overflow-x-auto">
          <table class="w-full min-w-[920px]">
            <thead class="bg-gray-50 border-b border-gray-100">
              <tr>
                <th class="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">شماره</th>
                <th class="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">نام</th>
                <th class="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">نام خانوادگی</th>
                <th class="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">وضعیت حساب</th>
                <th class="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">تعداد فاکتور</th>
                <th class="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">مبلغ کل فاکتور ها</th>
                <th class="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">شماره تماس</th>
                <th class="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">معرف</th>
                <th class="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">عملیات</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, index) in paginatedRows" :key="row.id"
                class="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" @click="navigateToCustomer(row.id)">
                <td class="px-4 py-3 text-sm text-gray-700 font-medium">{{ formatNumber(rowStartIndex + index + 1) }}
                </td>
                <td class="px-4 py-3 text-sm text-gray-700 font-medium">{{ row.first_name }}</td>
                <td class="px-4 py-3 text-sm text-gray-700 font-medium">{{ row.last_name }}</td>
                <td class="px-4 py-3 text-sm text-gray-600">
                  <div @click.stop @mousedown.stop>
                    <CustomSelect :model-value="row.account_status || ''" :options="accountStatusSelectOptions"
                      :disabled="statusSavingId === row.id" :trigger-class="statusTriggerClass(row.account_status)"
                      @update:model-value="handleStatusChange(row, $event)" />
                  </div>
                </td>
                <td class="px-4 py-3 text-sm text-gray-600">{{ formatNumber(row.invoice_count) }}</td>
                <td class="px-4 py-3 text-sm text-gray-600">{{ formatCurrency(row.total_invoices_amount) }}</td>
                <td class="px-4 py-3 text-sm text-gray-600">{{ row.phone || '-' }}</td>
                <td class="px-4 py-3 text-sm text-gray-600">{{ row.referrer || '-' }}</td>
                <td class="px-4 py-3 text-sm">
                  <div class="flex items-center gap-2">
                    <button @click.stop="openEditModal(row)"
                      class="bg-amber-100 text-amber-700 px-3 py-1.5 rounded-md hover:bg-amber-200">ویرایش</button>
                    <button @click.stop="handleDelete(row)"
                      class="bg-rose-100 text-rose-700 px-3 py-1.5 rounded-md hover:bg-rose-200">حذف</button>
                  </div>
                </td>
              </tr>

              <tr v-if="!filteredRows.length">
                <td colspan="9" class="px-4 py-10 text-center text-sm text-gray-400">
                  {{ rows.length ? 'کاربری با این جستجو پیدا نشد' : 'کاربری ثبت نشده است' }}
                </td>
              </tr>
            </tbody>
          </table>

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
                  <CustomSelect :model-value="pageSize" :options="pageSizeSelectOptions"
                    trigger-class="min-w-[92px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition hover:border-slate-300 hover:shadow-md"
                    @update:model-value="pageSize = Number($event)" />
                </div>
              </div>
            </div>
            <div class="flex flex-wrap items-center justify-center gap-2">
              <button @click="goToPage(currentPage - 1)" :disabled="currentPage === 1"
                class="inline-flex items-center rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
                قبلی
              </button>

              <button v-for="page in visiblePageNumbers" :key="page" @click="goToPage(page)" :class="page === currentPage
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'"
                class="inline-flex h-10 min-w-[40px] items-center justify-center rounded-2xl px-3 text-sm font-semibold transition">
                {{ page.toLocaleString('fa-IR') }}
              </button>

              <button @click="goToPage(currentPage + 1)" :disabled="currentPage === totalPages"
                class="inline-flex items-center rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
                بعدی
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>

    <CustomerFormModal :is-open="showForm" :customer="selectedCustomer"
      :existing-customers="invoiceStore.customersOverview" @close="closeModal" @saved="handleCustomerSaved" />

    <ConfirmModal :is-open="showDeleteConfirm" title="حذف کاربر" :message="deleteConfirmMessage"
      :loading="deletingCustomer" @confirm="confirmDeleteCustomer" @cancel="closeDeleteModal" />
    <UndoBar :visible="undoState.visible" :title="undoState.title" :message="undoState.message" @undo="handleUndo"
      @close="clearUndo" />

    <Teleport to="body">
      <div v-if="false && showForm" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        @click.self="closeModal">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
          <div class="flex items-center justify-between p-5 border-b">
            <h3 class="text-lg font-bold text-gray-800">{{ editingId ? 'ویرایش کاربر' : 'افزودن کاربر' }}</h3>
            <button @click="closeModal" class="text-gray-400 hover:text-gray-600 transition">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form @submit.prevent="saveCustomer" class="p-5 space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">نام <span
                    class="text-red-500">*</span></label>
                <input v-model="form.first_name" type="text"
                  class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  :class="{ 'border-red-500': errors.first_name }" />
                <p v-if="errors.first_name" class="text-red-500 text-xs mt-1">{{ errors.first_name }}</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">نام خانوادگی <span
                    class="text-red-500">*</span></label>
                <input v-model="form.last_name" type="text"
                  class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  :class="{ 'border-red-500': errors.last_name }" />
                <p v-if="errors.last_name" class="text-red-500 text-xs mt-1">{{ errors.last_name }}</p>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">شماره تماس</label>
              <input v-model="form.phone" type="text"
                class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">معرف</label>
              <input v-model="form.referrer" type="text"
                class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">وضعیت حساب</label>
              <select v-model="form.account_status"
                class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="">وضعیت حساب</option>
                <option v-for="option in accountStatusOptions" :key="option" :value="option">{{ option }}</option>
              </select>
            </div>

            <div class="flex gap-3 pt-2">
              <button type="submit" :disabled="saving"
                class="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50">
                {{ saving ? 'در حال ذخیره...' : (editingId ? 'ذخیره تغییرات' : 'افزودن کاربر') }}
              </button>
              <button type="button" @click="closeModal"
                class="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-200 transition">انصراف</button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import { useAuthStore } from '../stores/authStore';
import { useInvoiceStore } from '../stores/invoiceStore';
import CustomerFormModal from '../components/CustomerFormModal.vue';
import ConfirmModal from '../components/ConfirmModal.vue';
import CustomSelect from '../components/CustomSelect.vue';
import UndoBar from '../components/UndoBar.vue';
import api from '../utils/api';
import { exportRowsToExcel } from '../utils/exportToExcel';
import { getAccountStatusTone } from '../utils/statusStyles';

const router = useRouter();
const toast = useToast();
const authStore = useAuthStore();
const invoiceStore = useInvoiceStore();

const loading = ref(false);
const saving = ref(false);
const statusSavingId = ref(null);
const errorMessage = ref('');

const showForm = ref(false);
const editingId = ref(null);
const selectedCustomer = ref(null);
const showDeleteConfirm = ref(false);
const deletingCustomer = ref(false);
const deleteTargetCustomer = ref(null);
const undoState = ref({
  visible: false,
  title: '',
  message: '',
  handler: null,
  timerId: null
});

const form = reactive({
  first_name: '',
  last_name: '',
  phone: '',
  referrer: '',
  account_status: ''
});

const errors = reactive({
  first_name: '',
  last_name: ''
});

const accountStatusOptions = ['خوش حساب', 'بد حساب', 'پرداخت نقدی', 'هماهنگی با مدیر'];
const pageSizeOptions = [10, 15, 20, 50, 100];
const accountStatusSelectOptions = computed(() => ([
  { label: 'وضعیت حساب', value: '' },
  ...accountStatusOptions.map((option) => ({ label: option, value: option }))
]));
const accountStatusFilterOptions = computed(() => ([
  { label: 'همه وضعیت‌ها', value: 'all' },
  ...accountStatusOptions.map((option) => ({ label: option, value: option }))
]));
const pageSizeSelectOptions = computed(() => pageSizeOptions.map((size) => ({
  label: size.toLocaleString('fa-IR'),
  value: size
})));

const rows = computed(() => invoiceStore.customersOverview);
const searchQuery = ref('');
const statusFilter = ref('all');
const currentPage = ref(1);
const pageSize = ref(15);

const totalCustomers = computed(() => rows.value.length);
const deleteConfirmMessage = computed(() => {
  const customer = deleteTargetCustomer.value;
  if (!customer) {
    return 'آیا از حذف این کاربر اطمینان دارید؟ این عملیات قابل بازگشت نیست.';
  }

  return `آیا از حذف کاربر ${customer.first_name} ${customer.last_name} مطمئن هستید؟ این عملیات قابل بازگشت نیست.`;
});

function countCustomersByStatus(status) {
  return rows.value.filter((row) => row.account_status === status).length;
}

const statusSummary = computed(() => [
  {
    label: 'خوش حساب',
    filterValue: 'خوش حساب',
    count: countCustomersByStatus('خوش حساب'),
    containerClass: 'border-emerald-200 bg-emerald-50',
    labelClass: 'text-emerald-600',
    valueClass: 'text-emerald-700'
  },
  {
    label: 'بد حساب',
    filterValue: 'بد حساب',
    count: countCustomersByStatus('بد حساب'),
    containerClass: 'border-rose-200 bg-rose-50',
    labelClass: 'text-rose-600',
    valueClass: 'text-rose-700'
  },
  {
    label: 'پرداخت نقدی',
    filterValue: 'پرداخت نقدی',
    count: countCustomersByStatus('پرداخت نقدی'),
    containerClass: 'border-blue-200 bg-blue-50',
    labelClass: 'text-blue-600',
    valueClass: 'text-blue-700'
  },
  {
    label: 'هماهنگی با مدیر',
    filterValue: 'هماهنگی با مدیر',
    count: countCustomersByStatus('هماهنگی با مدیر'),
    containerClass: 'border-amber-200 bg-amber-50',
    labelClass: 'text-amber-600',
    valueClass: 'text-amber-700'
  }
]);
const currentStatusFilterLabel = computed(() => statusFilter.value === 'all'
  ? 'نمایش همه وضعیت‌ها'
  : `فیلتر فعال: ${statusFilter.value}`);

function normalizeForSearch(value) {
  return String(value ?? '')
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06f0-\u06f9]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .trim()
    .toLowerCase();
}

const filteredRows = computed(() => {
  const query = normalizeForSearch(searchQuery.value);
  const statusMatches = (row) => statusFilter.value === 'all' || row.account_status === statusFilter.value;
  if (!query) return rows.value.filter(statusMatches);

  return rows.value.filter((row) => {
    if (!statusMatches(row)) return false;
    const searchable = [
      row.first_name,
      row.last_name,
      row.phone,
      row.referrer,
      row.account_status
    ];

    return searchable.some((field) => normalizeForSearch(field).includes(query));
  });
});

const totalRows = computed(() => filteredRows.value.length);
const totalPages = computed(() => Math.max(1, Math.ceil(totalRows.value / pageSize.value)));
const rowStartIndex = computed(() => (currentPage.value - 1) * pageSize.value);
const paginatedRows = computed(() => filteredRows.value.slice(rowStartIndex.value, rowStartIndex.value + pageSize.value));
const visiblePageNumbers = computed(() => {
  const start = Math.max(1, currentPage.value - 1);
  const end = Math.min(totalPages.value, start + 2);
  const adjustedStart = Math.max(1, end - 2);
  return Array.from({ length: end - adjustedStart + 1 }, (_, index) => adjustedStart + index);
});

watch(pageSize, () => {
  currentPage.value = 1;
});

watch(searchQuery, () => {
  currentPage.value = 1;
});

watch(statusFilter, () => {
  currentPage.value = 1;
});

watch([rows, totalPages], () => {
  if (currentPage.value > totalPages.value) {
    currentPage.value = totalPages.value;
  }

  if (currentPage.value < 1) {
    currentPage.value = 1;
  }
});

function formatNumber(value) {
  return Math.round(Number(value) || 0).toLocaleString('fa-IR');
}

function formatCurrency(value) {
  return `${formatNumber(value)} تومان`;
}

function goToPage(page) {
  if (page < 1 || page > totalPages.value) return;
  currentPage.value = page;
}

function clearFilters() {
  searchQuery.value = '';
  statusFilter.value = 'all';
}

function accountStatusSelectClass(status) {
  return getAccountStatusTone(status);
}

function statusTriggerClass(status) {
  return [
    'min-w-[180px] rounded-2xl border px-3 py-2.5 text-sm font-medium shadow-sm transition hover:shadow-md',
    status ? accountStatusSelectClass(status) : 'border-gray-300 bg-white text-gray-400 hover:border-slate-300'
  ];
}

function resetForm() {
  editingId.value = null;
  form.first_name = '';
  form.last_name = '';
  form.phone = '';
  form.referrer = '';
  form.account_status = '';
  errors.first_name = '';
  errors.last_name = '';
}

function validate() {
  errors.first_name = '';
  errors.last_name = '';

  let valid = true;

  if (!String(form.first_name || '').trim()) {
    errors.first_name = 'نام الزامی است';
    valid = false;
  }

  if (!String(form.last_name || '').trim()) {
    errors.last_name = 'نام خانوادگی الزامی است';
    valid = false;
  }

  return valid;
}

async function loadOverview() {
  loading.value = true;
  errorMessage.value = '';
  try {
    await invoiceStore.fetchCustomersOverview();
  } catch (err) {
    errorMessage.value = 'دریافت لیست کاربران با خطا مواجه شد.';
  } finally {
    loading.value = false;
  }
}

function openAddModal() {
  resetForm();
  selectedCustomer.value = null;
  showForm.value = true;
}

function openEditModal(row) {
  selectedCustomer.value = row;
  editingId.value = row.id;
  form.first_name = row.first_name || '';
  form.last_name = row.last_name || '';
  form.phone = row.phone || '';
  form.referrer = row.referrer || '';
  form.account_status = row.account_status || '';
  errors.first_name = '';
  errors.last_name = '';
  showForm.value = true;
}

function closeModal() {
  showForm.value = false;
  selectedCustomer.value = null;
  resetForm();
}

function closeDeleteModal() {
  if (deletingCustomer.value) return;
  showDeleteConfirm.value = false;
  deleteTargetCustomer.value = null;
}

async function handleCustomerSaved() {
  await Promise.all([loadOverview(), invoiceStore.fetchCustomers()]);
}

async function saveCustomer() {
  if (!validate()) return;

  saving.value = true;

  const payload = {
    first_name: form.first_name.trim(),
    last_name: form.last_name.trim(),
    phone: String(form.phone || '').trim() || null,
    referrer: String(form.referrer || '').trim() || null,
    account_status: String(form.account_status || '').trim() || null
  };

  let result;
  if (editingId.value) {
    result = await invoiceStore.updateCustomer(editingId.value, payload);
  } else {
    result = await invoiceStore.addCustomer(payload, { allowExisting: false });
  }

  saving.value = false;

  if (!result.success) {
    toast.error(result.message || 'عملیات با خطا مواجه شد');
    return;
  }

  toast.success(editingId.value ? 'کاربر با موفقیت ویرایش شد' : 'کاربر با موفقیت اضافه شد');
  closeModal();
  await Promise.all([loadOverview(), invoiceStore.fetchCustomers()]);
}

async function handleStatusChange(row, value) {
  const previousStatus = row.account_status || '';
  row.account_status = String(value || '').trim() || '';
  statusSavingId.value = row.id;

  const result = await invoiceStore.updateCustomer(row.id, {
    first_name: row.first_name || '',
    last_name: row.last_name || '',
    phone: row.phone || null,
    referrer: row.referrer || null,
    account_status: String(value || '').trim() || null
  });

  statusSavingId.value = null;

  if (!result.success) {
    row.account_status = previousStatus;
    toast.error(result.message || 'به‌روزرسانی وضعیت حساب با خطا مواجه شد');
    return;
  }

  toast.success('وضعیت حساب با موفقیت ثبت شد');
  showUndo({
    title: 'وضعیت حساب تغییر کرد',
    message: 'در صورت نیاز، بازگردانی کن.',
    handler: async () => {
      const revertResult = await invoiceStore.updateCustomer(row.id, {
        first_name: row.first_name || '',
        last_name: row.last_name || '',
        phone: row.phone || null,
        referrer: row.referrer || null,
        account_status: previousStatus || null
      });
      if (!revertResult.success) {
        throw new Error(revertResult.message);
      }
      await Promise.all([loadOverview(), invoiceStore.fetchCustomers()]);
      toast.success('وضعیت حساب بازگردانی شد');
    }
  });
  await Promise.all([loadOverview(), invoiceStore.fetchCustomers()]);
}

async function handleDelete(row) {
  deleteTargetCustomer.value = row;
  showDeleteConfirm.value = true;
}

async function confirmDeleteCustomer() {
  if (!deleteTargetCustomer.value?.id) return;

  try {
    const customerSnapshotResponse = await api.get(`/invoices/customer/${deleteTargetCustomer.value.id}`);
    const customerSnapshot = customerSnapshotResponse.data?.customer;
    const invoiceSnapshots = customerSnapshotResponse.data?.invoices || [];

    deletingCustomer.value = true;
    const result = await invoiceStore.deleteCustomer(deleteTargetCustomer.value.id);
    deletingCustomer.value = false;

    if (!result.success) {
      toast.error(result.message || 'حذف کاربر با خطا مواجه شد');
      return;
    }

    toast.success('کاربر با موفقیت حذف شد');
    closeDeleteModal();
    if (customerSnapshot) {
      showUndo({
        title: 'کاربر حذف شد',
        message: 'در 5 ثانیه آینده می‌توانی او را برگردانی.',
        handler: async () => {
          const restoredCustomer = await invoiceStore.addCustomer({
            first_name: customerSnapshot.first_name || '',
            last_name: customerSnapshot.last_name || '',
            phone: customerSnapshot.phone || null,
            referrer: customerSnapshot.referrer || null,
            notes: customerSnapshot.notes || null,
            account_status: customerSnapshot.account_status || null
          }, { allowExisting: false });

          if (!restoredCustomer.success || !restoredCustomer.data?.id) {
            throw new Error(restoredCustomer.message || 'بازگردانی کاربر ممکن نشد');
          }

          for (const invoice of invoiceSnapshots) {
            const invoiceResult = await invoiceStore.addInvoice({
              customer_id: restoredCustomer.data.id,
              date: invoice.date,
              price: invoice.price,
              description: invoice.description || null,
              notes: invoice.notes || null
            });
            if (!invoiceResult.success) {
              throw new Error(invoiceResult.message || 'بازگردانی یکی از فاکتورها با خطا مواجه شد');
            }
          }

          await Promise.all([loadOverview(), invoiceStore.fetchCustomers(), invoiceStore.fetchAllInvoices()]);
          toast.success('کاربر و فاکتورهایش بازگردانی شدند');
        }
      });
    }
    await Promise.all([loadOverview(), invoiceStore.fetchCustomers()]);
  } catch (error) {
    deletingCustomer.value = false;
    toast.error(error.response?.data?.message || error.message || 'حذف کاربر با خطا مواجه شد');
  }
}

function exportCustomers() {
  exportRowsToExcel({
    fileName: 'customers-export',
    sheetTitle: 'فهرست کاربران',
    headers: ['نام', 'نام خانوادگی', 'وضعیت حساب', 'تعداد فاکتور', 'مبلغ کل', 'شماره تماس', 'معرف'],
    rows: filteredRows.value.map((row) => [
      row.first_name || '',
      row.last_name || '',
      row.account_status || '',
      formatNumber(row.invoice_count),
      formatCurrency(row.total_invoices_amount),
      row.phone || '',
      row.referrer || ''
    ])
  });
}

function clearUndo() {
  if (undoState.value.timerId) {
    window.clearTimeout(undoState.value.timerId);
  }
  undoState.value = { visible: false, title: '', message: '', handler: null, timerId: null };
}

function showUndo({ title, message, handler }) {
  clearUndo();
  const timerId = window.setTimeout(() => clearUndo(), 5000);
  undoState.value = { visible: true, title, message, handler, timerId };
}

async function handleUndo() {
  if (!undoState.value.handler) return;
  const undoHandler = undoState.value.handler;
  clearUndo();
  try {
    await undoHandler();
  } catch (error) {
    toast.error(error.message || 'بازگردانی با خطا مواجه شد');
  }
}

function goBack() {
  router.back();
}

function navigateToCustomer(customerId) {
  router.push(`/customer/${customerId}`);
}

function handleLogout() {
  authStore.logout();
  router.push('/login');
}

onMounted(async () => {
  await Promise.all([loadOverview(), invoiceStore.fetchCustomers()]);
});
</script>
