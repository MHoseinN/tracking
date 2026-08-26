<template>
  <div class="app-form-field" :class="wrapperClass">
    <label v-if="label" :for="forId || undefined" class="app-label">
      {{ label }}
      <span v-if="required" class="text-rose-600" aria-hidden="true">*</span>
    </label>
    <slot :control-id="forId" :described-by="describedBy" />
    <p v-if="error" :id="errorId" class="app-field-error" role="alert">{{ error }}</p>
    <p v-else-if="hint" :id="hintId" class="app-field-hint">{{ hint }}</p>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  forId: { type: String, default: '' },
  label: { type: String, default: '' },
  hint: { type: String, default: '' },
  error: { type: String, default: '' },
  required: { type: Boolean, default: false },
  wrapperClass: { type: [String, Array, Object], default: '' }
});

const hintId = computed(() => props.forId ? `${props.forId}-hint` : undefined);
const errorId = computed(() => props.forId ? `${props.forId}-error` : undefined);
const describedBy = computed(() => props.error ? errorId.value : (props.hint ? hintId.value : undefined));
</script>
