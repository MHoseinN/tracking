<template>
  <!-- Confirm Delete Modal -->
  <Teleport to="body">
    <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      @click.self="$emit('cancel')">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        <!-- Icon -->
        <div class="flex items-center justify-center w-16 h-16 bg-amber-50 text-amber-400 rounded-full mx-auto mb-4">
          <svg fill="none" viewBox="0 0 24 24" stroke-width="2"
            stroke="currentColor" class="size-10">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
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
