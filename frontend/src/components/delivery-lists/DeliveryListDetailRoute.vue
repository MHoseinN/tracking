<template>
  <div>
    <Teleport to="#app-shell-actions">
      <button v-if="list?.proforma" type="button" class="app-button-secondary w-full border-violet-300 text-violet-700"
        :disabled="loadingProforma" @click="openProforma">
        {{ loadingProforma ? 'در حال ساخت...' : 'مشاهده پیش‌فاکتور' }}
      </button>
      <button v-if="canRecordReturn" type="button" class="app-button-primary w-full bg-emerald-600 hover:bg-emerald-700"
        @click="showReturnModal = true">ثبت مرجوعی</button>
      <button v-if="canIssueInvoice" type="button" class="app-button-primary w-full"
        :disabled="loadingInvoicePreview" @click="openInvoiceModal">{{ loadingInvoicePreview ? 'در حال آماده‌سازی...' : 'بررسی و صدور فاکتور' }}</button>
      <button type="button" class="app-button-primary w-full bg-amber-600 hover:bg-amber-700"
        :disabled="loadingSettlement" @click="openSettlement">{{ loadingSettlement ? 'در حال دریافت...' : 'مدیریت پرداخت و تسویه' }}</button>
      <button type="button" class="app-button-primary w-full" @click="createNewDraft">ایجاد لیست جدید</button>
      <button type="button" class="app-button-secondary w-full" @click="router.push('/lists')">بازگشت به لیست‌ها</button>
    </Teleport>

    <AppContentState v-if="loading" loading message="در حال دریافت جزئیات لیست..." />

    <div v-else-if="list" class="space-y-5">
      <DeliveryListDraftEditorRoute
        embedded
        :initial-list="list"
        @saved="handleEmbeddedListSaved"
        @finalized="handleEmbeddedListSaved"
      />

      <section class="app-panel flex flex-wrap items-center justify-between gap-3 p-4">
        <div class="flex flex-wrap items-center gap-2">
          <span class="app-badge" :class="listStatus.className">{{ listStatus.label }}</span>
          <span class="app-badge" :class="invoiceStatus.className">{{ invoiceStatus.label }}</span>
          <span class="app-badge" :class="invoiceSendStatus.className">{{ invoiceSendStatus.label }}</span>
          <span class="app-badge" :class="settlementStatus.className">{{ settlementStatus.label }}</span>
        </div>
        <div class="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-semibold text-slate-500">
          <span>تحویل‌دهنده: <strong class="text-slate-800">{{ list.delivered_by_name || '—' }}</strong></span>
          <span>پیش‌فاکتور: <strong class="text-violet-700">{{ list.proforma ? `#${formatNumber(list.proforma.id)}` : 'ایجاد نشده' }}</strong></span>
        </div>
      </section>

      <section v-if="list.return_events?.length" class="app-panel overflow-hidden">
        <div class="border-b border-slate-100 p-5"><h3 class="text-base font-black text-slate-800">تاریخچه مرجوعی‌ها</h3></div>
        <div class="p-5">
          <table class="w-full table-fixed border-collapse border border-slate-300">
            <thead class="bg-slate-100"><tr><th v-for="heading in ['تاریخ برگشت','تحویل‌گیرنده','محصول','سالم','خسارت/مفقودی','روز نهایی','فاکتور','توضیحات']" :key="heading" class="border border-slate-300 px-2 py-3 text-right text-xs text-slate-600">{{ heading }}</th></tr></thead>
            <tbody><tr v-for="row in returnRows" :key="row.id">
              <td class="border border-slate-300 px-2 py-3 text-xs">{{ formatDateTime(row.returned_at) }}</td>
              <td class="border border-slate-300 px-2 py-3 text-sm">{{ row.received_by_name || '—' }}</td>
              <td class="border border-slate-300 px-2 py-3 text-sm font-bold">{{ row.product_name_snapshot }}</td>
              <td class="border border-slate-300 px-2 py-3">{{ formatNumber(row.healthy_quantity) }}</td>
              <td class="border border-slate-300 px-2 py-3 text-rose-700">{{ formatNumber(Number(row.damaged_quantity) + Number(row.lost_quantity)) }}</td>
              <td class="border border-slate-300 px-2 py-3 font-bold">{{ formatNumber(row.final_charged_days) }}</td>
              <td class="border border-slate-300 px-2 py-3"><span class="app-badge px-2 text-[11px]" :class="row.rental_invoice_id ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'">{{ row.rental_invoice_id ? 'فاکتور شده' : 'آماده صدور' }}</span></td>
              <td class="border border-slate-300 px-2 py-3 text-xs">{{ row.damage_notes || row.day_override_reason || '—' }}</td>
            </tr></tbody>
          </table>
        </div>
      </section>

      <section v-if="list.invoices?.length" class="app-panel overflow-hidden">
        <div class="border-b border-slate-300 p-5"><h3 class="text-base font-black text-slate-800">فاکتورهای صادرشده این لیست</h3></div>
        <div class="p-5">
          <table class="w-full table-fixed border-collapse border border-slate-300">
            <thead class="bg-slate-100"><tr><th v-for="heading in ['شماره فاکتور','نوع','تاریخ صدور','مبلغ نهایی','وضعیت ارسال','عملیات']" :key="heading" class="border border-slate-300 px-3 py-3 text-right text-xs">{{ heading }}</th></tr></thead>
            <tbody><tr v-for="invoice in list.invoices" :key="invoice.id">
              <td class="border border-slate-300 px-3 py-3 font-bold text-indigo-700">{{ invoice.invoice_number }}</td>
              <td class="border border-slate-300 px-3 py-3">{{ invoice.invoice_type === 'PRIMARY' ? 'اصلی' : 'تکمیلی' }}</td>
              <td class="border border-slate-300 px-3 py-3">{{ formatDateTime(invoice.issued_at) }}</td>
              <td class="border border-slate-300 px-3 py-3 font-black">{{ formatCurrency(invoice.final_amount_toman) }}</td>
              <td class="border border-slate-300 px-3 py-3">
                <button type="button" class="app-badge cursor-pointer"
                  :class="invoiceSendStatusMeta(invoice.send_status).className"
                  :disabled="loadingSendInvoiceId === invoice.id" @click="openInvoiceSend(invoice)">
                  {{ loadingSendInvoiceId === invoice.id ? 'در حال دریافت...' : invoiceSendStatusMeta(invoice.send_status).label }}
                </button>
              </td>
              <td class="border border-slate-300 px-3 py-3"><button type="button" class="app-button-secondary whitespace-nowrap px-3 py-2 text-xs" :disabled="openingInvoiceId === invoice.id" @click="openIssuedInvoice(invoice)">{{ openingInvoiceId === invoice.id ? 'در حال آماده‌سازی...' : 'مشاهده و ویرایش' }}</button></td>
            </tr></tbody>
          </table>
        </div>
      </section>

      <section v-else class="rounded-lg border border-violet-300 bg-violet-50 p-5 text-sm text-violet-800">
        پیش‌فاکتور خودکار آماده است. پس از ثبت اولین مرجوعی، فاکتور از ردیف‌های برگشتی ساخته می‌شود.
      </section>
    </div>

    <DeliveryReturnModal :is-open="showReturnModal" :list="list" :saving="returning"
      @close="showReturnModal = false" @save="handleReturn" />
    <DeliveryInvoiceIssueModal :is-open="showInvoiceModal" :preview="invoicePreview" :saving="issuingInvoice"
      @close="showInvoiceModal = false" @issue="handleIssueInvoice" />
    <DeliveryProformaPreviewModal :is-open="showProformaModal" :list-number="list?.list_number"
      :pdf-url="proformaPdfUrl" :loading="loadingProforma" :downloading="downloadingProforma"
      @close="closeProforma" @download="downloadPreparedProforma" />
    <DeliveryInvoicePreviewModal :is-open="showIssuedInvoiceModal" :invoice="selectedInvoice"
      :pdf-url="invoicePdfUrl" :saving="editingInvoice" :loading-pdf="loadingInvoicePdf"
      :downloading="Boolean(downloadingInvoiceId)" @close="closeIssuedInvoiceModal"
      @save="handleUpdateIssuedInvoice($event, false)" @save-download="handleUpdateIssuedInvoice($event, true)"
      @download="downloadPreparedInvoice" />
    <DeliveryInvoiceSendModal :is-open="showInvoiceSendModal" :invoice="sendInvoice"
      :saving="updatingSendStatus" @close="closeInvoiceSendModal"
      @save="handleInvoiceSend" @request-unsent="invoiceToResetSend = sendInvoice" />
    <DeliverySettlementModal :is-open="showSettlementModal" :summary="settlementSummary" :saving="settlementSaving"
      @close="showSettlementModal = false" @record="handleRecordPayment" @void="handleVoidPayment" />
    <ConfirmModal :is-open="Boolean(invoiceToResetSend)" title="لغو وضعیت ارسال فاکتور"
      :message="`فاکتور ${invoiceToResetSend?.invoice_number || ''} دوباره به وضعیت «ارسال‌نشده» برگردد؟ این عملیات در تاریخچه ثبت می‌شود.`"
      :loading="updatingSendStatus" confirm-text="بله، ارسال‌نشده شود" loading-text="در حال ثبت..."
      @confirm="confirmResetInvoiceSend" @cancel="invoiceToResetSend = null" />
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import AppContentState from '../AppContentState.vue';
import ConfirmModal from '../ConfirmModal.vue';
import DeliveryReturnModal from './DeliveryReturnModal.vue';
import DeliveryInvoiceIssueModal from './DeliveryInvoiceIssueModal.vue';
import DeliveryProformaPreviewModal from './DeliveryProformaPreviewModal.vue';
import DeliveryInvoicePreviewModal from './DeliveryInvoicePreviewModal.vue';
import DeliveryInvoiceSendModal from './DeliveryInvoiceSendModal.vue';
import DeliverySettlementModal from './DeliverySettlementModal.vue';
import DeliveryListDraftEditorRoute from './DeliveryListDraftEditorRoute.vue';
import { useDeliveryListStore } from '../../stores/deliveryListStore';
import { toPersianDate } from '../../utils/dateConverter';

