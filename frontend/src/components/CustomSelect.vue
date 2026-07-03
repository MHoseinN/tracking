<template>
  <div ref="rootRef" class="relative" :class="wrapperClass">
    <button
      ref="triggerRef"
      type="button"
      :disabled="disabled"
      :class="triggerClasses"
      :aria-expanded="isOpen ? 'true' : 'false'"
      @click="toggleDropdown"
    >
      <span class="min-w-0 truncate text-right" :class="selectedOption ? labelClass : placeholderClass">
        {{ selectedOption?.label || placeholder }}
      </span>
      <svg class="h-5 w-5 shrink-0 text-slate-500 transition duration-200" :class="isOpen ? 'rotate-180' : ''"
        fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <Teleport to="body">
      <div v-if="isOpen" class="fixed inset-0 z-[140]" @click="closeDropdown">
        <div
          class="fixed z-[141] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.22)]"
          :style="dropdownStyle"
          @click.stop
        >
          <div class="overflow-y-auto p-2" :style="{ maxHeight: dropdownStyle.maxHeight }">
            <button
              v-for="option in normalizedOptions"
              :key="String(option.value)"
              type="button"
              class="flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-right text-sm font-medium transition"
              :class="optionClasses(option)"
              @click="selectOption(option)"
            >
              <span class="truncate">{{ option.label }}</span>
              <span
                v-if="isSelected(option)"
                class="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-blue-600"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
              </span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';

const props = defineProps({
  modelValue: { type: [String, Number, Boolean], default: '' },
  options: { type: Array, default: () => [] },
  placeholder: { type: String, default: 'انتخاب کنید' },
  disabled: { type: Boolean, default: false },
  triggerClass: { type: [String, Array, Object], default: '' },
  wrapperClass: { type: [String, Array, Object], default: '' },
  placeholderClass: { type: String, default: 'text-slate-400' },
  labelClass: { type: String, default: 'text-slate-700' },
  align: { type: String, default: 'right' }
});

const emit = defineEmits(['update:modelValue', 'change']);

const rootRef = ref(null);
const triggerRef = ref(null);
const isOpen = ref(false);
const dropdownStyle = ref({});
const dropdownDirection = ref('down');

const normalizedOptions = computed(() =>
  props.options.map((option) => (
    typeof option === 'object'
      ? option
      : { label: String(option), value: option }
  ))
);

const selectedOption = computed(() =>
  normalizedOptions.value.find((option) => String(option.value) === String(props.modelValue))
);

const triggerClasses = computed(() => [
  'flex w-full items-center justify-between gap-3 text-right',
  props.triggerClass
]);

function isSelected(option) {
  return String(option.value) === String(props.modelValue);
}

function optionClasses(option) {
  if (isSelected(option)) {
    return 'bg-gradient-to-r from-blue-50 to-cyan-50 text-slate-900 shadow-sm ring-1 ring-blue-100';
  }

  return 'text-slate-600 hover:bg-slate-50 hover:text-slate-900';
}

function closeDropdown() {
  isOpen.value = false;
}

async function openDropdown() {
  if (props.disabled) return;
  isOpen.value = true;
  await nextTick();
  updatePosition();
}

function toggleDropdown() {
  if (isOpen.value) {
    closeDropdown();
    return;
  }

  openDropdown();
}

function selectOption(option) {
  emit('update:modelValue', option.value);
  emit('change', option.value);
  closeDropdown();
}

function updatePosition() {
  const trigger = triggerRef.value;
  if (!trigger) return;

  const rect = trigger.getBoundingClientRect();
  const viewportPadding = 12;
  const width = rect.width;
  const estimatedHeight = Math.min((normalizedOptions.value.length * 58) + 16, 288);
  const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
  const spaceAbove = rect.top - viewportPadding;
  const shouldOpenUp = spaceBelow < Math.min(estimatedHeight, 220) && spaceAbove > spaceBelow;
  const maxHeight = Math.max(160, Math.min(estimatedHeight, shouldOpenUp ? spaceAbove - 10 : spaceBelow - 10));
  dropdownDirection.value = shouldOpenUp ? 'up' : 'down';
  const top = shouldOpenUp
    ? Math.max(viewportPadding, rect.top - maxHeight - 10)
    : rect.bottom + 10;
  const left = props.align === 'left'
    ? rect.left
    : Math.max(viewportPadding, rect.right - width);

  dropdownStyle.value = {
    top: `${top}px`,
    left: `${left}px`,
    width: `${width}px`,
    maxWidth: `calc(100vw - ${viewportPadding * 2}px)`,
    maxHeight: `${maxHeight}px`
  };
}

function handleViewportChange() {
  if (!isOpen.value) return;
  updatePosition();
}

watch(() => props.disabled, (value) => {
  if (value) closeDropdown();
});

watch(() => props.modelValue, () => {
  if (isOpen.value) {
    nextTick(() => updatePosition());
  }
});

watch(isOpen, (open) => {
  if (open) {
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);
    return;
  }

  window.removeEventListener('resize', handleViewportChange);
  window.removeEventListener('scroll', handleViewportChange, true);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleViewportChange);
  window.removeEventListener('scroll', handleViewportChange, true);
});
</script>
