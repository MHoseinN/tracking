<template>
  <div>
    <Teleport to="#app-shell-actions">
      <button @click="openAddModal" class="app-button-primary w-full justify-between">
        <span> حساب جدید</span>
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
      </button>
      <button @click="exportInvoices"
        class="app-button border border-sky-100 bg-sky-50 text-sky-700 hover:bg-sky-100 focus:ring-sky-100">
        گزارش‌گیری
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      </button>
    </Teleport>
    <!-- Invoice table -->
    <div ref="tableSectionRef" class="app-panel">
      <div class="px-4 py-4">
        <div class="w-full">
          <InvoiceSearchBar :text-model-value="searchCustomerName" :date-model-value="searchDate"
            :filter-model-value="statusFilter" @update:text-model-value="searchCustomerName = $event"
            @update:date-model-value="searchDate = $event" @update:filter-model-value="statusFilter = $event"
            @clear="clearSearch" />
        </div>
      </div>

      <!-- Loading state -->
      <AppContentState v-if="invoiceStore.loading" loading message="در حال بارگذاری فهرست حساب‌ها..."
        surface-class="border-0 bg-transparent shadow-none" />

      <InvoiceTable v-else :invoices="paginatedInvoices" :show-customer-column="true" :show-actions="true"
        :sort-key="sortKey" :sort-direction="sortDirection" @toggle-sort="toggleSort" @edit="openEditModal"
        @delete="openDeleteModal" @status-change="handleStatusChange" @customer-click="navigateToCustomer" />

      <AppPagination v-if="!invoiceStore.loading" :total-rows="totalRows" :row-start-index="rowStartIndex"
        :page-size="pageSize" :page-size-options="pageSizeSelectOptions" :current-page="currentPage"
        :total-pages="totalPages" :visible-page-numbers="visiblePageNumbers" @update:page-size="pageSize = $event"
        @go-to-page="goToPage" />
    </div>
  </div>

  <!-- Invoice Form Modal -->
  <InvoiceForm :is-open="showInvoiceForm" :customer-id="null" :invoice-data="selectedInvoice"
    :customers-list="invoiceStore.customers" @save="handleSaveInvoice" @close="closeInvoiceForm" />

  <CustomerFormModal :is-open="showCustomerForm" :existing-customers="invoiceStore.customers" @close="closeCustomerForm"
    @saved="handleCustomerSaved" />

  <!-- Confirm Delete Modal -->
  <ConfirmModal :is-open="showConfirmDelete" title="حذف فاکتور"
    message="آیا از حذف این فاکتور اطمینان دارید؟ این عملیات قابل بازگشت نیست." :loading="deleting"
    @confirm="handleDeleteInvoice" @cancel="showConfirmDelete = false" />

  <UndoBar :visible="undoState.visible" :title="undoState.title" :message="undoState.message" @undo="handleUndo"
    @close="clearUndo" />

</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import { useInvoiceStore } from '../../stores/invoiceStore';

import AppContentState from '../AppContentState.vue';
import AppPagination from '../AppPagination.vue';
import InvoiceTable from '../InvoiceTable.vue';
import InvoiceForm from '../InvoiceForm.vue';
import ConfirmModal from '../ConfirmModal.vue';
import CustomerFormModal from '../CustomerFormModal.vue';
import InvoiceSearchBar from '../InvoiceSearchBar.vue';
import UndoBar from '../UndoBar.vue';
import { usePaginatedList } from '../../composables/usePaginatedList';
import { useUndoAction } from '../../composables/useUndoAction';
import { toGregorianDate, toPersianDate } from '../../utils/dateConverter';
import { exportRowsToExcel } from '../../utils/exportToExcel';

const router = useRouter();
const toast = useToast();
const invoiceStore = useInvoiceStore();

