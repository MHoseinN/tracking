import { computed, ref } from 'vue';

export function useProductCatalogActions({ catalogStore, toast, reloadData, selectedCategoryId, showUndo }) {
  const showCategoryModal = ref(false);
  const showProductModal = ref(false);
  const showDeleteCategoryModal = ref(false);
  const showDeleteProductModal = ref(false);
  const savingCategory = ref(false);
  const savingProduct = ref(false);
  const deleting = ref(false);
  const selectedCategoryForModal = ref(null);
  const selectedProduct = ref(null);
  const deleteProductTarget = ref(null);

  const deleteProductMessage = computed(() => deleteProductTarget.value?.name
    ? `آیا محصول «${deleteProductTarget.value.name}» حذف شود؟`
    : 'آیا این محصول حذف شود؟');

  function openCategoryModal(category = null) {
    selectedCategoryForModal.value = category ? { ...category } : { parent_id: selectedCategoryId.value || null };
    showCategoryModal.value = true;
  }
  function closeCategoryModal() { showCategoryModal.value = false; selectedCategoryForModal.value = null; }
  function openProductModal(product = null) {
    selectedProduct.value = product ? { ...product } : { category_id: selectedCategoryId.value || null };
    showProductModal.value = true;
  }
  function closeProductModal() { showProductModal.value = false; selectedProduct.value = null; }
  function openDeleteProduct(product) { deleteProductTarget.value = product; showDeleteProductModal.value = true; }

  async function handleSaveCategory(payload) {
    savingCategory.value = true;
    const isEdit = Boolean(selectedCategoryForModal.value?.id);
    const previousCategory = isEdit ? { ...selectedCategoryForModal.value } : null;
    const result = isEdit
      ? await catalogStore.updateCategory(selectedCategoryForModal.value.id, payload)
      : await catalogStore.createCategory(payload);
    savingCategory.value = false;
    if (!result.success) { toast.error(result.message); return; }
    closeCategoryModal(); await reloadData();
    toast.success(isEdit ? 'دسته‌بندی ویرایش شد' : 'دسته‌بندی ثبت شد');
    showUndo({
      title: isEdit ? 'ویرایش دسته‌بندی ثبت شد' : 'دسته‌بندی ثبت شد', message: 'اگر اشتباه بوده، بازگردانی کن.',
      handler: async () => {
        const undoResult = isEdit
          ? await catalogStore.updateCategory(previousCategory.id, { name: previousCategory.name, parent_id: previousCategory.parent_id || null })
          : await catalogStore.deleteCategory(result.data.id);
        if (!undoResult.success) throw new Error(undoResult.message);
        await reloadData();
      }
    });
  }

  async function handleSaveProduct(payload) {
    savingProduct.value = true;
    const isEdit = Boolean(selectedProduct.value?.id);
    const previousProduct = isEdit ? { ...selectedProduct.value } : null;
    const normalizedPayload = { ...payload, category_id: payload.category_id || selectedCategoryId.value || null };
    const result = isEdit
      ? await catalogStore.updateProduct(selectedProduct.value.id, normalizedPayload)
      : await catalogStore.createProduct(normalizedPayload);
    savingProduct.value = false;
    if (!result.success) { toast.error(result.message); return; }
    closeProductModal(); await reloadData();
    toast.success(isEdit ? 'محصول ویرایش شد' : 'محصول ثبت شد');
    showUndo({
      title: isEdit ? 'ویرایش محصول ثبت شد' : 'محصول ثبت شد', message: 'اگر اشتباه بوده، بازگردانی کن.',
      handler: async () => {
        const undoResult = isEdit
          ? await catalogStore.updateProduct(previousProduct.id, {
            name: previousProduct.name,
            daily_price_toman: previousProduct.daily_price_toman,
            category_id: previousProduct.category_id || null,
            notes: previousProduct.notes || null,
            is_active: previousProduct.is_active
          })
          : await catalogStore.deleteProduct(result.data.id);
        if (!undoResult.success) throw new Error(undoResult.message);
        await reloadData();
      }
    });
  }

  async function handleDeleteCategory(category) {
    if (!category?.id || deleting.value) return;
    const snapshot = { ...category };
    deleting.value = true;
    const result = await catalogStore.deleteCategory(category.id);
    deleting.value = false;
    if (!result.success) { toast.error(result.message); return; }
    showDeleteCategoryModal.value = false;
    selectedCategoryId.value = null;
    await reloadData();
    toast.success('دسته‌بندی حذف شد');
    showUndo({
      title: 'دسته‌بندی حذف شد', message: 'در صورت نیاز، همین حالا بازگردانی کن.',
      handler: async () => {
        const undoResult = await catalogStore.createCategory({ name: snapshot.name, parent_id: snapshot.parent_id || null });
        if (!undoResult.success) throw new Error(undoResult.message);
        await reloadData();
      }
    });
  }

  async function handleDeleteProduct() {
    if (!deleteProductTarget.value?.id || deleting.value) return;
    const snapshot = { ...deleteProductTarget.value };
    deleting.value = true;
    const result = await catalogStore.deleteProduct(snapshot.id);
    deleting.value = false;
    if (!result.success) { toast.error(result.message); return; }
    showDeleteProductModal.value = false; deleteProductTarget.value = null; await reloadData();
    toast.success('محصول حذف شد');
    showUndo({
      title: 'محصول حذف شد', message: 'در صورت نیاز، همین حالا بازگردانی کن.',
      handler: async () => {
        const undoResult = await catalogStore.createProduct({
          name: snapshot.name,
          daily_price_toman: snapshot.daily_price_toman,
          category_id: snapshot.category_id || null,
          notes: snapshot.notes || null,
          is_active: snapshot.is_active
        });
        if (!undoResult.success) throw new Error(undoResult.message);
        await reloadData();
      }
    });
  }

  return {
    showCategoryModal, showProductModal, showDeleteCategoryModal, showDeleteProductModal,
    savingCategory, savingProduct, deleting, selectedCategoryForModal, selectedProduct,
    deleteProductTarget, deleteProductMessage, openCategoryModal, closeCategoryModal,
    openProductModal, closeProductModal, openDeleteProduct, handleSaveCategory,
    handleSaveProduct, handleDeleteCategory, handleDeleteProduct
  };
}
