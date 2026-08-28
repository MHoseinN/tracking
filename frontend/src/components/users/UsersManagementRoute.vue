<template>
  <div ref="tableSectionRef">
    <Teleport to="#app-shell-actions">
      <AppButton variant="primary" block @click="openAddModal">افزودن مشتری</AppButton>
      <AppButton variant="info" block @click="exportCustomers">گزارش‌گیری</AppButton>
    </Teleport>

    <p v-if="errorMessage" class="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{{ errorMessage }}</p>

    <AppTablePanel title="مدیریت مشتریان"
      :count="loading ? null : sortedRows.length">
      <template #filters>
        <AppFilterBar columns-class="md:grid-cols-2 xl:grid-cols-4">
          <label class="space-y-1 col-span-2"><span class="text-xs font-bold text-slate-600">جست‌وجوی مشتری</span>
            <input v-model.trim="searchQuery" class="app-filter-control" type="search" placeholder="نام مشتری یا شماره تماس" /></label>
          <label class="space-y-1"><span class="text-xs font-bold text-slate-600">وضعیت حساب</span>
            <CustomSelect v-model="statusFilter" :options="accountStatusFilterOptions" trigger-class="app-filter-control" /></label>
          <label class="space-y-1"><span class="text-xs font-bold text-slate-600">وضعیت شماره تماس</span>
            <CustomSelect v-model="phoneFilter" :options="phoneFilterOptions" trigger-class="app-filter-control" /></label>
        </AppFilterBar>
      </template>
      <AppDataTable class="customers-table" :column-count="8" :loading="loading" :empty="!sortedRows.length"
        min-width="100%" loading-message="در حال دریافت مشتریان..." empty-message="مشتری‌ای با این فیلتر پیدا نشد.">
        <template #head>
          <tr>
            <th>ردیف</th><th>نام مشتری</th><th>وضعیت حساب</th>
            <th :aria-sort="sortAriaValue('list_count')">
              <button type="button" class="customer-sort-button" @click="toggleSort('list_count')">
                تعداد لیست
                <span aria-hidden="true" class="customer-sort-icon">{{ sortIcon('list_count') }}</span>
              </button>
            </th>
            <th :aria-sort="sortAriaValue('total_invoices_amount')">
              <button type="button" class="customer-sort-button" @click="toggleSort('total_invoices_amount')">
                مبلغ فاکتورها
                <span aria-hidden="true" class="customer-sort-icon">{{ sortIcon('total_invoices_amount') }}</span>
              </button>
            </th>
            <th>شماره تماس</th><th>معرف</th><th>عملیات</th>
          </tr>
        </template>

        <tr v-for="(row, index) in paginatedRows" :key="row.id" class="app-table-row">
          <td class="text-center font-bold text-slate-500">{{ formatNumber(rowStartIndex + index + 1) }}</td>
          <td class="cursor-pointer font-black text-slate-900 hover:text-indigo-700" @click="navigateToCustomer(row.id)">
            {{ row.first_name }} {{ row.last_name }}
          </td>
          <td @click.stop>
            <CustomSelect :model-value="row.account_status || ''" :options="accountStatusSelectOptions"
              :disabled="statusSavingId === row.id" :trigger-class="statusTriggerClass(row.account_status)"
              @update:model-value="handleStatusChange(row, $event)" />
          </td>
          <td class="text-center font-bold">{{ formatNumber(row.list_count) }}</td>
          <td class="text-center font-black text-slate-800">{{ formatCurrency(row.total_invoices_amount) }}</td>
          <td class="text-center" dir="ltr">{{ row.phone || '—' }}</td>
          <td class="text-center">{{ row.referrer || '—' }}</td>
          <td>
            <div class="flex items-center justify-center gap-1">
              <AppIconButton label="مشاهده جزئیات" size="sm" @click="navigateToCustomer(row.id)">
                <svg class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="19" cy="12" r="1.7" /></svg>
              </AppIconButton>
              <AppIconButton label="ویرایش مشتری" size="sm" variant="primary" @click="openEditModal(row)">
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5m-1.5-9.5a2.1 2.1 0 0 1 3 3L12 15H9v-3z" /></svg>
              </AppIconButton>
              <AppIconButton label="حذف مشتری" size="sm" variant="danger" @click="openDeleteModal(row)">
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-width="2" d="M6 7h12m-9 0V5h6v2m-8 0 1 13h8l1-13" /></svg>
              </AppIconButton>
            </div>
          </td>
        </tr>
      </AppDataTable>
      <template #footer>
        <AppPagination :total-rows="totalRows" :row-start-index="rowStartIndex" :page-size="pageSize"
          :page-size-options="pageSizeSelectOptions" :current-page="currentPage" :total-pages="totalPages"
          :visible-page-numbers="visiblePageNumbers" @update:page-size="pageSize = $event" @go-to-page="goToPage" />
      </template>
    </AppTablePanel>
  </div>

  <CustomerFormModal :is-open="showForm" :customer="selectedCustomer" :existing-customers="invoiceStore.customersOverview"
    @close="closeModal" @saved="handleCustomerSaved" />
  <ConfirmModal :is-open="showDeleteConfirm" title="حذف مشتری" :message="deleteConfirmMessage"
    :loading="deletingCustomer" @confirm="confirmDeleteCustomer" @cancel="closeDeleteModal" />
  <UndoBar :visible="undoState.visible" :title="undoState.title" :message="undoState.message"
    @undo="handleUndo" @close="clearUndo" />
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import AppPagination from '../AppPagination.vue';
import ConfirmModal from '../ConfirmModal.vue';
import CustomSelect from '../CustomSelect.vue';
import CustomerFormModal from '../CustomerFormModal.vue';
import UndoBar from '../UndoBar.vue';
import AppButton from '../ui/AppButton.vue';
import AppDataTable from '../ui/AppDataTable.vue';
import AppFilterBar from '../ui/AppFilterBar.vue';
import AppIconButton from '../ui/AppIconButton.vue';
import AppTablePanel from '../ui/AppTablePanel.vue';
import { useInvoiceStore } from '../../stores/invoiceStore';
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
const searchQuery = ref('');
const statusFilter = ref('all');
const phoneFilter = ref('all');
const sortKey = ref('total_invoices_amount');
const sortDirection = ref('desc');
const accountStatusOptions = ['خوش حساب', 'بد حساب', 'پرداخت نقدی', 'هماهنگی با مدیر'];
const accountStatusSelectOptions = computed(() => [{ label: 'بدون وضعیت', value: '' }, ...accountStatusOptions.map((value) => ({ label: value, value }))]);
const accountStatusFilterOptions = computed(() => [{ label: 'همه وضعیت‌ها', value: 'all' }, ...accountStatusOptions.map((value) => ({ label: value, value }))]);
const phoneFilterOptions = [
  { label: 'همه مشتریان', value: 'all' },
  { label: 'دارای شماره تماس', value: 'with-phone' },
  { label: 'بدون شماره تماس', value: 'without-phone' }
];
const rows = computed(() => invoiceStore.customersOverview);

