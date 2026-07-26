<template>
  <article class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-md">
    <div class="flex w-full flex-wrap items-center justify-between gap-4 px-4 py-4 text-right transition hover:bg-slate-50/80">
      <div class="min-w-0">
        <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          {{ toPersianDate(order.start_date) }} تا {{ toPersianDate(order.end_date) }}
        </span>
        <h2 class="mt-2 truncate text-lg font-black text-slate-900">{{ order.customer_name || 'مشتری بدون نام' }}</h2>
        <p class="mt-1 text-sm text-slate-500">{{ expanded ? 'برای بستن جزئیات دوباره کلیک کن' : itemsSummary }}</p>
        <p v-if="order.notes && expanded" class="mt-2 text-sm text-slate-500">{{ order.notes }}</p>
      </div>
      <div class="flex items-center gap-2">
        <button type="button"
          class="inline-flex h-10 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          @click="$emit('edit')">ویرایش رزرو</button>
        <button type="button" :disabled="releasing"
          class="inline-flex h-10 items-center rounded-lg border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
          @click="$emit('release')">{{ releasing ? 'در حال آزادسازی...' : 'آزادسازی کل رزرو' }}</button>
        <button type="button" :aria-expanded="expanded" @click="$emit('toggle')"
          class="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500">
          <svg class="h-4 w-4 transition" :class="expanded ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
    </div>
    <div v-if="expanded" class="border-t border-slate-100 px-4 py-4">
      <InventoryReservationItemsTable :order-id="order.reservation_order_id" :items="groupedItems" :updating="updating"
        @change-quantity="(productId, delta) => $emit('change-quantity', productId, delta)"
        @remove="$emit('remove', $event)" />
    </div>
  </article>
</template>

<script setup>
import { computed } from 'vue';
import { toPersianDate } from '../../utils/dateConverter';
import InventoryReservationItemsTable from './InventoryReservationItemsTable.vue';

const props = defineProps({
  order: { type: Object, required: true },
  groupedItems: { type: Array, default: () => [] },
  expanded: { type: Boolean, default: false },
  releasing: { type: Boolean, default: false },
  updating: { type: Boolean, default: false }
});

defineEmits(['toggle', 'edit', 'release', 'change-quantity', 'remove']);

const itemsSummary = computed(() => props.groupedItems.slice(0, 3)
  .map((item) => `${item.product_name} ${item.quantity.toLocaleString('fa-IR')} عدد`)
  .join('، '));
</script>
