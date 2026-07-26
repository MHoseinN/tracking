import { ref } from 'vue';

export function useReservationReleaseActions({ inventoryStore, orders, reloadData, toast, showUndo }) {
  const releasingOrders = ref({});
  const releasingAll = ref(false);
  const showReleaseAllConfirm = ref(false);
  const pendingReleaseOrder = ref(null);

  async function releaseOrder(order) {
    const orderSnapshot = JSON.parse(JSON.stringify(order));
    releasingOrders.value = { ...releasingOrders.value, [order.reservation_order_id]: true };
    const result = await inventoryStore.releaseReservationOrder(order.reservation_order_id);
    releasingOrders.value = { ...releasingOrders.value, [order.reservation_order_id]: false };
    pendingReleaseOrder.value = null;
    if (!result.success) {
      toast.error(result.message);
      return;
    }
    toast.success('کل رزرو آزاد شد');
    await reloadData();
    showUndo({
      title: 'رزرو آزاد شد',
      message: 'اگر اشتباه بوده، بازگردانی کن.',
      handler: async () => {
        const undoResult = await inventoryStore.restoreReservationOrder(orderSnapshot.reservation_order_id);
        if (!undoResult.success) throw new Error(undoResult.message);
        await reloadData();
      }
    });
  }

  async function confirmReleaseAll() {
    if (releasingAll.value || !orders.value.length) return;
    releasingAll.value = true;
    const result = await inventoryStore.releaseAllReservations();
    releasingAll.value = false;
    showReleaseAllConfirm.value = false;
    if (!result.success) {
      toast.error(result.message);
      return;
    }
    toast.success('همه محصولات رزروشده آزاد شدند');
    await reloadData();
    showUndo({
      title: 'همه رزروها آزاد شدند',
      message: 'اگر اشتباه بوده، بازگردانی کن.',
      handler: async () => {
        const undoResult = await inventoryStore.restoreAllReservations();
        if (!undoResult.success) throw new Error(undoResult.message);
        await reloadData();
      }
    });
  }

  return {
    releasingOrders,
    releasingAll,
    showReleaseAllConfirm,
    pendingReleaseOrder,
    releaseOrder,
    confirmReleaseAll
  };
}
