<template>
  <div class="app-table-wrapper">
    <table class="app-table" :style="tableStyle">
      <thead v-if="$slots.head" :class="stickyHeader ? 'sticky top-0 z-10' : ''">
        <slot name="head" />
      </thead>
      <tbody>
        <tr v-if="loading">
          <td :colspan="columnCount" class="h-40 text-center">
            <div class="inline-flex items-center gap-3 text-sm text-slate-500">
              <svg class="h-6 w-6 animate-spin text-indigo-500" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z" />
              </svg>
              {{ loadingMessage }}
            </div>
          </td>
        </tr>
        <tr v-else-if="empty">
          <td :colspan="columnCount" class="h-40 text-center text-sm text-slate-500">
            <slot name="empty">{{ emptyMessage }}</slot>
          </td>
        </tr>
        <slot v-else />
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  columnCount: { type: Number, required: true },
  minWidth: { type: [String, Number], default: '100%' },
  loading: { type: Boolean, default: false },
  empty: { type: Boolean, default: false },
  stickyHeader: { type: Boolean, default: false },
  loadingMessage: { type: String, default: 'در حال بارگذاری...' },
  emptyMessage: { type: String, default: 'داده‌ای برای نمایش وجود ندارد.' }
});

const tableStyle = computed(() => ({
  minWidth: typeof props.minWidth === 'number' ? `${props.minWidth}px` : props.minWidth
}));
</script>
