<template>
  <section class="overflow-hidden rounded-lg bg-white mb-2 shadow-md">
    <section class="flex w-full flex-col gap-4 border-b bg-white p-4 xl:flex-row xl:items-center xl:justify-between">
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
      <div class="grid min-w-0 flex-1 gap-2 sm:grid-cols-2 xl:max-w-xl">
        <AppStatCard label="مبلغ تسویه شده" :value="settledAmount" value-class="text-emerald-700"
          container-class="h-24" />
        <AppStatCard label="مبلغ تسویه نشده" :value="remainingAmount" value-class="text-rose-600 text-md"
          container-class="h-24" />
      </div>
      <button type="button" class="self-end xl:self-auto" @click="$emit('toggle')">
        <span class="flex h-10 w-10 items-center justify-center rounded-lg bg-white hover:bg-gray-100 transition-all text-slate-600 shadow-sm ring-1 ring-slate-200">
          <svg class="h-5 w-5 transition" :class="open ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>
    </section>

    <CustomerProfileEditor v-if="open" :draft="draft" :notes="notes"
      :account-status-select-options="accountStatusSelectOptions" :phone-duplicate-error="phoneDuplicateError"
      :changed="changed" :saving="saving" @update-field="handleUpdateField"
      @update:notes="$emit('update:notes', $event)" @save="$emit('save')" />
  </section>
</template>

<script setup>
import AppStatCard from '../AppStatCard.vue';
import CustomerProfileEditor from './CustomerProfileEditor.vue';

defineProps({
  customer: { type: Object, default: null },
  settledAmount: { type: String, required: true },
  remainingAmount: { type: String, required: true },
  open: { type: Boolean, default: false },
  draft: { type: Object, required: true },
  notes: { type: String, default: '' },
  accountStatusSelectOptions: { type: Array, default: () => [] },
  phoneDuplicateError: { type: String, default: '' },
  changed: { type: Boolean, default: false },
  saving: { type: Boolean, default: false }
});

const emit = defineEmits(['toggle', 'update-field', 'update:notes', 'save']);

function handleUpdateField(field, value) {
  emit('update-field', field, value);
}
</script>
