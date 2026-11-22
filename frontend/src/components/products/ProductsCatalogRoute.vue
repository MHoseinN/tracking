<template>
  <div>
    <Teleport to="#app-shell-actions">
      <AppButton variant="primary" block @click="router.push('/products/manage')">مدیریت محصولات</AppButton>
      <AppButton variant="info" block @click="showPriceVersionsModal = true">نسخه‌های قیمت</AppButton>
    </Teleport>

    <div class="grid items-start gap-4 xl:grid-cols-[230px_minmax(0,1fr)]">
      <ProductCatalogSidebar :category-tree="categoryTree" :selected-category-id="selectedCategoryId"
        @select="selectedCategoryId = $event" />
      <section ref="tableSectionRef">
        <ProductCatalogList :category-name="selectedCategoryObject?.name" :search-query="productSearch"
          :products="paginatedItems" :loading="catalogStore.loading" :total-rows="totalRows"
          :row-start-index="rowStartIndex" :page-size="pageSize" :page-size-options="pageSizeOptions"
          :current-page="currentPage" :total-pages="totalPages" :visible-page-numbers="visiblePageNumbers"
          @update:search-query="productSearch = $event" @update:page-size="pageSize = $event"
          @go-to-page="goToPage" />
      </section>
    </div>
    <ProductPriceVersionsModal :is-open="showPriceVersionsModal" :products="catalogStore.products"
      @close="showPriceVersionsModal = false" @catalog-changed="loadData" />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import AppButton from '../ui/AppButton.vue';
import ProductCatalogSidebar from './ProductCatalogSidebar.vue';
import ProductCatalogList from './ProductCatalogList.vue';
import ProductPriceVersionsModal from './ProductPriceVersionsModal.vue';
import { useProductCatalogStore } from '../../stores/productCatalogStore';
import { usePaginatedList } from '../../composables/usePaginatedList';

const router = useRouter();
const toast = useToast();
const catalogStore = useProductCatalogStore();
const productSearch = ref('');
const selectedCategoryId = ref(null);
const tableSectionRef = ref(null);
const showPriceVersionsModal = ref(false);
const categoryTree = computed(() => catalogStore.categoryTree || []);
const selectedCategoryObject = computed(() => catalogStore.categories.find(
  (category) => String(category.id) === String(selectedCategoryId.value)) || null);
const visibleProducts = computed(() => {
  const query = productSearch.value.trim().toLowerCase();
  return catalogStore.products.filter((product) => {
    const matchesSearch = !query || [product.name, product.category_name].some(
      (value) => String(value || '').toLowerCase().includes(query));
    if (!matchesSearch) return false;
    if (!selectedCategoryId.value) return true;
    let category = catalogStore.categories.find((item) => String(item.id) === String(product.category_id));
    while (category) {
      if (String(category.id) === String(selectedCategoryId.value)) return true;
      category = catalogStore.categories.find((item) => String(item.id) === String(category.parent_id));
    }
    return false;
  });
});
const {
  currentPage, pageSize, pageSizeOptions, totalRows, totalPages, rowStartIndex,
  paginatedItems, visiblePageNumbers, goToPage
} = usePaginatedList(visibleProducts, {
  initialPageSize: 15,
  pageSizeOptions: [10, 15, 20, 50, 100],
  resetSources: [productSearch, selectedCategoryId],
  scrollTarget: tableSectionRef
});

async function loadData() {
  try { await catalogStore.fetchCatalog(); }
  catch (_error) { toast.error(catalogStore.error || 'خطا در دریافت محصولات'); }
}
onMounted(loadData);
</script>
