<template>
  <Teleport to="body">
    <div v-if="visible" class="fixed bottom-5 left-1/2 z-[80] w-[min(92vw,520px)] -translate-x-1/2">
      <div class="flex items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-slate-900 px-5 py-4 text-white shadow-2xl">
        <div class="min-w-0">
          <p class="truncate text-sm font-semibold">{{ title }}</p>
          <p v-if="message" class="mt-1 text-xs text-slate-300">{{ message }}</p>
        </div>
        <div class="flex items-center gap-2">
          <button @click="$emit('undo')"
            class="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100">
            بازگردانی
          </button>
          <button @click="$emit('close')"
            class="rounded-2xl border border-white/15 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10">
            بستن
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
defineProps({
  visible: { type: Boolean, default: false },
  title: { type: String, default: '' },
  message: { type: String, default: '' }
});

defineEmits(['undo', 'close']);
</script>
