<template>
  <Teleport to="body">
    <div v-if="isOpen" class="fixed inset-0 z-[160] flex items-center justify-center bg-slate-950/60 p-3">
      <div class="flex max-h-[96vh] w-full max-w-7xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
        <header class="flex shrink-0 items-center justify-between border-b border-slate-300 px-5 py-4">
          <div>
            <h2 class="text-xl font-black text-slate-900">پیش‌نمایش و ویرایش فاکتور</h2>
            <p class="mt-1 text-xs text-slate-500">شماره {{ invoice?.invoice_number || '—' }}</p>
          </div>
          <button type="button" class="app-icon-button" :disabled="busy" @click="$emit('close')">✕</button>
        </header>

        <nav class="flex shrink-0 border-b border-slate-300 bg-slate-50 px-5 pt-3">
          <button type="button" class="border-b-2 px-5 py-3 text-sm font-bold"
            :class="activeTab === 'edit' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500'"
            @click="activeTab = 'edit'">بررسی و ویرایش</button>
          <button type="button" class="border-b-2 px-5 py-3 text-sm font-bold"
            :class="activeTab === 'pdf' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500'"
            @click="activeTab = 'pdf'">نمایش PDF</button>
        </nav>

        <div class="min-h-0 flex-1 overflow-y-auto p-5">
          <div v-if="activeTab === 'pdf'" class="space-y-3">
            <p v-if="isDirty" class="rounded border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              پیش‌نمایش PDF مربوط به آخرین نسخه ذخیره‌شده است. برای مشاهده تغییرات ابتدا فاکتور را ذخیره کنید.
            </p>
            <div class="h-[72vh] overflow-hidden rounded border border-slate-300 bg-slate-100">
              <div v-if="loadingPdf" class="flex h-full items-center justify-center text-sm text-slate-500">در حال ساخت پیش‌نمایش PDF...</div>
              <iframe v-else-if="pdfUrl" :src="`${pdfUrl}#toolbar=1&navpanes=0`" title="پیش‌نمایش PDF فاکتور" class="h-full w-full bg-white" />
              <div v-else class="flex h-full items-center justify-center text-sm text-rose-600">پیش‌نمایش PDF آماده نشد.</div>
            </div>
          </div>

          <div v-else class="space-y-6">
            <section>
              <h3 class="mb-3 text-sm font-black text-slate-800">اقلام فاکتور</h3>
              <div class="overflow-x-auto">
                <table class="w-full min-w-[950px] border-collapse border border-slate-400">
                  <thead class="bg-slate-100"><tr>
                    <th v-for="heading in ['نام محصول','تاریخ برگشت','تعداد','تعداد روز','قیمت واحد روزانه','مبلغ ردیف']" :key="heading" class="border border-slate-400 px-3 py-3 text-right text-xs">{{ heading }}</th>
                  </tr></thead>
                  <tbody><tr v-for="row in rows" :key="row.id">
                    <td class="border border-slate-400 px-3 py-3 text-sm font-bold">{{ row.description }}</td>
                    <td class="border border-slate-400 px-3 py-3 text-sm">{{ formatDateTime(row.billing_to_at) }}</td>
                    <td class="border border-slate-400 px-3 py-3">{{ formatNumber(row.quantity) }}</td>
                    <td class="border border-slate-400 p-2"><input v-model.number="row.charged_days" type="number" min="1" class="h-10 w-24 rounded border border-slate-300 px-2" /></td>
                    <td class="border border-slate-400 p-2"><input v-model.number="row.unit_price_toman" type="number" min="0" class="h-10 w-40 rounded border border-slate-300 px-2" /></td>
                    <td class="border border-slate-400 px-3 py-3 font-black text-indigo-700">{{ formatCurrency(lineTotal(row)) }}</td>
                  </tr></tbody>
                </table>
              </div>
            </section>

            <section>
              <div class="mb-3 flex items-center justify-between">
                <h3 class="text-sm font-black text-slate-800">هزینه‌های اضافی</h3>
                <button type="button" class="app-button-secondary px-3 py-2 text-xs" @click="addExtra">افزودن هزینه</button>
              </div>
              <div class="overflow-x-auto">
                <table class="w-full min-w-[760px] border-collapse border border-slate-400">
                  <thead class="bg-slate-100"><tr><th v-for="heading in ['نوع','شرح','مبلغ','عملیات']" :key="heading" class="border border-slate-400 px-3 py-3 text-right text-xs">{{ heading }}</th></tr></thead>
                  <tbody>
                    <tr v-if="!extras.length"><td colspan="4" class="border border-slate-400 px-3 py-5 text-center text-sm text-slate-400">هزینه اضافی ثبت نشده است.</td></tr>
                    <tr v-for="(extra, index) in extras" :key="extra.key">
                      <td class="border border-slate-400 p-2"><select v-model="extra.type" class="h-10 w-full rounded border border-slate-300 px-2 text-sm"><option value="DAMAGE">خسارت</option><option value="TRANSPORT">حمل‌ونقل</option><option value="OTHER">سایر</option></select></td>
                      <td class="border border-slate-400 p-2"><input v-model.trim="extra.description" maxlength="1000" class="h-10 w-full rounded border border-slate-300 px-3 text-sm" /></td>
                      <td class="border border-slate-400 p-2"><input v-model.number="extra.amount_toman" type="number" min="1" class="h-10 w-44 rounded border border-slate-300 px-2" /></td>
                      <td class="border border-slate-400 p-2"><button type="button" class="text-xs font-bold text-rose-700" @click="extras.splice(index, 1)">حذف</button></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section class="grid gap-5 lg:grid-cols-[1fr_430px]">
              <div class="grid content-start gap-4 md:grid-cols-2">
                <label class="space-y-2"><span class="text-sm font-semibold">تخفیف درصدی</span><input v-model.number="discountPercent" type="number" min="0" max="100" step="0.01" class="h-11 w-full rounded border border-slate-300 px-3" /></label>
                <label class="space-y-2"><span class="text-sm font-semibold">تخفیف مبلغی</span><input v-model.number="discountAmount" type="number" min="0" class="h-11 w-full rounded border border-slate-300 px-3" /></label>
                <label class="space-y-2"><span class="text-sm font-semibold">کاهش برای رند به پایین</span><input v-model.number="roundDownAmount" type="number" min="0" class="h-11 w-full rounded border border-slate-300 px-3" /></label>
                <label class="space-y-2"><span class="text-sm font-semibold">یادداشت فاکتور</span><input v-model.trim="notes" maxlength="5000" class="h-11 w-full rounded border border-slate-300 px-3" /></label>
              </div>
              <table class="w-full border-collapse border border-slate-400 text-sm"><tbody>
                <tr><th class="border border-slate-400 bg-slate-100 px-4 py-3 text-right">جمع اقلام</th><td class="border border-slate-400 px-4 py-3 font-bold">{{ formatCurrency(subtotal) }}</td></tr>
                <tr><th class="border border-slate-400 bg-slate-100 px-4 py-3 text-right">هزینه‌های اضافی</th><td class="border border-slate-400 px-4 py-3 font-bold">{{ formatCurrency(extraTotal) }}</td></tr>
                <tr><th class="border border-slate-400 bg-slate-100 px-4 py-3 text-right">مجموع تخفیف</th><td class="border border-slate-400 px-4 py-3 font-bold text-rose-700">{{ formatCurrency(totalDiscount) }}</td></tr>
                <tr><th class="border border-slate-400 bg-slate-100 px-4 py-3 text-right">رند به پایین</th><td class="border border-slate-400 px-4 py-3 font-bold text-rose-700">{{ formatCurrency(roundDownAmount) }}</td></tr>
                <tr><th class="border border-slate-500 bg-indigo-50 px-4 py-4 text-right">مبلغ نهایی</th><td class="border border-slate-500 bg-indigo-50 px-4 py-4 text-lg font-black text-indigo-800">{{ formatCurrency(finalAmount) }}</td></tr>
              </tbody></table>
            </section>
            <p v-if="errorMessage" class="rounded border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700">{{ errorMessage }}</p>
          </div>
        </div>

        <footer class="flex shrink-0 flex-wrap justify-end gap-3 border-t border-slate-300 bg-white px-5 py-4">
          <button type="button" class="app-button-secondary" :disabled="busy" @click="$emit('close')">بستن</button>
          <button type="button" class="app-button-secondary" :disabled="busy || !isDirty" @click="requestSave(false)">{{ saving ? 'در حال ذخیره...' : 'ذخیره تغییرات' }}</button>
          <button type="button" class="app-button-primary" :disabled="busy" @click="requestDownload">{{ downloading ? 'در حال آماده‌سازی...' : (isDirty ? 'ذخیره و دانلود PDF' : 'دانلود PDF') }}</button>
        </footer>
      </div>
    </div>
  </Teleport>

  <ConfirmModal :is-open="confirming" title="تأیید ویرایش فاکتور"
    :message="downloadAfterSave ? 'تغییرات ذخیره شوند و سپس PDF جدید دانلود شود؟' : 'تغییرات این فاکتور ذخیره شوند؟'"
    confirm-text="بله، ذخیره شود" @confirm="confirmSave" @cancel="confirming = false" />
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import ConfirmModal from '../ConfirmModal.vue';
import { toPersianDate } from '../../utils/dateConverter';

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  invoice: { type: Object, default: null },
  pdfUrl: { type: String, default: '' },
  saving: { type: Boolean, default: false },
  loadingPdf: { type: Boolean, default: false },
  downloading: { type: Boolean, default: false }
});
const emit = defineEmits(['close', 'save', 'save-download', 'download']);
const activeTab = ref('edit');
const rows = ref([]);
const extras = ref([]);
const discountPercent = ref(0);
const discountAmount = ref(0);
const roundDownAmount = ref(0);
const notes = ref('');
const errorMessage = ref('');
const initialPayload = ref('');
const confirming = ref(false);
const downloadAfterSave = ref(false);
let extraKey = 0;

