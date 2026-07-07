<template>
  <div v-if="totalRows > 0" class="app-pagination">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
      <div>
        <p class="text-sm text-slate-500">
          نمایش
          <span class="font-semibold text-slate-800">{{ (rowStartIndex + 1).toLocaleString('fa-IR') }}</span>
          تا
          <span class="font-semibold text-slate-800">{{ Math.min(rowStartIndex + pageSize, totalRows).toLocaleString('fa-IR') }}</span>
          از
          <span class="font-semibold text-slate-800">{{ totalRows.toLocaleString('fa-IR') }}</span>
        </p>
      </div>

      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2 text-sm text-slate-500">
          <CustomSelect
            :model-value="pageSize"
            :options="pageSizeOptions"
            trigger-class="min-w-[92px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition hover:border-slate-300 hover:shadow-md"
            @update:model-value="$emit('update:page-size', Number($event))"
          />
        </div>
      </div>
    </div>

    <div class="flex flex-wrap items-center justify-center gap-2">
      <button @click="$emit('go-to-page', currentPage - 1)" :disabled="currentPage === 1" class="app-pagination-button">
        قبلی
      </button>

      <button
        v-for="page in visiblePageNumbers"
        :key="page"
        @click="$emit('go-to-page', page)"
        :class="page === currentPage
          ? 'border-indigo-600 bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
          : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'"
        class="app-pagination-button"
      >
        {{ page.toLocaleString('fa-IR') }}
      </button>

      <button @click="$emit('go-to-page', currentPage + 1)" :disabled="currentPage === totalPages" class="app-pagination-button">
        بعدی
      </button>
    </div>
  </div>
</template>

<script setup>
import CustomSelect from './CustomSelect.vue';

defineProps({
  totalRows: { type: Number, required: true },
  rowStartIndex: { type: Number, required: true },
  pageSize: { type: Number, required: true },
  pageSizeOptions: { type: Array, required: true },
  currentPage: { type: Number, required: true },
  totalPages: { type: Number, required: true },
  visiblePageNumbers: { type: Array, required: true }
});

defineEmits(['update:page-size', 'go-to-page']);
</script>
