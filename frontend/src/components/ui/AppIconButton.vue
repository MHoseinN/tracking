<template>
  <button
    type="button"
    :title="label"
    :aria-label="label"
    :disabled="disabled || loading"
    :class="buttonClasses"
    @click="$emit('click', $event)"
  >
    <svg v-if="loading" class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z" />
    </svg>
    <slot v-else />
  </button>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  label: { type: String, required: true },
  variant: {
    type: String,
    default: 'secondary',
    validator: (value) => ['secondary', 'primary', 'success', 'warning', 'danger', 'info', 'ghost'].includes(value)
  },
  size: { type: String, default: 'md', validator: (value) => ['sm', 'md'].includes(value) },
  loading: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false }
});

defineEmits(['click']);

const variantClasses = {
  primary: 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 focus-visible:ring-emerald-200',
  secondary: 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50 focus-visible:ring-slate-200',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 focus-visible:ring-emerald-200',
  warning: 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 focus-visible:ring-amber-200',
  danger: 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 focus-visible:ring-rose-200',
  info: 'border-teal-200 bg-teal-50 text-teal-800 hover:bg-teal-100 focus-visible:ring-teal-200',
  ghost: 'border-transparent bg-transparent text-slate-500 hover:bg-slate-100 focus-visible:ring-slate-200'
};

const buttonClasses = computed(() => [
  'app-icon-button',
  props.size === 'sm' ? 'h-8 w-8' : 'h-10 w-10',
  variantClasses[props.variant]
]);
</script>
