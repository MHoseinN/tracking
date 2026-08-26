<template>
  <button
    type="button"
    class="app-status-button"
    :class="[toneClass, sizeClass]"
    :disabled="disabled || loading"
    :aria-label="ariaLabel || resolvedMeta.label"
    @click="$emit('click', $event)"
  >
    <svg v-if="loading" class="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z" />
    </svg>
    <span v-else class="h-1.5 w-1.5 shrink-0 rounded-full bg-current" aria-hidden="true" />
    <span><slot>{{ resolvedMeta.label }}</slot></span>
  </button>
</template>

<script setup>
import { computed } from 'vue';
import { getStatusMeta, getStatusToneClass } from '../../utils/statusStyles';

const props = defineProps({
  group: { type: String, default: '' },
  status: { type: [String, Number, Boolean], default: '' },
  label: { type: String, default: '' },
  tone: { type: String, default: '' },
  size: { type: String, default: 'md', validator: (value) => ['sm', 'md'].includes(value) },
  ariaLabel: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  loading: { type: Boolean, default: false }
});

defineEmits(['click']);

const resolvedMeta = computed(() => {
  const meta = getStatusMeta(props.group, props.status);
  return {
    label: props.label || meta.label,
    tone: props.tone || meta.tone
  };
});

const toneClass = computed(() => getStatusToneClass(resolvedMeta.value.tone, true));
const sizeClass = computed(() => props.size === 'sm' ? 'min-h-7 px-2 text-[11px]' : 'min-h-8 px-3 text-xs');
</script>
