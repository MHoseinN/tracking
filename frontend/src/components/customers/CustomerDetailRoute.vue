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
      <template #filters>
        <AppFilterBar :expanded="filtersExpanded" collapsible columns-class="md:grid-cols-2 xl:grid-cols-3"
          advanced-columns-class="md:grid-cols-3" @update:expanded="filtersExpanded = $event">
          <label class="app-filter-field"><span class="app-filter-label">جست‌وجوی لیست</span>
            <input v-model.trim="searchQuery" class="app-filter-control" type="search" placeholder="جست‌وجوی شماره لیست" /></label>
          <label class="app-filter-field"><span class="app-filter-label">تاریخ تحویل</span>
            <JalaliDatePicker v-model="deliveryDateFilter" input-class="app-filter-control !h-11" /></label>
          <label class="app-filter-field"><span class="app-filter-label">وضعیت لیست</span>
            <CustomSelect v-model="listStatusFilter" :options="listStatusOptions" trigger-class="app-filter-control" /></label>
          <template #advanced>
            <label class="app-filter-field"><span class="app-filter-label">وضعیت فاکتور</span>
              <CustomSelect v-model="invoiceStatusFilter" :options="invoiceStatusOptions" trigger-class="app-filter-control" /></label>
            <label class="app-filter-field"><span class="app-filter-label">وضعیت ارسال</span>
              <CustomSelect v-model="sendStatusFilter" :options="sendStatusOptions" trigger-class="app-filter-control" /></label>
            <label class="app-filter-field"><span class="app-filter-label">وضعیت تسویه</span>
              <CustomSelect v-model="settlementStatusFilter" :options="settlementStatusOptions" trigger-class="app-filter-control" /></label>
          </template>
          <template #actions><AppButton variant="secondary" @click="clearFilters">پاک‌کردن فیلترها</AppButton></template>
        </AppFilterBar>
      </template>
      <AppDataTable class="customer-lists-table" :column-count="9" :loading="loading"
        :empty="!filteredLists.length" min-width="100%" loading-message="در حال دریافت لیست‌های مشتری..."
        empty-message="برای این مشتری لیستی با فیلتر فعلی پیدا نشد.">
        <template #head>
          <tr>
            <th>ردیف</th>
            <th>شماره لیست</th>
            <th :aria-sort="sortAriaValue('deliveredAt')">
              <button class="customer-list-sort" type="button" @click="toggleListSort('deliveredAt')">
                <span>تاریخ تحویل</span>
                <span class="customer-list-sort__icon" aria-hidden="true">{{ sortIcon('deliveredAt') }}</span>
              </button>
            </th>
            <th>وضعیت لیست</th><th>فاکتور</th>
            <th>ارسال</th><th>تسویه</th>
            <th :aria-sort="sortAriaValue('invoiceAmount')">
              <button class="customer-list-sort" type="button" @click="toggleListSort('invoiceAmount')">
                <span>مبلغ فاکتور</span>
                <span class="customer-list-sort__icon" aria-hidden="true">{{ sortIcon('invoiceAmount') }}</span>
              </button>
            </th>
            <th>عملیات</th>
          </tr>
        </template>

        <tr v-for="(list, index) in paginatedLists" :key="list.id" class="app-table-row">
          <td class="text-center font-bold text-slate-500">{{ formatNumber(rowStartIndex + index + 1) }}</td>
          <td class="font-black text-slate-800">{{ displayListNumber(list) }}</td>
          <td>{{ formatDate(list.delivered_at) }}</td>
          <td><AppStatusButton group="list" :status="list.status" :loading="isActionLoading(list, 'list')"
              :aria-label="`مدیریت وضعیت لیست ${displayListNumber(list)}`" @click="manageListStatus(list)" /></td>
          <td><AppStatusButton group="invoice" :status="list.invoice_status" :loading="isActionLoading(list, 'invoice')"
              :aria-label="`مدیریت فاکتور ${displayListNumber(list)}`" @click="manageInvoice(list)" /></td>
          <td>
            <AppStatusButton v-if="hasIssuedInvoice(list)" group="send" :status="list.invoice_send_status"
              :loading="isActionLoading(list, 'send')" :aria-label="`مدیریت ارسال ${displayListNumber(list)}`"
              @click="manageInvoiceSend(list)" />
            <AppStatusBadge v-else group="send" :status="list.invoice_send_status" />
          </td>
          <td>
            <AppStatusButton v-if="list.status !== 'DRAFT'" group="settlement" :status="list.settlement_status"
              :loading="isActionLoading(list, 'settlement')" :aria-label="`مدیریت تسویه ${displayListNumber(list)}`"
              @click="openSettlement(list)" />
            <AppStatusBadge v-else group="settlement" :status="list.settlement_status" />
          </td>
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

    <DeliveryInvoiceIssueModal :is-open="showInvoiceIssueModal" :preview="invoicePreview" :saving="issuingInvoice"
      @close="closeInvoiceIssueModal" @issue="handleIssueInvoice" />
    <DeliveryInvoiceSendModal :is-open="showInvoiceSendModal" :invoice="sendInvoice" :saving="updatingSendStatus"
      @close="closeInvoiceSendModal" @save="handleInvoiceSend" @request-unsent="invoiceToResetSend = sendInvoice" />
    <DeliverySettlementModal :is-open="showSettlementModal" :summary="settlementSummary" :saving="settlementSaving"
      @close="showSettlementModal = false" @record="handleRecordPayment" @void="handleVoidPayment" />
    <ConfirmModal :is-open="Boolean(invoiceToResetSend)" title="لغو وضعیت ارسال فاکتور"
      :message="`فاکتور ${invoiceToResetSend?.invoice_number || ''} دوباره به وضعیت «ارسال‌نشده» برگردد؟ این تغییر در تاریخچه ثبت می‌شود.`"
      :loading="updatingSendStatus" confirm-text="بله، ارسال‌نشده شود" loading-text="در حال ثبت..."
      @confirm="confirmResetInvoiceSend" @cancel="invoiceToResetSend = null" />
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import AppPagination from '../AppPagination.vue';
import ConfirmModal from '../ConfirmModal.vue';
import CustomSelect from '../CustomSelect.vue';
import JalaliDatePicker from '../JalaliDatePicker.vue';
import CustomerSummaryPanel from './CustomerSummaryPanel.vue';
import AppButton from '../ui/AppButton.vue';
import AppDataTable from '../ui/AppDataTable.vue';
import AppFilterBar from '../ui/AppFilterBar.vue';
import AppIconButton from '../ui/AppIconButton.vue';
import AppStatusBadge from '../ui/AppStatusBadge.vue';
import AppStatusButton from '../ui/AppStatusButton.vue';
import AppTablePanel from '../ui/AppTablePanel.vue';
import DeliveryInvoiceIssueModal from '../delivery-lists/DeliveryInvoiceIssueModal.vue';
import DeliveryInvoiceSendModal from '../delivery-lists/DeliveryInvoiceSendModal.vue';
import DeliverySettlementModal from '../delivery-lists/DeliverySettlementModal.vue';
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
const filtersExpanded = ref(false);
const deliveryDateFilter = ref('');
const listStatusFilter = ref('all');
const invoiceStatusFilter = ref('all');
const sendStatusFilter = ref('all');
const settlementStatusFilter = ref('all');
const listSorts = reactive({ deliveredAt: 'desc', invoiceAmount: 'desc' });
const listSortPriority = ref(['deliveredAt', 'invoiceAmount']);
const actionLoadingKey = ref('');
const invoiceTargetList = ref(null);
const invoicePreview = ref(null);
const showInvoiceIssueModal = ref(false);
const issuingInvoice = ref(false);
const sendTargetList = ref(null);
const sendInvoice = ref(null);
const showInvoiceSendModal = ref(false);
const updatingSendStatus = ref(false);
const invoiceToResetSend = ref(null);
const showSettlementModal = ref(false);
const settlementSummary = ref(null);
const settlementSaving = ref(false);

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
  && (!deliveryDateFilter.value || formatDate(list.delivered_at) === deliveryDateFilter.value)
  && (listStatusFilter.value === 'all' || list.status === listStatusFilter.value)
  && (invoiceStatusFilter.value === 'all' || list.invoice_status === invoiceStatusFilter.value)
  && (sendStatusFilter.value === 'all' || list.invoice_send_status === sendStatusFilter.value)
  && (settlementStatusFilter.value === 'all' || list.settlement_status === settlementStatusFilter.value)
)));

