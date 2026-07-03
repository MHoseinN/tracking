<template>
  <Teleport to="body">
    <div v-if="isOpen" class="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-4">
      <div class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] bg-white shadow-[0_32px_100px_rgba(15,23,42,0.28)]">
        <div class="border-b border-slate-100 px-6 py-5">
          <div class="flex items-center justify-between gap-4">
            <div>
              <p class="text-xs font-semibold tracking-[0.3em] text-slate-400">UNIT ASSIGNMENT</p>
              <h2 class="mt-2 text-2xl font-bold text-slate-900">{{ title }}</h2>
              <p class="mt-2 text-sm text-slate-500">
                {{ unit?.product_name || '' }}
                <span v-if="unit?.unit_number">- واحد {{ unit.unit_number.toLocaleString('fa-IR') }}</span>
              </p>
            </div>
            <button
              type="button"
              class="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
              @click="$emit('close')"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form class="space-y-5 px-6 py-6" @submit.prevent="handleSubmit">
          <label class="space-y-2">
            <span class="text-sm font-semibold text-slate-700">مشتری</span>
            <SearchableLookupInput
              v-model="customerName"
              :options="customerOptions"
              header-text="مشتری‌ها"
              no-results-text="مشتری‌ای پیدا نشد. برای این فرم باید از مشتری‌های موجود انتخاب کنی."
              placeholder="جستجو و انتخاب مشتری"
              @select="handleCustomerSelect"
              @clear="form.customer_id = ''"
            />
          </label>

          <div class="grid gap-5 md:grid-cols-2">
            <label class="space-y-2">
              <span class="text-sm font-semibold text-slate-700">تاریخ رفت</span>
              <JalaliDatePicker
                :model-value="form.start_date_persian"
                input-class="h-12 rounded-2xl border border-slate-200 px-4 text-sm focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                @update:model-value="form.start_date_persian = $event"
              />
            </label>

            <label class="space-y-2">
              <span class="text-sm font-semibold text-slate-700">تاریخ برگشت</span>
              <JalaliDatePicker
                :model-value="form.end_date_persian"
                input-class="h-12 rounded-2xl border border-slate-200 px-4 text-sm focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                @update:model-value="form.end_date_persian = $event"
              />
            </label>
          </div>

          <label class="block space-y-2">
            <span class="text-sm font-semibold text-slate-700">یادداشت رزرو</span>
            <textarea
              v-model.trim="form.notes"
              rows="4"
              class="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              placeholder="اگر توضیحی برای این واحد لازم است اینجا بنویس"
            ></textarea>
          </label>

          <div class="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            مدت رزرو:
            <span class="font-semibold text-slate-800">{{ durationLabel }}</span>
          </div>

          <p v-if="errorMessage" class="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            {{ errorMessage }}
          </p>

          <div class="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-between">
            <button
              v-if="canClear"
              type="button"
              class="h-12 rounded-2xl border border-rose-200 bg-rose-50 px-5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
              @click="$emit('clear')"
            >
              آزاد کردن این واحد
            </button>
            <div class="flex flex-col-reverse gap-3 sm:mr-auto sm:flex-row">
              <button
                type="button"
                class="h-12 rounded-2xl border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                @click="$emit('close')"
              >
                انصراف
              </button>
              <button
                type="submit"
                :disabled="saving"
                class="h-12 rounded-2xl bg-emerald-600 px-6 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {{ saving ? 'در حال ذخیره...' : 'ذخیره رزرو' }}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue';
import JalaliDatePicker from './JalaliDatePicker.vue';
import SearchableLookupInput from './SearchableLookupInput.vue';
import { toGregorianDate, toPersianDate } from '../utils/dateConverter';

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  unit: { type: Object, default: null },
  customers: { type: Array, default: () => [] },
  saving: { type: Boolean, default: false }
});

const emit = defineEmits(['close', 'save', 'clear']);

const form = reactive({
  customer_id: '',
  start_date_persian: '',
  end_date_persian: '',
  notes: ''
});
const errorMessage = ref('');
const customerName = ref('');

const title = computed(() => props.unit?.reservation_item_id ? 'ویرایش رزرو این واحد' : 'رزرو این واحد');
const canClear = computed(() => Boolean(props.unit?.reservation_item_id));
const customerOptions = computed(() => props.customers.map((customer) => ({
  label: customer.name,
  value: customer.id
})));
const durationLabel = computed(() => {
  const start = toGregorianDate(form.start_date_persian);
  const end = toGregorianDate(form.end_date_persian);
  if (!start || !end) return 'تاریخ را مشخص کنید';
  const diff = Math.round((new Date(`${end}T00:00:00`).getTime() - new Date(`${start}T00:00:00`).getTime()) / 86400000) + 1;
  return diff > 0 ? `${diff.toLocaleString('fa-IR')} روز` : 'بازه نامعتبر';
});

function resetForm() {
  form.customer_id = props.unit?.customer_id || '';
  form.start_date_persian = props.unit?.start_date ? toPersianDate(props.unit.start_date) : '';
  form.end_date_persian = props.unit?.end_date ? toPersianDate(props.unit.end_date) : '';
  form.notes = props.unit?.reservation_notes || '';
  customerName.value = props.customers.find((customer) => String(customer.id) === String(form.customer_id))?.name || '';
  errorMessage.value = '';
}

function handleCustomerSelect(option) {
  form.customer_id = option?.value || '';
  customerName.value = option?.label || '';
}

function handleSubmit() {
  errorMessage.value = '';
  const startDate = toGregorianDate(form.start_date_persian);
  const endDate = toGregorianDate(form.end_date_persian);

  if (!form.customer_id || !startDate || !endDate) {
    errorMessage.value = 'مشتری و بازه تاریخ را کامل کن';
    return;
  }

  if (startDate > endDate) {
    errorMessage.value = 'تاریخ رفت باید قبل از تاریخ برگشت باشد';
    return;
  }

  emit('save', {
    customer_id: Number(form.customer_id),
    start_date: startDate,
    end_date: endDate,
    notes: form.notes.trim() || null,
    reservation_item_id: props.unit?.reservation_item_id || null
  });
}

watch(() => props.isOpen, (value) => {
  if (value) resetForm();
});

watch(() => props.unit, () => {
  if (props.isOpen) resetForm();
});

watch(customerName, (value) => {
  const matched = props.customers.find((customer) => customer.name === String(value || '').trim());
  form.customer_id = matched?.id || '';
});
</script>