function normalize(value) {
  return String(value ?? '').replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06f0-\u06f9]/g, (d) => String(d.charCodeAt(0) - 0x06f0)).replace(/ي/g, 'ی').replace(/ك/g, 'ک').trim().toLowerCase();
}
function normalizePhone(value) { return normalize(value).replace(/[^\d+]/g, ''); }
const filteredRows = computed(() => rows.value.filter((row) => {
  const name = normalize(`${row.first_name || ''} ${row.last_name || ''}`);
  const query = normalize(searchQuery.value);
  const phoneQuery = normalizePhone(searchQuery.value);
  const normalizedPhone = normalizePhone(row.phone);
  const hasPhone = Boolean(normalizedPhone);
  return (!query || name.includes(query) || (phoneQuery && normalizedPhone.includes(phoneQuery)))
    && (statusFilter.value === 'all' || row.account_status === statusFilter.value)
    && (phoneFilter.value === 'all'
      || (phoneFilter.value === 'with-phone' && hasPhone)
      || (phoneFilter.value === 'without-phone' && !hasPhone));
}));
const sortedRows = computed(() => [...filteredRows.value].sort((left, right) => {
  const difference = (Number(left[sortKey.value]) || 0) - (Number(right[sortKey.value]) || 0);
  if (difference !== 0) return sortDirection.value === 'asc' ? difference : -difference;
  return String(left.name || '').localeCompare(String(right.name || ''), 'fa');
}));

const { currentPage, pageSize, pageSizeOptions: pageSizeSelectOptions, totalRows, totalPages, rowStartIndex,
  paginatedItems: paginatedRows, visiblePageNumbers, goToPage } = usePaginatedList(sortedRows, {
  initialPageSize: 15, pageSizeOptions: [10, 15, 20, 50, 100],
  resetSources: [searchQuery, statusFilter, phoneFilter, sortKey, sortDirection], scrollTarget: tableSectionRef
});
const { undoState, clearUndo, showUndo, handleUndo } = useUndoAction({ onError: (error) => toast.error(error.message || 'بازگردانی با خطا مواجه شد') });
const { statusSavingId, showForm, selectedCustomer, showDeleteConfirm, deletingCustomer, deleteConfirmMessage,
  openAddModal, openEditModal, closeModal, openDeleteModal, closeDeleteModal, handleCustomerSaved,
  handleStatusChange, confirmDeleteCustomer } = useUserManagementActions({ invoiceStore, toast, reloadOverview: loadOverview, showUndo });

