<template>
  <div>
    <Teleport to="#app-shell-actions">
      <button type="button" @click="openAddModal" class="app-button-primary w-full justify-between">
        <span>افزودن کاربر</span>
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
      </button>
      <button type="button" @click="exportCustomers"
        class="app-button border border-sky-100 bg-sky-50 text-sky-700 hover:bg-sky-100 focus:ring-sky-100">
        <span>گزارش‌گیری</span>
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      </button>
      <button @click="goBack" class="app-button-secondary w-full justify-between">
        <span>بازگشت</span>
        <svg class="h-5 w-5 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </Teleport>
    <div v-if="errorMessage" class="rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-700">
      {{ errorMessage }}
    </div>

    <div class="bg-white border border-gray-200 rounded-lg">
      <div class="grid gap-4 grid-cols-6 items-center p-4">
        <div class="relative col-span-4">
          <svg class="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" fill="none"
            stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M21 21l-4.35-4.35m1.1-5.4a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" />
          </svg>
          <input v-model="searchQuery" type="search" placeholder="جستجو"
            class="w-full rounded-lg h-12 border border-gray-200 bg-white p-4 pr-10 pl-3 shadow-md text-sm text-slate-700 focus:outline-none focus-within:ring-4 focus-within:ring-blue-100" />

        </div>
        <div class="col-span-2">
          <CustomSelect :model-value="statusFilter" :options="accountStatusFilterOptions"
            trigger-class="rounded-lg h-12 border border-gray-200 bg-white p-4 text-sm shadow-md transition hover:bg-slate-50"
            @update:model-value="statusFilter = $event" />
        </div>
      </div>


      <AppContentState v-if="loading" loading message="در حال بارگذاری..."
        surface-class="border-0 bg-transparent py-16 shadow-none" text-class="text-gray-500" />

      <div ref="tableSectionRef" v-else class="table-container">
        <table class="w-full w bg-white text-sm">
          <thead class="bg-blue-50 rounded-lg">
            <tr class="rounded-lg">
              <th class="p-3 border border-gray-200 text-center font-semibold">شماره</th>
              <th class="p-3 border border-gray-200 text-right font-semibold">نام مشتری</th>
              <th class="p-3 border border-gray-200 text-center font-semibold">وضعیت حساب</th>
              <th class="p-3 border border-gray-200 text-right font-semibold">تعداد فاکتور</th>
              <th class="p-3 border border-gray-200 text-center font-semibold">مبلغ کل فاکتورها</th>
              <th class="p-3 border border-gray-200 text-center font-semibold">شماره تماس</th>
              <th class="p-3 border border-gray-200 text-right font-semibold">معرف</th>
              <th class="p-3 border border-gray-200 text-center font-semibold">عملیات</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, index) in paginatedRows" :key="row.id" class="hover:bg-blue-50 transition-all">
              <td class="px-4 py-3 text-sm border border-gray-100 font-medium">{{ formatNumber(rowStartIndex + index +
                1) }}
              </td>
              <td
                class="px-4 py-3 text-sm border border-gray-100 font-medium  hover:bg-blue-100 transition cursor-pointer"
                @click="navigateToCustomer(row.id)">{{
                  row.first_name }} {{ row.last_name }}</td>
              <td class="px-4 py-3 text-sm border border-gray-100">
                <div @click.stop @mousedown.stop>
                  <CustomSelect :model-value="row.account_status || ''" :options="accountStatusSelectOptions"
                    :disabled="statusSavingId === row.id" :trigger-class="statusTriggerClass(row.account_status)"
                    @update:model-value="handleStatusChange(row, $event)" />
                </div>
              </td>
              <td class="px-4 py-3 border border-gray-100">{{ formatNumber(row.invoice_count) }}</td>
              <td class="px-4 py-3 border border-gray-100">{{ formatCurrency(row.total_invoices_amount) }}</td>
              <td class="px-4 py-3 border border-gray-100">{{ row.phone || '-' }}</td>
              <td class="px-4 py-3 border border-gray-100">{{ row.referrer || '-' }}</td>
              <td class="px-4 py-3 border border-gray-100">
                <div class="flex items-center justify-center gap-2">
                  <button @click.stop="openEditModal(row)"
                    class="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700 transition hover:bg-blue-200"
                    title="ویرایش">
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button @click.stop="openDeleteModal(row)"
                    class="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-700 transition hover:bg-red-200"
                    title="حذف">
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>

            <tr v-if="!filteredRows.length">
              <td colspan="9" class="px-4 py-10 text-center text-sm">
                {{ rows.length ? 'کاربری با این جستجو پیدا نشد' : 'کاربری ثبت نشده است' }}
              </td>
            </tr>
          </tbody>
        </table>

        <AppPagination v-if="!invoiceStore.loading" :total-rows="totalRows" :row-start-index="rowStartIndex"
          :page-size="pageSize" :page-size-options="pageSizeSelectOptions" :current-page="currentPage"
          :total-pages="totalPages" :visible-page-numbers="visiblePageNumbers" @update:page-size="pageSize = $event"
          @go-to-page="goToPage" />
      </div>
    </div>
  </div>

  <CustomerFormModal :is-open="showForm" :customer="selectedCustomer"
    :existing-customers="invoiceStore.customersOverview" @close="closeModal" @saved="handleCustomerSaved" />

  <ConfirmModal :is-open="showDeleteConfirm" title="حذف کاربر" :message="deleteConfirmMessage"
    :loading="deletingCustomer" @confirm="confirmDeleteCustomer" @cancel="closeDeleteModal" />
  <UndoBar :visible="undoState.visible" :title="undoState.title" :message="undoState.message" @undo="handleUndo"
    @close="clearUndo" />

