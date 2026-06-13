<template>
  <div class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-center">
    <div
      class="flex min-h-14 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 shadow-sm transition focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-100">
      <svg class="h-5 w-5 shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z" />
      </svg>

      <input
        v-if="showTextInput"
        :value="textModelValue"
        @input="$emit('update:textModelValue', $event.target.value)"
        type="text"
        :placeholder="textPlaceholder"
        class="h-12 min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
      />

      <div v-if="showTextInput" class="h-8 w-px shrink-0 bg-slate-200"></div>

      <JalaliDatePicker
        :model-value="dateModelValue"
        trigger-mode="button"
        button-placeholder="تاریخ"
        button-class="text-slate-600 hover:bg-slate-100"
        @update:modelValue="$emit('update:dateModelValue', $event)"
      />

      <button
        v-if="hasValue"
        type="button"
        @click="$emit('clear')"
        class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
        title="پاک کردن"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <CustomSelect
      :model-value="filterModelValue"
      :options="filterOptions"
      trigger-class="h-14 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium shadow-sm transition hover:border-slate-300 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-blue-100"
      @update:model-value="$emit('update:filterModelValue', $event)"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue';
import CustomSelect from './CustomSelect.vue';
import JalaliDatePicker from './JalaliDatePicker.vue';

const props = defineProps({
  textModelValue: { type: String, default: '' },
  dateModelValue: { type: String, default: '' },
  filterModelValue: { type: String, default: 'all' },
  textPlaceholder: { type: String, default: 'نام یا نام‌خانوادگی مشتری...' },
  showTextInput: { type: Boolean, default: true },
  filterOptions: {
    type: Array,
    default: () => ([
      { label: 'همه حساب‌ها', value: 'all' },
      { label: 'ارسال نشده', value: 'not_shipped' },
      { label: 'تسویه نشده', value: 'unsettled' }
    ])
  }
});

defineEmits(['update:textModelValue', 'update:dateModelValue', 'update:filterModelValue', 'clear']);

const hasValue = computed(() => Boolean(props.textModelValue?.trim() || props.dateModelValue));
</script>
