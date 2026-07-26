<template>
  <div>
    <Teleport to="#app-shell-actions">
      <button type="button" @click="openProductModal()" class="app-button-primary w-full">افزودن محصول</button>
      <button type="button" @click="openCategoryModal()" class="app-button-primary w-full">افزودن دسته‌بندی</button>
      <button type="button" :disabled="!selectedCategoryObject" @click="openCategoryModal(selectedCategoryObject)"
        class="app-button-secondary w-ful disabled:opacity-50">ویرایش ‌دسته‌بندی</button>
      <button type="button" :disabled="!selectedCategoryObject"
        @click="openCategoryModal({ parent_id: selectedCategoryObject?.id || null })"
        class="app-button-secondary w-full disabled:opacity-50">افزودن زیرشاخه</button>
      <button type="button" :disabled="!selectedCategoryObject" @click="showDeleteCategoryModal = true"
        class="app-button-secondary w-full border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 focus:ring-rose-100 disabled:opacity-50">حذف
        دسته</button>
      <button type="button" class="app-button-secondary w-full" @click="router.push('/inventory')">بازگشت به
        رزرو</button>
    </Teleport>

    <div class="grid items-start gap-2 grid-cols-[250px_minmax(0,1fr)]">
      <ProductCatalogSidebar :category-tree="categoryTree" :selected-category-id="selectedCategoryId"
        @select="selectedCategoryId = $event" />

      <section ref="tableSectionRef" class="space-y-6">
        <ProductCatalogList :category-name="selectedCategoryObject?.name" :search-query="productSearch"
          :products="paginatedItems" :loading="inventoryStore.loading" :total-rows="totalRows"
          :row-start-index="rowStartIndex" :page-size="pageSize" :page-size-options="pageSizeOptions"
          :current-page="currentPage" :total-pages="totalPages" :visible-page-numbers="visiblePageNumbers"
          @update:search-query="productSearch = $event" @update:page-size="pageSize = $event"
          @go-to-page="goToPage" @edit="openProductModal" @delete="openDeleteProduct" />
      </section>
    </div>

    <InventoryCategoryModal :is-open="showCategoryModal" :category="selectedCategoryForModal"
      :categories="flatCategoryOptions" :saving="savingCategory" @close="closeCategoryModal"
      @save="handleSaveCategory" />

    <InventoryProductModal :is-open="showProductModal" :product="selectedProduct" :categories="flatCategoryOptions"
      :saving="savingProduct" @close="closeProductModal" @save="handleSaveProduct" />

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
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import ConfirmModal from '../ConfirmModal.vue';
import InventoryCategoryModal from '../InventoryCategoryModal.vue';
import InventoryProductModal from '../InventoryProductModal.vue';
import UndoBar from '../UndoBar.vue';
import ProductCatalogList from './ProductCatalogList.vue';
import ProductCatalogSidebar from './ProductCatalogSidebar.vue';
import { useInventoryStore } from '../../stores/inventoryStore';
import { usePaginatedList } from '../../composables/usePaginatedList';
import { useUndoAction } from '../../composables/useUndoAction';
import { useProductCatalogActions } from '../../composables/useProductCatalogActions';

const router = useRouter();
const toast = useToast();
const inventoryStore = useInventoryStore();

const productSearch = ref('');
const selectedCategoryId = ref(null);
const tableSectionRef = ref(null);

onMounted(async () => {
  await loadData();
});

const categoryTree = computed(() => inventoryStore.lookups.category_tree || []);
const selectedCategoryObject = computed(() => inventoryStore.lookups.categories.find((item) => String(item.id) === String(selectedCategoryId.value)) || null);
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
  return inventoryStore.productsForInventory.filter((product) => {
    const matchesSearch = !query
      || String(product.name || '').toLowerCase().includes(query)
      || String(product.category_name || '').toLowerCase().includes(query);

    const matchesCategory = !selectedCategoryId.value || String(product.category_id) === String(selectedCategoryId.value)
      || isCategoryDescendant(product.category_id, selectedCategoryId.value);

    return matchesSearch && matchesCategory;
  });
});

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
} = useProductCatalogActions({ inventoryStore, toast, reloadData: loadData, selectedCategoryId, showUndo });

async function loadData() {
  try {
    await Promise.all([inventoryStore.fetchLookups(), inventoryStore.fetchDashboard()]);
  } catch (_error) {
    toast.error(inventoryStore.error || 'خطا در دریافت اطلاعات مدیریت محصول');
  }
}

function isCategoryDescendant(categoryId, selectedId) {
  const categories = inventoryStore.lookups.categories;
  let current = categories.find((item) => String(item.id) === String(categoryId));
  while (current?.parent_id) {
    if (String(current.parent_id) === String(selectedId)) return true;
    current = categories.find((item) => String(item.id) === String(current.parent_id));
  }
  return false;
}

</script>
