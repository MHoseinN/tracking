import { ref } from 'vue';
import { buildGroupedOrderPayload } from './useReservationItemChanges';

export { buildGroupedOrderPayload } from './useReservationItemChanges';

export function useReservationOrderEditor({ inventoryStore, toast, reloadData, showUndo, getGroupedItems }) {
  const showEditor = ref(false);
  const editingOrder = ref(null);
  const editorSaving = ref(false);

  async function openEditor(order) {
    editingOrder.value = JSON.parse(JSON.stringify(order));
    showEditor.value = true;
    try {
      const params = { startDate: order.start_date, endDate: order.end_date };
      await Promise.all([inventoryStore.fetchLookups(params), inventoryStore.fetchDashboard(params)]);
    } catch (_error) {
      toast.error(inventoryStore.error || 'خطا در دریافت لیست محصولات آزاد');
    }
  }

  function closeEditor() {
    showEditor.value = false;
    editingOrder.value = null;
  }

  async function saveReservationOrder(payload) {
    if (editorSaving.value) return;
    const previousOrder = JSON.parse(JSON.stringify(editingOrder.value || payload));
    editorSaving.value = true;
    const result = await inventoryStore.updateReservationOrder(payload.reservation_order_id, payload);
    editorSaving.value = false;

    if (!result.success) {
      toast.error(result.message);
      return;
    }
    toast.success('رزرو با موفقیت ویرایش شد');
    closeEditor();
    await reloadData();
    showUndo({
      title: 'ویرایش رزرو ثبت شد',
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

  return { showEditor, editingOrder, editorSaving, openEditor, closeEditor, saveReservationOrder };
}
