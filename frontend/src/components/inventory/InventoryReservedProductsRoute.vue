<template>
  <div>
    <Teleport to="#app-shell-actions">
      <button type="button" :disabled="releasingAll || !orders.length" class="app-button-danger w-full"
        @click="showReleaseAllConfirm = true">
        {{ releasingAll ? 'در حال آزادسازی...' : 'آزادسازی همه محصولات' }}
      </button>
      <button type="button" class="app-button-secondary w-full" @click="router.push('/inventory')">بازگشت
      </button>
    </Teleport>

    <div class="max-w-7xl">
      <AppContentState v-if="inventoryStore.loading" loading message="در حال بارگذاری رزروهای فعال..."
        surface-class="rounded-lg bg-white/92 px-4 py-16 shadow-md" />

      <AppContentState v-else-if="filteredOrders.length === 0" message="فعلا محصول رزروشده‌ای وجود ندارد."
        surface-class="rounded-lg bg-white/92 px-4 py-16 shadow-[0_20px_70px_rgba(15,23,42,0.06)]" />

      <section class="space-y-3">
        <div class="grid grid-cols-4 gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-md">
          <div class="flex items-center col-span-3 border border-gray-200 rounded-lg px-2">
            <svg class="h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z" />
            </svg>
            <input v-model.trim="customerSearch" type="search" class="h-10   w-full text-sm text-slate-700 px-3 focus-within:outline-none"
              placeholder="جستجو" />
          </div>
          <button>
            <JalaliDatePicker placeholder="تاریخ" />
          </button>
        </div>

        <InventoryReservationOrderCard v-for="order in filteredOrders" :key="order.reservation_order_id"
          :order="order" :grouped-items="getGroupedOrderItems(order)"
          :expanded="Boolean(expandedOrders[order.reservation_order_id])"
          :releasing="Boolean(releasingOrders[order.reservation_order_id])"
          :updating="Boolean(updatingOrders[order.reservation_order_id])"
          @toggle="toggleOrder(order.reservation_order_id)" @edit="openEditor(order)"
          @release="pendingReleaseOrder = order"
          @change-quantity="(productId, delta) => changeGroupedItemQuantity(order, productId, delta)"
          @remove="removeGroupedItem(order, $event)" />
      </section>

      <InventoryReservationOrderEditorModal :is-open="showEditor" :reservation="editingOrder"
        :customer-options="customerOptions" :product-options="editorProductOptions" :loading="editorSaving"
        @cancel="closeEditor" @save="saveReservationOrder" />

      <ConfirmModal :is-open="showReleaseAllConfirm" title="آزادسازی همه رزروها"
        message="همه رزروهای فعال آزاد می‌شوند و محصولات دوباره در انبار آزاد خواهند شد. ادامه می‌دهی؟"
        :loading="releasingAll" confirm-text="بله، همه آزاد شوند" loading-text="در حال آزادسازی..."
        @confirm="confirmReleaseAll" @cancel="showReleaseAllConfirm = false" />

      <ConfirmModal :is-open="Boolean(pendingReleaseOrder)" title="آزادسازی این رزرو"
        :message="pendingReleaseOrder ? `رزرو مشتری «${pendingReleaseOrder.customer_name || 'بدون نام'}» آزاد شود؟` : ''"
        :loading="pendingReleaseOrder ? Boolean(releasingOrders[pendingReleaseOrder.reservation_order_id]) : false"
        confirm-text="بله، این رزرو آزاد شود" loading-text="در حال آزادسازی رزرو..."
        @confirm="pendingReleaseOrder ? releaseOrder(pendingReleaseOrder) : null"
        @cancel="pendingReleaseOrder = null" />

      <UndoBar :visible="undoState.visible" :title="undoState.title" :message="undoState.message" @undo="handleUndo"
        @close="clearUndo" />
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import AppContentState from '../AppContentState.vue';
import ConfirmModal from '../ConfirmModal.vue';
import InventoryReservationOrderEditorModal from '../InventoryReservationOrderEditorModal.vue';
import InventoryReservationOrderCard from './InventoryReservationOrderCard.vue';
import UndoBar from '../UndoBar.vue';
import { useInventoryStore } from '../../stores/inventoryStore';
import JalaliDatePicker from '../JalaliDatePicker.vue';
import { useUndoAction } from '../../composables/useUndoAction';
import { useReservationReleaseActions } from '../../composables/useReservationReleaseActions';
import { useReservationOrderEditor } from '../../composables/useReservationOrderEditor';
import { useReservationItemChanges } from '../../composables/useReservationItemChanges';

