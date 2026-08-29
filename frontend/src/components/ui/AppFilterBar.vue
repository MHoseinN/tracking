<template>
  <section class="app-filter-bar" aria-label="فیلترهای جدول">
    <div class="grid min-w-0 flex-1 gap-3" :class="columnsClass">
      <slot />
    </div>
    <div v-if="collapsible && expanded && $slots.advanced" class="app-filter-bar__advanced">
      <div class="grid min-w-0 flex-1 gap-3" :class="advancedColumnsClass">
        <slot name="advanced" />
      </div>
    </div>
    <div v-if="$slots.actions || (collapsible && $slots.advanced)" class="app-filter-bar__footer">
      <div v-if="$slots.actions" class="flex shrink-0 flex-wrap items-center gap-2">
        <slot name="actions" />
      </div>
      <button v-if="collapsible && $slots.advanced" type="button" class="app-filter-bar__toggle"
        :aria-expanded="expanded ? 'true' : 'false'" @click="$emit('update:expanded', !expanded)">
        <span>{{ expanded ? 'نمایش کمتر' : 'فیلترهای پیشرفته' }}</span>
        <svg class="h-4 w-4 transition" :class="expanded ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m6 9 6 6 6-6" />
        </svg>
      </button>
    </div>
  </section>
</template>

<script setup>
defineProps({
  columnsClass: { type: [String, Array, Object], default: 'md:grid-cols-2 xl:grid-cols-3' },
  advancedColumnsClass: { type: [String, Array, Object], default: 'md:grid-cols-2 xl:grid-cols-3' },
  collapsible: { type: Boolean, default: false },
  expanded: { type: Boolean, default: false }
});
defineEmits(['update:expanded']);
</script>

<style scoped>
.app-filter-bar__advanced { border-top:1px solid #e7dfcb; padding-top:.9rem; }
.app-filter-bar__footer { display:flex; align-items:center; justify-content:space-between; gap:.75rem; }
.app-filter-bar__toggle { display:inline-flex; align-items:center; gap:.35rem; color:#0f766e; font-size:.75rem; font-weight:800; transition:.2s; }
.app-filter-bar__toggle:hover { color:#064e3b; }
:deep(.app-filter-field) { position:relative; min-width:0; padding-top:.4rem; }
:deep(.app-filter-field > .app-filter-label) { position:absolute; top:0; right:.8rem; z-index:2; max-width:calc(100% - 1.6rem); overflow:hidden; background:#fffdf8; padding:0 .35rem; color:#475569; font-size:.68rem; font-weight:800; line-height:.85rem; white-space:nowrap; text-overflow:ellipsis; }
:deep(.app-filter-field > .app-filter-control), :deep(.app-filter-field > div) { margin-top:0 !important; }
@media (max-width:640px) { .app-filter-bar__footer { align-items:stretch; flex-direction:column; } }
</style>
