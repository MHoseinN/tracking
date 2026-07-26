<template>
  <div class="overflow-hidden rounded-lg border border-slate-200 bg-white">
    <div class="grid grid-cols-[minmax(0,1.3fr)_86px_120px_90px] gap-3 border-b border-slate-200 bg-slate-50 px-3 py-3 text-xs font-bold text-slate-500">
      <span>محصول</span><span class="text-center">تعداد</span><span class="text-center">تغییر تعداد</span><span class="text-center">حذف</span>
    </div>
    <div class="divide-y divide-slate-100">
      <div v-for="groupedItem in items" :key="`${orderId}-${groupedItem.product_id}`"
        class="grid grid-cols-[minmax(0,1.3fr)_86px_120px_90px] items-center gap-3 px-3 py-3">
        <div class="min-w-0">
          <p class="truncate text-sm font-black text-slate-900">{{ groupedItem.product_name }}</p>
          <p class="mt-1 truncate text-[11px] text-slate-500">{{ groupedItem.category_name || 'بدون دسته‌بندی' }}</p>
        </div>
        <div class="text-center text-sm font-bold text-slate-700">{{ groupedItem.quantity.toLocaleString('fa-IR') }}</div>
        <div class="flex items-center justify-center gap-1 rounded-lg bg-slate-50 px-2 py-2">
          <button v-for="control in quantityControls" :key="control.delta" type="button" :disabled="updating"
            class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            @click="$emit('change-quantity', groupedItem.product_id, control.delta)">{{ control.label }}</button>
        </div>
        <div class="flex justify-center">
          <button type="button" :disabled="updating"
            class="inline-flex h-8 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
            @click="$emit('remove', groupedItem.product_id)">حذف</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  orderId: { type: [String, Number], required: true },
  items: { type: Array, default: () => [] },
  updating: { type: Boolean, default: false }
});

defineEmits(['change-quantity', 'remove']);

const quantityControls = [
  { label: '-', delta: -1 },
  { label: '+', delta: 1 }
];
</script>
