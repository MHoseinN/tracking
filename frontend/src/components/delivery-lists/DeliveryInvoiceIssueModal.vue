<template>
  <Teleport to="body">
    <div v-if="isOpen" class="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/50 p-4">
      <div class="max-h-[95vh] w-full max-w-7xl overflow-y-auto rounded-lg bg-white shadow-2xl">
        <header
          class="sticky top-0 z-10 flex items-center justify-between border-b border-slate-300 bg-white px-6 py-5">
          <div>
            <h2 class="text-xl font-black text-slate-900">بررسی و صدور فاکتور</h2>
            <p class="mt-1 text-xs text-slate-500">{{ preview?.list?.list_number }} — فقط اقلامی که واقعاً برگشته‌اند
            </p>
          </div>
          <button type="button" class="app-icon-button" :disabled="saving" @click="$emit('close')">✕</button>
        </header>

        <div class="space-y-6 p-6">
          <section>
            <h3 class="mb-3 text-sm font-black text-slate-800">اقلام قابل صدور</h3>
            <div class="overflow-x-auto">
              <table class="w-full min-w-[1050px] border-collapse border border-slate-300">
                <thead class="bg-slate-100">
                  <tr>
                    <th class="border border-slate-300 px-3 py-3 text-right text-xs">نام محصول</th>
                    <th class="border border-slate-300 px-3 py-3 text-right text-xs">تاریخ برگشت واقعی</th>
                    <th class="border border-slate-300 px-3 py-3 text-right text-xs">تعداد</th>
                    <th class="border border-slate-300 px-3 py-3 text-right text-xs">تعداد روز</th>
                    <th class="border border-slate-300 px-3 py-3 text-right text-xs">قیمت واحد روزانه</th>
                    <th class="border border-slate-300 px-3 py-3 text-right text-xs">مبلغ ردیف</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in rows" :key="row.return_event_item_id">
                    <td class="border border-slate-300 px-3 py-3 text-sm font-bold text-slate-800">{{ row.description }}
                    </td>
                    <td class="border border-slate-300 px-3 py-3 text-sm text-slate-600">{{
                      formatDateTime(row.billing_to_at) }}</td>
                    <td class="border border-slate-300 px-3 py-3 text-sm">{{ formatNumber(row.quantity) }}</td>
                    <td class="border border-slate-300 p-2"><input v-model.number="row.charged_days" type="number"
                        min="1" class="h-10 w-24 rounded border border-slate-300 px-2" /></td>
                    <td class="border border-slate-300 p-2"><input v-model.number="row.unit_price_toman" type="number"
                        min="0" class="h-10 w-40 rounded border border-slate-300 px-2" /></td>
                    <td class="border border-slate-300 px-3 py-3 text-sm font-black text-indigo-700">{{
                      formatCurrency(lineTotal(row)) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <div class="mb-3 flex items-center justify-between">
              <h3 class="text-sm font-black text-slate-800">هزینه‌های اضافی</h3>
              <button type="button" class="app-button-secondary px-3 py-2 text-xs" @click="addExtra">افزودن
                هزینه</button>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full min-w-[800px] border-collapse border border-slate-300">
                <thead class="bg-slate-100">
                  <tr>
                    <th class="border border-slate-300 px-3 py-3 text-right text-xs">نوع هزینه</th>
                    <th class="border border-slate-300 px-3 py-3 text-right text-xs">شرح</th>
                    <th class="border border-slate-300 px-3 py-3 text-right text-xs">مبلغ</th>
                    <th class="border border-slate-300 px-3 py-3 text-right text-xs">عملیات</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="!extras.length">
                    <td colspan="4" class="border border-slate-300 px-3 py-5 text-center text-sm text-slate-400">هزینه
                      اضافی ثبت نشده است.</td>
                  </tr>
                  <tr v-for="(extra, index) in extras" :key="extra.key">
                    <td class="border border-slate-300 p-2"><select v-model="extra.type"
                        class="h-10 w-full rounded border border-slate-300 px-2 text-sm">
                        <option value="DAMAGE">خسارت</option>
                        <option value="TRANSPORT">حمل‌ونقل</option>
                        <option value="OTHER">سایر</option>
                      </select></td>
                    <td class="border border-slate-300 p-2"><input v-model.trim="extra.description" type="text"
                        maxlength="1000" class="h-10 w-full rounded border border-slate-300 px-3 text-sm"
                        placeholder="شرح هزینه" /></td>
                    <td class="border border-slate-300 p-2"><input v-model.number="extra.amount_toman" type="number"
                        min="1" class="h-10 w-44 rounded border border-slate-300 px-2" /></td>
                    <td class="border border-slate-300 p-2"><button type="button"
                        class="text-xs font-bold text-rose-700" @click="extras.splice(index, 1)">حذف</button></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section class="grid gap-5 lg:grid-cols-[1fr_430px]">
            <div class="grid content-start gap-4 md:grid-cols-2">
              <label class="space-y-2"><span class="text-sm font-semibold text-slate-700">تخفیف درصدی</span><input
                  v-model.number="discountPercent" type="number" min="0" max="100" step="0.01"
                  class="h-11 w-full rounded border border-slate-300 px-3" /></label>
              <label class="space-y-2"><span class="text-sm font-semibold text-slate-700">تخفیف مبلغی
                  (تومان)</span><input v-model.number="discountAmount" type="number" min="0"
                  class="h-11 w-full rounded border border-slate-300 px-3" /></label>
              <label class="space-y-2"><span class="text-sm font-semibold text-slate-700">کاهش برای رند به پایین
                  (تومان)</span><input v-model.number="roundDownAmount" type="number" min="0"
                  class="h-11 w-full rounded border border-slate-300 px-3" /></label>
              <label class="space-y-2"><span class="text-sm font-semibold text-slate-700">یادداشت فاکتور</span><input
                  v-model.trim="notes" type="text" maxlength="5000"
                  class="h-11 w-full rounded border border-slate-300 px-3" /></label>
            </div>
            <table class="w-full border-collapse border border-slate-300 text-sm">
              <tbody>
                <tr>
                  <th class="border border-slate-300 bg-slate-100 px-4 py-3 text-right">جمع اجاره اقلام</th>
                  <td class="border border-slate-300 px-4 py-3 font-bold">{{ formatCurrency(subtotal) }}</td>
                </tr>
                <tr>
                  <th class="border border-slate-300 bg-slate-100 px-4 py-3 text-right">هزینه‌های اضافی</th>
                  <td class="border border-slate-300 px-4 py-3 font-bold">{{ formatCurrency(extraTotal) }}</td>
                </tr>
                <tr>
                  <th class="border border-slate-300 bg-slate-100 px-4 py-3 text-right">مجموع تخفیف</th>
                  <td class="border border-slate-300 px-4 py-3 font-bold text-rose-700">{{ formatCurrency(totalDiscount)
                    }}</td>
                </tr>
                <tr>
                  <th class="border border-slate-300 bg-slate-100 px-4 py-3 text-right">رند به پایین</th>
                  <td class="border border-slate-300 px-4 py-3 font-bold text-rose-700">{{
                    formatCurrency(roundDownAmount) }}</td>
                </tr>
                <tr>
                  <th class="border border-slate-400 bg-indigo-50 px-4 py-4 text-right text-base">مبلغ نهایی</th>
                  <td class="border border-slate-400 bg-indigo-50 px-4 py-4 text-lg font-black text-indigo-800">{{
                    formatCurrency(finalAmount) }}</td>
                </tr>
              </tbody>
            </table>
          </section>

          <p v-if="errorMessage" class="rounded border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700">{{
            errorMessage }}</p>
        </div>

        <footer class="sticky bottom-0 flex justify-end gap-3 border-t border-slate-300 bg-white px-6 py-4">
          <button type="button" class="app-button-secondary" :disabled="saving" @click="$emit('close')">انصراف</button>
          <button type="button" class="app-button-primary" :disabled="saving || !rows.length"
            @click="validateAndConfirm">بررسی نهایی و صدور</button>
        </footer>
      </div>
    </div>
  </Teleport>

  <ConfirmModal :is-open="confirming" title="صدور قطعی فاکتور"
    message="پس از صدور، اقلام این مرحله فاکتورشده محسوب می‌شوند. آیا اطلاعات جدول را تأیید می‌کنید؟" :loading="saving"
    confirm-text="بله، فاکتور صادر شود" loading-text="در حال صدور..." @confirm="emitIssue"
    @cancel="confirming = false" />
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import ConfirmModal from '../ConfirmModal.vue';
import { toPersianDate } from '../../utils/dateConverter';

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  preview: { type: Object, default: null },
  saving: { type: Boolean, default: false }
});
const emit = defineEmits(['close', 'issue']);
const rows = ref([]);
const extras = ref([]);
const discountPercent = ref(0);
const discountAmount = ref(0);
const roundDownAmount = ref(0);
const notes = ref('');
const errorMessage = ref('');
const confirming = ref(false);
let extraKey = 0;

