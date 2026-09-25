<template>
  <section class="mb-2 space-y-3">
    <section class="customer-summary__profile">
      <button type="button" class="customer-summary__preview" :aria-expanded="open" @click="$emit('toggle')">
        <span class="customer-summary__avatar" aria-hidden="true">
          <svg fill="none" viewBox="0 0 24 24" stroke-width="1.7" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          </svg>
        </span>

        <span class="customer-summary__identity">
          <strong>{{ customer?.name || `${draft.first_name || ''} ${draft.last_name || ''}`.trim() || 'مشتری' }}</strong>
        </span>

        <span class="customer-summary__facts">
          <span class="customer-summary__fact"><small>نام</small><strong>{{ draft.first_name || '—' }}</strong></span>
          <span class="customer-summary__fact"><small>نام خانوادگی</small><strong>{{ draft.last_name || '—' }}</strong></span>
          <span class="customer-summary__fact"><small>شماره تماس</small><strong dir="ltr">{{ draft.phone || customer?.phone || '—' }}</strong></span>
          <span class="customer-summary__fact"><small>معرف</small><strong>{{ draft.referrer || customer?.referrer || '—' }}</strong></span>
        </span>

        <span class="customer-summary__toggle">
          <span>{{ open ? 'بستن جزئیات' : 'نمایش جزئیات' }}</span>
          <svg :class="open ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      <CustomerProfileEditor v-if="open" class="customer-summary__editor" :draft="draft" :notes="notes"
        :account-status-select-options="accountStatusSelectOptions" :phone-duplicate-error="phoneDuplicateError"
        :changed="changed" :saving="saving" @update-field="handleUpdateField"
        @update:notes="$emit('update:notes', $event)" @save="$emit('save')" />
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

<style scoped>
.customer-summary__profile { overflow:hidden; border:1px solid #dde5e1; border-radius:.85rem; background:#fff; box-shadow:0 4px 14px rgb(15 23 42 / .05); }
.customer-summary__preview { display:grid; width:100%; min-height:5.5rem; grid-template-columns:auto minmax(9rem,1fr) minmax(28rem,3fr) auto; align-items:center; gap:1rem; padding:.85rem 1rem; text-align:right; transition:background .18s ease; }
.customer-summary__preview:hover { background:#fbfdfc; }
.customer-summary__avatar { display:grid; width:3.25rem; height:3.25rem; place-items:center; border-radius:.75rem; background:#e5f6ef; color:#08745d; }
.customer-summary__avatar svg { width:2rem; height:2rem; }
.customer-summary__identity { min-width:0; }
.customer-summary__identity strong { display:block; overflow:hidden; color:#172033; font-size:1.05rem; font-weight:950; text-overflow:ellipsis; white-space:nowrap; }
.customer-summary__identity small { display:block; margin-top:.25rem; color:#94a3b8; font-size:.67rem; }
.customer-summary__facts { display:grid; min-width:0; grid-template-columns:repeat(4,minmax(0,1fr)); border-right:1px solid #e7ece9; }
.customer-summary__fact { min-width:0; padding:.2rem 1rem; border-left:1px solid #e7ece9; }
.customer-summary__fact small { display:block; color:#8b97a7; font-size:.65rem; font-weight:750; }
.customer-summary__fact strong { display:block; overflow:hidden; margin-top:.28rem; color:#344054; font-size:.82rem; font-weight:900; text-overflow:ellipsis; white-space:nowrap; }
.customer-summary__toggle { display:flex; height:2.65rem; align-items:center; gap:.5rem; border:1px solid #cfe0d9; border-radius:.65rem; padding:0 .8rem; color:#0b735d; font-size:.7rem; font-weight:900; white-space:nowrap; }
.customer-summary__toggle svg { width:1rem; height:1rem; transition:transform .18s ease; }
.customer-summary__editor { border-top:1px solid #e2e8e5; background:#fff; }
@media(max-width:1100px){.customer-summary__preview{grid-template-columns:auto minmax(9rem,1fr) auto}.customer-summary__facts{grid-column:1/-1; grid-row:2; border-top:1px solid #edf1ef; border-right:0; padding-top:.7rem}.customer-summary__toggle{grid-column:3;grid-row:1}}
@media(max-width:640px){.customer-summary__preview{grid-template-columns:auto minmax(0,1fr) auto;gap:.7rem}.customer-summary__toggle span{display:none}.customer-summary__toggle{width:2.65rem;justify-content:center;padding:0}.customer-summary__facts{grid-template-columns:repeat(2,minmax(0,1fr));gap:.55rem}.customer-summary__fact{border:0;border-radius:.55rem;background:#f7f9f8;padding:.55rem .7rem}}
</style>
