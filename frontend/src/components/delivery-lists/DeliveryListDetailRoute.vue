<template>
  <div>
    <Teleport to="#app-shell-actions">
      <button v-if="canRecordReturn" type="button" class="app-button-primary w-full bg-emerald-600 hover:bg-emerald-700"
        @click="showReturnModal = true">ثبت مرجوعی</button>
      <button v-if="canIssueInvoice" type="button" class="app-button-primary w-full bg-violet-600 hover:bg-violet-700"
        :disabled="loadingInvoicePreview" @click="openInvoiceModal">{{ loadingInvoicePreview ? 'در حال آماده‌سازی...' : 'بررسی و صدور فاکتور' }}</button>
      <button type="button" class="app-button-primary w-full bg-amber-600 hover:bg-amber-700"
        :disabled="loadingSettlement" @click="openSettlement">{{ loadingSettlement ? 'در حال دریافت...' : 'مدیریت پرداخت و تسویه' }}</button>
      <button type="button" class="app-button-primary w-full" @click="createNewDraft">ایجاد لیست جدید</button>
      <button type="button" class="app-button-secondary w-full" @click="router.push('/lists')">بازگشت به لیست‌ها</button>
    </Teleport>

    <AppContentState v-if="loading" loading message="در حال دریافت جزئیات لیست..." />

    <div v-else-if="list" class="space-y-5">
      <section class="app-panel p-5">
        <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <span class="app-badge" :class="listStatus.className">{{ listStatus.label }}</span>
              <span class="app-badge" :class="invoiceStatus.className">{{ invoiceStatus.label }}</span>
              <span class="app-badge" :class="settlementStatus.className">{{ settlementStatus.label }}</span>
            </div>
            <h2 class="mt-3 text-2xl font-black text-slate-900">{{ list.list_number || `لیست #${list.id}` }}</h2>
            <p class="mt-1 text-sm text-slate-500">{{ list.customer_name || 'مشتری نامشخص' }}</p>
          </div>
          <div class="rounded-lg border border-violet-200 bg-violet-50 px-5 py-4 text-center">
            <p class="text-xs text-violet-600">پیش‌فاکتور متصل</p>
            <p class="mt-2 text-lg font-black text-violet-800">{{ list.proforma ? `#${formatNumber(list.proforma.id)}` : 'ایجاد نشده' }}</p>
          </div>
        </div>
      </section>

      <section class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div class="app-panel p-4"><p class="text-xs text-slate-500">زمان تحویل</p><p class="mt-2 text-sm font-bold text-slate-800">{{ formatDateTime(list.delivered_at) }}</p></div>
        <div class="app-panel p-4"><p class="text-xs text-slate-500">برگشت تقریبی</p><p class="mt-2 text-sm font-bold text-slate-800">{{ formatDateTime(list.expected_return_at) }}</p></div>
        <div class="app-panel p-4"><p class="text-xs text-slate-500">تحویل‌دهنده</p><p class="mt-2 text-sm font-bold text-slate-800">{{ list.delivered_by_name || '—' }}</p></div>
        <div class="app-panel p-4"><p class="text-xs text-slate-500">قاعده محاسبه</p><p class="mt-2 text-sm font-bold text-slate-800">{{ list.night_before ? 'شب قبل فعال' : 'محاسبه عادی' }}</p></div>
      </section>

      <section class="app-panel overflow-hidden">
        <div class="border-b border-slate-100 p-5">
          <h3 class="text-base font-black text-slate-800">اقلام تحویل‌شده</h3>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full min-w-[760px] border-collapse border border-slate-300">
            <thead class="bg-slate-100">
              <tr>
                <th v-for="heading in ['نام محصول','قیمت روزانه','تعداد','برگشت سالم','خسارت/مفقودی','مانده','جمع روزانه','وضعیت']" :key="heading" class="border border-slate-300 px-4 py-3 text-right text-xs font-bold text-slate-600">{{ heading }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in list.items" :key="item.id">
                <td class="border border-slate-300 px-4 py-4 text-sm font-bold text-slate-800">{{ item.product_name_snapshot }}</td>
                <td class="border border-slate-300 px-4 py-4 text-sm text-slate-600">{{ formatCurrency(item.daily_price_toman) }}</td>
                <td class="border border-slate-300 px-4 py-4 text-sm text-slate-600">{{ formatNumber(item.delivered_quantity) }}</td>
                <td class="border border-slate-300 px-4 py-4 text-sm font-bold text-emerald-700">{{ formatNumber(item.healthy_returned_quantity) }}</td>
                <td class="border border-slate-300 px-4 py-4 text-sm font-bold text-rose-700">{{ formatNumber(item.damaged_quantity + item.lost_quantity) }}</td>
                <td class="border border-slate-300 px-4 py-4 text-sm font-bold text-orange-700">{{ formatNumber(item.remaining_quantity) }}</td>
                <td class="border border-slate-300 px-4 py-4 text-sm font-bold text-indigo-700">{{ formatCurrency(item.daily_price_toman * item.delivered_quantity) }}</td>
                <td class="border border-slate-300 px-4 py-4"><span class="app-badge" :class="itemStatusMeta(item.item_status).className">{{ itemStatusMeta(item.item_status).label }}</span></td>
              </tr>
            </tbody>
            <tfoot class="border-t border-slate-200 bg-slate-50">
              <tr>
                <td colspan="6" class="border border-slate-300 px-4 py-4 text-sm font-bold text-slate-700">جمع نرخ روزانه</td>
                <td colspan="2" class="border border-slate-300 px-4 py-4 text-base font-black text-indigo-700">{{ formatCurrency(dailyTotal) }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <section v-if="list.return_events?.length" class="app-panel overflow-hidden">
        <div class="border-b border-slate-100 p-5"><h3 class="text-base font-black text-slate-800">تاریخچه مرجوعی‌ها</h3></div>
        <div class="overflow-x-auto p-5">
          <table class="w-full min-w-[1200px] border-collapse border border-slate-300">
            <thead class="bg-slate-100"><tr><th v-for="heading in ['تاریخ برگشت','تحویل‌گیرنده','محصول','سالم','خسارت','مفقودی','روز سیستم','روز نهایی','وضعیت فاکتور','توضیحات']" :key="heading" class="border border-slate-300 px-3 py-3 text-right text-xs text-slate-600">{{ heading }}</th></tr></thead>
            <tbody><tr v-for="row in returnRows" :key="row.id">
              <td class="border border-slate-300 px-3 py-3 text-sm">{{ formatDateTime(row.returned_at) }}</td><td class="border border-slate-300 px-3 py-3 text-sm">{{ row.received_by_name || '—' }}</td><td class="border border-slate-300 px-3 py-3 text-sm font-bold">{{ row.product_name_snapshot }}</td><td class="border border-slate-300 px-3 py-3">{{ formatNumber(row.healthy_quantity) }}</td><td class="border border-slate-300 px-3 py-3 text-rose-700">{{ formatNumber(row.damaged_quantity) }}</td><td class="border border-slate-300 px-3 py-3 text-rose-700">{{ formatNumber(row.lost_quantity) }}</td><td class="border border-slate-300 px-3 py-3">{{ formatNumber(row.system_calculated_days) }}</td><td class="border border-slate-300 px-3 py-3 font-bold">{{ formatNumber(row.final_charged_days) }}</td><td class="border border-slate-300 px-3 py-3"><span class="app-badge" :class="row.rental_invoice_id ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'">{{ row.rental_invoice_id ? 'فاکتور شده' : 'آماده صدور' }}</span></td><td class="border border-slate-300 px-3 py-3 text-xs">{{ row.damage_notes || row.day_override_reason || '—' }}</td>
            </tr></tbody>
          </table>
        </div>
      </section>

      <section v-if="list.invoices?.length" class="app-panel overflow-hidden">
        <div class="border-b border-slate-300 p-5"><h3 class="text-base font-black text-slate-800">فاکتورهای صادرشده این لیست</h3></div>
        <div class="overflow-x-auto p-5">
          <table class="w-full min-w-[1050px] border-collapse border border-slate-300">
            <thead class="bg-slate-100"><tr><th v-for="heading in ['شماره فاکتور','نوع','زمان صدور','تعداد ردیف','جمع اقلام','هزینه اضافی','تخفیف','مبلغ نهایی','صادرکننده','عملیات']" :key="heading" class="border border-slate-300 px-3 py-3 text-right text-xs">{{ heading }}</th></tr></thead>
            <tbody><tr v-for="invoice in list.invoices" :key="invoice.id">
              <td class="border border-slate-300 px-3 py-3 font-bold text-indigo-700">{{ invoice.invoice_number }}</td>
              <td class="border border-slate-300 px-3 py-3">{{ invoice.invoice_type === 'PRIMARY' ? 'اصلی' : 'تکمیلی' }}</td>
              <td class="border border-slate-300 px-3 py-3">{{ formatDateTime(invoice.issued_at) }}</td>
              <td class="border border-slate-300 px-3 py-3">{{ formatNumber(invoice.lines?.length) }}</td>
              <td class="border border-slate-300 px-3 py-3">{{ formatCurrency(invoice.subtotal_toman) }}</td>
              <td class="border border-slate-300 px-3 py-3">{{ formatCurrency(invoice.extra_charges_toman) }}</td>
              <td class="border border-slate-300 px-3 py-3">{{ formatCurrency(invoice.discount_amount_toman) }}</td>
              <td class="border border-slate-300 px-3 py-3 font-black">{{ formatCurrency(invoice.final_amount_toman) }}</td>
              <td class="border border-slate-300 px-3 py-3">{{ invoice.issued_by_name || '—' }}</td>
              <td class="border border-slate-300 px-3 py-3"><button type="button" class="app-button-secondary whitespace-nowrap px-3 py-2 text-xs" :disabled="downloadingInvoiceId === invoice.id" @click="downloadInvoicePdf(invoice)">{{ downloadingInvoiceId === invoice.id ? 'در حال دانلود...' : 'دانلود PDF' }}</button></td>
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
    <DeliverySettlementModal :is-open="showSettlementModal" :summary="settlementSummary" :saving="settlementSaving"
      @close="showSettlementModal = false" @record="handleRecordPayment" @void="handleVoidPayment" />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import AppContentState from '../AppContentState.vue';
import DeliveryReturnModal from './DeliveryReturnModal.vue';
import DeliveryInvoiceIssueModal from './DeliveryInvoiceIssueModal.vue';
import DeliverySettlementModal from './DeliverySettlementModal.vue';
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

const dailyTotal = computed(() => (list.value?.items || []).reduce((sum, item) => (
  sum + Number(item.daily_price_toman) * Number(item.delivered_quantity)
), 0));
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

async function downloadInvoicePdf(invoice) {
  if (downloadingInvoiceId.value) return;
  downloadingInvoiceId.value = invoice.id;
  const result = await listStore.downloadInvoicePdf(list.value.id, invoice.id);
  downloadingInvoiceId.value = null;
  if (!result.success) return toast.error(result.message);
  const url = URL.createObjectURL(result.data);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `invoice-${invoice.invoice_number}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  toast.success('فایل PDF فاکتور دانلود شد');
}

function itemStatusMeta(status) {
  return {
    DELIVERED: { label: 'تحویل', className: 'bg-blue-100 text-blue-700' },
    RETURNED: { label: 'برگشت', className: 'bg-emerald-100 text-emerald-700' },
    REMAINING: { label: 'مانده', className: 'bg-orange-100 text-orange-700' },
    DAMAGE: { label: 'خسارت/مفقودی', className: 'bg-rose-100 text-rose-700' }
  }[status] || { label: status || 'نامشخص', className: 'bg-slate-100 text-slate-600' };
}

function formatNumber(value) { return Number(value || 0).toLocaleString('fa-IR'); }
function formatCurrency(value) { return `${formatNumber(value)} تومان`; }
function formatDateTime(value) {
  if (!value) return '—';
  const text = String(value);
  return `${toPersianDate(text.slice(0, 10))} - ${text.slice(11, 16)}`;
}
</script>