</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import { useInvoiceStore } from '../../stores/invoiceStore';
import AppContentState from '../AppContentState.vue';
import AppPagination from '../AppPagination.vue';
import CustomerFormModal from '../CustomerFormModal.vue';
import ConfirmModal from '../ConfirmModal.vue';
import CustomSelect from '../CustomSelect.vue';
import UndoBar from '../UndoBar.vue';
import { exportRowsToExcel } from '../../utils/exportToExcel';
import { getAccountStatusTone } from '../../utils/statusStyles';
import { usePaginatedList } from '../../composables/usePaginatedList';
import { useUndoAction } from '../../composables/useUndoAction';
import { useUserManagementActions } from '../../composables/useUserManagementActions';

const router = useRouter();
const toast = useToast();
const invoiceStore = useInvoiceStore();

const loading = ref(false);
const errorMessage = ref('');
const tableSectionRef = ref(null);

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

const rows = computed(() => invoiceStore.customersOverview);
const searchQuery = ref('');
const statusFilter = ref('all');

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

const {
  currentPage,
  pageSize,
  pageSizeOptions: pageSizeSelectOptions,
  totalRows,
  totalPages,
  rowStartIndex,
  paginatedItems: paginatedRows,
  visiblePageNumbers,
  goToPage
} = usePaginatedList(filteredRows, {
  initialPageSize: 15,
  pageSizeOptions,
  resetSources: [searchQuery, statusFilter],
  scrollTarget: tableSectionRef
});

const { undoState, clearUndo, showUndo, handleUndo } = useUndoAction({
  onError: (error) => toast.error(error.message || 'بازگردانی با خطا مواجه شد')
});

const {
  statusSavingId,
  showForm,
  selectedCustomer,
  showDeleteConfirm,
  deletingCustomer,
  deleteConfirmMessage,
  openAddModal,
  openEditModal,
  closeModal,
  openDeleteModal,
  closeDeleteModal,
  handleCustomerSaved,
  handleStatusChange,
  confirmDeleteCustomer
} = useUserManagementActions({
  invoiceStore,
  toast,
  reloadOverview: loadOverview,
  showUndo
});

function formatNumber(value) {
  return Math.round(Number(value) || 0).toLocaleString('fa-IR');
}

function formatCurrency(value) {
  return `${formatNumber(value)} تومان`;
}

function accountStatusSelectClass(status) {
  return getAccountStatusTone(status);
}

function statusTriggerClass(status) {
  return [
    'min-w-[120px] rounded-lg border p-2 text-xs transition shadow-sm',
    status ? accountStatusSelectClass(status) : 'border-gray-300 bg-white text-gray-400'
  ];
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

function goBack() {
  router.back();
}

function navigateToCustomer(customerId) {
  router.push(`/customer/${customerId}`);
}

onMounted(async () => {
  await Promise.all([loadOverview(), invoiceStore.fetchCustomers()]);
});


</script>
