import { ref } from 'vue';

export function useInventoryUnitActions({ inventoryStore, reservationCart, toast, reloadData, showUndo }) {
  const directReserveOpen = ref(false);
  const directReserveSaving = ref(false);
  const selectedUnit = ref(null);

  function openUnitModal(unit) {
    selectedUnit.value = unit;
    directReserveOpen.value = true;
  }

  function closeDirectReserve() {
    directReserveOpen.value = false;
    selectedUnit.value = null;
  }

  async function submitDirectReserve(payload) {
    if (!selectedUnit.value || directReserveSaving.value) return;
    directReserveSaving.value = true;
    const result = await inventoryStore.updateUnitAssignment(selectedUnit.value.unit_id, {
      customer_id: payload.customer_id,
      customer_name: payload.customer_name,
      start_date: payload.start_date,
      end_date: payload.end_date,
      reservation_item_id: selectedUnit.value.reservation_item_id || null,
      notes: payload.notes
    });
    directReserveSaving.value = false;

    if (!result.success) {
      toast.error(result.message);
      return;
    }
    toast.success('رزرو مستقیم ثبت شد');
    closeDirectReserve();
    await reloadData();
  }

  async function clearUnitReservation(unit) {
    if (!unit?.reservation_item_id || directReserveSaving.value) return;
    const unitSnapshot = { ...unit };
    directReserveSaving.value = true;
    const result = await inventoryStore.deleteUnitAssignment(unit.unit_id, unit.reservation_item_id);
    directReserveSaving.value = false;

    if (!result.success) {
      toast.error(result.message);
      return;
    }
    toast.success('محصول آزاد شد');
    closeDirectReserve();
    await reloadData();
    showUndo({
      title: 'آزادسازی ثبت شد',
      message: 'اگر اشتباه بوده، بازگردانی کن.',
      handler: async () => {
        const undoResult = await inventoryStore.restoreUnitAssignment(unitSnapshot.unit_id, unitSnapshot.reservation_item_id);
        if (!undoResult.success) throw new Error(undoResult.message);
        await reloadData();
      }
    });
  }

  function addUnitToCart(group) {
    if (group.available_units <= reservationCart.getProductQuantity(group.product_id)) {
      toast.error('عدد آزاد بیشتری برای افزودن به سبد وجود ندارد');
      return;
    }
    const result = reservationCart.addProduct({
      id: group.product_id,
      name: group.product_name,
      category_name: group.category_name
    }, 1, group.available_units);
    if (!result.success) {
      toast.error(result.message);
      return;
    }
    toast.success('محصول به سبد رزرو اضافه شد');
  }

  return {
    directReserveOpen,
    directReserveSaving,
    selectedUnit,
    openUnitModal,
    closeDirectReserve,
    submitDirectReserve,
    clearUnitReservation,
    addUnitToCart
  };
}
