<template>
  <Teleport to="body">
    <div v-if="isOpen && unit" class="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/45 p-4">
      <div class="max-h-[90vh]  overflow-y-auto rounded-xl bg-white shadow-[0_32px_100px_rgba(15,23,42,0.28)]">
        <div class="border-b border-slate-100 px-4 py-4">
          <div class="flex items-center justify-between gap-4">
            <div>
              <h1>{{ unit.product_name }} -  {{ Number(unit.unit_number || 0).toLocaleString('fa-IR') }} عدد</h1>
            </div>
            <button
              type="button"
              class="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
              @click="$emit('close')"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form class="space-y-5 px-4 py-4" @submit.prevent="handleSubmit">
          <div class="grid gap-5 md:grid-cols-2">
            <label class="space-y-2 md:col-span-2">
              <span class="text-sm font-semibold text-slate-700">نام مشتری</span>
              <SearchableLookupInput
                v-model="customerName"
                :options="customerOptions"
                no-results-text="مشتری‌ای پیدا نشد. می‌توانی نام جدید را دستی وارد کنی."
                placeholder="نام مشتری را وارد کن یا از لیست انتخاب کن"
                @select="handleCustomerSelect"
                @clear="customerId = null"
              />
            </label>

            <label class="space-y-2">
              <span class="text-sm font-semibold text-slate-700">تاریخ رفت</span>
              <JalaliDatePicker
                :model-value="startDatePersian"
                input-class="h-12 rounded-xl border border-slate-200 px-4 text-sm focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                @update:model-value="startDatePersian = $event"
              />
            </label>

            <label class="space-y-2">
              <span class="text-sm font-semibold text-slate-700">تاریخ برگشت</span>
              <JalaliDatePicker
                :model-value="endDatePersian"
                input-class="h-12 rounded-xl border border-slate-200 px-4 text-sm focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                @update:model-value="endDatePersian = $event"
              />
            </label>
          </div>

          <div class="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-slate-600">
            مدت رزرو:
            <span class="font-semibold text-rose-600">{{ durationLabel }}</span>
          </div>

          <p v-if="errorMessage" class="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            {{ errorMessage }}
          </p>

          <div class="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-between">
            <button
              v-if="unit?.reservation_item_id"
              type="button"
              class="h-12 rounded-xl border border-rose-200 bg-rose-50 px-5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
              @click="$emit('clear', unit)"
            >
              آزادسازی این واحد
            </button>
            <div class="flex flex-col-reverse gap-3 sm:mr-auto sm:flex-row">
              <button
                type="button"
                class="h-12 rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                @click="$emit('close')"
              >
                انصراف
              </button>
              <button
                type="submit"
                :disabled="saving"
                class="h-12 rounded-xl bg-emerald-600 px-6 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {{ saving ? 'در حال ثبت...' : unit?.reservation_item_id ? 'ذخیره تغییرات رزرو' : 'ثبت رزرو مستقیم' }}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import JalaliDatePicker from './JalaliDatePicker.vue';
import SearchableLookupInput from './SearchableLookupInput.vue';
import { getCurrentPersianDate, toGregorianDate, toPersianDate } from '../utils/dateConverter';

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  unit: { type: Object, default: null },
  customers: { type: Array, default: () => [] },
  saving: { type: Boolean, default: false },
  initialStartPersian: { type: String, default: '' },
  initialEndPersian: { type: String, default: '' }
});

const emit = defineEmits(['close', 'save', 'clear']);

const today = getCurrentPersianDate();
const fallbackDate = `${today.year}/${String(today.month).padStart(2, '0')}/${String(today.day).padStart(2, '0')}`;

const customerId = ref(null);
const customerName = ref('');
const startDatePersian = ref('');
const endDatePersian = ref('');
const notes = ref('');
const errorMessage = ref('');
const customerOptions = computed(() => props.customers.map((customer) => ({
  label: customer.name,
  value: customer.id
})));

const durationLabel = computed(() => {
  const start = toGregorianDate(startDatePersian.value);
  const end = toGregorianDate(endDatePersian.value);
  if (!start || !end) return 'تاریخ را کامل کن';

  const diff = Math.round((new Date(`${end}T00:00:00`).getTime() - new Date(`${start}T00:00:00`).getTime()) / 86400000) + 1;
  return diff > 0 ? `${diff.toLocaleString('fa-IR')} روز` : 'بازه نامعتبر';
});

function resetForm() {
  customerId.value = props.unit?.customer_id || null;
  customerName.value = props.unit?.customer_name || '';
  startDatePersian.value = props.unit?.start_date ? toPersianDate(props.unit.start_date) : (props.initialStartPersian || fallbackDate);
  endDatePersian.value = props.unit?.end_date ? toPersianDate(props.unit.end_date) : (props.initialEndPersian || fallbackDate);
  notes.value = props.unit?.reservation_notes || '';
  errorMessage.value = '';
}

function syncCustomerId() {
  const matched = props.customers.find((customer) => customer.name === customerName.value.trim());
  customerId.value = matched?.id || null;
}

function handleCustomerSelect(option) {
  customerId.value = option?.value || null;
}

function handleSubmit() {
  errorMessage.value = '';

  if (!customerName.value.trim()) {
    errorMessage.value = 'نام مشتری را وارد کن';
    return;
  }

  const startDate = toGregorianDate(startDatePersian.value);
  const endDate = toGregorianDate(endDatePersian.value);

  if (!startDate || !endDate) {
    errorMessage.value = 'بازه تاریخ را کامل کن';
    return;
  }

  if (startDate > endDate) {
    errorMessage.value = 'تاریخ رفت باید قبل از تاریخ برگشت باشد';
    return;
  }

  emit('save', {
    customer_id: customerId.value || null,
    customer_name: customerName.value.trim(),
    start_date: startDate,
    end_date: endDate,
    notes: notes.value.trim() || null
  });
}

watch(() => props.isOpen, (value) => {
  if (value) {
    resetForm();
  }
});

watch(customerName, () => {
  syncCustomerId();
});
</script>
