<template>
  <header class="app-page-header">
    <div class="min-w-0">
      <div class="flex flex-wrap items-center gap-3">
        <h1 class="text-2xl font-black text-slate-900">{{ title }}</h1>
        <slot name="badge" />
      </div>
      <p v-if="description" class="mt-2 text-sm leading-7 text-slate-500">{{ description }}</p>
    </div>
    <div v-if="$slots.actions" class="flex shrink-0 flex-wrap items-center gap-2">
      <slot name="actions" />
    </div>
  </header>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  description: { type: String, default: '' }
});
</script>
