<template>
  <div>
    <Teleport to="#app-shell-actions">
      <button @click="openAddModal" class="app-button-primary w-full justify-between">
        <span>افزودن حساب</span>
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
      </button>
      <button @click="exportCustomerInvoices"
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

    <CustomerSummaryPanel :customer="customer" :settled-amount="settledAmountFormatted"
      :remaining-amount="remainingAmountFormatted" :open="isCustomerInfoOpen" :draft="customerProfileDraft"
      :notes="customerNotesDraft" :account-status-select-options="accountStatusSelectOptions"
      :phone-duplicate-error="phoneDuplicateError" :changed="customerFormChanged" :saving="customerFormSaving"
      @toggle="isCustomerInfoOpen = !isCustomerInfoOpen" @update-field="updateProfileField"
      @update:notes="customerNotesDraft = $event" @save="saveCustomerForm" />

    <section ref="tableSectionRef" class="overflow-hidden rounded-lg bg-white shadow">
      <div class="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-4">
        <InvoiceSearchBar :date-model-value="searchDate" :filter-model-value="statusFilter" :show-text-input="false"
          :show-icon-input="false" :searchIcon="false" @update:date-model-value="searchDate = $event"
          @update:filter-model-value="statusFilter = $event" @clear="clearSearch" />
      </div>

      <AppContentState v-if="invoiceStore.loading" loading message="در حال بارگذاری..."
        surface-class="border-0 bg-transparent py-16 shadow-none" text-class="text-gray-500" />

      <InvoiceTable v-else :invoices="paginatedInvoices" :show-customer-column="false" :show-actions="true"
        :row-clickable="true" :sort-key="sortKey" :sort-direction="sortDirection" @toggle-sort="toggleSort"
        @edit="openEditModal" @delete="openDeleteModal" @status-change="handleStatusChange" />

      <AppPagination v-if="!invoiceStore.loading" :total-rows="totalRows" :row-start-index="rowStartIndex"
        :page-size="pageSize" :page-size-options="pageSizeSelectOptions" :current-page="currentPage"
        :total-pages="totalPages" :visible-page-numbers="visiblePageNumbers" @update:page-size="pageSize = $event"
        @go-to-page="goToPage" />
    </section>
  </div>

  <InvoiceForm :is-open="showInvoiceForm" :customer-id="customerId" :invoice-data="selectedInvoice"
    :customers-list="allCustomers" :allow-customer-selection="true" @save="handleSaveInvoice"
    @close="closeInvoiceForm" />

  <ConfirmModal :is-open="showConfirmDelete" title="حذف فاکتور"
    message="آیا از حذف این فاکتور مطمئن هستید؟ این عملیات قابل بازگشت نیست." :loading="deleting"
    @confirm="handleDeleteInvoice" @cancel="showConfirmDelete = false" />
  <UndoBar :visible="undoState.visible" :title="undoState.title" :message="undoState.message" @undo="handleUndo"
    @close="clearUndo" />
</template>
<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import { useInvoiceStore } from '../../stores/invoiceStore';

import AppContentState from '../AppContentState.vue';
import AppPagination from '../AppPagination.vue';
import CustomerSummaryPanel from './CustomerSummaryPanel.vue';
import InvoiceTable from '../InvoiceTable.vue';
import InvoiceForm from '../InvoiceForm.vue';
import ConfirmModal from '../ConfirmModal.vue';
import InvoiceSearchBar from '../InvoiceSearchBar.vue';
import UndoBar from '../UndoBar.vue';
import { exportRowsToExcel } from '../../utils/exportToExcel';
import { toPersianDate } from '../../utils/dateConverter';
import { usePaginatedList } from '../../composables/usePaginatedList';
import { useCustomerInvoiceList } from '../../composables/useCustomerInvoiceList';
import { useCustomerInvoiceActions } from '../../composables/useCustomerInvoiceActions';
import { useCustomerProfileForm } from '../../composables/useCustomerProfileForm';
import { useUndoAction } from '../../composables/useUndoAction';

const props = defineProps({
  id: { type: [String, Number], required: true }
});

const router = useRouter();
const toast = useToast();
const invoiceStore = useInvoiceStore();


