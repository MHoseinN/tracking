<template>
  <AppTablePanel :title="`محصولات ${categoryName || 'همه دسته‌ها'}`">
    <template #filters>
      <AppFilterBar columns-class="md:grid-cols-2">
        <input :value="searchQuery" class="app-filter-control" type="search" placeholder="جست‌وجوی محصول یا دسته‌بندی"
          @input="$emit('update:search-query', $event.target.value)" />
        <CustomSelect :model-value="selectedCategoryId || ''" :options="categoryOptions"
          trigger-class="app-filter-control" @update:model-value="$emit('update:selected-category-id', $event)" />
        <template #actions>
          <AppButton variant="secondary" @click="$emit('clear-filters')">پاک‌کردن فیلترها</AppButton>
        </template>
      </AppFilterBar>
    </template>
    <AppDataTable class="products-table" :column-count="5" :loading="loading" :empty="!products.length" min-width="100%"
      loading-message="در حال بارگذاری محصولات..." empty-message="محصولی با این فیلتر پیدا نشد.">
      <template #head>
        <tr>
          <th>ردیف</th>
          <th>نام محصول</th>
          <th>دسته‌بندی</th>
          <th>قیمت یک روز</th>
          <th>عملیات</th>
        </tr>
      </template>

      <tr v-for="(product, index) in products" :key="product.id" class="app-table-row">
        <td class="text-center font-bold text-slate-500">{{ (rowStartIndex + index + 1).toLocaleString('fa-IR') }}</td>
        <td class="font-black text-slate-900">{{ product.name }}</td>
        <td>{{ product.category_name || 'بدون دسته‌بندی' }}</td>
        <td class="text-center font-black text-emerald-700">{{ formatPrice(product.daily_price_toman) }}</td>
        <td>
          <div class="flex items-center justify-center gap-1">
            <AppIconButton label="ویرایش محصول" size="sm" variant="primary" @click="$emit('edit', product)">
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5m-1.5-9.5a2.1 2.1 0 0 1 3 3L12 15H9v-3z" />
              </svg>
            </AppIconButton>
            <AppIconButton label="حذف محصول" size="sm" variant="danger" @click="$emit('delete', product)">
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-width="2" d="M6 7h12m-9 0V5h6v2m-8 0 1 13h8l1-13" />
              </svg>
            </AppIconButton>
          </div>
        </td>
      </tr>
    </AppDataTable>
    <template #footer>
      <AppPagination :total-rows="totalRows" :row-start-index="rowStartIndex" :page-size="pageSize"
        :page-size-options="pageSizeOptions" :current-page="currentPage" :total-pages="totalPages"
        :visible-page-numbers="visiblePageNumbers" @update:page-size="$emit('update:page-size', $event)"
        @go-to-page="$emit('go-to-page', $event)" />
    </template>
  </AppTablePanel>
</template>

<script setup>
import AppPagination from '../AppPagination.vue';
import CustomSelect from '../CustomSelect.vue';
import AppButton from '../ui/AppButton.vue';
import AppDataTable from '../ui/AppDataTable.vue';
import AppFilterBar from '../ui/AppFilterBar.vue';
import AppIconButton from '../ui/AppIconButton.vue';
import AppTablePanel from '../ui/AppTablePanel.vue';

defineProps({
  categoryName: { type: String, default: '' }, searchQuery: { type: String, default: '' },
  selectedCategoryId: { type: [String, Number], default: null }, categoryOptions: { type: Array, default: () => [] },
  products: { type: Array, default: () => [] }, loading: { type: Boolean, default: false },
  totalRows: { type: Number, default: 0 }, rowStartIndex: { type: Number, default: 0 },
  pageSize: { type: Number, required: true }, pageSizeOptions: { type: Array, default: () => [] },
  currentPage: { type: Number, required: true }, totalPages: { type: Number, required: true },
  visiblePageNumbers: { type: Array, default: () => [] }
});
defineEmits(['update:search-query', 'update:selected-category-id', 'clear-filters', 'update:page-size', 'go-to-page', 'edit', 'delete']);
function formatPrice(value) { return `${Math.round(Number(value) || 0).toLocaleString('fa-IR')} تومان`; }
</script>

<style scoped>
.products-table :deep(.app-table) {
  width: 100%;
  table-layout: fixed;
}

.products-table :deep(.app-table-wrapper) {
  overflow-x: hidden;
}

.products-table :deep(th),
.products-table :deep(td) {
  padding: .4rem .45rem;
  vertical-align: middle;
}

.products-table :deep(th:nth-child(1)) {
  width: 8%;
}

.products-table :deep(th:nth-child(2)) {
  width: 30%;
}

.products-table :deep(th:nth-child(3)) {
  width: 24%;
}

.products-table :deep(th:nth-child(4)) {
  width: 23%;
}

.products-table :deep(th:nth-child(5)) {
  width: 15%;
}

@media (max-width: 767px) {

  .products-table :deep(th:nth-child(3)),
  .products-table :deep(td:nth-child(3)) {
    display: none;
  }

  .products-table :deep(th:nth-child(1)) {
    width: 10%;
  }

  .products-table :deep(th:nth-child(2)) {
    width: 40%;
  }

  .products-table :deep(th:nth-child(4)) {
    width: 30%;
  }

  .products-table :deep(th:nth-child(5)) {
    width: 20%;
  }
}
</style>