const subtotal = computed(() => rows.value.reduce((sum, row) => sum + lineTotal(row), 0));
const extraTotal = computed(() => extras.value.reduce((sum, row) => sum + Math.max(0, Number(row.amount_toman) || 0), 0));
const gross = computed(() => subtotal.value + extraTotal.value);
const percentDiscountAmount = computed(() => Math.floor(gross.value * Math.max(0, Number(discountPercent.value) || 0) / 100));
const totalDiscount = computed(() => percentDiscountAmount.value + Math.max(0, Number(discountAmount.value) || 0));
const finalAmount = computed(() => Math.max(0, gross.value - totalDiscount.value - Math.max(0, Number(roundDownAmount.value) || 0)));

watch(() => [props.isOpen, props.preview], ([open]) => {
  if (open) reset();
  else confirming.value = false;
}, { deep: true });

function reset() {
  rows.value = (props.preview?.lines || []).map((line) => ({ ...line }));
  extras.value = [];
  discountPercent.value = 0;
  discountAmount.value = 0;
  roundDownAmount.value = 0;
  notes.value = '';
  errorMessage.value = '';
  confirming.value = false;
}

function addExtra() {
  extras.value.push({ key: ++extraKey, type: 'OTHER', description: '', amount_toman: 0 });
}

function lineTotal(row) {
  return Number(row.quantity || 0) * Math.max(1, Number(row.charged_days) || 1) * Math.max(0, Number(row.unit_price_toman) || 0);
}