const sortedLists = computed(() => filteredLists.value
  .map((list, originalIndex) => ({ list, originalIndex }))
  .sort((leftEntry, rightEntry) => {
    for (const key of listSortPriority.value) {
      const direction = listSorts[key] === 'asc' ? 1 : -1;
      const leftValue = listSortValue(leftEntry.list, key);
      const rightValue = listSortValue(rightEntry.list, key);
      if (leftValue !== rightValue) return (leftValue - rightValue) * direction;
    }
    return leftEntry.originalIndex - rightEntry.originalIndex;
  })
  .map(({ list }) => list));

const { currentPage, pageSize, pageSizeOptions, totalRows, totalPages, rowStartIndex,
  paginatedItems: paginatedLists, visiblePageNumbers, goToPage } = usePaginatedList(sortedLists, {
  initialPageSize: 15, pageSizeOptions: [10, 15, 20, 50, 100],
  resetSources: [searchQuery, deliveryDateFilter, listStatusFilter, invoiceStatusFilter, sendStatusFilter, settlementStatusFilter],
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

function setActionLoading(list, action) {
  actionLoadingKey.value = list ? `${list.id}:${action}` : '';
}

function isActionLoading(list, action) {
  return actionLoadingKey.value === `${list.id}:${action}`;
}

async function manageListStatus(list) {
  if (list.status === 'DRAFT') return router.push(`/lists/${list.id}/edit`);
  return router.push(`/lists/${list.id}`);
}

async function manageInvoice(list) {
  if (list.status === 'DRAFT') {
    toast.info('ابتدا تحویل این پیش‌نویس را ثبت کنید');
    return router.push(`/lists/${list.id}/edit`);
  }
  setActionLoading(list, 'invoice');
  const result = await deliveryListStore.getInvoicePreview(list.id);
  setActionLoading();
  if (!result.success) return toast.error(result.message);
  if (!(result.data.lines || []).length) {
    toast.info('مرجوعی فاکتورنشده‌ای برای صدور وجود ندارد؛ جزئیات لیست باز شد');
    return router.push(`/lists/${list.id}`);
  }
  invoiceTargetList.value = list;
  invoicePreview.value = result.data;
  showInvoiceIssueModal.value = true;
}

function closeInvoiceIssueModal() {
  if (issuingInvoice.value) return;
  showInvoiceIssueModal.value = false;
  invoiceTargetList.value = null;
  invoicePreview.value = null;
}

async function handleIssueInvoice(payload) {
  if (!invoiceTargetList.value || issuingInvoice.value) return;
  issuingInvoice.value = true;
  const result = await deliveryListStore.issueInvoice(invoiceTargetList.value.id, payload);
  issuingInvoice.value = false;
  if (!result.success) return toast.error(result.message);
  closeInvoiceIssueModal();
  await loadWorkflow();
  toast.success(`فاکتور ${result.data.invoice.invoice_number} صادر شد`);
}

async function manageInvoiceSend(list) {
  setActionLoading(list, 'send');
  const detailResult = await deliveryListStore.getListDetails(list.id);
  if (!detailResult.success) {
    setActionLoading();
    return toast.error(detailResult.message);
  }
  const invoices = detailResult.data.invoices || [];
  const targetInvoice = invoices.find((invoice) => invoice.send_status !== 'SENT') || invoices[invoices.length - 1];
  if (!targetInvoice) {
    setActionLoading();
    return toast.info('ابتدا فاکتور این لیست را صادر کنید');
  }
  const invoiceResult = await deliveryListStore.getInvoice(list.id, targetInvoice.id);
  setActionLoading();
  if (!invoiceResult.success) return toast.error(invoiceResult.message);
  sendTargetList.value = list;
  sendInvoice.value = invoiceResult.data;
  showInvoiceSendModal.value = true;
}

async function handleInvoiceSend(payload) {
  if (updatingSendStatus.value || !sendInvoice.value || !sendTargetList.value) return;
  updatingSendStatus.value = true;
  const result = await deliveryListStore.updateInvoiceSendStatus(sendTargetList.value.id, sendInvoice.value.id, payload);
  updatingSendStatus.value = false;
  if (!result.success) return toast.error(result.message);
  sendInvoice.value = result.data.invoice;
  await loadWorkflow();
  toast.success('ارسال فاکتور ثبت شد');
}

async function confirmResetInvoiceSend() {
  if (updatingSendStatus.value || !invoiceToResetSend.value || !sendTargetList.value) return;
  updatingSendStatus.value = true;
  const result = await deliveryListStore.updateInvoiceSendStatus(sendTargetList.value.id, invoiceToResetSend.value.id, {
    send_status: 'NOT_SENT', channel: 'MANUAL', sent_at: new Date().toISOString(),
    notes: 'وضعیت ارسال با تأیید کاربر لغو شد'
  });
  updatingSendStatus.value = false;
  if (!result.success) return toast.error(result.message);
  sendInvoice.value = result.data.invoice;
  invoiceToResetSend.value = null;
  await loadWorkflow();
  toast.success('فاکتور به وضعیت ارسال‌نشده برگشت');
}

function closeInvoiceSendModal() {
  if (updatingSendStatus.value) return;
  showInvoiceSendModal.value = false;
  sendTargetList.value = null;
  sendInvoice.value = null;
  invoiceToResetSend.value = null;
}

async function openSettlement(list) {
  setActionLoading(list, 'settlement');
  const result = await deliveryListStore.getSettlement(list.id);
  setActionLoading();
  if (!result.success) return toast.error(result.message);
  settlementSummary.value = result.data;
  showSettlementModal.value = true;
}

async function handleRecordPayment(payload) {
  if (settlementSaving.value) return;
  settlementSaving.value = true;
  const result = await deliveryListStore.recordPayment(settlementSummary.value.list.id, payload);
  settlementSaving.value = false;
  if (!result.success) return toast.error(result.message);
  settlementSummary.value = result.data;
  await loadWorkflow();
  toast.success('پرداخت ثبت شد');
}

async function handleVoidPayment(paymentId) {
  if (settlementSaving.value) return;
  settlementSaving.value = true;
  const result = await deliveryListStore.voidPayment(settlementSummary.value.list.id, paymentId);
  settlementSaving.value = false;
  if (!result.success) return toast.error(result.message);
  settlementSummary.value = result.data;
  await loadWorkflow();
  toast.success('پرداخت باطل شد و وضعیت تسویه دوباره محاسبه شد');
}

function clearFilters() {
  searchQuery.value = ''; deliveryDateFilter.value = ''; listStatusFilter.value = 'all'; invoiceStatusFilter.value = 'all';
  sendStatusFilter.value = 'all'; settlementStatusFilter.value = 'all';
}
function listSortValue(list, key) {
  if (key === 'invoiceAmount') return Number(list.invoice_total_toman) || 0;
  const rawDate = list.delivered_at || list.created_at;
  if (!rawDate) return 0;
  return Date.parse(String(rawDate).replace(' ', 'T')) || 0;
}
function toggleListSort(key) {
  listSorts[key] = listSorts[key] === 'desc' ? 'asc' : 'desc';
  listSortPriority.value = [key, ...listSortPriority.value.filter((item) => item !== key)];
  currentPage.value = 1;
}
function sortIcon(key) { return listSorts[key] === 'desc' ? '↓' : '↑'; }
function sortAriaValue(key) { return listSorts[key] === 'desc' ? 'descending' : 'ascending'; }
function hasInvoice(list) { return hasIssuedInvoice(list); }
function hasIssuedInvoice(list) { return ['PARTIALLY_ISSUED', 'ISSUED'].includes(list.invoice_status); }
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
    rows: sortedLists.value.map((list) => [list.list_number || list.id, formatDate(list.delivered_at),
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
.customer-lists-table :deep(.app-status-badge) { max-width: 100%; padding-inline: .35rem; white-space: normal; justify-content: center; }
.customer-list-sort { display: inline-flex; width: 100%; align-items: center; justify-content: center; gap: .35rem; color: inherit; font: inherit; }
.customer-list-sort__icon { color: #0f766e; font-size: .95rem; font-weight: 900; }
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