const route = useRoute();
const router = useRouter();
const toast = useToast();
const listStore = useDeliveryListStore();
const list = ref(null);
const loading = ref(true);
const showReturnModal = ref(false);
const returning = ref(false);
const loadingInvoicePreview = ref(false);
const issuingInvoice = ref(false);
const showInvoiceModal = ref(false);
const invoicePreview = ref(null);
const loadingSettlement = ref(false);
const settlementSaving = ref(false);
const showSettlementModal = ref(false);
const settlementSummary = ref(null);
const downloadingInvoiceId = ref(null);
const openingInvoiceId = ref(null);
const loadingInvoicePdf = ref(false);
const editingInvoice = ref(false);
const showIssuedInvoiceModal = ref(false);
const selectedInvoice = ref(null);
const invoicePdfBlob = ref(null);
const invoicePdfUrl = ref('');
const showInvoiceSendModal = ref(false);
const sendInvoice = ref(null);
const loadingSendInvoiceId = ref(null);
const updatingSendStatus = ref(false);
const invoiceToResetSend = ref(null);
const showProformaModal = ref(false);
const loadingProforma = ref(false);
const downloadingProforma = ref(false);
const proformaPdfBlob = ref(null);
const proformaPdfUrl = ref('');

const canRecordReturn = computed(() => (
  ['DELIVERED', 'REMAINING', 'NEEDS_FOLLOW_UP'].includes(list.value?.status)
  && (list.value?.items || []).some((item) => Number(item.remaining_quantity) > 0)
));
const returnRows = computed(() => (list.value?.return_events || []).flatMap((event) => (
  event.items.map((item) => ({ ...item, returned_at: event.returned_at, received_by_name: event.received_by_name }))
)));
const canIssueInvoice = computed(() => returnRows.value.some((item) => !item.rental_invoice_id));
const listStatus = computed(() => ({
  DELIVERED: { label: 'تحویل‌شده', className: 'bg-blue-100 text-blue-700' },
  REMAINING: { label: 'مانده', className: 'bg-orange-100 text-orange-700' },
  NEEDS_FOLLOW_UP: { label: 'نیاز به پیگیری', className: 'bg-rose-100 text-rose-700' },
  COMPLETED: { label: 'تکمیل', className: 'bg-emerald-100 text-emerald-700' }
}[list.value?.status] || { label: list.value?.status || 'نامشخص', className: 'bg-slate-100 text-slate-600' }));
const invoiceStatus = computed(() => ({
  PROFORMA: { label: 'پیش‌فاکتور', className: 'bg-violet-100 text-violet-700' },
  PARTIALLY_ISSUED: { label: 'صدور جزئی', className: 'bg-amber-100 text-amber-700' },
  ISSUED: { label: 'فاکتور صادرشده', className: 'bg-emerald-100 text-emerald-700' }
}[list.value?.invoice_status] || { label: 'بدون فاکتور', className: 'bg-slate-100 text-slate-600' }));
const invoiceSendStatus = computed(() => invoiceSendStatusMeta(list.value?.invoice_send_status));
const settlementStatus = computed(() => ({
  UNPAID: { label: 'تسویه‌نشده', className: 'bg-rose-100 text-rose-700' },
  PARTIAL: { label: 'تسویه جزئی / بیعانه', className: 'bg-amber-100 text-amber-700' },
  PAID: { label: 'تسویه کامل', className: 'bg-emerald-100 text-emerald-700' }
}[list.value?.settlement_status] || { label: 'نامشخص', className: 'bg-slate-100 text-slate-600' }));

