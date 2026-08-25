<template>
  <div>
    <Teleport to="#app-shell-actions">
      <button type="button" class="app-button-primary w-full" :disabled="creating" @click="createNewDraft">
        {{ creating ? 'در حال ایجاد...' : 'ایجاد لیست جدید' }}
      </button>
      <CustomSelect v-model="statusFilter" :options="statusOptions"
        trigger-class="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm" />
      <button type="button" class="app-button-secondary w-full" @click="loadLists">به‌روزرسانی</button>
    </Teleport>

    <section class="app-panel overflow-hidden">
      <div class="flex flex-col gap-4 border-b border-slate-100 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 class="text-lg font-black text-slate-900">لیست‌های تحویل</h2>
          <p class="mt-1 text-xs text-slate-500">پیش‌نویس‌ها و لیست‌های ثبت‌شده در یک جدول قابل پیگیری هستند.</p>
        </div>
        <input v-model.trim="searchQuery" type="search" placeholder="جست‌وجوی نام مشتری یا سازنده..."
          class="h-11 w-full rounded-lg border border-slate-200 px-4 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 md:w-80" />
      </div>

      <AppContentState v-if="draftStore.loading" loading message="در حال دریافت پیش‌نویس‌ها..." />
      <AppContentState v-else-if="!filteredDrafts.length" message="لیستی برای نمایش وجود ندارد." />

      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-[1150px] border-collapse border border-slate-300">
          <thead class="bg-slate-100">
            <tr>
              <th class="border border-slate-300 px-4 py-3 text-right text-xs font-bold text-slate-600">شماره لیست</th>
              <th class="border border-slate-300 px-4 py-3 text-right text-xs font-bold text-slate-600">مشتری</th>
              <th class="border border-slate-300 px-4 py-3 text-right text-xs font-bold text-slate-600">زمان تحویل</th>
              <th class="border border-slate-300 px-4 py-3 text-right text-xs font-bold text-slate-600">تاریخ برگشت</th>
              <th class="border border-slate-300 px-4 py-3 text-right text-xs font-bold text-slate-600">وضعیت لیست</th>
              <th class="border border-slate-300 px-4 py-3 text-right text-xs font-bold text-slate-600">وضعیت فاکتور</th>
              <th class="border border-slate-300 px-4 py-3 text-right text-xs font-bold text-slate-600">وضعیت تسویه</th>
              <th class="border border-slate-300 px-4 py-3 text-right text-xs font-bold text-slate-600">ایجادکننده</th>
              <th class="border border-slate-300 px-4 py-3 text-right text-xs font-bold text-slate-600">عملیات</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="draft in filteredDrafts" :key="draft.id" class="hover:bg-slate-50/60">
              <td class="border border-slate-300 px-4 py-4 text-sm font-bold text-indigo-700">{{ draft.list_number || `پیش‌نویس #${draft.id}` }}</td>
              <td class="border border-slate-300 px-4 py-4 text-sm font-bold text-slate-800">{{ draft.customer_name || 'نامشخص' }}</td>
              <td class="border border-slate-300 px-4 py-4 text-sm text-slate-600">{{ formatDateTime(draft.delivered_at) }}</td>
              <td class="border border-slate-300 px-4 py-4 text-sm text-slate-600">{{ draft.last_returned_at ? formatDateTime(draft.last_returned_at) : '' }}</td>
              <td class="border border-slate-300 px-4 py-4"><span class="app-badge" :class="listStatusMeta(draft.status).className">{{ listStatusMeta(draft.status).label }}</span></td>
              <td class="border border-slate-300 px-4 py-4">
                <div class="flex flex-col items-start gap-2">
                  <span class="app-badge" :class="invoiceStatusMeta(draft.invoice_status).className">{{ invoiceStatusMeta(draft.invoice_status).label }}</span>
                  <span v-if="draft.invoice_status !== 'NONE' && draft.invoice_status !== 'PROFORMA'"
                    class="app-badge" :class="invoiceSendStatusMeta(draft.invoice_send_status).className">
                    {{ invoiceSendStatusMeta(draft.invoice_send_status).label }}
                  </span>
                </div>
              </td>
              <td class="border border-slate-300 px-4 py-4"><button v-if="draft.status !== 'DRAFT'" type="button" class="app-badge cursor-pointer" :class="settlementStatusMeta(draft.settlement_status).className" @click="openSettlement(draft)">{{ settlementStatusMeta(draft.settlement_status).label }}</button><span v-else class="app-badge" :class="settlementStatusMeta(draft.settlement_status).className">{{ settlementStatusMeta(draft.settlement_status).label }}</span></td>
              <td class="border border-slate-300 px-4 py-4 text-sm text-slate-600">{{ draft.created_by_name || '—' }}</td>
              <td class="border border-slate-300 px-4 py-4">
                <div class="flex gap-2">
                  <button v-if="draft.status === 'DRAFT'" type="button" class="app-button-secondary px-3 py-2 text-xs"
                    @click="router.push(`/lists/${draft.id}/edit`)">ادامه ویرایش</button>
                  <button v-else type="button" class="app-button-secondary px-3 py-2 text-xs"
                    @click="router.push(`/lists/${draft.id}`)">مشاهده جزئیات</button>
                  <button v-if="draft.status === 'DRAFT'" type="button" class="app-button-secondary border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700"
                    @click="draftToDelete = draft">حذف</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <ConfirmModal :is-open="Boolean(draftToDelete)" title="حذف پیش‌نویس"
      :message="`پیش‌نویس ${draftToDelete?.customer_name ? `مشتری «${draftToDelete.customer_name}»` : 'بدون نام'} و تمام اقلام آن حذف شود؟`"
      :loading="deleting" confirm-text="بله، حذف شود" loading-text="در حال حذف..."
      @confirm="confirmDelete" @cancel="draftToDelete = null" />
    <DeliverySettlementModal :is-open="showSettlementModal" :summary="settlementSummary" :saving="settlementSaving"
      @close="showSettlementModal = false" @record="handleRecordPayment" @void="handleVoidPayment" />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import AppContentState from '../AppContentState.vue';
