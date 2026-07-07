<template>
  <section :class="['app-content-state', surfaceClass]">
    <div class="flex flex-col items-center gap-3 text-center">
      <svg v-if="loading" class="h-10 w-10 animate-spin text-indigo-500" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
      </svg>
      <p :class="['text-sm', textClass]">{{ message }}</p>
    </div>
  </section>
</template>

<script setup>
defineProps({
  loading: { type: Boolean, default: false },
  message: { type: String, required: true },
  surfaceClass: { type: String, default: '' },
  textClass: { type: String, default: 'text-slate-500' }
});
</script>
