<template>
  <div ref="rootRef" class="relative" :class="wrapperClass">
    <div
      ref="triggerRef"
      class="flex h-12 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 shadow-sm transition focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-100"
      :class="inputContainerClass"
      @click="focusInput"
    >
      <svg class="h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z" />
      </svg>

      <input
        ref="inputRef"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        class="h-12 min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
        :class="inputClass"
        @focus="openDropdown"
        @input="handleInput"
      />

      <button
        v-if="modelValue"
        type="button"
        class="inline-flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
        @click.stop="clearValue"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <svg class="h-4 w-4 shrink-0 text-slate-400 transition" :class="isOpen ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </div>

    <Teleport to="body">
      <div v-if="isOpen" class="fixed inset-0 z-[150]" @click="closeDropdown">
        <div
          class="fixed z-50 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.22)]"
          :style="dropdownStyle"
          @click.stop
        >

          <div class="overflow-y-auto p-2" :style="{ maxHeight: dropdownStyle.maxHeight }">
            <button
              v-for="option in filteredOptions"
              :key="String(option.value)"
              type="button"
              class="flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-right text-sm font-medium transition"
              :class="isExactMatch(option) ? 'bg-gradient-to-r from-blue-50 to-cyan-50 text-slate-900 shadow-sm ring-1 ring-blue-100' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'"
              @click="selectOption(option)"
            >
              <span class="truncate">{{ option.label }}</span>
              <span
                v-if="isExactMatch(option)"
                class="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-blue-600"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
              </span>
            </button>

            <p v-if="filteredOptions.length === 0" class="rounded-xl bg-slate-50 px-4 py-4 text-sm text-slate-500">
              {{ noResultsText }}
            </p>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';

const props = defineProps({
  modelValue: { type: String, default: '' },
  options: { type: Array, default: () => [] },
  placeholder: { type: String, default: 'جستجو کن' },
  disabled: { type: Boolean, default: false },
  wrapperClass: { type: [String, Array, Object], default: '' },
  inputContainerClass: { type: [String, Array, Object], default: '' },
  inputClass: { type: [String, Array, Object], default: '' },
  headerText: { type: String, default: 'جستجو و انتخاب' },
  noResultsText: { type: String, default: 'موردی پیدا نشد.' }
});

const emit = defineEmits(['update:modelValue', 'select', 'clear']);

const rootRef = ref(null);
const triggerRef = ref(null);
const inputRef = ref(null);
const isOpen = ref(false);
const dropdownStyle = ref({});

const normalizedOptions = computed(() =>
  props.options.map((option) => (
    typeof option === 'object'
      ? option
      : { label: String(option), value: option }
  ))
);

const filteredOptions = computed(() => {
  const query = String(props.modelValue || '').trim().toLowerCase();
  if (!query) return normalizedOptions.value.slice(0, 12);

  return normalizedOptions.value
    .filter((option) => String(option.label || '').toLowerCase().includes(query))
    .slice(0, 12);
});

function isExactMatch(option) {
  return String(option.label || '').trim() === String(props.modelValue || '').trim();
}

function focusInput() {
  inputRef.value?.focus();
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

function handleInput(event) {
  emit('update:modelValue', event.target.value);
  if (!isOpen.value) {
    openDropdown();
    return;
  }
  nextTick(() => updatePosition());
}

function clearValue() {
  emit('update:modelValue', '');
  emit('clear');
  openDropdown();
}

function selectOption(option) {
  emit('update:modelValue', option.label);
  emit('select', option);
  closeDropdown();
}

function updatePosition() {
  const trigger = triggerRef.value;
  if (!trigger) return;

  const rect = trigger.getBoundingClientRect();
  const viewportPadding = 12;
  const width = rect.width;
  const estimatedHeight = Math.min((Math.max(filteredOptions.value.length, 1) * 58) + 58, 340);
  const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
  const spaceAbove = rect.top - viewportPadding;
  const shouldOpenUp = spaceBelow < Math.min(estimatedHeight, 220) && spaceAbove > spaceBelow;
  const maxHeight = Math.max(160, Math.min(estimatedHeight, shouldOpenUp ? spaceAbove - 10 : spaceBelow - 10));
  const top = shouldOpenUp
    ? Math.max(viewportPadding, rect.top - maxHeight - 10)
    : rect.bottom + 10;
  const left = Math.max(viewportPadding, rect.left);

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