function formatNumber(value) { return Math.round(Number(value) || 0).toLocaleString('fa-IR'); }
function formatCurrency(value) { return `${formatNumber(value)} تومان`; }
function statusTriggerClass(status) { return ['customers-status-control', status ? getAccountStatusTone(status) : 'border-slate-300 bg-white text-slate-500']; }
function navigateToCustomer(id) { router.push({ name: 'CustomerDetail', params: { id } }); }
function toggleSort(key) {
  if (sortKey.value === key) sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
  else { sortKey.value = key; sortDirection.value = 'asc'; }
}
function sortIcon(key) { return sortKey.value === key ? (sortDirection.value === 'asc' ? '↑' : '↓') : '↕'; }
function sortAriaValue(key) {
  if (sortKey.value !== key) return 'none';
  return sortDirection.value === 'asc' ? 'ascending' : 'descending';
}
function clearFilters() { searchQuery.value = ''; statusFilter.value = 'all'; phoneFilter.value = 'all'; }

async function loadOverview() {
  loading.value = true; errorMessage.value = '';
  try { await invoiceStore.fetchCustomersOverview(); }
  catch { errorMessage.value = 'دریافت فهرست مشتریان با خطا مواجه شد.'; }
  finally { loading.value = false; }
}
function exportCustomers() {
  exportRowsToExcel({ fileName: 'customers-export', sheetTitle: 'فهرست مشتریان',
    headers: ['نام', 'نام خانوادگی', 'وضعیت حساب', 'تعداد لیست', 'مبلغ کل', 'شماره تماس', 'معرف'],
    rows: sortedRows.value.map((row) => [row.first_name || '', row.last_name || '', row.account_status || '',
      row.list_count, row.total_invoices_amount, row.phone || '', row.referrer || '']) });
}
onMounted(async () => { await Promise.all([loadOverview(), invoiceStore.fetchCustomers()]); });
</script>

<style scoped>
.customers-table :deep(.app-table) { width: 100%; table-layout: fixed; }
.customers-table :deep(.app-table-wrapper) { overflow-x: hidden; }
.customers-table :deep(th), .customers-table :deep(td) { padding: .65rem .45rem; vertical-align: middle; }
.customers-table :deep(th:nth-child(1)) { width: 5%; }
.customers-table :deep(th:nth-child(2)) { width: 17%; }
.customers-table :deep(th:nth-child(3)) { width: 14%; }
.customers-table :deep(th:nth-child(4)) { width: 8%; }
.customers-table :deep(th:nth-child(5)) { width: 15%; }
.customers-table :deep(th:nth-child(6)) { width: 13%; }
.customers-table :deep(th:nth-child(7)) { width: 12%; }
.customers-table :deep(th:nth-child(8)) { width: 16%; }
.customers-table :deep(.customer-sort-button) { display: inline-flex; width: 100%; align-items: center; justify-content: center; gap: .35rem; font: inherit; color: inherit; }
.customers-table :deep(.customer-sort-button:hover) { color: #4338ca; }
.customers-table :deep(.customer-sort-button:focus-visible) { border-radius: .35rem; outline: 2px solid #818cf8; outline-offset: 2px; }
.customers-table :deep(.customer-sort-icon) { min-width: 1rem; color: #6366f1; font-size: .85rem; }
.customers-table :deep(.customers-status-control) { width: 100%; min-width: 0; height: 2.25rem; border: 1px solid #cbd5e1; border-radius: .5rem; padding: 0 .5rem; font-size: .72rem; }
@media (max-width: 1023px) {
  .customers-table :deep(th:nth-child(4)), .customers-table :deep(td:nth-child(4)),
  .customers-table :deep(th:nth-child(7)), .customers-table :deep(td:nth-child(7)) { display: none; }
  .customers-table :deep(th:nth-child(1)) { width: 8%; }
  .customers-table :deep(th:nth-child(2)) { width: 27%; }
  .customers-table :deep(th:nth-child(3)) { width: 22%; }
  .customers-table :deep(th:nth-child(5)) { width: 23%; }
  .customers-table :deep(th:nth-child(6)) { width: 20%; }
  .customers-table :deep(th:nth-child(8)) { width: 20%; }
}
</style>
