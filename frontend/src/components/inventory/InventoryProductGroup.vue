<template>
  <article class="rounded-lg border border-slate-300">
    <div class="p-2 border-b">
      <div class="min-w-0 flex items-center justify-between gap-2">
        <div class="flex gap-4 items-center">
          <h3 class="text-base font-black text-slate-900">{{ group.product_name }}</h3>
          <div class="flex gap-1">
            <span class="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
              {{ formatNumber(group.available_units) }} آزاد
            </span>
            <span class="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">
              {{ formatNumber(group.reserved_units) }} رزرو
            </span>
            <span v-if="cartQuantity"
              class="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
              {{ formatNumber(cartQuantity) }} در سبد
            </span>
          </div>
        </div>
        <button type="button" :aria-expanded="expanded" @click="$emit('toggle')"
          class="rounded-lg bg-slate-100 hover:bg-gray-200/80 transition px-3 py-2 text-xs font-semibold text-slate-600">
          <svg fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"
            class="size-5 transition-transform" :class="expanded ? 'rotate-180' : ''">
            <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </button>
      </div>
    </div>

    <div v-if="expanded" class="grid grid-cols-2 md:grid-cols-6 gap-2 rounded-lg bg-gray-50 p-2">
      <article v-for="unit in group.units" :key="unit.unit_id"
        class="max-w-30 rounded-lg border p-2 transition hover:-translate-y-0.5 hover:shadow-md"
        :class="unit.status === 'reserved' ? 'border-rose-200 bg-rose-50/80' : 'border-emerald-200 bg-emerald-50/80'">
        <button type="button" class="block w-full text-right" @click="$emit('open-unit', unit)">
          <div class="flex items-start justify-between gap-2">
            <span class="text-[11px] font-black text-slate-700">شماره {{ formatNumber(unit.unit_number) }}</span>
            <span class="rounded-full px-2 py-0.5 text-[10px] font-bold"
              :class="unit.status === 'reserved' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'">
              {{ unit.status === 'reserved' ? 'رزرو' : 'آزاد' }}
            </span>
          </div>
          <p class="mt-2 min-h-[32px] text-[11px] leading-5 text-slate-700">
            {{ unit.status === 'reserved' ? unit.customer_name || 'رزرو شده' : 'آماده برای رزرو' }}
          </p>
          <p class="text-xs text-slate-500">
            {{ unit.status === 'reserved' ? formatUnitDates(unit) : 'بدون رزرو فعال در بازه انتخابی' }}
          </p>
        </button>

        <div v-if="unit.status !== 'reserved'" class="mt-3 grid gap-2">
          <button type="button"
            class="inline-flex h-8 items-center justify-center rounded-lg bg-blue-600 px-2 text-xs font-semibold text-white transition hover:bg-blue-700"
            @click.stop="$emit('open-unit', unit)">رزرو</button>
          <button type="button"
            class="inline-flex h-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            @click.stop="$emit('add-to-cart')">افزودن به سبد</button>
        </div>
        <div v-else class="mt-3 text-xs text-center">
          <button type="button"
            class="inline-flex h-8 w-full items-center justify-center rounded-lg border border-rose-200 bg-white px-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
            @click="$emit('clear', unit)">آزادسازی</button>
        </div>
      </article>
    </div>
  </article>
</template>

<script setup>
import { toPersianDate } from '../../utils/dateConverter';

defineProps({
  group: { type: Object, required: true },
  cartQuantity: { type: Number, default: 0 },
  expanded: { type: Boolean, default: false }
});

defineEmits(['toggle', 'open-unit', 'add-to-cart', 'clear']);

function formatNumber(value) {
  return Number(value || 0).toLocaleString('fa-IR');
}

function formatUnitDates(unit) {
  if (!unit.start_date || !unit.end_date) return 'بازه ثبت نشده';
  return `${toPersianDate(unit.start_date)} تا ${toPersianDate(unit.end_date)}`;
}
</script>