const busy = computed(() => props.saving || props.loadingPdf || props.downloading);
const subtotal = computed(() => rows.value.reduce((sum, row) => sum + lineTotal(row), 0));
const extraTotal = computed(() => extras.value.reduce((sum, row) => sum + Math.max(0, Number(row.amount_toman) || 0), 0));
const gross = computed(() => subtotal.value + extraTotal.value);
const percentDiscountAmount = computed(() => Math.floor(gross.value * Math.max(0, Number(discountPercent.value) || 0) / 100));
const totalDiscount = computed(() => percentDiscountAmount.value + Math.max(0, Number(discountAmount.value) || 0));
const finalAmount = computed(() => Math.max(0, gross.value - totalDiscount.value - Math.max(0, Number(roundDownAmount.value) || 0)));
const payload = computed(() => ({
  lines: rows.value.map((row) => ({ id: row.id, charged_days: Math.round(Number(row.charged_days)), unit_price_toman: Math.round(Number(row.unit_price_toman)) })),
  extras: extras.value.map((row) => ({ type: row.type, description: row.description, amount_toman: Math.round(Number(row.amount_toman)) })),
  discount_percent_basis_points: Math.round(Number(discountPercent.value || 0) * 100),
  discount_amount_toman: Math.round(Number(discountAmount.value) || 0),
  rounding_adjustment_toman: -Math.round(Number(roundDownAmount.value) || 0),
  notes: notes.value || null
}));
const isDirty = computed(() => JSON.stringify(payload.value) !== initialPayload.value);

