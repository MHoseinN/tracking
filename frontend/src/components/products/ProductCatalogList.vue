<template>
  <section class="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-md">
    <div class="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h2 class="text-xl font-black text-slate-900">محصولات {{ categoryName || 'همه دسته‌ها' }}</h2>
        <p class="mt-1 text-xs text-slate-500">قیمت‌ها برای یک روز و به تومان ثبت شده‌اند.</p>
      </div>
      <div class="flex min-h-12 min-w-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 shadow-sm lg:w-[380px]">
        <svg class="h-5 w-5 shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15z" />
        </svg>
        <input :value="searchQuery" type="search" placeholder="جستجوی نام، دسته یا توضیحات..."
          class="h-11 min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
          @input="$emit('update:search-query', $event.target.value)" />
      </div>
    </div>

    <AppContentState v-if="loading" loading message="در حال بارگذاری محصولات..."
      surface-class="border-0 bg-transparent px-5 py-16 shadow-none" />

    <div v-else class="table-container">
      <table class="w-full bg-white text-sm">
        <thead class="bg-blue-50">
          <tr>
            <th class="border border-gray-200 p-3 text-center font-semibold">ردیف</th>
            <th class="border border-gray-200 p-3 text-right font-semibold">نام محصول</th>
            <th class="border border-gray-200 p-3 text-right font-semibold">دسته‌بندی</th>
            <th class="border border-gray-200 p-3 text-center font-semibold">قیمت یک روز</th>
            <th class="border border-gray-200 p-3 text-center font-semibold">وضعیت</th>
            <th class="border border-gray-200 p-3 text-right font-semibold">توضیحات</th>
            <th class="border border-gray-200 p-3 text-center font-semibold">عملیات</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(product, index) in products" :key="product.id" class="transition hover:bg-blue-50">
            <td class="border border-gray-100 px-4 py-3 text-center">
              {{ (rowStartIndex + index + 1).toLocaleString('fa-IR') }}
            </td>
            <td class="border border-gray-100 px-4 py-3 font-semibold text-slate-900">{{ product.name }}</td>
            <td class="border border-gray-100 px-4 py-3">{{ product.category_name || 'بدون دسته‌بندی' }}</td>
            <td class="border border-gray-100 px-4 py-3 text-center font-bold text-emerald-700">
              {{ formatPrice(product.daily_price_toman) }}
            </td>
            <td class="border border-gray-100 px-4 py-3 text-center">
              <span class="rounded-full px-3 py-1 text-xs font-semibold"
                :class="product.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'">
                {{ product.is_active ? 'فعال' : 'غیرفعال' }}
              </span>
            </td>
            <td class="max-w-[260px] truncate border border-gray-100 px-4 py-3 text-slate-500">
              {{ product.notes || '-' }}
            </td>
            <td class="border border-gray-100 px-4 py-3">
              <div class="flex justify-center gap-2">
                <button type="button"
                  class="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                  @click="$emit('edit', product)">ویرایش</button>
                <button type="button"
                  class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                  @click="$emit('delete', product)">حذف</button>
              </div>
            </td>
          </tr>
          <tr v-if="!products.length">
            <td colspan="7" class="px-4 py-12 text-center text-slate-500">محصولی با این فیلتر پیدا نشد.</td>
          </tr>
        </tbody>
      </table>

      <AppPagination v-if="totalRows" :total-rows="totalRows" :row-start-index="rowStartIndex"
        :page-size="pageSize" :page-size-options="pageSizeOptions" :current-page="currentPage"
        :total-pages="totalPages" :visible-page-numbers="visiblePageNumbers"
        @update:page-size="$emit('update:page-size', $event)" @go-to-page="$emit('go-to-page', $event)" />
    </div>
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

function formatPrice(value) {
  return `${Math.round(Number(value) || 0).toLocaleString('fa-IR')} تومان`;
}
</script>
