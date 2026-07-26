<template>
  <div>
    <Teleport to="#app-shell-actions">
      <button type="button"
        class="app-button w-full justify-between border border-rose-200 bg-rose-100 text-rose-700 hover:bg-rose-200 focus:ring-rose-100"
        @click="router.push('/inventory/reservations/new')">
        <span>سبد رزرو</span>
        <span class="rounded-full bg-white/60 px-2 py-0.5 text-xs font-bold">{{
          reservationCart.totalQuantity.toLocaleString('fa-IR') }}</span>
      </button>
      <button type="button" class="app-button-secondary w-full" @click="goBack">بازگشت
      </button>
    </Teleport>

    <div class="grid items-start gap-2 grid-cols-[250px_minmax(0,1fr)]">
      <InventoryCategorySidebar :filtered-tree="filteredTree" :selected-category-id="selectedCategoryId"
        @select="selectedCategoryId = $event" />

      <section ref="tableSectionRef" class="rounded-lg border border-gray-200 bg-white shadow-md">
        <div class="p-2">
          <InventoryFilters v-model:search-term="searchTerm" v-model:status-filter="statusFilter"
            v-model:range-start-persian="rangeStartPersian" v-model:range-end-persian="rangeEndPersian"
            :status-options="statusOptions" />
        </div>

        <AppContentState v-if="inventoryStore.loading" loading message="در حال بارگذاری..."
          surface-class="border-0 bg-transparent px-4 py-16 shadow-none" />
        <AppContentState v-else-if="paginatedGroups.length === 0" message="موردی پیدا نشد."
          surface-class="border-0 bg-transparent px-4 py-16 shadow-none" />

        <div v-else class="space-y-2 px-4">
          <InventoryProductGroup v-for="group in paginatedGroups" :key="group.product_id" :group="group"
            :cart-quantity="reservationCart.getProductQuantity(group.product_id)"
            :expanded="expandedProductId === group.product_id" @toggle="toggleProduct(group.product_id)"
            @open-unit="openUnitModal" @add-to-cart="addUnitToCart(group)" @clear="clearUnitReservation" />
        </div>

        <div v-if="!inventoryStore.loading && filteredGroups.length > 0" class="border-t border-slate-100 p-4">
          <AppPagination :total-rows="filteredGroups.length" :row-start-index="rowStartIndex" :page-size="pageSize"
            :page-size-options="pageSizeSelectOptions" :current-page="currentPage" :total-pages="totalPages"
            :visible-page-numbers="visiblePageNumbers" @update:page-size="pageSize = $event" @go-to-page="goToPage" />
        </div>
      </section>
    </div>

    <InventoryDirectReserveModal :is-open="directReserveOpen" :unit="selectedUnit"
      :customers="inventoryStore.lookups.customers" :saving="directReserveSaving"
      :initial-start-persian="rangeStartPersian" :initial-end-persian="rangeEndPersian" @close="closeDirectReserve"
      @save="submitDirectReserve" @clear="clearUnitReservation" />

    <UndoBar :visible="undoState.visible" :title="undoState.title" :message="undoState.message" @undo="handleUndo"
      @close="clearUndo" />
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import AppContentState from '../AppContentState.vue';
import AppPagination from '../AppPagination.vue';
import InventoryCategorySidebar from './InventoryCategorySidebar.vue';
import InventoryFilters from './InventoryFilters.vue';
import InventoryProductGroup from './InventoryProductGroup.vue';
import InventoryDirectReserveModal from '../InventoryDirectReserveModal.vue';
import UndoBar from '../UndoBar.vue';
import { usePaginatedList } from '../../composables/usePaginatedList';
import { useInventoryGroups } from '../../composables/useInventoryGroups';
import { useInventoryUnitActions } from '../../composables/useInventoryUnitActions';
import { useTreeFilter } from '../../composables/useTreeFilter';
import { useUndoAction } from '../../composables/useUndoAction';
import { useReservationCartStore } from '../../stores/reservationCartStore';
import { useInventoryStore } from '../../stores/inventoryStore';
import { getCurrentPersianDate, toGregorianDate } from '../../utils/dateConverter';

const router = useRouter();
const toast = useToast();
const inventoryStore = useInventoryStore();
const reservationCart = useReservationCartStore();

const today = getCurrentPersianDate();
const defaultPersianDate = `${today.year}/${String(today.month).padStart(2, '0')}/${String(today.day).padStart(2, '0')}`;

const rangeStartPersian = ref(defaultPersianDate);
const rangeEndPersian = ref(defaultPersianDate);
const searchTerm = ref('');
const treeSearch = ref('');
const statusFilter = ref('all');
const selectedCategoryId = ref(null);
const tableSectionRef = ref(null);
const expandedProductId = ref(null);

const pageSizeOptions = [6, 8, 10, 12].map((size) => ({ label: size.toLocaleString('fa-IR'), value: size }));
const statusOptions = [
  { label: 'همه وضعیت‌ها', value: 'all' },
  { label: 'فقط آزاد', value: 'available' },
  { label: 'فقط رزرو شده', value: 'reserved' }
];

const categoryTree = computed(() => inventoryStore.lookups.category_tree || []);
const { filteredTree } = useTreeFilter(categoryTree, treeSearch);
const { groupedProducts } = useInventoryGroups({
  units: computed(() => inventoryStore.dashboard.units || []),
  categories: computed(() => inventoryStore.lookups.categories || []),
  searchTerm,
  statusFilter,
  selectedCategoryId
});

const filteredGroups = computed(() => groupedProducts.value);
const {
  currentPage,
  pageSize,
  pageSizeOptions: pageSizeSelectOptions,
  totalPages,
  rowStartIndex,
  paginatedItems: paginatedGroups,
  visiblePageNumbers,
  goToPage
} = usePaginatedList(filteredGroups, {
  initialPageSize: 8,
  pageSizeOptions,
  resetSources: [searchTerm, statusFilter, selectedCategoryId],
  scrollTarget: tableSectionRef
});
watch([searchTerm, statusFilter, selectedCategoryId, currentPage], () => {
  expandedProductId.value = null;
});
const { undoState, clearUndo, showUndo, handleUndo } = useUndoAction({
  onSuccess: () => toast.success('بازگردانی انجام شد'),
  onError: (error) => toast.error(error.message || 'بازگردانی با خطا مواجه شد')
});
const {
  directReserveOpen,
  directReserveSaving,
  selectedUnit,
  openUnitModal,
  closeDirectReserve,
  submitDirectReserve,
  clearUnitReservation,
  addUnitToCart
} = useInventoryUnitActions({
  inventoryStore,
  reservationCart,
  toast,
  reloadData: loadData,
  showUndo
});

onMounted(async () => {
  reservationCart.initialize();
  await loadData();
});

function toggleProduct(productId) {
  expandedProductId.value = expandedProductId.value === productId ? null : productId;
}

function getRangeParams() {
  const startDate = toGregorianDate(rangeStartPersian.value);
  const endDate = toGregorianDate(rangeEndPersian.value);
  return {
    startDate: startDate <= endDate ? startDate : endDate,
    endDate: startDate <= endDate ? endDate : startDate
  };
}

async function loadData() {
  try {
    const params = getRangeParams();
    await Promise.all([
      inventoryStore.fetchLookups(),
      inventoryStore.fetchDashboard(params)
    ]);
    reservationCart.syncProductMeta(inventoryStore.productsForInventory);
  } catch (_error) {
    toast.error(inventoryStore.error || 'خطا در دریافت اطلاعات انبار');
  }
}

function goBack() {
  router.back();
}
</script>
