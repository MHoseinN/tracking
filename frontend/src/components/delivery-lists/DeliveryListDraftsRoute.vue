<template>
  <div ref="tableSectionRef" class="space-y-5">
    <Teleport to="#app-shell-actions">
      <AppButton variant="primary" block :loading="creating" @click="createNewDraft">
        {{ creating ? 'در حال ایجاد...' : 'ایجاد لیست جدید' }}
      </AppButton>
    </Teleport>

    <AppTablePanel
      title="مرکز مدیریت لیست‌ها"
      :count="draftStore.loading ? null : filteredDrafts.length"
    >
      <template #filters>
        <AppFilterBar :expanded="filtersExpanded" collapsible columns-class="md:grid-cols-2 xl:grid-cols-3"
          advanced-columns-class="md:grid-cols-3" @update:expanded="filtersExpanded = $event">
          <label class="app-filter-field">
            <span class="app-filter-label">جستجو</span>
            <input v-model.trim="searchQuery" type="search" placeholder="مشتری یا شماره لیست" class="app-filter-control" />
          </label>
          <label class="app-filter-field">
            <span class="app-filter-label">تاریخ تحویل</span>
            <JalaliDatePicker v-model="deliveryDateFilter" input-class="app-filter-control !h-11" />
          </label>
          <label class="app-filter-field">
            <span class="app-filter-label">وضعیت لیست</span>
            <CustomSelect v-model="listStatusFilter" :options="listStatusOptions" trigger-class="app-filter-control" />
          </label>
          <template #advanced>
            <label class="app-filter-field"><span class="app-filter-label">وضعیت فاکتور</span>
              <CustomSelect v-model="invoiceStatusFilter" :options="invoiceStatusOptions" trigger-class="app-filter-control" /></label>
            <label class="app-filter-field"><span class="app-filter-label">وضعیت ارسال</span>
              <CustomSelect v-model="sendStatusFilter" :options="sendStatusOptions" trigger-class="app-filter-control" /></label>
            <label class="app-filter-field"><span class="app-filter-label">وضعیت تسویه</span>
              <CustomSelect v-model="settlementStatusFilter" :options="settlementStatusOptions" trigger-class="app-filter-control" /></label>
          </template>
          <template #actions>
            <AppButton variant="secondary" @click="clearFilters">پاک‌کردن فیلترها</AppButton>
          </template>
        </AppFilterBar>
      </template>

      <AppDataTable
        class="delivery-lists-table"
        :column-count="9"
        :loading="draftStore.loading"
        :empty="!filteredDrafts.length"
        min-width="100%"
        sticky-header
        loading-message="در حال دریافت لیست‌ها..."
        empty-message="لیستی با این جست‌وجو یا فیلتر پیدا نشد."
      >
        <template #head>
          <tr>
            <th>ردیف</th>
            <th>مشتری</th>
            <th>تاریخ تحویل</th>
            <th>وضعیت لیست</th>
            <th>فاکتور</th>
            <th>ارسال</th>
            <th>تسویه</th>
            <th>مبلغ فاکتور</th>
            <th>عملیات</th>
          </tr>
        </template>

        <tr v-for="(draft, index) in paginatedDrafts" :key="draft.id" class="app-table-row">
          <td class="text-center font-bold text-slate-500">{{ formatNumber(rowStartIndex + index + 1) }}</td>
          <td class="font-bold text-slate-900">{{ draft.customer_name || 'نامشخص' }}</td>
          <td>{{ formatDate(draft.delivered_at) }}</td>
          <td>
            <AppStatusButton
              group="list"
              :status="draft.status"
              :loading="isActionLoading(draft, 'list')"
              :aria-label="`مدیریت وضعیت لیست ${draft.list_number || draft.id}`"
              @click="manageListStatus(draft)"
            />
          </td>
          <td>
            <AppStatusButton
              group="invoice"
              :status="draft.invoice_status"
              :loading="isActionLoading(draft, 'invoice')"
              :aria-label="`مدیریت فاکتور لیست ${draft.list_number || draft.id}`"
              @click="manageInvoice(draft)"
            />
          </td>
          <td>
            <AppStatusButton
              v-if="draft.invoice_status !== 'NONE' && draft.invoice_status !== 'PROFORMA'"
              group="send"
              :status="draft.invoice_send_status"
              :loading="isActionLoading(draft, 'send')"
              :aria-label="`مدیریت ارسال فاکتور لیست ${draft.list_number || draft.id}`"
              @click="manageInvoiceSend(draft)"
            />
            <AppStatusBadge v-else group="send" :status="draft.invoice_send_status" />
          </td>
          <td>
            <AppStatusButton
              v-if="draft.status !== 'DRAFT'"
              group="settlement"
              :status="draft.settlement_status"
              :loading="isActionLoading(draft, 'settlement')"
              :aria-label="`مدیریت تسویه لیست ${draft.list_number || draft.id}`"
              @click="openSettlement(draft)"
            />
            <AppStatusBadge v-else group="settlement" :status="draft.settlement_status" />
          </td>
          <td class="font-black text-slate-800">
            {{ hasIssuedInvoice(draft) ? formatCurrency(draft.invoice_total_toman) : '—' }}
          </td>
          <td>
            <div class="flex items-center justify-center gap-1">
              <AppIconButton label="مشاهده جزئیات" size="sm" @click="router.push(`/lists/${draft.id}`)">
                <svg class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <circle cx="5" cy="12" r="1.7" />
                  <circle cx="12" cy="12" r="1.7" />
                  <circle cx="19" cy="12" r="1.7" />
                </svg>
              </AppIconButton>
              <AppIconButton
                label="حذف رکورد"
                size="sm"
                variant="danger"
                @click="draftToDelete = draft"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 7h12m-9 0V5h6v2m-8 0 1 13h8l1-13M10 11v5m4-5v5" />
                </svg>
              </AppIconButton>
            </div>
          </td>
        </tr>
      </AppDataTable>

      <template #footer>
        <AppPagination
          :total-rows="totalRows"
          :row-start-index="rowStartIndex"
          :page-size="pageSize"
          :page-size-options="pageSizeOptions"
          :current-page="currentPage"
          :total-pages="totalPages"
          :visible-page-numbers="visiblePageNumbers"
          @update:page-size="pageSize = $event"
          @go-to-page="goToPage"
        />
      </template>
    </AppTablePanel>

    <ConfirmModal
      :is-open="Boolean(draftToDelete)"
      title="حذف رکورد لیست"
      :message="`آیا از حذف ${draftToDelete?.list_number ? `لیست شماره ${draftToDelete.list_number}` : 'این پیش‌نویس'}${draftToDelete?.customer_name ? ` مربوط به مشتری «${draftToDelete.customer_name}»` : ''} مطمئن هستید؟`"
      :loading="deleting"
      confirm-text="بله، حذف شود"
      loading-text="در حال حذف..."
      @confirm="confirmDelete"
      @cancel="draftToDelete = null"
    />

    <DeliveryReturnModal
      :is-open="Boolean(returnTargetList)"
      :list="returnTargetList"
      :saving="returning"
      @close="returnTargetList = null"
      @save="handleReturn"
    />
    <DeliveryInvoiceIssueModal
      :is-open="showInvoiceIssueModal"
      :preview="invoicePreview"
      :saving="issuingInvoice"
      @close="closeInvoiceIssueModal"
      @issue="handleIssueInvoice"
    />
    <DeliveryInvoiceSendModal
      :is-open="showInvoiceSendModal"
      :invoice="sendInvoice"
      :saving="updatingSendStatus"
      @close="closeInvoiceSendModal"
      @save="handleInvoiceSend"
      @request-unsent="invoiceToResetSend = sendInvoice"
    />
    <DeliverySettlementModal
      :is-open="showSettlementModal"
      :summary="settlementSummary"
      :saving="settlementSaving"
      @close="showSettlementModal = false"
      @record="handleRecordPayment"
      @void="handleVoidPayment"
    />
    <ConfirmModal
      :is-open="Boolean(invoiceToResetSend)"
      title="لغو وضعیت ارسال فاکتور"
      :message="`فاکتور ${invoiceToResetSend?.invoice_number || ''} دوباره به وضعیت «ارسال‌نشده» برگردد؟ این تغییر در تاریخچه ثبت می‌شود.`"
      :loading="updatingSendStatus"
      confirm-text="بله، ارسال‌نشده شود"
      loading-text="در حال ثبت..."
      @confirm="confirmResetInvoiceSend"
      @cancel="invoiceToResetSend = null"
    />
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import ConfirmModal from '../ConfirmModal.vue';
import CustomSelect from '../CustomSelect.vue';
import JalaliDatePicker from '../JalaliDatePicker.vue';
import AppPagination from '../AppPagination.vue';
import AppButton from '../ui/AppButton.vue';
import AppDataTable from '../ui/AppDataTable.vue';
import AppFilterBar from '../ui/AppFilterBar.vue';
import AppIconButton from '../ui/AppIconButton.vue';
import AppStatusBadge from '../ui/AppStatusBadge.vue';
import AppStatusButton from '../ui/AppStatusButton.vue';
import AppTablePanel from '../ui/AppTablePanel.vue';
import DeliveryInvoiceIssueModal from './DeliveryInvoiceIssueModal.vue';
import DeliveryInvoiceSendModal from './DeliveryInvoiceSendModal.vue';
import DeliveryReturnModal from './DeliveryReturnModal.vue';
import DeliverySettlementModal from './DeliverySettlementModal.vue';
import { deliveryListService } from '../../modules/delivery-lists/api/deliveryList.service';
import { usePaginatedList } from '../../composables/usePaginatedList';
import { useDeliveryListStore } from '../../stores/deliveryListStore';
import { toPersianDate } from '../../utils/dateConverter';
import { STATUS_GROUPS } from '../../utils/statusStyles';

