<template>
  <!-- Confirm Delete Modal -->
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      @click.self="$emit('cancel')"
    >
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <!-- Icon -->
        <div class="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-4">
          <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
        </div>

        <!-- Title -->
        <h3 class="text-xl font-bold text-gray-800 text-center mb-2">{{ title }}</h3>

        <!-- Message -->
        <p class="text-gray-500 text-center mb-6">{{ message }}</p>

        <!-- Buttons -->
        <div class="flex gap-3">
          <button
            @click="$emit('confirm')"
            :disabled="loading"
            class="flex-1 bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50"
          >
            <span v-if="loading" class="flex items-center justify-center gap-2">
              <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              در حال حذف...
            </span>
            <span v-else>بله، حذف شود</span>
          </button>
          <button
            @click="$emit('cancel')"
            :disabled="loading"
            class="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-200 transition"
          >
            انصراف
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
  loading: { type: Boolean, default: false }
});

defineEmits(['confirm', 'cancel']);
</script>