import ConfirmModal from '../ConfirmModal.vue';
import CustomSelect from '../CustomSelect.vue';
import DeliverySettlementModal from './DeliverySettlementModal.vue';
import { useDeliveryListStore } from '../../stores/deliveryListStore';
import { toPersianDate } from '../../utils/dateConverter';

const router = useRouter();
const toast = useToast();
const draftStore = useDeliveryListStore();
const searchQuery = ref('');
const statusFilter = ref('all');
const creating = ref(false);
const deleting = ref(false);
const draftToDelete = ref(null);
const showSettlementModal = ref(false);
const settlementSummary = ref(null);
const settlementSaving = ref(false);

const statusOptions = [
  { label: 'همه وضعیت‌ها', value: 'all' },
  { label: 'پیش‌نویس', value: 'DRAFT' },
  { label: 'تحویل‌شده', value: 'DELIVERED' },
  { label: 'مانده', value: 'REMAINING' },
  { label: 'نیاز به پیگیری', value: 'NEEDS_FOLLOW_UP' },
  { label: 'تکمیل', value: 'COMPLETED' }
];

const filteredDrafts = computed(() => {
  const query = searchQuery.value.toLowerCase();
  return draftStore.lists.filter((draft) => {
    const matchesStatus = statusFilter.value === 'all' || draft.status === statusFilter.value;
    const matchesQuery = !query
      || String(draft.customer_name || '').toLowerCase().includes(query)
      || String(draft.created_by_name || '').toLowerCase().includes(query)
      || String(draft.list_number || '').toLowerCase().includes(query);
    return matchesStatus && matchesQuery;
  });
});

onMounted(loadLists);

async function loadLists() {
  try { await draftStore.fetchLists(); }
  catch (_error) { toast.error(draftStore.error); }
}

function listStatusMeta(status) {
  return {
    DRAFT: { label: 'پیش‌نویس', className: 'bg-amber-100 text-amber-700' },
    DELIVERED: { label: 'تحویل‌شده', className: 'bg-blue-100 text-blue-700' },
    REMAINING: { label: 'مانده', className: 'bg-orange-100 text-orange-700' },
    NEEDS_FOLLOW_UP: { label: 'نیاز به پیگیری', className: 'bg-rose-100 text-rose-700' },
    COMPLETED: { label: 'تکمیل', className: 'bg-emerald-100 text-emerald-700' }
  }[status] || { label: status || 'نامشخص', className: 'bg-slate-100 text-slate-600' };
}

function invoiceStatusMeta(status) {
  return {
    NONE: { label: 'بدون پیش‌فاکتور', className: 'bg-slate-100 text-slate-600' },
    PROFORMA: { label: 'پیش‌فاکتور', className: 'bg-violet-100 text-violet-700' },
    PARTIALLY_ISSUED: { label: 'صدور جزئی', className: 'bg-amber-100 text-amber-700' },
    ISSUED: { label: 'صادرشده', className: 'bg-emerald-100 text-emerald-700' }
  }[status] || { label: status || 'نامشخص', className: 'bg-slate-100 text-slate-600' };
}

function invoiceSendStatusMeta(status) {
  return {
    NOT_SENT: { label: 'ارسال‌نشده', className: 'bg-rose-100 text-rose-700' },
    PARTIALLY_SENT: { label: 'ارسال جزئی', className: 'bg-amber-100 text-amber-700' },
    SENT: { label: 'ارسال‌شده', className: 'bg-cyan-100 text-cyan-700' }
  }[status] || { label: 'ارسال‌نشده', className: 'bg-slate-100 text-slate-600' };
}

function settlementStatusMeta(status) {
  return {
    UNPAID: { label: 'تسویه‌نشده', className: 'bg-rose-100 text-rose-700' },
    PARTIAL: { label: 'تسویه جزئی', className: 'bg-amber-100 text-amber-700' },
    PAID: { label: 'تسویه کامل', className: 'bg-emerald-100 text-emerald-700' }
  }[status] || { label: status || 'نامشخص', className: 'bg-slate-100 text-slate-600' };
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
  const result = await draftStore.deleteDraft(draftToDelete.value.id);
  deleting.value = false;
  if (!result.success) return toast.error(result.message);
  toast.success('پیش‌نویس حذف شد');
  draftToDelete.value = null;
}

async function openSettlement(list) {
  const result = await draftStore.getSettlement(list.id);
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

function formatDateTime(value) {
  if (!value) return '—';
  const text = String(value);
  const date = toPersianDate(text.slice(0, 10));
  const time = text.length >= 16 ? text.slice(11, 16) : '';
  return `${date}${time ? ` - ${time}` : ''}`;
}
</script>
