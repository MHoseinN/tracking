<template>
  <section class="rounded-lg border border-gray-200 bg-white shadow-md">
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-2">
      <div>
        <h2 class="text-xl font-black text-slate-900">محصولات {{ categoryName || 'همه شاخه‌ها' }}</h2>
        <div class="flex min-h-12 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 shadow-sm">
          <svg class="h-5 w-5 shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z" />
          </svg>
          <input :value="searchQuery" type="text" placeholder="جستجوی لحظه‌ای در محصولات همین شاخه..."
            class="h-11 min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            @input="$emit('update:search-query', $event.target.value.trim())" />
        </div>
      </div>
    </div>

    <div class="border-b border-slate-100 bg-slate-50/70 px-5 py-4">
      <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]"></div>
    </div>

    <AppContentState v-if="loading" loading message="در حال بارگذاری..."
      surface-class="border-0 bg-transparent px-5 py-16 shadow-none" />

    <AppContentState v-else-if="products.length === 0" message="محصولی برای این شاخه پیدا نشد."
      surface-class="border-0 bg-transparent px-5 py-16 shadow-none" />

    <div v-else class="divide-y divide-slate-100">
      <article v-for="product in products" :key="product.id"
        class="flex flex-col gap-4 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
        <div class="space-y-2">
          <div class="flex flex-wrap items-center gap-2">
            <span class="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
              {{ product.category_name || 'بدون دسته‌بندی' }}
            </span>
            <span class="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
              {{ product.total_quantity.toLocaleString('fa-IR') }} واحد
            </span>
          </div>
          <h3 class="text-lg font-black text-slate-900">{{ product.name }}</h3>
          <p v-if="product.notes" class="text-sm text-slate-500">{{ product.notes }}</p>
        </div>

        <div class="flex flex-wrap gap-2">
          <button type="button"
            class="inline-flex h-11 items-center rounded-lg border border-blue-200 bg-blue-50 px-4 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
            @click="$emit('edit', product)">
            ویرایش
          </button>
          <button type="button"
            class="inline-flex h-11 items-center rounded-lg border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
            @click="$emit('delete', product)">
            حذف
          </button>
        </div>
      </article>
    </div>

    <AppPagination v-if="totalRows" :total-rows="totalRows" :row-start-index="rowStartIndex"
      :page-size="pageSize" :page-size-options="pageSizeOptions" :current-page="currentPage"
      :total-pages="totalPages" :visible-page-numbers="visiblePageNumbers"
      @update:page-size="$emit('update:page-size', $event)" @go-to-page="$emit('go-to-page', $event)" />
  </section>
</template>

<script setup>
import AppContentState from '../AppContentState.vue';
import AppPagination from '../AppPagination.vue';

defineProps({
  categoryName: { type: String, default: '' },
  searchQuery: { type: String, default: '' },
  products: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  totalRows: { type: Number, default: 0 },
  rowStartIndex: { type: Number, default: 0 },
  pageSize: { type: Number, required: true },
  pageSizeOptions: { type: Array, default: () => [] },
  currentPage: { type: Number, required: true },
  totalPages: { type: Number, required: true },
  visiblePageNumbers: { type: Array, default: () => [] }
});

defineEmits(['update:search-query', 'update:page-size', 'go-to-page', 'edit', 'delete']);
</script>
