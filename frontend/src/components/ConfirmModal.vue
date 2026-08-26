<template>
  <AppModal
    :is-open="isOpen"
    :title="title"
    :busy="loading"
    size="sm"
    :z-index="170"
    :show-close="false"
    body-class="text-center"
    @close="$emit('cancel')"
  >
    <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-amber-600">
      <svg fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="h-7 w-7" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round"
          d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
      </svg>
    </div>
    <p class="text-sm leading-7 text-slate-600">{{ message }}</p>

    <template #footer>
      <AppButton :variant="confirmVariant" size="lg" :loading="loading" @click="$emit('confirm')">
        {{ loading ? loadingText : confirmText }}
      </AppButton>
      <AppButton variant="secondary" size="lg" :disabled="loading" @click="$emit('cancel')">
        {{ cancelText }}
      </AppButton>
    </template>
  </AppModal>
</template>

<script setup>
import AppButton from './ui/AppButton.vue';
import AppModal from './ui/AppModal.vue';

defineProps({
  isOpen: { type: Boolean, default: false },
  title: { type: String, default: 'حذف' },
  message: { type: String, default: 'آیا از حذف این مورد اطمینان دارید؟' },
  loading: { type: Boolean, default: false },
  confirmText: { type: String, default: 'بله، حذف شود' },
  cancelText: { type: String, default: 'انصراف' },
  loadingText: { type: String, default: 'در حال انجام...' },
  confirmVariant: {
    type: String,
    default: 'primary',
    validator: (value) => ['primary', 'success', 'warning', 'danger'].includes(value)
  }
});

defineEmits(['confirm', 'cancel']);
</script>
