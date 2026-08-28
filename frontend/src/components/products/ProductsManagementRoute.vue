<template>
  <div>
    <Teleport to="#app-shell-actions">
      <AppButton variant="primary" block @click="openProductModal()">افزودن محصول</AppButton>
      <AppButton variant="info" block @click="showPriceVersionsModal = true">نسخه‌های قیمت</AppButton>
      <AppButton variant="primary" block @click="openCategoryModal()">افزودن دسته‌بندی</AppButton>
      <AppButton variant="secondary" block :disabled="!selectedCategoryObject" @click="openCategoryModal(selectedCategoryObject)">ویرایش دسته‌بندی</AppButton>
      <AppButton variant="secondary" block :disabled="!selectedCategoryObject" @click="openCategoryModal({ parent_id: selectedCategoryObject?.id || null })">افزودن زیرشاخه</AppButton>
      <AppButton variant="danger" block :disabled="!selectedCategoryObject" @click="showDeleteCategoryModal = true">حذف دسته</AppButton>
    </Teleport>

    <div class="grid items-start gap-4 xl:grid-cols-[230px_minmax(0,1fr)]">
      <ProductCatalogSidebar :category-tree="categoryTree" :selected-category-id="selectedCategoryId"
        @select="selectedCategoryId = $event" />

      <section ref="tableSectionRef" class="space-y-6">
        <ProductCatalogList :category-name="selectedCategoryObject?.name" :search-query="productSearch"
          :selected-category-id="selectedCategoryId" :category-options="categoryFilterOptions"
          :products="paginatedItems" :loading="catalogStore.loading" :total-rows="totalRows"
          :row-start-index="rowStartIndex" :page-size="pageSize" :page-size-options="pageSizeOptions"
          :current-page="currentPage" :total-pages="totalPages" :visible-page-numbers="visiblePageNumbers"
          @update:search-query="productSearch = $event"
          @update:selected-category-id="selectedCategoryId = $event || null"
          @clear-filters="clearProductFilters" @update:page-size="pageSize = $event"
          @go-to-page="goToPage" @edit="openProductModal" @delete="openDeleteProduct" />
      </section>
    </div>

    <ProductCategoryModal :is-open="showCategoryModal" :category="selectedCategoryForModal"
      :categories="flatCategoryOptions" :saving="savingCategory" @close="closeCategoryModal"
      @save="handleSaveCategory" />

    <ProductFormModal :is-open="showProductModal" :product="selectedProduct" :categories="flatCategoryOptions"
      :saving="savingProduct" @close="closeProductModal" @save="handleSaveProduct" />

    <ProductPriceVersionsModal :is-open="showPriceVersionsModal" :products="catalogStore.products"
      @close="showPriceVersionsModal = false" @catalog-changed="loadData" />

    <ConfirmModal :is-open="showDeleteCategoryModal" title="حذف دسته‌بندی"
      :message="selectedCategoryObject ? `آیا دسته‌بندی «${selectedCategoryObject.name}» حذف شود؟` : 'آیا این دسته‌بندی حذف شود؟'"
      :loading="deleting" @confirm="handleDeleteCategory(selectedCategoryObject)"
      @cancel="showDeleteCategoryModal = false" />

    <ConfirmModal :is-open="showDeleteProductModal" title="حذف محصول" :message="deleteProductMessage"
      :loading="deleting" @confirm="handleDeleteProduct" @cancel="showDeleteProductModal = false" />

    <UndoBar :visible="undoState.visible" :title="undoState.title" :message="undoState.message" @undo="handleUndo"
      @close="clearUndo" />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useToast } from 'vue-toastification';
