<template>
  <section class="app-table-panel">
    <header v-if="title || description || $slots.header || $slots.filters" class="app-table-panel__header">
      <slot name="header">
        <div v-if="title || description" class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <h2 class="text-lg font-black text-slate-900">{{ title }}</h2>
            <span v-if="count !== null" class="app-table-panel__count">{{ Number(count).toLocaleString('fa-IR') }} ردیف</span>
          </div>
          <p v-if="description" class="mt-1 text-xs leading-6 text-slate-500">{{ description }}</p>
        </div>
      </slot>
      <div v-if="$slots.filters" class="mt-4">
        <slot name="filters" />
      </div>
    </header>

    <div class="min-w-0">
      <slot />
    </div>

    <footer v-if="$slots.footer" class="border-t border-slate-200 bg-white">
      <slot name="footer" />
    </footer>
  </section>
</template>

<script setup>
defineProps({
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  count: { type: Number, default: null }
});
</script>