const customerId = computed(() => parseInt(props.id));
const tableSectionRef = ref(null);
const customer = ref(null);
const searchDate = ref('');
const statusFilter = ref('all');
const sortKey = ref('date');
const sortDirection = ref('desc');
const allCustomerInvoices = ref([]);
const isCustomerInfoOpen = ref(false);
const allCustomers = ref([]);
const pageSizeOptions = [10, 15, 20, 50, 100];
const {
  customerProfileDraft,
  customerNotesDraft,
  accountStatusSelectOptions,
  customerFormSaving,
  customerFormChanged,
  phoneDuplicateError,
  resetFromCustomer,
  updateProfileField,
  saveCustomerForm
} = useCustomerProfileForm({
  customer,
  allCustomers,
  customerId,
  invoiceStore,
  toast,
  reloadCustomers: loadCustomers
});

const { filteredInvoices, sortedInvoices } = useCustomerInvoiceList({
  invoices: allCustomerInvoices,
  searchDate,
  statusFilter,
  sortKey,
  sortDirection
});

const {
  currentPage,
  pageSize,
  pageSizeOptions: pageSizeSelectOptions,
  totalRows,
  totalPages,
  rowStartIndex,
  paginatedItems: paginatedInvoices,
  visiblePageNumbers,
  goToPage
} = usePaginatedList(sortedInvoices, {
  initialPageSize: 15,
  pageSizeOptions,
  resetSources: [searchDate, statusFilter],
  scrollTarget: tableSectionRef
});

const { undoState, clearUndo, showUndo, handleUndo } = useUndoAction({
  onError: (error) => toast.error(error.message || 'بازگردانی با خطا مواجه شد')
});
const {
  showInvoiceForm,
  selectedInvoice,
  showConfirmDelete,
  deleting,
  openAddModal,
  openEditModal,
  closeInvoiceForm,
  openDeleteModal,
  handleSaveInvoice,
  handleDeleteInvoice,
  handleStatusChange
} = useCustomerInvoiceActions({
  invoiceStore,
  customerId,
  reloadInvoices: loadCustomerInvoices,
  toast,
  showUndo
});

// Computed stats
const settledAmount = computed(() => {
  return allCustomerInvoices.value
    .filter(i => i.is_settled)
    .reduce((sum, i) => sum + (Number(i.price) || 0), 0);
});

const settledAmountFormatted = computed(() => {
  return settledAmount.value.toLocaleString('fa-IR') + ' تومان';
});

const remainingAmount = computed(() =>
  allCustomerInvoices.value
    .filter(i => !i.is_settled)
    .reduce((sum, i) => sum + (Number(i.price) || 0), 0)
);
const remainingAmountFormatted = computed(() =>
  remainingAmount.value.toLocaleString('fa-IR') + ' تومان'
);

// Load customer invoices on mount
onMounted(async () => {
  await Promise.all([loadCustomerInvoices(), loadCustomers()]);
});

async function loadCustomerInvoices() {
  try {
    currentPage.value = 1;
    customer.value = await invoiceStore.fetchCustomerInvoices(customerId.value);
    allCustomerInvoices.value = [...invoiceStore.currentInvoices];
    resetFromCustomer();
  } catch (err) {
    toast.error('خطا در بارگذاری فاکتورهای مشتری');
    if (err.response?.status === 404) {
      router.push('/accounts');
    }
  }
}

function clearSearch() {
  currentPage.value = 1;
  searchDate.value = '';
  statusFilter.value = 'all';
}

function toggleSort(column) {
  if (sortKey.value === column) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortKey.value = column;
    sortDirection.value = column === 'price' ? 'asc' : 'desc';
  }

  currentPage.value = 1;
}

async function loadCustomers() {
  try {
    await invoiceStore.fetchCustomers();
    allCustomers.value = [...invoiceStore.customers];
  } catch (error) {
    allCustomers.value = [];
  }
}

// Navigate back
function goBack() {
  router.back();
}

function exportCustomerInvoices() {
  exportRowsToExcel({
    fileName: `customer-${customerId.value}-invoices`,
    sheetTitle: `فاکتورهای ${customer.value?.name || 'مشتری'}`,
    headers: ['تاریخ شمسی', 'مبلغ', 'وضعیت ارسال', 'وضعیت تسویه', 'یادداشت'],
    rows: filteredInvoices.value.map((invoice) => [
      toPersianDate(invoice.date),
      Number(invoice.price || 0).toLocaleString('fa-IR'),
      invoice.is_shipped ? 'ارسال شده' : 'ارسال نشده',
      invoice.is_settled ? 'تسویه شده' : 'تسویه نشده',
      invoice.notes || invoice.description || ''
    ])
  });
}

</script>