const router = useRouter();
const toast = useToast();
const inventoryStore = useInventoryStore();

const expandedOrders = ref({});
const customerSearch = ref('');

const orders = computed(() => inventoryStore.activeReservations || []);
const { undoState, clearUndo, showUndo, handleUndo } = useUndoAction({
  onSuccess: () => toast.success('بازگردانی انجام شد'),
  onError: (error) => toast.error(error.message || 'بازگردانی با خطا مواجه شد')
});
const {
  releasingOrders,
  releasingAll,
  showReleaseAllConfirm,
  pendingReleaseOrder,
  releaseOrder,
  confirmReleaseAll
} = useReservationReleaseActions({
  inventoryStore,
  orders,
  reloadData: loadData,
  toast,
  showUndo
});
const {
  showEditor,
  editingOrder,
  editorSaving,
  openEditor,
  closeEditor,
  saveReservationOrder
} = useReservationOrderEditor({
  inventoryStore,
  toast,
  reloadData: loadData,
  showUndo,
  getGroupedItems
});
const { updatingOrders, changeGroupedItemQuantity, removeGroupedItem } = useReservationItemChanges({
  inventoryStore,
  toast,
  reloadData: loadData,
  showUndo,
  expandedOrders,
  getGroupedItems
});
const filteredOrders = computed(() => {
  const query = customerSearch.value.trim().toLowerCase();
  if (!query) return orders.value;

  return orders.value.filter((order) =>
    String(order.customer_name || '').toLowerCase().includes(query)
  );
});
const customerOptions = computed(() => inventoryStore.lookups.customers.map((customer) => ({
  label: customer.name,
  value: customer.id
})));
const editorProductOptions = computed(() => {
  const lookupMap = new Map(inventoryStore.productsForInventory.map((product) => [Number(product.id), product]));

  (editingOrder.value?.items || []).forEach((item) => {
    const productId = Number(item.product_id);
    if (!lookupMap.has(productId)) {
      lookupMap.set(productId, {
        id: productId,
        name: item.product_name,
        category_name: item.category_name || '',
        available_quantity: 0
      });
    }
  });

  return Array.from(lookupMap.values());
});

onMounted(async () => {
  await loadData();
});

async function loadData() {
  try {
    await Promise.all([
      inventoryStore.fetchActiveReservations(),
      inventoryStore.fetchLookups(),
      inventoryStore.fetchDashboard()
    ]);
  } catch (_error) {
    toast.error(inventoryStore.error || 'خطا در دریافت رزروهای فعال');
  }
}

function toggleOrder(reservationOrderId) {
  expandedOrders.value = {
    ...expandedOrders.value,
    [reservationOrderId]: !expandedOrders.value[reservationOrderId]
  };
}

function getGroupedItems(items = []) {
  const grouped = new Map();

  items.forEach((item) => {
    const productId = Number(item.product_id);
    const existing = grouped.get(productId);
    if (existing) {
      existing.quantity += 1;
      existing.unit_ids.push(item.unit_id);
      existing.reservation_item_ids.push(item.reservation_item_id);
      return;
    }

    grouped.set(productId, {
      product_id: productId,
      product_name: item.product_name,
      category_name: item.category_name || '',
      quantity: 1,
      unit_ids: [item.unit_id],
      reservation_item_ids: [item.reservation_item_id]
    });
  });

  return Array.from(grouped.values()).sort((a, b) => String(a.product_name).localeCompare(String(b.product_name), 'fa'));
}

function getGroupedOrderItems(order) {
  return getGroupedItems(order?.items || []);
}

</script>
