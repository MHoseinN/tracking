<template>
  <article :class="['app-stat-card', centered ? 'app-stat-card--centered' : '', containerClass]">
    <span class="app-stat-card__icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
        <path d="M7 3h8l4 4v14H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" stroke-linejoin="round" />
        <path d="M14 3v5h5M9 13h6M9 17h6" stroke-linecap="round" />
      </svg>
    </span>
    <div class="min-w-0">
      <p class="app-stat-card__label">{{ label }}</p>
      <p :class="['app-stat-card__value', valueClass]">{{ value }}</p>
      <p v-if="meta" class="app-stat-card__meta">{{ meta }}</p>
    </div>
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