// State
const showInvoiceForm = ref(false);
const tableSectionRef = ref(null);
const showCustomerForm = ref(false);
const selectedInvoice = ref(null);
const showConfirmDelete = ref(false);
const deleteTargetId = ref(null);
const deleting = ref(false);
const searchDate = ref('');
const searchCustomerName = ref('');
const statusFilter = ref('all');
const sortKey = ref('date');
const sortDirection = ref('desc');
const pageSizeOptions = [10, 15, 20, 50, 100];
const { undoState, clearUndo, showUndo, handleUndo } = useUndoAction({
  onError: (error) => toast.error(error.message || 'بازگردانی با خطا مواجه شد')
});

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

const sortedInvoices = computed(() => {
  const invoices = [...displayedInvoices.value];

  invoices.sort((left, right) => {
    let comparison = 0;

    if (sortKey.value === 'price') {
      comparison = (Number(left.price) || 0) - (Number(right.price) || 0);
    } else {
      comparison = String(left.date || '').localeCompare(String(right.date || ''));
      if (comparison === 0) {
        comparison = (Number(left.id) || 0) - (Number(right.id) || 0);
      }
    }

    return sortDirection.value === 'asc' ? comparison : -comparison;
  });

  return invoices;
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
  resetPage,
  goToPage
} = usePaginatedList(sortedInvoices, {
  initialPageSize: 15,
  pageSizeOptions,
  resetSources: [searchCustomerName, searchDate, statusFilter],
  scrollTarget: tableSectionRef
});

// Load initial data
onMounted(async () => {
  await Promise.all([
    invoiceStore.fetchCustomers(),
    invoiceStore.fetchAllInvoices()
  ]);
});

async function clearSearch() {
  searchCustomerName.value = '';
  searchDate.value = '';
  statusFilter.value = 'all';
  resetPage();
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
    if (result.data) {
      showUndo({
        title: 'فاکتور حذف شد',
        message: 'در صورت نیاز، همین حالا بازگردانی کن.',
        handler: async () => {
          const restoreResult = await invoiceStore.addInvoice({
            customer_id: result.data.customer_id,
            date: result.data.date,
            price: result.data.price,
            description: result.data.description || null,
            notes: result.data.notes || null
          });
          if (!restoreResult.success) {
            throw new Error(restoreResult.message);
          }
          await invoiceStore.fetchAllInvoices();
          toast.success('فاکتور بازگردانی شد');
        }
      });
    }
    await invoiceStore.fetchAllInvoices();
  } else {
    toast.error(result.message);
  }
}

async function handleStatusChange({ id, field, value }) {
  await invoiceStore.fetchAllInvoices();
  showUndo({
    title: 'وضعیت فاکتور تغییر کرد',
    message: 'اگر اشتباه بوده، بازگردانی کن.',
    handler: async () => {
      const revertResult = await invoiceStore.updateStatus(id, field, !value);
      if (!revertResult.success) {
        throw new Error(revertResult.message);
      }
      await invoiceStore.fetchAllInvoices();
      toast.success('وضعیت فاکتور بازگردانی شد');
    }
  });
}

// Navigate to customer detail page
function navigateToCustomer(customerId) {
  router.push(`/customer/${customerId}`);
}

function exportInvoices() {
  exportRowsToExcel({
    fileName: 'invoices-export',
    sheetTitle: 'فهرست فاکتورها',
    headers: ['نام مشتری', 'تاریخ شمسی', 'مبلغ', 'وضعیت ارسال', 'وضعیت تسویه', 'یادداشت'],
    rows: displayedInvoices.value.map((invoice) => [
      invoice.customer_name || '',
      toPersianDate(invoice.date),
      Number(invoice.price || 0).toLocaleString('fa-IR'),
      invoice.is_shipped ? 'ارسال شده' : 'ارسال نشده',
      invoice.is_settled ? 'تسویه شده' : 'تسویه نشده',
      invoice.notes || invoice.description || ''
    ])
  });
}

watch([searchCustomerName, searchDate, statusFilter], () => {
  resetPage();
});
</script>
