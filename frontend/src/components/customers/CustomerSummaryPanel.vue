<template>
  <section class="mb-2 space-y-3">
    <section class="flex w-full flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm xl:flex-row xl:items-center xl:justify-between">
      <div class="flex min-w-0 items-center gap-3">
        <svg fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-16 w-16 shrink-0 sm:h-20 sm:w-20">
          <path stroke-linecap="round" stroke-linejoin="round"
            d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        </svg>
        <div class="flex flex-col justify-around">
          <span class="text-xl font-black text-slate-800 sm:text-xl">
            {{ customer?.name || 'مشتری' }}
            <span class="text-gray-500 bg-gray-100 p-2 rounded-lg text-xs">{{ customer?.referrer }}</span>
          </span>
          <p class="app-button-secondary max-w-[150px] !p-1">{{ customer?.phone }}</p>
        </div>
      </div>
      <button type="button" class="self-end xl:self-auto" @click="$emit('toggle')">
        <span class="flex h-10 w-10 items-center justify-center rounded-lg bg-white hover:bg-gray-100 transition-all text-slate-600 shadow-sm ring-1 ring-slate-200">
          <svg class="h-5 w-5 transition" :class="open ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>
    </section>

    <AppFinancialOverview
      primary-label="مبلغ تسویه‌شده"
      :primary-value="settledAmount"
      primary-meta="مجموع پرداخت‌های معتبر این مشتری"
      :primary-percent="settledPercent"
      primary-percent-label="تسویه‌شده"
      danger-label="مبلغ تسویه‌نشده"
      :danger-value="remainingAmount"
      :danger-percent="remainingPercent"
      danger-percent-label="در انتظار"
      :items="customerOverviewItems"
      status-title="وضعیت حساب مشتری"
      :status-items="customerSettlementItems" />

    <CustomerProfileEditor v-if="open" class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm" :draft="draft" :notes="notes"
      :account-status-select-options="accountStatusSelectOptions" :phone-duplicate-error="phoneDuplicateError"
      :changed="changed" :saving="saving" @update-field="handleUpdateField"
      @update:notes="$emit('update:notes', $event)" @save="$emit('save')" />
  </section>
</template>

<script setup>
import { computed } from 'vue';
import AppFinancialOverview from '../AppFinancialOverview.vue';
import CustomerProfileEditor from './CustomerProfileEditor.vue';

const props = defineProps({
  customer: { type: Object, default: null },
  settledAmount: { type: String, required: true },
  remainingAmount: { type: String, required: true },
  invoicedAmount: { type: String, required: true },
  invoiceCount: { type: String, required: true },
  listCount: { type: String, required: true },
  settledPercent: { type: Number, default: 0 },
  remainingPercent: { type: Number, default: 0 },
  open: { type: Boolean, default: false },
  draft: { type: Object, required: true },
  notes: { type: String, default: '' },
  accountStatusSelectOptions: { type: Array, default: () => [] },
  phoneDuplicateError: { type: String, default: '' },
  changed: { type: Boolean, default: false },
  saving: { type: Boolean, default: false }
});

const emit = defineEmits(['toggle', 'update-field', 'update:notes', 'save']);

const customerOverviewItems = computed(() => [
  { label: 'جمع مبلغ فاکتورها', value: props.invoicedAmount, tone: 'blue', icon: 'invoice' },
  { label: 'تعداد فاکتورها', value: props.invoiceCount, tone: 'violet', icon: 'users' },
  { label: 'تعداد لیست‌ها', value: props.listCount, tone: 'amber', icon: 'box' }
]);
const customerSettlementItems = computed(() => [
  { label: 'تسویه‌شده', value: `${toPersianNumber(props.settledPercent)}٪`, percent: props.settledPercent, tone: 'success' },
  { label: 'در انتظار', value: `${toPersianNumber(props.remainingPercent)}٪`, percent: props.remainingPercent, tone: 'danger' }
]);

function toPersianNumber(value) {
  return Math.round(Number(value) || 0).toLocaleString('fa-IR');
}

function handleUpdateField(field, value) {
  emit('update-field', field, value);
}
</script>
