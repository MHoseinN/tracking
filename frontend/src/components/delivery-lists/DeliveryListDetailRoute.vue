<template>
  <div>
    <Teleport to="#app-shell-actions">
      <button v-if="canRecordReturn" type="button" class="app-button-primary w-full bg-emerald-600 hover:bg-emerald-700"
        @click="showReturnModal = true">ثبت مرجوعی</button>
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
          <table class="w-full min-w-[760px]">
            <thead class="border-b border-slate-100 bg-slate-50">
              <tr>
                <th class="px-4 py-3 text-right text-xs font-bold text-slate-500">نام محصول</th>
                <th class="px-4 py-3 text-right text-xs font-bold text-slate-500">قیمت روزانه</th>
                <th class="px-4 py-3 text-right text-xs font-bold text-slate-500">تعداد</th>
                <th class="px-4 py-3 text-right text-xs font-bold text-slate-500">برگشت سالم</th>
                <th class="px-4 py-3 text-right text-xs font-bold text-slate-500">خسارت/مفقودی</th>
                <th class="px-4 py-3 text-right text-xs font-bold text-slate-500">مانده</th>
                <th class="px-4 py-3 text-right text-xs font-bold text-slate-500">جمع روزانه</th>
                <th class="px-4 py-3 text-right text-xs font-bold text-slate-500">وضعیت</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in list.items" :key="item.id" class="border-b border-slate-100 last:border-0">
                <td class="px-4 py-4 text-sm font-bold text-slate-800">{{ item.product_name_snapshot }}</td>
                <td class="px-4 py-4 text-sm text-slate-600">{{ formatCurrency(item.daily_price_toman) }}</td>
                <td class="px-4 py-4 text-sm text-slate-600">{{ formatNumber(item.delivered_quantity) }}</td>
                <td class="px-4 py-4 text-sm font-bold text-emerald-700">{{ formatNumber(item.healthy_returned_quantity) }}</td>
                <td class="px-4 py-4 text-sm font-bold text-rose-700">{{ formatNumber(item.damaged_quantity + item.lost_quantity) }}</td>
                <td class="px-4 py-4 text-sm font-bold text-orange-700">{{ formatNumber(item.remaining_quantity) }}</td>
                <td class="px-4 py-4 text-sm font-bold text-indigo-700">{{ formatCurrency(item.daily_price_toman * item.delivered_quantity) }}</td>
                <td class="px-4 py-4"><span class="app-badge" :class="itemStatusMeta(item.item_status).className">{{ itemStatusMeta(item.item_status).label }}</span></td>
              </tr>
            </tbody>
            <tfoot class="border-t border-slate-200 bg-slate-50">
              <tr>
                <td colspan="6" class="px-4 py-4 text-sm font-bold text-slate-700">جمع نرخ روزانه</td>
                <td colspan="2" class="px-4 py-4 text-base font-black text-indigo-700">{{ formatCurrency(dailyTotal) }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <section v-if="list.return_events?.length" class="app-panel overflow-hidden">
        <div class="border-b border-slate-100 p-5"><h3 class="text-base font-black text-slate-800">تاریخچه مرجوعی‌ها</h3></div>
        <div class="divide-y divide-slate-100">
          <article v-for="event in list.return_events" :key="event.id" class="p-5">
            <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p class="text-sm font-bold text-slate-800">{{ formatDateTime(event.returned_at) }}</p>
                <p class="mt-1 text-xs text-slate-500">تحویل‌گیرنده: {{ event.received_by_name || '—' }}</p>
              </div>
              <span class="app-badge bg-slate-100 text-slate-600">{{ formatNumber(event.items.length) }} ردیف</span>
            </div>
            <div class="mt-4 grid gap-2 lg:grid-cols-2">
              <div v-for="item in event.items" :key="item.id" class="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                <p class="font-bold text-slate-800">{{ item.product_name_snapshot }}</p>
                <p class="mt-2">سالم: {{ formatNumber(item.healthy_quantity) }} | خسارت: {{ formatNumber(item.damaged_quantity) }} | مفقودی: {{ formatNumber(item.lost_quantity) }}</p>
                <p class="mt-1">روز سیستم: {{ formatNumber(item.system_calculated_days) }} | روز نهایی: {{ formatNumber(item.final_charged_days) }}</p>
                <p v-if="item.day_override_reason" class="mt-1 text-amber-700">دلیل تغییر: {{ item.day_override_reason }}</p>
                <p v-if="item.damage_notes" class="mt-1 text-rose-700">شرح: {{ item.damage_notes }}</p>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section class="rounded-lg border border-violet-200 bg-violet-50 p-5 text-sm text-violet-800">
        پیش‌فاکتور خودکار ایجاد شده است. تعداد روز و مبلغ قطعی اقلام در مرحله ثبت مرجوعی محاسبه و به فاکتور اضافه می‌شود.
      </section>
    </div>

    <DeliveryReturnModal :is-open="showReturnModal" :list="list" :saving="returning"
      @close="showReturnModal = false" @save="handleReturn" />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import AppContentState from '../AppContentState.vue';
import DeliveryReturnModal from './DeliveryReturnModal.vue';
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

const dailyTotal = computed(() => (list.value?.items || []).reduce((sum, item) => (
  sum + Number(item.daily_price_toman) * Number(item.delivered_quantity)
), 0));
const canRecordReturn = computed(() => (
  ['DELIVERED', 'REMAINING', 'NEEDS_FOLLOW_UP'].includes(list.value?.status)
  && (list.value?.items || []).some((item) => Number(item.remaining_quantity) > 0)
));
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