onMounted(async () => {
  try { list.value = await listStore.fetchDraft(route.params.id); }
  catch (_error) { toast.error(listStore.error); router.replace('/lists'); }
  finally { loading.value = false; }
});

onBeforeUnmount(() => {
  releaseInvoicePdfUrl();
  releaseProformaPdfUrl();
});

function handleEmbeddedListSaved(updatedList) {
  if (updatedList) list.value = updatedList;
}

async function openProforma() {
  if (loadingProforma.value || !list.value?.proforma) return;
  showProformaModal.value = true;
  loadingProforma.value = true;
  const result = await listStore.downloadProformaPdf(list.value.id);
  loadingProforma.value = false;
  if (!result.success) {
    showProformaModal.value = false;
    return toast.error(result.message);
  }
  releaseProformaPdfUrl();
  proformaPdfBlob.value = result.data;
  proformaPdfUrl.value = URL.createObjectURL(result.data);
}

function closeProforma() {
  if (loadingProforma.value) return;
  showProformaModal.value = false;
  releaseProformaPdfUrl();
}

function releaseProformaPdfUrl() {
  if (proformaPdfUrl.value) URL.revokeObjectURL(proformaPdfUrl.value);
  proformaPdfUrl.value = '';
  proformaPdfBlob.value = null;
}

