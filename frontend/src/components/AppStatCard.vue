<template>
  <article :class="['app-stat-card', centered ? 'text-center' : '', containerClass]">
    <p class="text-sm text-slate-500">{{ label }}</p>
    <p :class="['mt-2 text-2xl font-black', valueClass]">{{ value }}</p>
    <p v-if="meta" class="mt-2 text-xs text-slate-400">{{ meta }}</p>
  </article>
</template>

<script setup>
defineProps({
  label: { type: String, required: true },
  value: { type: String, required: true },
  meta: { type: String, default: '' },
  valueClass: { type: String, default: 'text-slate-800' },
  containerClass: { type: String, default: '' },
  centered: { type: Boolean, default: true }
});
</script>
