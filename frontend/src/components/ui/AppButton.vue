<template>
  <component
    :is="tag"
    :type="tag === 'button' ? type : undefined"
    :disabled="tag === 'button' ? isDisabled : undefined"
    :aria-busy="loading ? 'true' : undefined"
    :class="buttonClasses"
    @click="handleClick"
  >
    <svg v-if="loading" class="h-4 w-4 shrink-0 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z" />
    </svg>
    <slot name="leading" />
    <span v-if="$slots.default" class="min-w-0 truncate"><slot /></span>
    <slot name="trailing" />
  </component>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  tag: { type: [String, Object], default: 'button' },
  type: { type: String, default: 'button' },
  variant: {
    type: String,
    default: 'secondary',
    validator: (value) => ['primary', 'secondary', 'success', 'warning', 'danger', 'info', 'ghost'].includes(value)
  },
  size: {
    type: String,
    default: 'md',
    validator: (value) => ['sm', 'md', 'lg'].includes(value)
  },
  loading: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  block: { type: Boolean, default: false }
});

const emit = defineEmits(['click']);

const variantClasses = {
  primary: 'border-indigo-600 bg-indigo-600 text-white shadow-sm hover:border-indigo-700 hover:bg-indigo-700 focus-visible:ring-indigo-200',
  secondary: 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-slate-200',
  success: 'border-emerald-600 bg-emerald-600 text-white shadow-sm hover:border-emerald-700 hover:bg-emerald-700 focus-visible:ring-emerald-200',
  warning: 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 focus-visible:ring-amber-200',
  danger: 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 focus-visible:ring-rose-200',
  info: 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 focus-visible:ring-blue-200',
  ghost: 'border-transparent bg-transparent text-slate-600 hover:bg-slate-100 focus-visible:ring-slate-200'
};

const sizeClasses = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-5 text-sm'
};

const isDisabled = computed(() => props.disabled || props.loading);
const buttonClasses = computed(() => [
  'app-button border',
  variantClasses[props.variant],
  sizeClasses[props.size],
  props.block ? 'w-full' : ''
]);

function handleClick(event) {
  if (isDisabled.value) {
    event.preventDefault();
    return;
  }
  emit('click', event);
}
</script>