function downloadPreparedProforma() {
  if (downloadingProforma.value || !proformaPdfBlob.value) return;
  downloadingProforma.value = true;
  const url = URL.createObjectURL(proformaPdfBlob.value);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `proforma-${list.value.list_number}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30000);
  downloadingProforma.value = false;
  toast.success('فایل PDF پیش‌فاکتور دانلود شد');
}

async function createNewDraft() {
  const result = await listStore.createDraft();
  if (!result.success) return toast.error(result.message);
  router.push(`/lists/${result.data.id}/edit`);
}

async function handleReturn(payload) {
  if (returning.value) return;
  returning.value = true;
  const result = await listStore.recordReturn(list.value.id, payload);
  returning.value = false;
  if (!result.success) return toast.error(result.message);
  list.value = result.data;
  showReturnModal.value = false;
  toast.success(result.data.status === 'COMPLETED' ? 'برگشت کامل ثبت و لیست تکمیل شد' : 'مرجوعی اقلام ثبت شد');
}

async function openInvoiceModal() {
  if (loadingInvoicePreview.value) return;
  loadingInvoicePreview.value = true;
  const result = await listStore.getInvoicePreview(list.value.id);
  loadingInvoicePreview.value = false;
  if (!result.success) return toast.error(result.message);
  invoicePreview.value = result.data;
  showInvoiceModal.value = true;
}

async function handleIssueInvoice(payload) {
  if (issuingInvoice.value) return;
  issuingInvoice.value = true;
  const result = await listStore.issueInvoice(list.value.id, payload);
  issuingInvoice.value = false;
  if (!result.success) return toast.error(result.message);
  list.value = result.data.list;
  showInvoiceModal.value = false;
  toast.success(`فاکتور ${result.data.invoice.invoice_number} صادر شد`);
}

async function openSettlement() {
  if (loadingSettlement.value) return;
  loadingSettlement.value = true;
  const result = await listStore.getSettlement(list.value.id);
  loadingSettlement.value = false;
  if (!result.success) return toast.error(result.message);
  settlementSummary.value = result.data;
  showSettlementModal.value = true;
}

async function handleRecordPayment(payload) {
  if (settlementSaving.value) return;
  settlementSaving.value = true;
  const result = await listStore.recordPayment(list.value.id, payload);
  settlementSaving.value = false;
  if (!result.success) return toast.error(result.message);
  settlementSummary.value = result.data;
  list.value.settlement_status = result.data.list.settlement_status;
  toast.success('پرداخت ثبت شد');
}

async function handleVoidPayment(paymentId) {
  if (settlementSaving.value) return;
  settlementSaving.value = true;
  const result = await listStore.voidPayment(list.value.id, paymentId);
  settlementSaving.value = false;
  if (!result.success) return toast.error(result.message);
  settlementSummary.value = result.data;
  list.value.settlement_status = result.data.list.settlement_status;
  toast.success('پرداخت باطل شد و وضعیت تسویه دوباره محاسبه شد');
}

async function openIssuedInvoice(invoice) {
  if (openingInvoiceId.value) return;
  openingInvoiceId.value = invoice.id;
  loadingInvoicePdf.value = true;
  const [detailResult, pdfResult] = await Promise.all([
    listStore.getInvoice(list.value.id, invoice.id),
    listStore.downloadInvoicePdf(list.value.id, invoice.id)
  ]);
  openingInvoiceId.value = null;
  loadingInvoicePdf.value = false;
  if (!detailResult.success) return toast.error(detailResult.message);
  selectedInvoice.value = detailResult.data;
  if (pdfResult.success) setInvoicePdfBlob(pdfResult.data);
  else {
    releaseInvoicePdfUrl();
    toast.error(pdfResult.message);
  }
  showIssuedInvoiceModal.value = true;
}

async function handleUpdateIssuedInvoice(payload, downloadAfter) {
  if (editingInvoice.value || !selectedInvoice.value) return;
  editingInvoice.value = true;
  const result = await listStore.updateInvoice(list.value.id, selectedInvoice.value.id, payload);
  editingInvoice.value = false;
  if (!result.success) return toast.error(result.message);
  list.value = result.data.list;
  selectedInvoice.value = result.data.invoice;
  toast.success('تغییرات فاکتور ذخیره شد');
  const refreshed = await refreshInvoicePdf();
  if (downloadAfter && refreshed) await downloadPreparedInvoice();
}

async function openInvoiceSend(invoice) {
  if (loadingSendInvoiceId.value) return;
  loadingSendInvoiceId.value = invoice.id;
  const result = await listStore.getInvoice(list.value.id, invoice.id);
  loadingSendInvoiceId.value = null;
  if (!result.success) return toast.error(result.message);
  sendInvoice.value = result.data;
  showInvoiceSendModal.value = true;
}

async function handleInvoiceSend(payload) {
  if (updatingSendStatus.value || !sendInvoice.value) return;
  updatingSendStatus.value = true;
  const result = await listStore.updateInvoiceSendStatus(list.value.id, sendInvoice.value.id, payload);
  updatingSendStatus.value = false;
  if (!result.success) return toast.error(result.message);
  list.value = result.data.list;
  sendInvoice.value = result.data.invoice;
  toast.success('ارسال فاکتور ثبت شد');
}

async function confirmResetInvoiceSend() {
  if (updatingSendStatus.value || !invoiceToResetSend.value) return;
  updatingSendStatus.value = true;
  const result = await listStore.updateInvoiceSendStatus(list.value.id, invoiceToResetSend.value.id, {
    send_status: 'NOT_SENT',
    channel: 'MANUAL',
    sent_at: new Date().toISOString(),
    notes: 'وضعیت ارسال با تأیید کاربر لغو شد'
  });
  updatingSendStatus.value = false;
  if (!result.success) return toast.error(result.message);
  list.value = result.data.list;
  sendInvoice.value = result.data.invoice;
  invoiceToResetSend.value = null;
  toast.success('فاکتور به وضعیت ارسال‌نشده برگشت');
}

function closeInvoiceSendModal() {
  if (updatingSendStatus.value) return;
  showInvoiceSendModal.value = false;
  sendInvoice.value = null;
  invoiceToResetSend.value = null;
}

async function refreshInvoicePdf() {
  if (!selectedInvoice.value || loadingInvoicePdf.value) return false;
  loadingInvoicePdf.value = true;
  const result = await listStore.downloadInvoicePdf(list.value.id, selectedInvoice.value.id);
  loadingInvoicePdf.value = false;
  if (!result.success) {
    toast.error(result.message);
    return false;
  }
  setInvoicePdfBlob(result.data);
  return true;
}

async function downloadPreparedInvoice() {
  if (downloadingInvoiceId.value || !selectedInvoice.value) return;
  if (!invoicePdfBlob.value && !(await refreshInvoicePdf())) return;
  downloadingInvoiceId.value = selectedInvoice.value.id;
  const url = URL.createObjectURL(invoicePdfBlob.value);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `invoice-${selectedInvoice.value.invoice_number}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30000);
  downloadingInvoiceId.value = null;
  toast.success('فایل PDF فاکتور دانلود شد');
}

