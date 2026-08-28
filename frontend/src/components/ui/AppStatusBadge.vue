<template>
  <span class="app-status-badge" :class="[toneClass, sizeClass]">
    <span><slot>{{ resolvedMeta.label }}</slot></span>
  </span>
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
  showDot: { type: Boolean, default: true }
});

const resolvedMeta = computed(() => {
  const meta = getStatusMeta(props.group, props.status);
  return {
    label: props.label || meta.label,
    tone: props.tone || meta.tone
  };
});

const toneClass = computed(() => getStatusToneClass(resolvedMeta.value.tone));
const sizeClass = computed(() => props.size === 'sm' ? 'min-h-6 px-2 text-[11px]' : 'min-h-7 px-3 text-xs');
</script>