const router = useRouter();
const toast = useToast();
const draftStore = useDeliveryListStore();
const tableSectionRef = ref(null);
const searchQuery = ref('');
const filtersExpanded = ref(false);
const deliveryDateFilter = ref('');
const listStatusFilter = ref('all');
const invoiceStatusFilter = ref('all');
const sendStatusFilter = ref('all');
const settlementStatusFilter = ref('all');
const creating = ref(false);
const deleting = ref(false);
const draftToDelete = ref(null);
const actionLoadingKey = ref('');
const returnTargetList = ref(null);
const returning = ref(false);
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
let stopRealtime = null;
let syncInFlight = false;

function statusOptions(group, allLabel) {
  return [
    { label: allLabel, value: 'all' },
    ...Object.entries(STATUS_GROUPS[group]).map(([value, meta]) => ({ value, label: meta.label }))
  ];
}

const listStatusOptions = statusOptions('list', 'همه لیست‌ها');
const invoiceStatusOptions = statusOptions('invoice', 'همه فاکتورها');
const sendStatusOptions = statusOptions('send', 'همه ارسال‌ها');
const settlementStatusOptions = statusOptions('settlement', 'همه تسویه‌ها');

const filteredDrafts = computed(() => {
  const query = searchQuery.value.toLowerCase();
  return draftStore.lists.filter((draft) => {
    const matchesListStatus = listStatusFilter.value === 'all' || draft.status === listStatusFilter.value;
    const matchesInvoiceStatus = invoiceStatusFilter.value === 'all' || draft.invoice_status === invoiceStatusFilter.value;
    const matchesSendStatus = sendStatusFilter.value === 'all' || draft.invoice_send_status === sendStatusFilter.value;
    const matchesSettlementStatus = settlementStatusFilter.value === 'all' || draft.settlement_status === settlementStatusFilter.value;
    const matchesDeliveryDate = !deliveryDateFilter.value || formatDate(draft.delivered_at) === deliveryDateFilter.value;
    const matchesQuery = !query
      || String(draft.customer_name || '').toLowerCase().includes(query)
      || String(draft.created_by_name || '').toLowerCase().includes(query)
      || String(draft.delivered_by_name || '').toLowerCase().includes(query)
      || String(draft.list_number || '').toLowerCase().includes(query);
    return matchesListStatus && matchesInvoiceStatus && matchesSendStatus && matchesSettlementStatus && matchesDeliveryDate && matchesQuery;
  });
});