function setInvoicePdfBlob(blob) {
  releaseInvoicePdfUrl();
  invoicePdfBlob.value = blob;
  invoicePdfUrl.value = URL.createObjectURL(blob);
}

function releaseInvoicePdfUrl() {
  if (invoicePdfUrl.value) URL.revokeObjectURL(invoicePdfUrl.value);
  invoicePdfUrl.value = '';
  invoicePdfBlob.value = null;
}

function closeIssuedInvoiceModal() {
  showIssuedInvoiceModal.value = false;
  selectedInvoice.value = null;
  releaseInvoicePdfUrl();
}

function invoiceSendStatusMeta(status) {
  return {
    NOT_SENT: { label: 'ارسال‌نشده', className: 'bg-rose-100 text-rose-700' },
    PARTIALLY_SENT: { label: 'ارسال جزئی', className: 'bg-amber-100 text-amber-700' },
    SENT: { label: 'ارسال‌شده', className: 'bg-cyan-100 text-cyan-700' }
  }[status] || { label: 'ارسال‌نشده', className: 'bg-slate-100 text-slate-600' };
}

function formatNumber(value) { return Number(value || 0).toLocaleString('fa-IR'); }
function formatCurrency(value) { return `${formatNumber(value)} تومان`; }
function formatDateTime(value) {
  if (!value) return '—';
  const text = String(value);
  return `${toPersianDate(text.slice(0, 10))} - ${text.slice(11, 16)}`;
}
</script>

<style scoped>
table {
  table-layout: fixed;
}

th,
td {
  overflow-wrap: anywhere;
}

.app-badge {
  max-width: 100%;
  white-space: normal;
  text-align: center;
  line-height: 1.35;
}
</style>
