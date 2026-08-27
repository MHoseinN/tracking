<template>
  <div ref="tableSectionRef" class="space-y-5">
    <Teleport to="#app-shell-actions">
      <AppButton variant="primary" block :loading="creatingList" @click="createListForCustomer">ایجاد لیست برای مشتری</AppButton>
      <AppButton variant="info" block @click="exportCustomerLists">گزارش‌گیری</AppButton>
      <AppButton variant="secondary" block @click="router.push('/users')">بازگشت به مشتریان</AppButton>
    </Teleport>

    <CustomerSummaryPanel :customer="customer" :settled-amount="formatCurrency(summary.paid_total_toman)"
      :remaining-amount="formatCurrency(summary.balance_toman)" :open="isCustomerInfoOpen"
      :draft="customerProfileDraft" :notes="customerNotesDraft"
      :account-status-select-options="accountStatusSelectOptions" :phone-duplicate-error="phoneDuplicateError"
      :changed="customerFormChanged" :saving="customerFormSaving"
      @toggle="isCustomerInfoOpen = !isCustomerInfoOpen" @update-field="updateProfileField"
      @update:notes="customerNotesDraft = $event" @save="saveCustomerForm" />

    <AppTablePanel title="لیست‌های این مشتری"
      description="وضعیت تحویل، فاکتور، ارسال و تسویه این مشتری بر اساس مدل جدید نمایش داده می‌شود."
      :count="loading ? null : filteredLists.length">
      <AppDataTable class="customer-lists-table" :column-count="9" :loading="loading"
        :empty="!filteredLists.length" min-width="100%" loading-message="در حال دریافت لیست‌های مشتری..."
        empty-message="برای این مشتری لیستی با فیلتر فعلی پیدا نشد.">
        <template #head>
          <tr>
            <th>ردیف</th><th>شماره لیست</th><th>تاریخ تحویل</th><th>وضعیت لیست</th><th>فاکتور</th>
            <th>ارسال</th><th>تسویه</th><th>مبلغ فاکتور</th><th>عملیات</th>
          </tr>
          <tr class="customer-lists-filter-row">
            <th />
            <th><input v-model.trim="searchQuery" class="customer-list-filter" type="search" placeholder="شماره لیست" /></th>
            <th />
            <th><CustomSelect v-model="listStatusFilter" :options="listStatusOptions" trigger-class="customer-list-filter" /></th>
            <th><CustomSelect v-model="invoiceStatusFilter" :options="invoiceStatusOptions" trigger-class="customer-list-filter" /></th>
            <th><CustomSelect v-model="sendStatusFilter" :options="sendStatusOptions" trigger-class="customer-list-filter" /></th>
            <th><CustomSelect v-model="settlementStatusFilter" :options="settlementStatusOptions" trigger-class="customer-list-filter" /></th>
            <th />
            <th>
              <AppIconButton label="پاک‌کردن فیلترها" size="sm" @click="clearFilters">
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-width="2" d="M6 18 18 6M6 6l12 12" /></svg>
              </AppIconButton>
            </th>
          </tr>
        </template>

        <tr v-for="(list, index) in paginatedLists" :key="list.id" class="app-table-row">
          <td class="text-center font-bold text-slate-500">{{ formatNumber(rowStartIndex + index + 1) }}</td>
          <td class="font-black text-slate-800">{{ displayListNumber(list) }}</td>
          <td>{{ formatDate(list.delivered_at) }}</td>
          <td><AppStatusBadge group="list" :status="list.status" /></td>
          <td><AppStatusBadge group="invoice" :status="list.invoice_status" /></td>
          <td><AppStatusBadge group="send" :status="list.invoice_send_status" /></td>
          <td><AppStatusBadge group="settlement" :status="list.settlement_status" /></td>
          <td class="font-black text-slate-800">{{ hasInvoice(list) ? formatCurrency(list.invoice_total_toman) : '—' }}</td>
          <td>
            <AppIconButton label="مشاهده جزئیات" size="sm" @click="router.push(`/lists/${list.id}`)">
              <svg class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="19" cy="12" r="1.7" /></svg>
            </AppIconButton>
          </td>
        </tr>
      </AppDataTable>
      <template #footer>
        <AppPagination :total-rows="totalRows" :row-start-index="rowStartIndex" :page-size="pageSize"
          :page-size-options="pageSizeOptions" :current-page="currentPage" :total-pages="totalPages"
          :visible-page-numbers="visiblePageNumbers" @update:page-size="pageSize = $event" @go-to-page="goToPage" />
      </template>
    </AppTablePanel>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import AppPagination from '../AppPagination.vue';
