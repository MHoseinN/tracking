<template>
  <!-- Confirm Delete Modal -->
  <Teleport to="body">
    <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      @click.self="$emit('cancel')">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
        <!-- Icon -->
        <div class="flex items-center justify-center w-16 h-16 bg-amber-50 text-amber-400 rounded-full mx-auto mb-4">
          <svg fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="size-8">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
        </div>
        <!-- Title -->
        <h3 class="text-xl font-bold text-gray-800 text-center mb-2">{{ title }}</h3>

        <!-- Message -->
        <p class="text-gray-500 text-center mb-6">{{ message }}</p>

        <!-- Buttons -->
        <div class="flex gap-3">
          <button @click="$emit('confirm')" :disabled="loading"
            class="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50">
            <span v-if="loading" class="flex items-center justify-center gap-2">
              <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              {{ loadingText }}
            </span>
            <span v-else>{{ confirmText }}</span>
          </button>
          <button @click="$emit('cancel')" :disabled="loading"
            class="flex-1 bg-red-100 text-red-700 py-3 rounded-lg font-semibold hover:bg-red-200 transition">
            {{ cancelText }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
defineProps({
  isOpen: { type: Boolean, default: false },
  title: { type: String, default: 'حذف' },
  message: { type: String, default: 'آیا از حذف این مورد اطمینان دارید؟' },
  loading: { type: Boolean, default: false },
  confirmText: { type: String, default: 'بله، حذف شود' },
  cancelText: { type: String, default: 'انصراف' },
  loadingText: { type: String, default: 'در حال حذف...' }
});

defineEmits(['confirm', 'cancel']);
</script>
