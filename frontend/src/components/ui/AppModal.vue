<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isOpen"
        class="app-modal-backdrop"
        :style="{ zIndex }"
        @mousedown.self="handleBackdrop"
      >
        <section
          ref="dialogRef"
          class="app-modal"
          :class="sizeClass"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          :aria-describedby="description ? descriptionId : undefined"
          tabindex="-1"
        >
          <header class="app-modal-header">
            <div class="min-w-0">
              <h2 :id="titleId" class="text-lg font-black text-slate-900">{{ title }}</h2>
              <p v-if="description" :id="descriptionId" class="mt-1 text-xs leading-6 text-slate-500">{{ description }}</p>
            </div>
            <AppIconButton v-if="showClose" label="بستن" variant="ghost" :disabled="busy" @click="requestClose">
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </AppIconButton>
          </header>

          <div class="app-modal-body" :class="bodyClass">
            <slot />
          </div>

          <footer v-if="$slots.footer" class="app-modal-footer">
            <slot name="footer" />
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import AppIconButton from './AppIconButton.vue';

let openModalCount = 0;
let originalBodyOverflow = '';
const modalStack = [];

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  size: {
    type: String,
    default: 'md',
    validator: (value) => ['sm', 'md', 'lg', 'xl', 'full'].includes(value)
  },
  busy: { type: Boolean, default: false },
  showClose: { type: Boolean, default: true },
  closeOnBackdrop: { type: Boolean, default: true },
  closeOnEscape: { type: Boolean, default: true },
  bodyClass: { type: [String, Array, Object], default: '' },
  zIndex: { type: Number, default: 160 }
});

const emit = defineEmits(['close']);
const dialogRef = ref(null);
const instanceKey = Symbol('app-modal');
const titleId = `app-modal-title-${Math.random().toString(36).slice(2)}`;
const descriptionId = `${titleId}-description`;
let previousFocus = null;

const sizeClass = computed(() => ({
  sm: 'max-w-[400px]',
  md: 'max-w-[560px]',
  lg: 'max-w-[800px]',
  xl: 'max-w-[1200px]',
  full: 'max-w-[calc(100vw-32px)]'
}[props.size]));

function isTopModal() {
  return modalStack.at(-1) === instanceKey;
}

function lockBody() {
  if (openModalCount === 0) {
    originalBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  openModalCount += 1;
}

function unlockBody() {
  openModalCount = Math.max(0, openModalCount - 1);
  if (openModalCount === 0) document.body.style.overflow = originalBodyOverflow;
}

function requestClose() {
  if (!props.busy && isTopModal()) emit('close');
}

function handleBackdrop() {
  if (props.closeOnBackdrop) requestClose();
}

function focusableElements() {
  if (!dialogRef.value) return [];
  return [...dialogRef.value.querySelectorAll(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )].filter((element) => !element.hasAttribute('hidden'));
}

function handleKeydown(event) {
  if (!props.isOpen || !isTopModal()) return;
  if (event.key === 'Escape' && props.closeOnEscape) {
    event.preventDefault();
    requestClose();
    return;
  }
  if (event.key !== 'Tab') return;
  const elements = focusableElements();
  if (!elements.length) {
    event.preventDefault();
    dialogRef.value?.focus();
    return;
  }
  const first = elements[0];
  const last = elements[elements.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function activateModal() {
  previousFocus = document.activeElement;
  modalStack.push(instanceKey);
  lockBody();
  window.addEventListener('keydown', handleKeydown);
  nextTick(() => {
    const [first] = focusableElements();
    (first || dialogRef.value)?.focus();
  });
}

function deactivateModal() {
  const stackIndex = modalStack.lastIndexOf(instanceKey);
  if (stackIndex >= 0) modalStack.splice(stackIndex, 1);
  window.removeEventListener('keydown', handleKeydown);
  unlockBody();
  if (previousFocus instanceof HTMLElement) previousFocus.focus();
  previousFocus = null;
}

watch(() => props.isOpen, (open, wasOpen) => {
  if (open && !wasOpen) activateModal();
  else if (!open && wasOpen) deactivateModal();
}, { immediate: true });

onBeforeUnmount(() => {
  if (props.isOpen) deactivateModal();
});
</script>