import CustomSelect from '../CustomSelect.vue';
import CustomerSummaryPanel from './CustomerSummaryPanel.vue';
import AppButton from '../ui/AppButton.vue';
import AppDataTable from '../ui/AppDataTable.vue';
import AppIconButton from '../ui/AppIconButton.vue';
import AppStatusBadge from '../ui/AppStatusBadge.vue';
import AppTablePanel from '../ui/AppTablePanel.vue';
import { useDeliveryListStore } from '../../stores/deliveryListStore';
import { useInvoiceStore } from '../../stores/invoiceStore';
import { usePaginatedList } from '../../composables/usePaginatedList';
import { useCustomerProfileForm } from '../../composables/useCustomerProfileForm';
import { exportRowsToExcel } from '../../utils/exportToExcel';
import { toPersianDate } from '../../utils/dateConverter';

const props = defineProps({ id: { type: [String, Number], required: true } });
const router = useRouter();
const toast = useToast();
const invoiceStore = useInvoiceStore();
const deliveryListStore = useDeliveryListStore();
const customerId = computed(() => Number(props.id));
const customer = ref(null);
const lists = ref([]);
const allCustomers = ref([]);
const loading = ref(false);
const creatingList = ref(false);
const isCustomerInfoOpen = ref(false);
const tableSectionRef = ref(null);
const summary = ref({ list_count: 0, invoice_count: 0, invoiced_total_toman: 0, paid_total_toman: 0, balance_toman: 0 });
const searchQuery = ref('');
const listStatusFilter = ref('all');
const invoiceStatusFilter = ref('all');
const sendStatusFilter = ref('all');
const settlementStatusFilter = ref('all');

const makeOptions = (items) => [{ label: 'همه', value: 'all' }, ...items];
const listStatusOptions = makeOptions([
  { label: 'پیش‌نویس', value: 'DRAFT' }, { label: 'تحویل‌شده', value: 'DELIVERED' },
  { label: 'مانده', value: 'REMAINING' }, { label: 'نیاز به پیگیری', value: 'NEEDS_FOLLOW_UP' },
  { label: 'تکمیل', value: 'COMPLETED' }
]);
const invoiceStatusOptions = makeOptions([
  { label: 'بدون فاکتور', value: 'NONE' }, { label: 'پیش‌فاکتور', value: 'PROFORMA' },
  { label: 'صدور جزئی', value: 'PARTIALLY_ISSUED' }, { label: 'صادرشده', value: 'ISSUED' }
]);
const sendStatusOptions = makeOptions([
  { label: 'ارسال‌نشده', value: 'NOT_SENT' }, { label: 'ارسال جزئی', value: 'PARTIALLY_SENT' },
  { label: 'ارسال‌شده', value: 'SENT' }
]);
const settlementStatusOptions = makeOptions([
  { label: 'تسویه‌نشده', value: 'UNPAID' }, { label: 'تسویه جزئی', value: 'PARTIAL' },
  { label: 'تسویه کامل', value: 'PAID' }
]);

const filteredLists = computed(() => lists.value.filter((list) => (
  (!searchQuery.value || String(list.list_number || list.id).includes(searchQuery.value))
  && (listStatusFilter.value === 'all' || list.status === listStatusFilter.value)
  && (invoiceStatusFilter.value === 'all' || list.invoice_status === invoiceStatusFilter.value)
  && (sendStatusFilter.value === 'all' || list.invoice_send_status === sendStatusFilter.value)
  && (settlementStatusFilter.value === 'all' || list.settlement_status === settlementStatusFilter.value)
)));

const { currentPage, pageSize, pageSizeOptions, totalRows, totalPages, rowStartIndex,
  paginatedItems: paginatedLists, visiblePageNumbers, goToPage } = usePaginatedList(filteredLists, {
  initialPageSize: 15, pageSizeOptions: [10, 15, 20, 50, 100],
  resetSources: [searchQuery, listStatusFilter, invoiceStatusFilter, sendStatusFilter, settlementStatusFilter],
  scrollTarget: tableSectionRef
});

const { customerProfileDraft, customerNotesDraft, accountStatusSelectOptions, customerFormSaving,
  customerFormChanged, phoneDuplicateError, resetFromCustomer, updateProfileField, saveCustomerForm } = useCustomerProfileForm({
  customer, allCustomers, customerId, invoiceStore, toast, reloadCustomers: loadCustomers
});

onMounted(async () => { await Promise.all([loadWorkflow(), loadCustomers()]); });

