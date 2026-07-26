<template>
  <div class="p-2 grid gap-3 grid-cols-4">
    <div class="flex min-h-11 col-span-3 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 shadow-sm">
      <svg class="h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z" />
      </svg>
      <input :value="searchTerm" type="search" placeholder="جستجو"
        class="h-10 min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
        @input="$emit('update:searchTerm', $event.target.value)" />
    </div>
    <CustomSelect class="col-span-1" :model-value="statusFilter" :options="statusOptions" placeholder="وضعیت"
      trigger-class="h-11 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium shadow-sm"
      @update:model-value="$emit('update:statusFilter', $event)" />
  </div>
</template>

<script setup>
import CustomSelect from '../CustomSelect.vue';
import JalaliDatePicker from '../JalaliDatePicker.vue';

defineProps({
  searchTerm: { type: String, default: '' },
  statusFilter: { type: String, default: 'all' },
  statusOptions: { type: Array, default: () => [] },
  rangeStartPersian: { type: String, default: '' },
  rangeEndPersian: { type: String, default: '' }
});

defineEmits(['update:searchTerm', 'update:statusFilter', 'update:rangeStartPersian', 'update:rangeEndPersian']);
</script>
