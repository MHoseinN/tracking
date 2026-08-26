<template>
  <div v-if="totalRows > 0" class="app-pagination sticky z-20">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
      <div>
        <p class="text-sm text-slate-500">
          نمایش
          <span class="font-semibold text-slate-800">{{ (rowStartIndex + 1).toLocaleString('fa-IR') }}</span>
          تا
          <span class="font-semibold text-slate-800">{{ Math.min(rowStartIndex + pageSize,
            totalRows).toLocaleString('fa-IR') }}</span>
          از
          <span class="font-semibold text-slate-800">{{ totalRows.toLocaleString('fa-IR') }}</span>
        </p>
        <p class="mt-1 text-xs font-semibold text-slate-500">
          صفحه فعلی: {{ currentPage.toLocaleString('fa-IR') }} از {{ totalPages.toLocaleString('fa-IR') }}
        </p>
      </div>

      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2 text-sm text-gray-500">
          <CustomSelect :model-value="pageSize" :options="pageSizeOptions"
            trigger-class="h-10 min-w-[95px] rounded-lg border border-slate-300 bg-white px-3 text-sm transition hover:border-slate-400 focus:ring-4 focus:ring-indigo-100"
            @update:model-value="$emit('update:page-size', Number($event))" />
        </div>
      </div>
    </div>

    <div class="flex flex-wrap items-center justify-center gap-2">
      <AppButton size="md" variant="secondary" @click="$emit('go-to-page', currentPage - 1)" :disabled="currentPage === 1">
        قبلی
      </AppButton>

      <AppButton v-for="page in visiblePageNumbers" :key="page" size="md"
        :variant="page === currentPage ? 'primary' : 'secondary'" class="min-w-10 px-3"
        @click="$emit('go-to-page', page)"
        :aria-current="page === currentPage ? 'page' : null">
        {{ page.toLocaleString('fa-IR') }}
      </AppButton>

      <AppButton size="md" variant="secondary" @click="$emit('go-to-page', currentPage + 1)"
        :disabled="currentPage === totalPages">
        بعدی
      </AppButton>
    </div>
  </div>
</template>

<script setup>
import CustomSelect from './CustomSelect.vue';
import AppButton from './ui/AppButton.vue';

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