async function loadWorkflow() {
  loading.value = true;
  try {
    const data = await invoiceStore.fetchCustomerWorkflow(customerId.value);
    customer.value = data.customer;
    lists.value = data.lists || [];
    summary.value = data.summary || summary.value;
    resetFromCustomer();
  } catch (error) {
    toast.error(invoiceStore.error || 'دریافت اطلاعات مشتری با خطا مواجه شد');
    if (error.response?.status === 404) router.replace('/users');
  } finally { loading.value = false; }
}

async function loadCustomers() {
  try { await invoiceStore.fetchCustomers(); allCustomers.value = [...invoiceStore.customers]; }
  catch { allCustomers.value = []; }
}

async function createListForCustomer() {
  if (creatingList.value) return;
  creatingList.value = true;
  const result = await deliveryListStore.createDraft();
  creatingList.value = false;
  if (!result.success) return toast.error(result.message);
  router.push({ path: `/lists/${result.data.id}/edit`, query: { customer_id: customerId.value } });
}

function clearFilters() {
  searchQuery.value = ''; listStatusFilter.value = 'all'; invoiceStatusFilter.value = 'all';
  sendStatusFilter.value = 'all'; settlementStatusFilter.value = 'all';
}
function hasInvoice(list) { return ['PARTIALLY_ISSUED', 'ISSUED'].includes(list.invoice_status); }
function displayListNumber(list) {
  if (list.list_number) return list.list_number;
  return list.status === 'DRAFT' ? `پیش‌نویس ${formatNumber(list.id)}` : `سابقه ${formatNumber(list.id)}`;
}
function formatNumber(value) { return Math.round(Number(value) || 0).toLocaleString('fa-IR'); }
function formatCurrency(value) { return `${formatNumber(value)} تومان`; }
function formatDate(value) { return value ? toPersianDate(String(value).slice(0, 10)) : '—'; }

function exportCustomerLists() {
  exportRowsToExcel({
    fileName: `customer-${customerId.value}-lists`, sheetTitle: `لیست‌های ${customer.value?.name || 'مشتری'}`,
    headers: ['شماره لیست', 'تاریخ تحویل', 'وضعیت لیست', 'فاکتور', 'ارسال', 'تسویه', 'مبلغ فاکتور'],
    rows: filteredLists.value.map((list) => [list.list_number || list.id, formatDate(list.delivered_at),
      list.status, list.invoice_status, list.invoice_send_status, list.settlement_status, list.invoice_total_toman])
  });
}
</script>

<style scoped>
.customer-lists-table :deep(.app-table) { width: 100%; table-layout: fixed; }
.customer-lists-table :deep(.app-table-wrapper) { overflow-x: hidden; }
.customer-lists-table :deep(th), .customer-lists-table :deep(td) { padding: .65rem .4rem; text-align: center; vertical-align: middle; }
.customer-lists-table :deep(th:nth-child(1)) { width: 4%; }
.customer-lists-table :deep(th:nth-child(2)) { width: 13%; }
.customer-lists-table :deep(th:nth-child(3)) { width: 12%; }
.customer-lists-table :deep(th:nth-child(4)) { width: 12%; }
.customer-lists-table :deep(th:nth-child(5)) { width: 11%; }
.customer-lists-table :deep(th:nth-child(6)) { width: 11%; }
.customer-lists-table :deep(th:nth-child(7)) { width: 14%; }
.customer-lists-table :deep(th:nth-child(8)) { width: 15%; }
.customer-lists-table :deep(th:nth-child(9)) { width: 8%; }
.customer-lists-filter-row th { padding: .35rem; background: #f8fafc; }
.customer-list-filter { width: 100%; min-width: 0; height: 2.25rem; border: 1px solid #cbd5e1; border-radius: .5rem; background: white; padding: 0 .4rem; font-size: .68rem; }
.customer-lists-table :deep(.app-status-badge) { max-width: 100%; padding-inline: .35rem; white-space: normal; justify-content: center; }
@media (max-width: 1023px) {
  .customer-lists-table :deep(th:nth-child(3)), .customer-lists-table :deep(td:nth-child(3)),
  .customer-lists-table :deep(th:nth-child(6)), .customer-lists-table :deep(td:nth-child(6)),
  .customer-lists-table :deep(th:nth-child(8)), .customer-lists-table :deep(td:nth-child(8)) { display: none; }
  .customer-lists-table :deep(th:nth-child(1)) { width: 8%; }
  .customer-lists-table :deep(th:nth-child(2)) { width: 18%; }
  .customer-lists-table :deep(th:nth-child(4)) { width: 18%; }
  .customer-lists-table :deep(th:nth-child(5)) { width: 18%; }
  .customer-lists-table :deep(th:nth-child(7)) { width: 25%; }
  .customer-lists-table :deep(th:nth-child(9)) { width: 13%; }
}
</style>
