<template>
  <div v-if="totalRows > 0" class="app-pagination sticky z-20">
    <p class="app-pagination__summary">
      نمایش <strong>{{ (rowStartIndex + 1).toLocaleString('fa-IR') }}</strong>
      تا <strong>{{ Math.min(rowStartIndex + pageSize, totalRows).toLocaleString('fa-IR') }}</strong>
      از <strong>{{ totalRows.toLocaleString('fa-IR') }}</strong>
    </p>

    <nav class="app-pagination__pages" aria-label="صفحه‌بندی جدول">
      <button type="button" class="app-pagination-button" :disabled="currentPage === 1"
        aria-label="صفحه قبلی" @click="$emit('go-to-page', currentPage - 1)">«</button>
      <template v-for="item in paginationItems" :key="String(item)">
        <span v-if="item === 'ellipsis-start' || item === 'ellipsis-end'" class="px-1 text-slate-400">…</span>
        <button v-else type="button" class="app-pagination-button"
          :class="item === currentPage ? 'app-pagination-button--active' : ''"
          :aria-current="item === currentPage ? 'page' : undefined" @click="$emit('go-to-page', item)">
          {{ item.toLocaleString('fa-IR') }}
        </button>
      </template>
      <button type="button" class="app-pagination-button" :disabled="currentPage === totalPages"
        aria-label="صفحه بعدی" @click="$emit('go-to-page', currentPage + 1)">»</button>
    </nav>

    <div class="app-pagination__size">
      <span>تعداد در صفحه</span>
      <CustomSelect :model-value="pageSize" :options="pageSizeOptions"
        trigger-class="h-10 min-w-[76px] rounded-lg border border-stone-300 bg-white px-3 text-sm transition hover:border-emerald-700 focus:ring-4 focus:ring-emerald-100"
        @update:model-value="$emit('update:page-size', Number($event))" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import CustomSelect from './CustomSelect.vue';

const props = defineProps({
  totalRows: { type: Number, required: true },
  rowStartIndex: { type: Number, required: true },
  pageSize: { type: Number, required: true },
  pageSizeOptions: { type: Array, required: true },
  currentPage: { type: Number, required: true },
  totalPages: { type: Number, required: true },
  visiblePageNumbers: { type: Array, required: true }
});

defineEmits(['update:page-size', 'go-to-page']);

const paginationItems = computed(() => {
  if (props.totalPages <= 7) return Array.from({ length: props.totalPages }, (_, index) => index + 1);
  const pages = new Set([1, props.totalPages, props.currentPage - 1, props.currentPage, props.currentPage + 1]);
  const sorted = [...pages].filter((page) => page >= 1 && page <= props.totalPages).sort((a, b) => a - b);
  const items = [];
  sorted.forEach((page, index) => {
    const previous = sorted[index - 1];
    if (previous && page - previous > 1) items.push(index === 1 ? 'ellipsis-start' : 'ellipsis-end');
    items.push(page);
  });
  return items;
});
</script>
