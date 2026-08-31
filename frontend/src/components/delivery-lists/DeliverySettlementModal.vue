<template>
  <Teleport to="body">
    <div v-if="isOpen" class="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/50 p-4">
      <div class="max-h-[95vh] w-full max-w-7xl overflow-y-auto rounded-lg bg-white shadow-2xl">
        <header class="sticky top-0 z-10 flex items-center justify-between border-b border-slate-300 bg-white px-6 py-5">
          <div>
            <h2 class="text-xl font-black text-slate-900">مدیریت پرداخت و تسویه</h2>
            <p class="mt-1 text-xs text-slate-500">{{ summary?.list?.list_number }} — {{ summary?.list?.customer_name_snapshot }}</p>
          </div>
          <button type="button" class="app-icon-button" :disabled="saving" @click="$emit('close')">✕</button>
        </header>

        <div class="space-y-6 p-6">
          <table class="w-full border-collapse border border-slate-300 text-sm">
            <thead class="bg-slate-100"><tr>
              <th class="border border-slate-300 px-4 py-3 text-right">وضعیت تسویه</th>
              <th class="border border-slate-300 px-4 py-3 text-right">جمع فاکتورهای صادرشده</th>
              <th class="border border-slate-300 px-4 py-3 text-right">جمع پرداخت معتبر</th>
              <th class="border border-slate-300 px-4 py-3 text-right">مانده قابل پرداخت</th>
              <th class="border border-slate-300 px-4 py-3 text-right">بستانکاری/بیعانه مازاد</th>
            </tr></thead>
            <tbody><tr>
              <td class="border border-slate-300 px-4 py-4"><span class="app-badge" :class="settlementMeta.className">{{ settlementMeta.label }}</span></td>
              <td class="border border-slate-300 px-4 py-4 font-bold">{{ formatCurrency(summary?.total_invoiced_toman) }}</td>
              <td class="border border-slate-300 px-4 py-4 font-bold text-emerald-700">{{ formatCurrency(summary?.total_paid_toman) }}</td>
              <td class="border border-slate-300 px-4 py-4 font-black text-rose-700">{{ formatCurrency(summary?.balance_toman) }}</td>
              <td class="border border-slate-300 px-4 py-4 font-bold text-indigo-700">{{ formatCurrency(summary?.credit_toman) }}</td>
            </tr></tbody>
          </table>

          <section>
            <h3 class="mb-3 text-sm font-black text-slate-800">فاکتورهای این لیست</h3>
            <div class="overflow-x-auto"><table class="w-full min-w-[750px] border-collapse border border-slate-300 text-sm">
              <thead class="bg-slate-100"><tr><th v-for="heading in ['شماره فاکتور','نوع','تاریخ صدور','مبلغ نهایی','وضعیت تسویه']" :key="heading" class="border border-slate-300 px-3 py-3 text-right">{{ heading }}</th></tr></thead>
              <tbody>
                <tr v-if="!summary?.invoices?.length"><td colspan="5" class="border border-slate-300 px-3 py-5 text-center text-slate-400">هنوز فاکتور قطعی صادر نشده است؛ پرداخت به‌عنوان بیعانه ثبت می‌شود.</td></tr>
                <tr v-for="invoice in summary?.invoices" :key="invoice.id"><td class="border border-slate-300 px-3 py-3 font-bold text-indigo-700">{{ invoice.invoice_number }}</td><td class="border border-slate-300 px-3 py-3">{{ invoice.invoice_type === 'PRIMARY' ? 'اصلی' : 'تکمیلی' }}</td><td class="border border-slate-300 px-3 py-3">{{ formatDateTime(invoice.issued_at) }}</td><td class="border border-slate-300 px-3 py-3 font-bold">{{ formatCurrency(invoice.final_amount_toman) }}</td><td class="border border-slate-300 px-3 py-3">{{ settlementLabel(invoice.settlement_status) }}</td></tr>
              </tbody>
            </table></div>
          </section>

          <section class="rounded-lg border border-slate-300">
            <div class="border-b border-slate-300 bg-slate-50 px-5 py-4"><h3 class="text-sm font-black text-slate-800">ثبت پرداخت جدید</h3></div>
            <div class="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
              <label class="space-y-2"><span class="text-sm font-semibold text-slate-700">مبلغ پرداخت (تومان)</span><div class="flex gap-2"><input v-model.number="form.amount_toman" type="number" min="1" class="h-11 min-w-0 flex-1 rounded border border-slate-300 px-3" /><button v-if="Number(summary?.balance_toman) > 0" type="button" class="app-button-secondary whitespace-nowrap px-3 text-xs" @click="form.amount_toman = Number(summary.balance_toman)">کل مانده</button></div></label>
              <label class="space-y-2"><span class="text-sm font-semibold text-slate-700">روش پرداخت</span><select v-model="form.payment_method" class="h-11 w-full rounded border border-slate-300 px-3 text-sm"><option value="CASH">نقدی</option><option value="POS">کارت‌خوان</option><option value="CARD_TRANSFER">کارت‌به‌کارت</option><option value="OTHER">سایر</option></select></label>
              <label class="space-y-2"><span class="text-sm font-semibold text-slate-700">اتصال به فاکتور</span><select v-model="form.invoice_id" class="h-11 w-full rounded border border-slate-300 px-3 text-sm"><option value="">کل لیست / بیعانه</option><option v-for="invoice in summary?.invoices" :key="invoice.id" :value="invoice.id">{{ invoice.invoice_number }}</option></select></label>
              <label class="space-y-2"><span class="text-sm font-semibold text-slate-700">شماره پیگیری</span><input v-model.trim="form.reference_number" type="text" maxlength="255" class="h-11 w-full rounded border border-slate-300 px-3" /></label>
              <label class="space-y-2"><span class="text-sm font-semibold text-slate-700">تاریخ پرداخت</span><JalaliDatePicker v-model="form.paid_date" input-class="h-11 bg-white" /></label>
              <label class="space-y-2"><span class="text-sm font-semibold text-slate-700">ساعت پرداخت</span><TimePicker24 v-model="form.paid_time" input-class="h-11" /></label>
              <label class="space-y-2 md:col-span-2"><span class="text-sm font-semibold text-slate-700">توضیحات</span><input v-model.trim="form.notes" type="text" maxlength="2000" class="h-11 w-full rounded border border-slate-300 px-3" /></label>
            </div>
            <div class="flex justify-end border-t border-slate-300 px-5 py-4"><button type="button" class="app-button-primary" :disabled="saving" @click="prepareRecord">ثبت پرداخت</button></div>
          </section>

          <section>
            <h3 class="mb-3 text-sm font-black text-slate-800">تاریخچه پرداخت‌ها</h3>
            <div class="overflow-x-auto"><table class="w-full min-w-[1200px] border-collapse border border-slate-300 text-sm">
              <thead class="bg-slate-100"><tr><th v-for="heading in ['تاریخ پرداخت','مبلغ','روش','فاکتور','شماره پیگیری','دریافت‌کننده','توضیحات','وضعیت','عملیات']" :key="heading" class="border border-slate-300 px-3 py-3 text-right">{{ heading }}</th></tr></thead>
              <tbody>
                <tr v-if="!summary?.payments?.length"><td colspan="9" class="border border-slate-300 px-3 py-5 text-center text-slate-400">پرداختی ثبت نشده است.</td></tr>
                <tr v-for="payment in summary?.payments" :key="payment.id" :class="payment.voided_at ? 'bg-slate-50 text-slate-400' : ''"><td class="border border-slate-300 px-3 py-3">{{ formatDateTime(payment.paid_at) }}</td><td class="border border-slate-300 px-3 py-3 font-bold">{{ formatCurrency(payment.amount_toman) }}</td><td class="border border-slate-300 px-3 py-3">{{ methodLabel(payment.payment_method) }}</td><td class="border border-slate-300 px-3 py-3">{{ payment.invoice_number || 'کل لیست' }}</td><td class="border border-slate-300 px-3 py-3">{{ payment.reference_number || '—' }}</td><td class="border border-slate-300 px-3 py-3">{{ payment.received_by_name || '—' }}</td><td class="border border-slate-300 px-3 py-3">{{ payment.notes || '—' }}</td><td class="border border-slate-300 px-3 py-3"><span class="app-badge" :class="payment.voided_at ? 'bg-slate-200 text-slate-600' : 'bg-emerald-100 text-emerald-700'">{{ payment.voided_at ? 'باطل‌شده' : 'معتبر' }}</span></td><td class="border border-slate-300 px-3 py-3"><button v-if="!payment.voided_at" type="button" class="text-xs font-bold text-rose-700" @click="paymentToVoid = payment">ابطال</button><span v-else class="text-xs">توسط {{ payment.voided_by_name || '—' }}</span></td></tr>
              </tbody>
            </table></div>
          </section>

          <p v-if="errorMessage" class="rounded border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700">{{ errorMessage }}</p>
        </div>
        <footer class="sticky bottom-0 flex justify-end border-t border-slate-300 bg-white px-6 py-4"><button type="button" class="app-button-secondary" :disabled="saving" @click="$emit('close')">بستن</button></footer>
      </div>
    </div>
  </Teleport>

  <ConfirmModal :is-open="Boolean(pendingPayment)" title="تأیید ثبت پرداخت"
    :message="`مبلغ ${formatCurrency(pendingPayment?.amount_toman)} به‌عنوان پرداخت ثبت شود؟`"
    :loading="saving" confirm-text="بله، ثبت شود" loading-text="در حال ثبت..."
    @confirm="emitRecord" @cancel="pendingPayment = null" />
  <ConfirmModal :is-open="Boolean(paymentToVoid)" title="ابطال پرداخت"
    :message="`پرداخت ${formatCurrency(paymentToVoid?.amount_toman)} باطل شود؟ سابقه آن در سیستم باقی می‌ماند.`"
    :loading="saving" confirm-text="بله، باطل شود" loading-text="در حال ابطال..."
    @confirm="$emit('void', paymentToVoid.id)" @cancel="paymentToVoid = null" />
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue';
import ConfirmModal from '../ConfirmModal.vue';
import JalaliDatePicker from '../JalaliDatePicker.vue';
import TimePicker24 from '../TimePicker24.vue';
import { getCurrentPersianDate, toGregorianDate, toPersianDate } from '../../utils/dateConverter';

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  summary: { type: Object, default: null },
  saving: { type: Boolean, default: false }
});
const emit = defineEmits(['close', 'record', 'void']);
const form = reactive({ amount_toman: '', payment_method: 'CARD_TRANSFER', invoice_id: '', reference_number: '', paid_date: '', paid_time: '', notes: '' });
const pendingPayment = ref(null);
const paymentToVoid = ref(null);
const errorMessage = ref('');