watch(() => [props.isOpen, props.invoice], ([open]) => {
  if (open) reset();
}, { deep: true });

function reset() {
  rows.value = (props.invoice?.lines || []).map((line) => ({ ...line }));
  extras.value = (props.invoice?.extras || []).map((extra) => ({ ...extra, key: ++extraKey }));
  discountPercent.value = Number(props.invoice?.discount_percent_basis_points || 0) / 100;
  discountAmount.value = Number(props.invoice?.fixed_discount_toman || 0);
  roundDownAmount.value = Math.abs(Number(props.invoice?.rounding_adjustment_toman || 0));
  notes.value = props.invoice?.notes || '';
  errorMessage.value = '';
  activeTab.value = 'edit';
  confirming.value = false;
  initialPayload.value = JSON.stringify(payload.value);
}

function addExtra() { extras.value.push({ key: ++extraKey, type: 'OTHER', description: '', amount_toman: 0 }); }
function lineTotal(row) { return Number(row.quantity || 0) * Math.max(1, Number(row.charged_days) || 1) * Math.max(0, Number(row.unit_price_toman) || 0); }

function validate() {
  errorMessage.value = '';
  if (!rows.value.length) return setError('فاکتور هیچ ردیفی ندارد');
  if (rows.value.some((row) => !Number.isInteger(Number(row.charged_days)) || Number(row.charged_days) < 1)) return setError('تعداد روز تمام ردیف‌ها باید حداقل یک باشد');
  if (rows.value.some((row) => !Number.isInteger(Number(row.unit_price_toman)) || Number(row.unit_price_toman) < 0)) return setError('قیمت واحد تمام ردیف‌ها باید معتبر باشد');
  if (Number(discountPercent.value) < 0 || Number(discountPercent.value) > 100) return setError('درصد تخفیف باید بین صفر تا صد باشد');
  if (extras.value.some((row) => !row.description || Number(row.amount_toman) < 1)) return setError('شرح و مبلغ تمام هزینه‌های اضافی را کامل کنید');
  if (totalDiscount.value > gross.value) return setError('مجموع تخفیف از مبلغ فاکتور بیشتر است');
  if (Number(roundDownAmount.value) > gross.value - totalDiscount.value) return setError('مبلغ رند کردن بیش از مبلغ قابل پرداخت است');
  return true;
}

function requestSave(downloadAfter) {
  if (!validate()) return;
  downloadAfterSave.value = downloadAfter;
  confirming.value = true;
}
function confirmSave() {
  confirming.value = false;
  emit(downloadAfterSave.value ? 'save-download' : 'save', payload.value);
}
function requestDownload() {
  if (isDirty.value) requestSave(true);
  else emit('download');
}
function setError(message) { errorMessage.value = message; activeTab.value = 'edit'; return false; }
function formatNumber(value) { return Number(value || 0).toLocaleString('fa-IR'); }
function formatCurrency(value) { return `${formatNumber(value)} تومان`; }
function formatDateTime(value) {
  if (!value) return '—';
  const text = String(value);
  return `${toPersianDate(text.slice(0, 10))} - ${text.slice(11, 16)}`;
}
</script>