function validateAndConfirm() {
  errorMessage.value = '';
  if (!rows.value.length) return setError('مرجوعی فاکتورنشده‌ای وجود ندارد');
  if (rows.value.some((row) => !Number.isInteger(Number(row.charged_days)) || Number(row.charged_days) < 1)) return setError('تعداد روز تمام ردیف‌ها باید حداقل یک باشد');
  if (rows.value.some((row) => !Number.isInteger(Number(row.unit_price_toman)) || Number(row.unit_price_toman) < 0)) return setError('قیمت واحد تمام ردیف‌ها باید معتبر باشد');
  if (Number(discountPercent.value) < 0 || Number(discountPercent.value) > 100) return setError('درصد تخفیف باید بین صفر تا صد باشد');
  if (extras.value.some((row) => !row.description || Number(row.amount_toman) < 1)) return setError('شرح و مبلغ تمام هزینه‌های اضافی را کامل کنید');
  if (totalDiscount.value > gross.value || finalAmount.value < 0) return setError('تخفیف از مبلغ فاکتور بیشتر است');
  if (Number(roundDownAmount.value) > gross.value - totalDiscount.value) return setError('مبلغ رند کردن بیش از مبلغ قابل پرداخت است');
  confirming.value = true;
}

function emitIssue() {
  emit('issue', {
    lines: rows.value.map((row) => ({
      return_event_item_id: row.return_event_item_id,
      charged_days: Math.round(Number(row.charged_days)),
      unit_price_toman: Math.round(Number(row.unit_price_toman))
    })),
    extras: extras.value.map((row) => ({ type: row.type, description: row.description, amount_toman: Math.round(Number(row.amount_toman)) })),
    discount_percent_basis_points: Math.round(Number(discountPercent.value || 0) * 100),
    discount_amount_toman: Math.round(Number(discountAmount.value) || 0),
    rounding_adjustment_toman: -Math.round(Number(roundDownAmount.value) || 0),
    notes: notes.value || null
  });
}

function setError(message) { errorMessage.value = message; }
function formatNumber(value) { return Number(value || 0).toLocaleString('fa-IR'); }
function formatCurrency(value) { return `${formatNumber(value)} تومان`; }
function formatDateTime(value) {
  if (!value) return '—';
  const text = String(value);
  return `${toPersianDate(text.slice(0, 10))} - ${text.slice(11, 16)}`;
}
</script>
