<template>
  <section class="app-filter-bar" aria-label="فیلترهای جدول">
    <div class="grid min-w-0 flex-1 gap-3" :class="columnsClass">
      <slot />
    </div>
    <div v-if="$slots.actions" class="flex shrink-0 flex-wrap items-center gap-2">
      <slot name="actions" />
    </div>
  </section>
</template>

<script setup>
defineProps({
  columnsClass: { type: [String, Array, Object], default: 'md:grid-cols-2 xl:grid-cols-3' }
});
</script>