const settlementMeta = computed(() => ({
  UNPAID: { label: 'تسویه‌نشده', className: 'bg-rose-100 text-rose-700' },
  PARTIAL: { label: 'تسویه جزئی / بیعانه', className: 'bg-amber-100 text-amber-700' },
  PAID: { label: 'تسویه کامل', className: 'bg-emerald-100 text-emerald-700' }
}[props.summary?.list?.settlement_status] || { label: 'نامشخص', className: 'bg-slate-100 text-slate-600' }));

watch(() => props.isOpen, (open) => {
  if (open) resetForm();
  else { pendingPayment.value = null; paymentToVoid.value = null; }
});
watch(() => props.summary?.total_paid_toman, () => {
  if (props.isOpen) { pendingPayment.value = null; paymentToVoid.value = null; resetForm(); }
});

function resetForm() {
  const now = new Date();
  const today = getCurrentPersianDate();
  form.amount_toman = '';
  form.payment_method = 'CARD_TRANSFER';
  form.invoice_id = '';
  form.reference_number = '';
  form.paid_date = `${today.year}/${String(today.month).padStart(2, '0')}/${String(today.day).padStart(2, '0')}`;
  form.paid_time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  form.notes = '';
  errorMessage.value = '';
}

function prepareRecord() {
  errorMessage.value = '';
  const amount = Number(form.amount_toman);
  if (!Number.isInteger(amount) || amount < 1) return setError('مبلغ پرداخت باید بیشتر از صفر باشد');
  if (!form.paid_date || !form.paid_time) return setError('تاریخ و ساعت پرداخت الزامی است');
  pendingPayment.value = {
    invoice_id: form.invoice_id ? Number(form.invoice_id) : null,
    amount_toman: amount,
    payment_method: form.payment_method,
    reference_number: form.reference_number || null,
    paid_at: `${toGregorianDate(form.paid_date)}T${form.paid_time}:00+03:30`,
    notes: form.notes || null
  };
}

function emitRecord() { emit('record', pendingPayment.value); }
function setError(message) { errorMessage.value = message; }
function settlementLabel(status) { return ({ UNPAID: 'تسویه‌نشده', PARTIAL: 'تسویه جزئی', PAID: 'تسویه کامل' })[status] || status; }
function methodLabel(method) { return ({ CASH: 'نقدی', POS: 'کارت‌خوان', CARD_TRANSFER: 'کارت‌به‌کارت', OTHER: 'سایر' })[method] || method; }
function formatNumber(value) { return Number(value || 0).toLocaleString('fa-IR'); }
function formatCurrency(value) { return `${formatNumber(value)} تومان`; }
function formatDateTime(value) {
  if (!value) return '—';
  const text = String(value);
  const date = new Date(text);
  const localDate = Number.isNaN(date.getTime()) ? text.slice(0, 10) : new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tehran' }).format(date);
  const localTime = Number.isNaN(date.getTime()) ? text.slice(11, 16) : new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Tehran' }).format(date);
  return `${toPersianDate(localDate)} - ${localTime}`;
}
</script>