import ConfirmModal from '../ConfirmModal.vue';
import AppButton from '../ui/AppButton.vue';
import ProductCategoryModal from './ProductCategoryModal.vue';
import ProductFormModal from './ProductFormModal.vue';
import UndoBar from '../UndoBar.vue';
import ProductCatalogList from './ProductCatalogList.vue';
import ProductCatalogSidebar from './ProductCatalogSidebar.vue';
import ProductPriceVersionsModal from './ProductPriceVersionsModal.vue';
import { useProductCatalogStore } from '../../stores/productCatalogStore';
import { usePaginatedList } from '../../composables/usePaginatedList';
import { useUndoAction } from '../../composables/useUndoAction';
import { useProductCatalogActions } from '../../composables/useProductCatalogActions';

const toast = useToast();
const catalogStore = useProductCatalogStore();

const productSearch = ref('');
const selectedCategoryId = ref(null);
const tableSectionRef = ref(null);
const showPriceVersionsModal = ref(false);

onMounted(async () => {
  await loadData();
});

const categoryTree = computed(() => catalogStore.categoryTree || []);
const selectedCategoryObject = computed(() => catalogStore.categories.find((item) => String(item.id) === String(selectedCategoryId.value)) || null);
const flatCategoryOptions = computed(() => {
  const result = [];
  const walk = (nodes, depth = 0) => {
    nodes.forEach((node) => {
      result.push({
        id: node.id,
        name: node.name,
        parent_id: node.parent_id,
        label: `${'— '.repeat(depth)}${node.name}`
      });
      if (node.children?.length) walk(node.children, depth + 1);
    });
  };
  walk(categoryTree.value);
  return result;
});

const visibleProducts = computed(() => {
  const query = productSearch.value.trim().toLowerCase();
  return catalogStore.products.filter((product) => {
    const matchesSearch = !query
      || String(product.name || '').toLowerCase().includes(query)
      || String(product.category_name || '').toLowerCase().includes(query);

    const matchesCategory = !selectedCategoryId.value || String(product.category_id) === String(selectedCategoryId.value)
      || isCategoryDescendant(product.category_id, selectedCategoryId.value);

    return matchesSearch && matchesCategory;
  });
});
const categoryFilterOptions = computed(() => [
  { label: 'همه دسته‌بندی‌ها', value: '' },
  ...flatCategoryOptions.value.map((category) => ({ label: category.label, value: category.id }))
]);

const {
  currentPage,
  pageSize,
  pageSizeOptions,
  totalRows,
  totalPages,
  rowStartIndex,
  paginatedItems,
  visiblePageNumbers,
  goToPage
} = usePaginatedList(visibleProducts, {
  initialPageSize: 15,
  pageSizeOptions: [10, 15, 20, 50, 100],
  resetSources: [productSearch, selectedCategoryId],
  scrollTarget: tableSectionRef
});

const { undoState, clearUndo, showUndo, handleUndo } = useUndoAction({
  onError: (error) => toast.error(error.message || 'بازگردانی با خطا مواجه شد')
});

const {
  showCategoryModal, showProductModal, showDeleteCategoryModal, showDeleteProductModal,
  savingCategory, savingProduct, deleting, selectedCategoryForModal, selectedProduct,
  deleteProductMessage, openCategoryModal, closeCategoryModal, openProductModal,
  closeProductModal, openDeleteProduct, handleSaveCategory, handleSaveProduct,
  handleDeleteCategory, handleDeleteProduct
} = useProductCatalogActions({ catalogStore, toast, reloadData: loadData, selectedCategoryId, showUndo });

async function loadData() {
  try {
    await catalogStore.fetchCatalog();
  } catch (_error) {
    toast.error(catalogStore.error || 'خطا در دریافت اطلاعات مدیریت محصول');
  }
}

function isCategoryDescendant(categoryId, selectedId) {
  const categories = catalogStore.categories;
  let current = categories.find((item) => String(item.id) === String(categoryId));
  while (current?.parent_id) {
    if (String(current.parent_id) === String(selectedId)) return true;
    current = categories.find((item) => String(item.id) === String(current.parent_id));
  }
  return false;
}

function clearProductFilters() {
  productSearch.value = '';
  selectedCategoryId.value = null;
}

</script>
