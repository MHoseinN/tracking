import { ref } from 'vue';

export function buildGroupedOrderPayload(order, groupedItems) {
  return {
    reservation_order_id: order.reservation_order_id,
    customer_id: order.customer_id ? Number(order.customer_id) : null,
    customer_name: order.customer_name || '',
    start_date: order.start_date,
    end_date: order.end_date,
    items: groupedItems
      .filter((item) => Number(item.quantity) > 0)
      .map((item) => ({ product_id: Number(item.product_id), quantity: Number(item.quantity) }))
  };
}

export function useReservationItemChanges({ inventoryStore, toast, reloadData, showUndo, expandedOrders, getGroupedItems }) {
  const updatingOrders = ref({});

  async function persistGroupedOrderChanges(order, groupedItems, successMessage, previousOrder = null) {
    const payload = buildGroupedOrderPayload(order, groupedItems);
    if (payload.items.length === 0) {
      toast.error('حداقل یک محصول باید در رزرو باقی بماند');
      return;
    }

    const orderId = order.reservation_order_id;
    updatingOrders.value = { ...updatingOrders.value, [orderId]: true };
    const result = await inventoryStore.updateReservationOrder(orderId, payload);
    updatingOrders.value = { ...updatingOrders.value, [orderId]: false };
    if (!result.success) {
      toast.error(result.message);
      return;
    }

    toast.success(successMessage);
    await reloadData();
    expandedOrders.value = { ...expandedOrders.value, [orderId]: true };
    if (previousOrder) {
      showUndo({
        title: successMessage,
        message: 'اگر اشتباه بوده، بازگردانی کن.',
        handler: async () => {
          const undoResult = await inventoryStore.updateReservationOrder(
            previousOrder.reservation_order_id,
            buildGroupedOrderPayload(previousOrder, getGroupedItems(previousOrder.items))
          );
          if (!undoResult.success) throw new Error(undoResult.message);
          await reloadData();
        }
      });
    }
  }

  async function changeGroupedItemQuantity(order, productId, delta) {
    const previousOrder = JSON.parse(JSON.stringify(order));
    const groupedItems = getGroupedItems(order.items).map((item) => ({ ...item }));
    const target = groupedItems.find((item) => Number(item.product_id) === Number(productId));
    if (!target) return;
    const nextQuantity = Number(target.quantity) + Number(delta);
    if (nextQuantity <= 0) {
      await removeGroupedItem(order, productId);
      return;
    }
    target.quantity = nextQuantity;
    await persistGroupedOrderChanges(order, groupedItems, 'تعداد محصول در رزرو به‌روزرسانی شد', previousOrder);
  }

  async function removeGroupedItem(order, productId) {
    const previousOrder = JSON.parse(JSON.stringify(order));
    const groupedItems = getGroupedItems(order.items)
      .filter((item) => Number(item.product_id) !== Number(productId));
    await persistGroupedOrderChanges(order, groupedItems, 'محصول از این رزرو حذف شد', previousOrder);
  }

  return { updatingOrders, persistGroupedOrderChanges, changeGroupedItemQuantity, removeGroupedItem };
}
