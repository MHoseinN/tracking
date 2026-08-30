<template>
  <Teleport to="body">
    <div v-if="isOpen" class="fixed inset-0 z-[160] flex items-center justify-center bg-slate-950/60 p-3">
      <div class="flex max-h-[96vh] w-full max-w-7xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
        <header class="flex shrink-0 items-center justify-between border-b border-slate-300 px-5 py-4">
          <div>
            <h2 class="text-xl font-black text-slate-900">پیش‌نمایش پیش‌فاکتور</h2>
            <p class="mt-1 text-xs text-slate-500">لیست شماره {{ listNumber || '—' }}</p>
          </div>
          <button type="button" class="app-icon-button" :disabled="loading" @click="$emit('close')">✕</button>
        </header>

        <div class="min-h-0 flex-1 overflow-y-auto p-5">
          <p class="mb-3 rounded border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
            این پیش‌فاکتور صرفاً برآورد اولیه است و مبنای مالی قطعی یا تسویه حساب نیست.
          </p>
          <div class="h-[72vh] overflow-hidden rounded border border-slate-300 bg-slate-100">
            <div v-if="loading" class="flex h-full items-center justify-center text-sm text-slate-500">
              در حال ساخت پیش‌فاکتور...
            </div>
            <iframe v-else-if="pdfUrl" :src="`${pdfUrl}#toolbar=1&navpanes=0`"
              title="پیش‌نمایش PDF پیش‌فاکتور" class="h-full w-full bg-white" />
            <div v-else class="flex h-full items-center justify-center text-sm text-rose-600">
              پیش‌نمایش پیش‌فاکتور آماده نشد.
            </div>
          </div>
        </div>

        <footer class="flex shrink-0 flex-wrap justify-end gap-3 border-t border-slate-300 bg-white px-5 py-4">
          <button type="button" class="app-button-secondary" :disabled="loading" @click="$emit('close')">بستن</button>
          <button type="button" class="app-button-primary" :disabled="loading || !pdfUrl" @click="$emit('download')">
            {{ downloading ? 'در حال دانلود...' : 'دانلود PDF پیش‌فاکتور' }}
          </button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
defineProps({
  isOpen: { type: Boolean, default: false },
  listNumber: { type: [String, Number], default: '' },
  pdfUrl: { type: String, default: '' },
  loading: { type: Boolean, default: false },
  downloading: { type: Boolean, default: false }
});
defineEmits(['close', 'download']);
</script>
