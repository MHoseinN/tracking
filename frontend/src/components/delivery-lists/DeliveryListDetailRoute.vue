<template>
  <div>
    <Teleport to="#app-shell-actions">
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
                <th class="px-4 py-3 text-right text-xs font-bold text-slate-500">جمع روزانه</th>
                <th class="px-4 py-3 text-right text-xs font-bold text-slate-500">وضعیت</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in list.items" :key="item.id" class="border-b border-slate-100 last:border-0">
                <td class="px-4 py-4 text-sm font-bold text-slate-800">{{ item.product_name_snapshot }}</td>
                <td class="px-4 py-4 text-sm text-slate-600">{{ formatCurrency(item.daily_price_toman) }}</td>
                <td class="px-4 py-4 text-sm text-slate-600">{{ formatNumber(item.delivered_quantity) }}</td>
                <td class="px-4 py-4 text-sm font-bold text-indigo-700">{{ formatCurrency(item.daily_price_toman * item.delivered_quantity) }}</td>
                <td class="px-4 py-4"><span class="app-badge bg-blue-100 text-blue-700">تحویل</span></td>
              </tr>
            </tbody>
            <tfoot class="border-t border-slate-200 bg-slate-50">
              <tr>
                <td colspan="3" class="px-4 py-4 text-sm font-bold text-slate-700">جمع نرخ روزانه</td>
                <td colspan="2" class="px-4 py-4 text-base font-black text-indigo-700">{{ formatCurrency(dailyTotal) }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <section class="rounded-lg border border-violet-200 bg-violet-50 p-5 text-sm text-violet-800">
        پیش‌فاکتور خودکار ایجاد شده است. تعداد روز و مبلغ قطعی اقلام در مرحله ثبت مرجوعی محاسبه و به فاکتور اضافه می‌شود.
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import AppContentState from '../AppContentState.vue';
import { useDeliveryListStore } from '../../stores/deliveryListStore';
import { toPersianDate } from '../../utils/dateConverter';

const route = useRoute();
const router = useRouter();
const toast = useToast();
const listStore = useDeliveryListStore();
const list = ref(null);
const loading = ref(true);

const dailyTotal = computed(() => (list.value?.items || []).reduce((sum, item) => (
  sum + Number(item.daily_price_toman) * Number(item.delivered_quantity)
), 0));
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

function formatNumber(value) { return Number(value || 0).toLocaleString('fa-IR'); }
function formatCurrency(value) { return `${formatNumber(value)} تومان`; }
function formatDateTime(value) {
  if (!value) return '—';
  const text = String(value);
  return `${toPersianDate(text.slice(0, 10))} - ${text.slice(11, 16)}`;
}
</script>