const {
  currentPage,
  pageSize,
  pageSizeOptions,
  totalRows,
  totalPages,
  rowStartIndex,
  paginatedItems: paginatedDrafts,
  visiblePageNumbers,
  resetPage,
  goToPage
} = usePaginatedList(filteredDrafts, {
  initialPageSize: 15,
  pageSizeOptions: [10, 15, 20, 50, 100],
  resetSources: [searchQuery, deliveryDateFilter, listStatusFilter, invoiceStatusFilter, sendStatusFilter, settlementStatusFilter],
  scrollTarget: tableSectionRef
});

onMounted(async () => {
  await loadLists();
  stopRealtime = deliveryListService.subscribeToChanges(syncLists);
});

onBeforeUnmount(() => {
  stopRealtime?.();
  stopRealtime = null;
});

async function loadLists({ silent = false, notify = true } = {}) {
  try { await draftStore.fetchLists({ silent }); }
  catch (_error) { if (notify) toast.error(draftStore.error); }
}

async function syncLists() {
  if (syncInFlight) return;
  syncInFlight = true;
  try { await loadLists({ silent: true, notify: false }); }
  finally { syncInFlight = false; }
}

function clearFilters() {
  searchQuery.value = '';
  deliveryDateFilter.value = '';
  listStatusFilter.value = 'all';
  invoiceStatusFilter.value = 'all';
  sendStatusFilter.value = 'all';
  settlementStatusFilter.value = 'all';
  resetPage();
}

function setActionLoading(list, action) {
  actionLoadingKey.value = list ? `${list.id}:${action}` : '';
}

function isActionLoading(list, action) {
  return actionLoadingKey.value === `${list.id}:${action}`;
}

async function createNewDraft() {
  if (creating.value) return;
  creating.value = true;
  const result = await draftStore.createDraft();
  creating.value = false;
  if (!result.success) return toast.error(result.message);
  router.push(`/lists/${result.data.id}/edit`);
}

async function confirmDelete() {
  if (!draftToDelete.value || deleting.value) return;
  deleting.value = true;
  const result = await draftStore.deleteList(draftToDelete.value.id);
  deleting.value = false;
  if (!result.success) return toast.error(result.message);
  toast.success('رکورد لیست حذف شد');
  draftToDelete.value = null;
}

async function manageListStatus(list) {
  if (list.status === 'DRAFT') return router.push(`/lists/${list.id}/edit`);
  if (list.status === 'COMPLETED') return router.push(`/lists/${list.id}`);
  setActionLoading(list, 'list');
  const result = await draftStore.getListDetails(list.id);
  setActionLoading();
  if (!result.success) return toast.error(result.message);
  const hasRemaining = (result.data.items || []).some((item) => Number(item.remaining_quantity) > 0);
  if (!hasRemaining) return router.push(`/lists/${list.id}`);
  returnTargetList.value = result.data;
}

async function handleReturn(payload) {
  if (!returnTargetList.value || returning.value) return;
  returning.value = true;
  const result = await draftStore.recordReturn(returnTargetList.value.id, payload);
  returning.value = false;
  if (!result.success) return toast.error(result.message);
  returnTargetList.value = null;
  toast.success(result.data.status === 'COMPLETED' ? 'برگشت کامل ثبت و لیست تکمیل شد' : 'مرجوعی اقلام ثبت شد');
}

async function manageInvoice(list) {
  if (list.status === 'DRAFT') {
    toast.info('ابتدا تحویل این پیش‌نویس را ثبت کنید');
    return router.push(`/lists/${list.id}/edit`);
  }
  setActionLoading(list, 'invoice');
  const result = await draftStore.getInvoicePreview(list.id);
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
  const result = await draftStore.issueInvoice(invoiceTargetList.value.id, payload);
  issuingInvoice.value = false;
  if (!result.success) return toast.error(result.message);
  closeInvoiceIssueModal();
  toast.success(`فاکتور ${result.data.invoice.invoice_number} صادر شد`);
}

async function manageInvoiceSend(list) {
  setActionLoading(list, 'send');
  const detailResult = await draftStore.getListDetails(list.id);
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
  const invoiceResult = await draftStore.getInvoice(list.id, targetInvoice.id);
  setActionLoading();
  if (!invoiceResult.success) return toast.error(invoiceResult.message);
  sendTargetList.value = list;
  sendInvoice.value = invoiceResult.data;
  showInvoiceSendModal.value = true;
}

async function handleInvoiceSend(payload) {
  if (updatingSendStatus.value || !sendInvoice.value || !sendTargetList.value) return;
  updatingSendStatus.value = true;
  const result = await draftStore.updateInvoiceSendStatus(sendTargetList.value.id, sendInvoice.value.id, payload);
  updatingSendStatus.value = false;
  if (!result.success) return toast.error(result.message);
  sendInvoice.value = result.data.invoice;
  toast.success('ارسال فاکتور ثبت شد');
}

async function confirmResetInvoiceSend() {
  if (updatingSendStatus.value || !invoiceToResetSend.value || !sendTargetList.value) return;
  updatingSendStatus.value = true;
  const result = await draftStore.updateInvoiceSendStatus(sendTargetList.value.id, invoiceToResetSend.value.id, {
    send_status: 'NOT_SENT',
    channel: 'MANUAL',
    sent_at: new Date().toISOString(),
    notes: 'وضعیت ارسال با تأیید کاربر لغو شد'
  });
  updatingSendStatus.value = false;
  if (!result.success) return toast.error(result.message);
  sendInvoice.value = result.data.invoice;
  invoiceToResetSend.value = null;
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
  const result = await draftStore.getSettlement(list.id);
  setActionLoading();
  if (!result.success) return toast.error(result.message);
  settlementSummary.value = result.data;
  showSettlementModal.value = true;
}

async function handleRecordPayment(payload) {
  if (settlementSaving.value) return;
  settlementSaving.value = true;
  const result = await draftStore.recordPayment(settlementSummary.value.list.id, payload);
  settlementSaving.value = false;
  if (!result.success) return toast.error(result.message);
  settlementSummary.value = result.data;
  toast.success('پرداخت ثبت شد');
}

async function handleVoidPayment(paymentId) {
  if (settlementSaving.value) return;
  settlementSaving.value = true;
  const result = await draftStore.voidPayment(settlementSummary.value.list.id, paymentId);
  settlementSaving.value = false;
  if (!result.success) return toast.error(result.message);
  settlementSummary.value = result.data;
  toast.success('پرداخت باطل شد و وضعیت تسویه دوباره محاسبه شد');
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('fa-IR');
}

function formatCurrency(value) {
  return `${formatNumber(value)} تومان`;
}

function hasIssuedInvoice(list) {
  return ['PARTIALLY_ISSUED', 'ISSUED'].includes(list.invoice_status);
}

function formatDate(value) {
  if (!value) return '—';
  return toPersianDate(String(value).slice(0, 10));
}
</script>

<style scoped>
.lists-panel-heading { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
.lists-heading-search { width: min(32rem, 50%); min-width: 18rem; }
@media (max-width: 767px) {
  .lists-panel-heading { flex-wrap: wrap; }
  .lists-heading-search { width: 100%; min-width: 0; }
}
.delivery-lists-table {
  overflow-x: hidden;
}

.delivery-lists-table :deep(.app-table) {
  table-layout: fixed;
}

.delivery-lists-table :deep(.app-table th),
.delivery-lists-table :deep(.app-table td) {
  overflow-wrap: anywhere;
  padding-right: 0.5rem;
  padding-left: 0.5rem;
}

.delivery-lists-table :deep(.app-table th:nth-child(1)),
.delivery-lists-table :deep(.app-table td:nth-child(1)) { width: 4%; }
.delivery-lists-table :deep(.app-table th:nth-child(2)),
.delivery-lists-table :deep(.app-table td:nth-child(2)) { width: 16%; }
.delivery-lists-table :deep(.app-table th:nth-child(3)),
.delivery-lists-table :deep(.app-table td:nth-child(3)) { width: 10%; }
.delivery-lists-table :deep(.app-table th:nth-child(4)),
.delivery-lists-table :deep(.app-table td:nth-child(4)) { width: 11%; }
.delivery-lists-table :deep(.app-table th:nth-child(5)),
.delivery-lists-table :deep(.app-table td:nth-child(5)) { width: 10%; }
.delivery-lists-table :deep(.app-table th:nth-child(6)),
.delivery-lists-table :deep(.app-table td:nth-child(6)) { width: 10%; }
.delivery-lists-table :deep(.app-table th:nth-child(7)),
.delivery-lists-table :deep(.app-table td:nth-child(7)) { width: 14%; }
.delivery-lists-table :deep(.app-table th:nth-child(8)),
.delivery-lists-table :deep(.app-table td:nth-child(8)) { width: 15%; }
.delivery-lists-table :deep(.app-table th:nth-child(9)),
.delivery-lists-table :deep(.app-table td:nth-child(9)) { width: 10%; }

.delivery-lists-table :deep(.app-status-button),
.delivery-lists-table :deep(.app-status-badge) {
  max-width: 100%;
  white-space: normal;
  text-align: center;
  line-height: 1.35;
}

</style>
